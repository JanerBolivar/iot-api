import jwt from 'jsonwebtoken';
import Device from '../models/Device.js';
import { JWT_SECRET } from '../config/envs.js';

export default async (req, res, next) => {
  try {
    // Obtener token del header
    const token = req.header('Device-Token') || req.query.deviceToken;
    
    if (!token) {
      return res.status(401).json({ 
        error: 'Token de dispositivo requerido',
        code: 'DEVICE_TOKEN_MISSING'
      });
    }

    // Verificar token con el almacenado en BD
    const device = await Device.findOne({ 
      where: { token },
      attributes: ['uuid', 'name', 'ownerId']
    });

    if (!device) {
      return res.status(401).json({ 
        error: 'Dispositivo no autorizado',
        code: 'DEVICE_NOT_FOUND'
      });
    }

    // Adjuntar información del dispositivo al request
    req.device = {
      uuid: device.uuid,
      name: device.name,
      ownerId: device.ownerId
    };

    next();
  } catch (error) {
    console.error('Error en autenticación de dispositivo:', error);
    res.status(500).json({ 
      error: 'Error de autenticación',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};