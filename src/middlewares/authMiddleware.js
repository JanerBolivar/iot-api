import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { JWT_SECRET } from '../config/envs.js';

// Middleware de autenticación (protección)
export const protect = async (req, res, next) => {
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
      attributes: ['uuid', 'email', 'first_name', 'last_name', 'role', 'status'],
      raw: true
    });

    if (!user) {
      return res.status(401).json({
        error: 'Usuario no encontrado',
        details: 'El token es válido pero el usuario no existe'
      });
    }

    if (!user.status) {
      return res.status(403).json({
        error: 'Usuario inactivo',
        details: 'El usuario está inactivo, por favor contacte al administrador.'
      });
    }

    req.user = {
      uuid: user.uuid,
      email: user.email,
      first_name: user.first_name,
      last_name: user.last_name,
      role: user.role,
      status: user.status
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

// Middleware para autorizar roles
export const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    // Verificar que el usuario esté autenticado primero
    if (!req.user || !req.user.role) {
      return res.status(401).json({
        success: false,
        message: 'Usuario no autenticado'
      });
    }

    // Verificar si el rol del usuario está en los roles permitidos
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Rol ${req.user.role} no tiene permisos para esta acción`
      });
    }

    next();
  };
};

// Exportar por defecto el middleware protect para mantener compatibilidad
export default protect;