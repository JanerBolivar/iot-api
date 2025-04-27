import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { JWT_SECRET } from '../config/envs.js';

export default async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ 
        error: 'Acceso denegado',
        details: 'Token no proporcionado en el header Authorization'
      });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    
    const user = await User.findByPk(decoded.uuid, {
      attributes: ['uuid', 'email', 'name'],
      raw: true
    });

    if (!user) {
      return res.status(401).json({ 
        error: 'Usuario no encontrado',
        details: 'El token es válido pero el usuario no existe'
      });
    }

    req.user = {
      uuid: user.uuid,
      email: user.email,
      name: user.name
    };
    next();
    
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        error: 'Token expirado',
        details: 'El token ha caducado, por favor inicie sesión nuevamente'
      });
    }
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ 
        error: 'Token inválido',
        details: 'El token proporcionado no es válido'
      });
    }

    // Para cualquier otro error
    console.error('Error en middleware de autenticación:', error);
    res.status(500).json({ 
      error: 'Error de autenticación',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};