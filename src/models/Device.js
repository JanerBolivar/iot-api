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
  status: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  token: {
    type: DataTypes.STRING(64),
    unique: true
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
    beforeCreate: (device) => {
        device.token = crypto.randomBytes(32).toString('hex');
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