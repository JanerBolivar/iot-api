import swaggerJSDoc from 'swagger-jsdoc';
import { dirname } from 'path';
import { fileURLToPath } from 'url';
import schemas from './swaggerSchemas.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'IoT API',
      version: '1.0.0',
      description: 'API para gestión de usuarios y dispositivos IoT',
    },
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
      schemas: schemas
    },
    security: [{ bearerAuth: [] }],
  },
  apis: [`${__dirname}/../routes/*.js`],
};

const swaggerSpec = swaggerJSDoc(options);
export default swaggerSpec;