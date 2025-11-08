import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const DeviceData = sequelize.define('DeviceData', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  type: {
    type: DataTypes.ENUM('Level', 'Valve'),
    allowNull: false
  },
  valve: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  value: {
    type: DataTypes.STRING,
    allowNull: false
  },
  deviceUuid: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'Devices',
      key: 'uuid'
    }
  }
});

// Asociación simplificada
DeviceData.associate = function (models) {
  this.belongsTo(models.Device, {
    foreignKey: 'deviceUuid',
    targetKey: 'uuid',
    as: 'device'
  });
};

export default DeviceData;