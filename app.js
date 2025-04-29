import express from "express";
import cors from "cors";
import swaggerUI from "swagger-ui-express";
import { createServer } from "http";
import { WebSocketServer } from "ws";
import { URL } from "url";

import swaggerSpec from "./src/docs/swagger.js";
import { PORT, BASE_URL } from "./src/config/envs.js";
import userRouter from "./src/routes/userRoutes.js";
import deviceRouter from "./src/routes/deviceRoutes.js";
import { deviceHandler, dashboardHandler } from "./src/config/websocket.js";

const app = express();
const server = createServer(app);

// Configuración WebSocket unificada
const wsServer = new WebSocketServer({ noServer: true });

// Middlewares
app.use(cors());
app.use(express.json());

// Swagger UI
app.use('/api-doc', swaggerUI.serve, swaggerUI.setup(swaggerSpec));

// Rutas HTTP
app.use('/api/user', userRouter);
app.use('/api/device', deviceRouter);

// Manejador de upgrade WebSocket
server.on('upgrade', (req, socket, head) => {
  const { pathname } = new URL(req.url, `http://${req.headers.host}`);
  
  // Validación de rutas WebSocket
  if (pathname.startsWith('/device/')) {
    handleDeviceUpgrade(req, socket, head);
  } else if (pathname.startsWith('/dashboard/')) {
    handleDashboardUpgrade(req, socket, head);
  } else {
    socket.write('HTTP/1.1 404 Not Found\r\n\r\n');
    socket.destroy();
  }
});

// Manejador para conexiones de dispositivos
function handleDeviceUpgrade(req, socket, head) {
  const { pathname } = new URL(req.url, `http://${req.headers.host}`);
  const deviceUuid = pathname.split('/')[2]; // Extraer UUID de /device/<uuid>
  
  // Validar UUID
  if (!isValidUuid(deviceUuid)) {
    return rejectConnection(socket, 400, 'Formato de UUID inválido');
  }

  // Verificar token de dispositivo
  if (!req.headers['device-token']) {
    return rejectConnection(socket, 401, 'Token de dispositivo requerido');
  }

  // Aceptar la conexión WebSocket
  wsServer.handleUpgrade(req, socket, head, (ws) => {
    deviceHandler(ws, req); // El handler ahora extrae el UUID de la URL
  });
}

// Manejador para conexiones de dashboard
function handleDashboardUpgrade(req, socket, head) {
  const { pathname } = new URL(req.url, `http://${req.headers.host}`);
  
  // Verificar token de autorización
  if (!req.headers['authorization']) {
    return rejectConnection(socket, 401, 'Token de autorización requerido');
  }

  // Aceptar la conexión WebSocket
  wsServer.handleUpgrade(req, socket, head, (ws) => {
    dashboardHandler(ws, req); // El handler maneja las rutas internamente
  });
}

// Función para validar UUID
function isValidUuid(uuid) {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuid && uuidRegex.test(uuid);
}

// Función para rechazar conexiones
function rejectConnection(socket, code, message) {
  socket.write(`HTTP/1.1 ${code} ${getStatusText(code)}\r\n`);
  socket.write('Content-Type: text/plain\r\n\r\n');
  socket.write(message);
  socket.destroy();
}

// Función auxiliar para textos de estado HTTP
function getStatusText(statusCode) {
  const statusTexts = {
    400: 'Bad Request',
    401: 'Unauthorized',
    404: 'Not Found'
  };
  return statusTexts[statusCode] || 'Unknown Error';
}

// Iniciar servidor HTTP
server.listen(PORT, () => {
  console.log(`Servidor HTTP en ${BASE_URL}`);
  console.log(`Swagger UI en ${BASE_URL}/api-doc`);
  console.log('Endpoints WebSocket:');
  console.log(`- Dispositivos: ws://${BASE_URL.replace('http://', '')}/device/<uuid>`);
  console.log(`- Dashboards (específico): ws://${BASE_URL.replace('http://', '')}/dashboard/device/<uuid>`);
  console.log(`- Dashboards (global): ws://${BASE_URL.replace('http://', '')}/dashboard/all`);
});