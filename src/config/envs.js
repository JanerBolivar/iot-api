import dotenv from 'dotenv';

dotenv.config();

// Credenciales de la base de datos
export const DB_CREDENTIALS = {
  DATABASE: process.env.DB_DATABASE || 'iot_db',
  USER: process.env.DB_USER || 'root',
  PASSWORD: process.env.DB_PASSWORD || '',
  HOST: process.env.DB_HOST || 'localhost',
  PORT: process.env.DB_PORT || 3306,
  DIALECT: process.env.DB_DIALECT || 'mysql',
};

// Secreto de JWT
export const JWT_SECRET = process.env.JWT_SECRET;
export const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '1h';

// Puerto del servidor
export const PORT = process.env.PORT || 3000;

// Puerto del servidor WebSocket
export const WS_PORT = process.env.WS_PORT || 8080;