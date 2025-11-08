import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';
import crypto from 'crypto';

const Device = sequelize.define('Device', {
  uuid: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      len: [3, 50]
    }
  },
  location: {
    type: DataTypes.JSON,
    allowNull: false,
    defaultValue: {
      bloque: null,
      piso: null,
      laboratorio: null,
      ubicacion: null
    },
    get() {
      const rawValue = this.getDataValue('location');
      if (typeof rawValue === 'string') {
        try {
          return JSON.parse(rawValue);
        } catch (e) {
          console.error("Error al parsear JSON de 'location':", e);
          return rawValue;
        }
      }
      return rawValue;
    },
    set(value) {
      this.setDataValue('location', JSON.stringify(value));
    }
  },
  status: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  token: {
    type: DataTypes.STRING(64),
    unique: true,
    allowNull: false
  },
  ownerId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'Users',
      key: 'uuid'
    }
  }
}, {
  hooks: {
    beforeValidate: (device) => {
      if (!device.token) {
        device.token = crypto.randomBytes(32).toString('hex');
      }
    }
  }
});

Device.associate = (models) => {
  Device.belongsTo(models.User, {
    foreignKey: 'ownerId',
    as: 'owner'
  });
};

export default Device;