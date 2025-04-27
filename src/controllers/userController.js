import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import { JWT_SECRET, JWT_EXPIRES_IN } from '../config/envs.js';

// Registro de usuario
const register = async (req, res) => {
  try {
    const { name, email, password } = req.body;
    const user = await User.create({ name, email, password });
    res.status(201).json({ id: user.id, name: user.name, email: user.email });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Login (genera JWT)
const login = async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ where: { email } });

  if (!user || !(await bcrypt.compare(password, user.password))) {
    return res.status(401).json({ error: 'Credenciales inválidas' });
  }

  const accessToken = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
  res.json({ accessToken });
};

// Obtener perfil (requiere JWT)
const getProfile = async (req, res) => {
  const user = await User.findByPk(req.user.id, { attributes: { exclude: ['password'] } });
  res.json(user);
};

// Actualizar contraseña (requiere autenticación)
const updatePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await User.findByPk(req.user.id);

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
const requestPasswordReset = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ where: { email } });

    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    const resetToken = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: '15m' });
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
const resetPassword = async (req, res) => {
  try {
    const { token, newPassword } = req.body;
    
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await User.findByPk(decoded.id);

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

export default { 
  register, 
  login, 
  getProfile, 
  updatePassword,
  requestPasswordReset,
  resetPassword
};