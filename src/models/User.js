import { DataTypes } from 'sequelize';
import bcrypt from 'bcryptjs';
import sequelize from '../config/database.js';

const User = sequelize.define('User', {
  uuid: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
    allowNull: false
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  email: {
    type: DataTypes.STRING,
    unique: {
      msg: 'El correo electrónico ya está en uso'
    },
    allowNull: false,
    validate: {
      isEmail: { msg: 'Debe ser un correo electrónico válido' }
    }
  },
  password: {
    type: DataTypes.STRING,
    allowNull: false,
    set(value) {
      const hash = bcrypt.hashSync(value, 10);
      this.setDataValue('password', hash);
    }
  }
});

User.associate = (models) => {
  User.hasMany(models.Device, {
    foreignKey: 'ownerId',
    as: 'devices'
  });
};

export default User;