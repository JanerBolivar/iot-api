import jwt from 'jsonwebtoken';
import Device from '../models/Device.js';
import DeviceData from '../models/DeviceData.js';
import { JWT_SECRET } from '../config/envs.js';
import WebSocket from 'ws';

// Expresión regular para validar UUID v4
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

// Estructuras de datos mejoradas
const deviceConnections = new Map(); // Map<deviceUuid, Set<WebSocket>>
const dashboardSubscriptions = new Map(); // Map<deviceUuid, Set<WebSocket>>
const globalDashboards = new Set(); // Para dashboards que monitorean todos los dispositivos

// Handler de dispositivos (ahora requiere UUID en URL)
export const deviceHandler = async (ws, req) => {
  try {
    // Extraer UUID de la URL
    const deviceUuid = extractUuidFromRequest(req);
    if (!deviceUuid) {
      return ws.close(4004, 'UUID de dispositivo requerido en la URL');
    }

    // Validar formato UUID
    if (!UUID_REGEX.test(deviceUuid)) {
      return ws.close(4004, 'Formato de UUID inválido');
    }

    // Verificar token de dispositivo
    const token = req.headers['device-token'];
    if (!token) {
      return ws.close(4003, 'Token de dispositivo requerido');
    }

    // Buscar dispositivo en BD
    const device = await Device.findOne({
      where: { uuid: deviceUuid, token },
      attributes: ['uuid', 'name', 'ownerId', 'status']
    });

    if (!device) {
      return ws.close(4003, 'Dispositivo no autorizado');
    }

    // Registrar conexión
    if (!deviceConnections.has(deviceUuid)) {
      deviceConnections.set(deviceUuid, new Set());
    }
    deviceConnections.get(deviceUuid).add(ws);

    // Configurar handlers de mensajes
    ws.on('message', (message) => handleDeviceMessage(device)(message, ws));
    ws.on('close', handleDeviceDisconnection(deviceUuid, ws));
    ws.on('error', handleDeviceError(deviceUuid));

    // Notificar a los dashboards que el dispositivo se ha conectado
    broadcastDeviceStatus(deviceUuid, device.name, 'connected');

  } catch (error) {
    console.error(`Error en conexión de dispositivo: ${error.message}`);
    ws.close(4005, 'Error de servidor');
  }
};

// Handler de dashboards (ahora requiere UUID en URL)
export const dashboardHandler = async (ws, req) => {
  try {
    // Verificar autenticación JWT
    const authHeader = req.headers['authorization'];
    if (!authHeader) {
      return ws.close(4001, 'Token de autorización requerido');
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      return ws.close(4001, 'Formato de token inválido (usar "Bearer <token>")');
    }

    // Verificar token JWT
    const decoded = jwt.verify(token, JWT_SECRET);

    const path = req.url.split('?')[0];

    if (path.startsWith('/dashboard/device/')) {
      await handleSpecificDeviceSubscription(ws, req, decoded);
    } else {
      return ws.close(4004, 'Ruta no válida. Use /dashboard/device/:uuid');
    }

    // Configurar handlers de cierre
    ws.on('close', handleDashboardDisconnection(ws));
    ws.on('error', handleDashboardError());

    // Enviar últimos datos del dispositivo al dashboard como inicio
    if (path.startsWith('/dashboard/device/')) {
      const deviceUuid = extractUuidFromRequest(req);
      if (deviceUuid) {
        sendLatestDeviceData(ws, deviceUuid);
      }
    }

  } catch (error) {
    console.error(`Error en conexión de dashboard: ${error.message}`);
    ws.close(4001, 'No autorizado');
  }
};

// Funciones auxiliares

function handleDeviceError(deviceUuid) {
  return (error) => {
    console.error(`Error en conexión con dispositivo ${deviceUuid}:`, error.message);
  };
}

function handleDashboardError() {
  return (error) => {
    console.error(`Error en conexión con dashboard:`, error.message);
  };
}

function extractUuidFromRequest(req) {
  const match = req.url.match(/\/([0-9a-f-]{36})/);
  return match ? match[1] : null;
}

function handleDeviceMessage(device) {
  return async (message, ws) => {
    try {
      let parsedMessage;
      try {
        parsedMessage = JSON.parse(message);
      } catch (e) {
        throw new Error(`Error al parsear JSON: ${e.message}`);
      }

      const { data, save } = parsedMessage;

      if (!data) {
        throw new Error('Mensaje sin datos');
      }

      // Guardar en BD si es necesario
      if (save) {
        await DeviceData.create({
          type: data.type || 'unknown',
          value: data.value !== undefined ? data.value : null,
          valve: data.valve || null,
          deviceUuid: device.uuid
        });
      }

      // Preparar mensaje de broadcast
      const broadcastMsg = JSON.stringify({
        event: 'device_update',
        device: { uuid: device.uuid, name: device.name },
        data,
        timestamp: new Date().toISOString(),
        save: save
      });

      // Enviar a suscriptores
      broadcastToSubscribers(device.uuid, broadcastMsg);

      // Confirmación al dispositivo
      ws.send(JSON.stringify({
        status: 'OK',
        messageId: Date.now(),
        saved: save
      }));

    } catch (error) {
      console.error(`Error procesando mensaje del dispositivo ${device.uuid}:`, error);
      ws.send(JSON.stringify({
        error: 'Error procesando mensaje',
        details: error.message
      }));
    }
  };
}

function broadcastToSubscribers(deviceUuid, message) {
  // Suscriptores específicos del dispositivo
  if (dashboardSubscriptions.has(deviceUuid)) {
    dashboardSubscriptions.get(deviceUuid).forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
        console.log(`Mensaje enviado a suscriptor específico para ${deviceUuid}`);
      } else {
        console.warn(`Cliente websocket para ${deviceUuid} no está abierto. Estado: ${client.readyState}`);
      }
    });
  }
}

function broadcastDeviceStatus(deviceUuid, deviceName, status) {
  const statusMessage = JSON.stringify({
    event: 'device_status',
    device: { uuid: deviceUuid, name: deviceName },
    status,
    timestamp: new Date().toISOString()
  });

  broadcastToSubscribers(deviceUuid, statusMessage);
}

async function handleSpecificDeviceSubscription(ws, req, user) {
  const deviceUuid = extractUuidFromRequest(req);

  if (!deviceUuid) {
    return ws.close(4004, 'UUID de dispositivo requerido');
  }

  // Verificar que el dispositivo existe y pertenece al usuario
  const device = await Device.findOne({
    where: { uuid: deviceUuid },
    attributes: ['uuid', 'name', 'ownerId']
  });

  if (!device) {
    return ws.close(404, 'Dispositivo no encontrado');
  }

  if (device.ownerId !== user.uuid) {
    return ws.close(403, 'No tienes permisos para este dispositivo');
  }

  // Registrar suscripción
  if (!dashboardSubscriptions.has(deviceUuid)) {
    dashboardSubscriptions.set(deviceUuid, new Set());
  }
  dashboardSubscriptions.get(deviceUuid).add(ws);

  console.log(`Dashboard suscrito a dispositivo: ${deviceUuid} (Usuario: ${user.uuid})`);

  // Enviar confirmación
  ws.send(JSON.stringify({
    type: 'subscription_ack',
    status: 'subscribed',
    device: {
      uuid: device.uuid,
      name: device.name
    },
    timestamp: new Date().toISOString()
  }));
}

// Funciones de limpieza
function handleDeviceDisconnection(deviceUuid, ws) {
  return () => {
    if (deviceConnections.has(deviceUuid)) {
      deviceConnections.get(deviceUuid).delete(ws);

      // Limpiar si no hay más conexiones
      if (deviceConnections.get(deviceUuid).size === 0) {
        deviceConnections.delete(deviceUuid);

        // Notificar a los dashboards que el dispositivo se ha desconectado
        const device = Device.findOne({ where: { uuid: deviceUuid } });
        if (device) {
          broadcastDeviceStatus(deviceUuid, device.name, 'disconnected');
        }
      }
    }
    console.log(`Dispositivo desconectado: ${deviceUuid}`);
  };
}

function handleDashboardDisconnection(ws) {
  return () => {
    // Eliminar de suscripciones específicas
    dashboardSubscriptions.forEach((subs, deviceUuid) => {
      if (subs.has(ws)) {
        subs.delete(ws);
        console.log(`Dashboard eliminado de suscripciones para dispositivo: ${deviceUuid}`);
        if (subs.size === 0) {
          dashboardSubscriptions.delete(deviceUuid);
        }
      }
    });
  };
}

// Función para enviar comandos
export const sendDeviceCommand = (deviceUuid, command) => {
  if (!deviceConnections.has(deviceUuid)) {
    throw new Error(`Dispositivo ${deviceUuid} no conectado`);
  }

  const connections = deviceConnections.get(deviceUuid);
  const results = [];

  connections.forEach(ws => {
    if (ws.readyState === WebSocket.OPEN) {
      try {
        ws.send(JSON.stringify({
          ...command,
          messageId: Date.now(),
          timestamp: new Date().toISOString()
        }));
        results.push({ success: true });
      } catch (error) {
        results.push({ success: false, error: error.message });
      }
    }
  });

  return results;
};

// Función para enviar los últimos datos del dispositivo al dashboard
async function sendLatestDeviceData(ws, deviceUuid) {
  try {
    // Obtener los últimos datos del dispositivo (por ejemplo, los últimos 10)
    const latestData = await DeviceData.findAll({
      where: { deviceUuid },
      limit: 10,
      order: [['createdAt', 'DESC']]
    });

    // Obtener información del dispositivo
    const device = await Device.findOne({
      where: { uuid: deviceUuid },
      attributes: ['uuid', 'name']
    });

    if (!device) return;

    // Enviar datos históricos
    if (latestData.length > 0) {
      ws.send(JSON.stringify({
        event: 'historical_data',
        device: { uuid: device.uuid, name: device.name },
        data: latestData,
        timestamp: new Date().toISOString()
      }));
      console.log(`Enviados ${latestData.length} registros históricos al dashboard para dispositivo ${deviceUuid}`);
    } else {
      console.log(`No hay datos históricos para enviar al dispositivo ${deviceUuid}`);
    }
  } catch (error) {
    console.error(`Error al enviar datos históricos para dispositivo ${deviceUuid}:`, error);
  }
}