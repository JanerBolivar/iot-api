import { DataTypes } from 'sequelize';
import bcrypt from 'bcryptjs';
import sequelize from '../config/database.js';

const User = sequelize.define('User', {
  name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  email: {
    type: DataTypes.STRING,
    unique: {
      name: 'email',
      msg: 'El correo electrónico ya está en uso'
    },
    allowNull: false,
    validate: {
      isEmail: {
        msg: 'Debe ser un correo electrónico válido'
      },
      notEmpty: {
        msg: 'El correo electrónico no puede estar vacío'
      }
    }
  },
  password: {
    type: DataTypes.STRING,
    allowNull: false,
    set(value) {
      const hash = bcrypt.hashSync(value, 10);
      this.setDataValue('password', hash);
    },
  },
});

export default User;