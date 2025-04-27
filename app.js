import express from "express";
import cors from "cors";
import swaggerUI from "swagger-ui-express";
import swaggerSpec from "./src/docs/swagger.js";
import { PORT } from "./src/config/envs.js";
import userRouter from "./src/routes/userRoutes.js";
import deviceRouter from "./src/routes/deviceRoutes.js";

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());

// Swagger UI
app.use('/api-doc', swaggerUI.serve, swaggerUI.setup(swaggerSpec));

// Rutas
app.use('/api/user', userRouter);
app.use('/api/device', deviceRouter);

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`Servidor en http://localhost:${PORT}`);
  console.log(`Swagger UI en http://localhost:${PORT}/api-doc`);
});