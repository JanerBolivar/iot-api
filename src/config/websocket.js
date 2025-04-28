import jwt from 'jsonwebtoken';
import Device from '../models/Device.js';
import DeviceData from '../models/DeviceData.js';
import { JWT_SECRET } from '../config/envs.js';

// Map<deviceUuid, { device: DeviceInfo, connections: Set<WebSocket> }>
const deviceChannels = new Map();

// Map<deviceUuid, Set<WebSocket>> - Para conexiones de dashboard por dispositivo
const dashboardChannels = new Map();

// Set global para todos los dashboards (para mensajes globales)
const allDashboards = new Set();

// Manejo de conexiones de dispositivos - Autenticación dual (token + uuid)
export const deviceHandler = async (ws, req, deviceUuid = null) => {
  const token = req.headers['device-token'];
  
  if (!token) {
    return ws.close(4003, 'Token de dispositivo requerido');
  }
  
  try {
    let device = null;
    
    // Si se proporciona un UUID en la ruta, verificamos que coincida con el token
    if (deviceUuid) {
      device = await Device.findOne({
        where: { uuid: deviceUuid, token },
        attributes: ['uuid', 'name', 'ownerId']
      });
      
      if (!device) {
        return ws.close(4003, 'UUID o token de dispositivo no válido');
      }
    } 
    // Si no hay UUID en la ruta, buscamos el dispositivo solo por el token
    else {
      device = await Device.findOne({
        where: { token },
        attributes: ['uuid', 'name', 'ownerId']
      });
      
      if (!device) {
        return ws.close(4003, 'Dispositivo no autorizado');
      }
    }
    
    // Inicializar el canal si no existe
    if (!deviceChannels.has(device.uuid)) {
      deviceChannels.set(device.uuid, {
        device: {
          uuid: device.uuid,
          name: device.name,
          ownerId: device.ownerId
        },
        connections: new Set()
      });
    }
    
    // Añadir esta conexión al canal del dispositivo
    const channel = deviceChannels.get(device.uuid);
    channel.connections.add(ws);
    
    console.log(`Dispositivo conectado: ${device.name} (${device.uuid})`);
    
    ws.on('message', async (message) => {
      try {
        const { data, save } = JSON.parse(message);
        
        // Validación y procesamiento...
        if (save) {
          await DeviceData.create({
            type: data.type,
            value: data.value,
            valve: data.valve || null,
            deviceUuid: device.uuid
          });
        }
        
        // Broadcast a dashboards suscritos a este dispositivo específico
        const broadcastMsg = JSON.stringify({
          device: { uuid: device.uuid, name: device.name },
          data,
          timestamp: new Date().toISOString(),
          saved: save
        });
        
        // Enviar a dashboards suscritos a este dispositivo
        if (dashboardChannels.has(device.uuid)) {
          dashboardChannels.get(device.uuid).forEach(client => {
            if (client.readyState === client.OPEN) {
              client.send(broadcastMsg);
            }
          });
        }
        
        // También enviar a todos los dashboards que están suscritos a todos los dispositivos
        allDashboards.forEach(client => {
          if (client.readyState === client.OPEN) {
            client.send(broadcastMsg);
          }
        });
        
        ws.send(JSON.stringify({ status: 'OK', saved: save }));
      } catch (error) {
        console.error('Error procesando mensaje:', error);
        ws.send(JSON.stringify({ error: 'Formato de mensaje inválido' }));
      }
    });
    
    ws.on('close', () => {
      if (deviceChannels.has(device.uuid)) {
        deviceChannels.get(device.uuid).connections.delete(ws);
        
        // Si no quedan conexiones, podríamos eliminar el canal
        //if (deviceChannels.get(device.uuid).connections.size === 0) {
          // deviceChannels.delete(device.uuid);
        //}
      }
      
      console.log(`Dispositivo desconectado: ${device.uuid}`);
    });
  } catch (error) {
    console.error('Error en conexión WebSocket de dispositivo:', error);
    ws.close(4005, 'Error de servidor');
  }
};

// Manejo de dashboards - Autenticación por JWT de usuario 
export const handleDashboardConnection = (ws, req, deviceUuid = null) => {
  try {
    // Extrae el token del header 'Authorization' (ej: "Bearer <token>")
    const authHeader = req.headers['authorization'];
    if (!authHeader) throw new Error('Token de autorización no proporcionado');
    
    const token = authHeader.split(' ')[1];
    if (!token) throw new Error('Formato de token inválido');
    
    // Verifica el token JWT del usuario
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Si se proporciona un UUID de dispositivo, suscribimos solo a ese canal
    if (deviceUuid) {
      // Verificar que el dispositivo existe
      Device.findOne({ where: { uuid: deviceUuid } })
        .then(device => {
          if (!device) {
            ws.send(JSON.stringify({
              type: 'ERROR',
              message: 'Dispositivo no encontrado'
            }));
            return;
          }

          // Verificar que el usuario tiene acceso a este dispositivo
          if (device.ownerId !== decoded.uuid) {
            ws.send(JSON.stringify({
              type: 'ERROR',
              message: 'No tienes permisos para acceder a este dispositivo'
            }));
            return;
          }
          
          // Inicializar el canal si no existe
          if (!dashboardChannels.has(deviceUuid)) {
            dashboardChannels.set(deviceUuid, new Set());
          }
          
          // Añadir esta conexión al canal del dashboard para este dispositivo
          dashboardChannels.get(deviceUuid).add(ws);
          
          console.log(`Dashboard conectado al dispositivo: ${deviceUuid} (Usuario ID: ${decoded.uuid})`);
          
          ws.send(JSON.stringify({
            type: 'CONNECTION_ACK',
            message: `Suscrito al dispositivo ${deviceUuid}`,
            deviceUuid,
            userId: decoded.uuid
          }));
        })
        .catch(error => {
          console.error('Error verificando dispositivo:', error);
          ws.send(JSON.stringify({
            type: 'ERROR',
            message: 'Error verificando dispositivo'
          }));
        });
    } 
    // Si no hay UUID, lo añadimos al canal global (recibe datos de todos los dispositivos)
    else {
      allDashboards.add(ws);
      console.log(`Dashboard conectado a todos los dispositivos (Usuario ID: ${decoded.uuid})`);
      
      ws.send(JSON.stringify({
        type: 'CONNECTION_ACK',
        message: 'Conexión autorizada - Recibiendo datos de todos los dispositivos',
        userId: decoded.uuid
      }));
    }
    
    ws.on('close', () => {
      // Eliminar de canales específicos
      if (deviceUuid && dashboardChannels.has(deviceUuid)) {
        dashboardChannels.get(deviceUuid).delete(ws);
        
        // Si no quedan conexiones, podríamos eliminar el canal
        //if (dashboardChannels.get(deviceUuid).size === 0) {
          // dashboardChannels.delete(deviceUuid);
        //}
      }
      
      // Eliminar del canal global
      allDashboards.delete(ws);
      
      console.log(`Dashboard desconectado ${deviceUuid ? `del dispositivo ${deviceUuid}` : 'del canal global'}`);
    });
  } catch (error) {
    console.error('Error en autenticación del dashboard:', error.message);
    ws.close(4001, 'No autorizado');
  }
};

// Función para enviar comandos a un dispositivo específico
export const sendDeviceCommand = (deviceUuid, command) => {
  if (!deviceChannels.has(deviceUuid)) {
    return false;
  }
  
  const channel = deviceChannels.get(deviceUuid);
  let sentToAny = false;
  
  channel.connections.forEach(ws => {
    if (ws.readyState === ws.OPEN) {
      ws.send(JSON.stringify(command));
      sentToAny = true;
    }
  });
  
  return sentToAny;
};