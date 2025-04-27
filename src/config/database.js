import Sequelize from 'sequelize';
import { DB_CREDENTIALS } from '../config/envs.js';

const sequelize = new Sequelize(DB_CREDENTIALS.DATABASE, DB_CREDENTIALS.USER, DB_CREDENTIALS.PASSWORD, {
  host: DB_CREDENTIALS.HOST,
  port: DB_CREDENTIALS.PORT,
  dialect: DB_CREDENTIALS.DIALECT,
  logging: false,
});

// Testear conexión
(async () => {
  try {
    await sequelize.authenticate();
    console.log('Conexión a MySQL establecida.');
    await sequelize.sync({ force: false });
  } catch (error) {
    console.error('Error de conexión a MySQL:', error);
  }
})();

export default sequelize;