import express from "express";
import cors from "cors";
import swaggerUI from "swagger-ui-express";
import { createServer } from "http";
import { WebSocketServer } from "ws";

import swaggerSpec from "./src/docs/swagger.js";
import { PORT, BASE_URL } from "./src/config/envs.js";
import userRouter from "./src/routes/userRoutes.js";
import deviceRouter from "./src/routes/deviceRoutes.js";
import { deviceHandler, handleDashboardConnection } from "./src/config/websocket.js";

const app = express();
const server = createServer(app);

// Configuración WebSocket unificada
const wsServer = new WebSocketServer({ noServer: true });

// Upgrade HTTP → WebSocket
server.on('upgrade', (req, socket, head) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const pathname = url.pathname;
  
  // Expresión regular para validar formato UUID
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  
  // Extraer la ruta base y el UUID si existe
  const deviceMatch = pathname.match(/^\/device(?:\/([^\/]+))?$/);
  const dashboardMatch = pathname.match(/^\/dashboard(?:\/([^\/]+))?$/);
  
  let deviceUuid = null;
  
  if (deviceMatch) {
    // Si hay un UUID en la ruta, verificamos que tenga el formato correcto
    if (deviceMatch[1]) {
      if (!uuidRegex.test(deviceMatch[1])) {
        socket.write('HTTP/1.1 400 Bad Request\r\n' +
                    'Content-Type: text/plain\r\n' +
                    '\r\n' +
                    'UUID de dispositivo inválido');
        socket.destroy();
        return;
      }
      deviceUuid = deviceMatch[1];
    }
    
    // Verificar que el token del dispositivo esté presente
    if (!req.headers['device-token']) {
      socket.write('HTTP/1.1 401 Unauthorized\r\n' +
                   'Content-Type: text/plain\r\n' +
                   '\r\n' +
                   'Token de dispositivo requerido');
      socket.destroy();
      return;
    }
    
    wsServer.handleUpgrade(req, socket, head, (ws) => {
      deviceHandler(ws, req, deviceUuid);
    });
  } 
  else if (dashboardMatch) {
    // Si hay un UUID en la ruta, verificamos que tenga el formato correcto
    if (dashboardMatch[1]) {
      if (!uuidRegex.test(dashboardMatch[1])) {
        socket.write('HTTP/1.1 400 Bad Request\r\n' +
                    'Content-Type: text/plain\r\n' +
                    '\r\n' +
                    'UUID de dispositivo inválido');
        socket.destroy();
        return;
      }
      deviceUuid = dashboardMatch[1];
    }
    
    // Verificar que el token de autorización esté presente
    if (!req.headers['authorization']) {
      socket.write('HTTP/1.1 401 Unauthorized\r\n' +
                   'Content-Type: text/plain\r\n' +
                   '\r\n' +
                   'Token de autorización requerido');
      socket.destroy();
      return;
    }
    
    wsServer.handleUpgrade(req, socket, head, (ws) => {
      handleDashboardConnection(ws, req, deviceUuid);
    });
  } 
  else {
    socket.destroy();
  }
});

// Middlewares
app.use(cors());
app.use(express.json());

// Swagger UI
app.use('/api-doc', swaggerUI.serve, swaggerUI.setup(swaggerSpec));

// Rutas
app.use('/api/user', userRouter);
app.use('/api/device', deviceRouter);

// Iniciar servidor HTTP
server.listen(PORT, () => {
  console.log(`Servidor HTTP en ${BASE_URL}`);
  console.log(`Swagger UI en ${BASE_URL}/api-doc`);
  console.log(`WebSocket disponible en ws://${BASE_URL.replace('http://', '')}`);
});