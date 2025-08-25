import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import { JWT_SECRET, JWT_EXPIRES_IN } from '../config/envs.js';
import { Op } from 'sequelize';

// Registro de usuario
export const register = async (req, res) => {
  try {
    const { first_name, last_name, email, password } = req.body;

    if (!first_name || !last_name || !email || !password) {
      return res.status(400).json({ error: 'Todos los campos son obligatorios' });
    }

    const user = await User.create({ first_name, last_name, email, password });
    res.status(201).json({
      message: 'Usuario registrado exitosamente',
      user: {
        uuid: user.uuid,
        first_name: user.first_name,
        last_name: user.last_name,
        role: user.role,
        email: user.email
      },
      token: jwt.sign({ uuid: user.uuid }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN })
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Login (genera JWT)
export const login = async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ where: { email } });

  if (!user || !(await bcrypt.compare(password, user.password))) {
    return res.status(401).json({ error: 'Credenciales inválidas' });
  }

  if (!user.status) {
    return res.status(403).json({ error: 'Usuario inactivo' });
  }

  const token = jwt.sign({ uuid: user.uuid }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
  res.json({
    message: 'Inicio de sesión exitoso',
    user: {
      uuid: user.uuid,
      first_name: user.first_name,
      last_name: user.last_name,
      role: user.role,
      status: user.status,
      email: user.email
    },
    token
  });
};

// Obtener perfil (requiere JWT)
export const getProfile = async (req, res) => {
  const user = await User.findByPk(req.user.uuid, { attributes: { exclude: ['password'] } });
  res.json(user);
};

// Actualizar contraseña (requiere autenticación)
export const updatePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await User.findByPk(req.user.uuid);

    if (!user || !(await bcrypt.compare(currentPassword, user.password))) {
      return res.status(401).json({ error: 'Contraseña actual incorrecta' });
    }

    user.password = newPassword;
    await user.save();

    res.json({ message: 'Contraseña actualizada exitosamente' });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Recuperar contraseña (envío de token por email)
export const requestPasswordReset = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ where: { email } });

    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    const resetToken = jwt.sign({ uuid: user.uuid, email: user.email, name: user.name }, JWT_SECRET, { expiresIn: '15m' });
    // En producción, aquí enviarías el token por email
    res.json({
      message: 'Si el email existe, se enviarán instrucciones',
      resetToken: resetToken
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Resetear contraseña con token válido
export const resetPassword = async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await User.findByPk(decoded.uuid);

    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    user.password = newPassword;
    await user.save();

    res.json({ message: 'Contraseña restablecida exitosamente' });
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'El token ha expirado' });
    }
    res.status(400).json({ error: 'Token inválido' });
  }
};

// Obtener todos los usuarios (con paginación)
export const getAllUsers = async (req, res) => {
  try {
    const { page = 1, limit = 10, search = '' } = req.query;
    const offset = (page - 1) * limit;

    const whereCondition = {};
    if (search) {
      whereCondition[Op.or] = [
        { first_name: { [Op.iLike]: `%${search}%` } },
        { last_name: { [Op.iLike]: `%${search}%` } },
        { email: { [Op.iLike]: `%${search}%` } }
      ];
    }

    const { count, rows: users } = await User.findAndCountAll({
      where: whereCondition,
      attributes: ['uuid', 'first_name', 'last_name', 'email', 'role', 'status', 'createdAt'],
      limit: parseInt(limit),
      offset: offset,
      order: [['createdAt', 'DESC']]
    });

    res.json({
      success: true,
      data: users,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(count / limit),
        totalItems: count,
        itemsPerPage: parseInt(limit)
      }
    });

  } catch (error) {
    console.error('Error al obtener usuarios:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

// Obtener un usuario por UUID
export const getUserById = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findOne({
      where: { uuid: id },
      attributes: ['uuid', 'first_name', 'last_name', 'email', 'role', 'status', 'createdAt', 'updatedAt']
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }

    res.json({
      success: true,
      data: user
    });

  } catch (error) {
    console.error('Error al obtener usuario:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

// Actualizar un usuario
export const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { first_name, last_name, email, role, status } = req.body;

    const user = await User.findOne({ where: { uuid: id } });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }

    // Verificar si el email ya existe (excluyendo al usuario actual)
    if (email && email !== user.email) {
      const existingUser = await User.findOne({ where: { email } });
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: 'El correo electrónico ya está en uso'
        });
      }
    }

    // Campos permitidos para actualizar
    const allowedUpdates = {};
    if (first_name !== undefined) allowedUpdates.first_name = first_name;
    if (last_name !== undefined) allowedUpdates.last_name = last_name;
    if (email !== undefined) allowedUpdates.email = email;
    if (role !== undefined) allowedUpdates.role = role;
    if (status !== undefined) allowedUpdates.status = status;

    await user.update(allowedUpdates);

    res.json({
      success: true,
      message: 'Usuario actualizado correctamente',
      data: {
        uuid: user.uuid,
        first_name: user.first_name,
        last_name: user.last_name,
        email: user.email,
        role: user.role,
        status: user.status
      }
    });

  } catch (error) {
    console.error('Error al actualizar usuario:', error);

    if (error.name === 'SequelizeValidationError') {
      return res.status(400).json({
        success: false,
        message: 'Datos de entrada inválidos',
        errors: error.errors.map(err => err.message)
      });
    }

    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

// "Eliminar" usuario (cambiar estado a false)
export const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findOne({ where: { uuid: id } });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }

    // No permitir que un administrador se elimine a sí mismo
    if (user.uuid === req.user.uuid) {
      return res.status(400).json({
        success: false,
        message: 'No puedes desactivar tu propia cuenta'
      });
    }

    await user.update({ status: false });

    res.json({
      success: true,
      message: 'Usuario desactivado correctamente'
    });

  } catch (error) {
    console.error('Error al desactivar usuario:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

// Reactivar usuario
export const activateUser = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findOne({ where: { uuid: id } });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }

    await user.update({ status: true });

    res.json({
      success: true,
      message: 'Usuario reactivado correctamente'
    });

  } catch (error) {
    console.error('Error al reactivar usuario:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};