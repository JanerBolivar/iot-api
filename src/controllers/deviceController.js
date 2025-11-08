import Device from '../models/Device.js';

// Middleware para validar ownership
const checkOwnership = async (req, res, next) => {
  const device = await Device.findByPk(req.params.id);
  if (!device) return res.status(404).json({ error: 'Dispositivo no encontrado' });
  if (device.ownerId !== req.user.uuid) {
    return res.status(403).json({ error: 'No tienes permisos sobre este dispositivo' });
  }
  req.device = device;
  next();
};

// Crear dispositivo (asociado al usuario logueado)
const createDevice = async (req, res) => {
  try {
    if (!req.user?.uuid) {
      return res.status(400).json({ error: "Usuario no identificado" });
    }

    const device = await Device.create({
      name: req.body.name,
      location: req.body.location,
      status: req.body.status || true,
      ownerId: req.user.uuid
    });

    res.status(201).json({
      uuid: device.uuid,
      name: device.name,
      location: device.location,
      token: device.token,
      status: device.status,
      createdAt: device.createdAt
    });
  } catch (error) {
    console.error("Error al crear dispositivo:", error);
    res.status(400).json({
      error: "Error al crear dispositivo",
      details: error.errors?.map(e => e.message) || error.message
    });
  }
};

// Obtener todos los dispositivos del usuario
const getUserDevices = async (req, res) => {
  try {
    const devices = await Device.findAll({
      where: { ownerId: req.user.uuid }
    });
    
    if (!devices || devices.length === 0) {
      return res.status(404).json({ message: 'No se encontraron dispositivos' });
    }
    
    res.json(devices);
  } catch (error) {
    console.error("Error al obtener dispositivos:", error);
    res.status(500).json({ 
      error: "Error del servidor",
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Actualizar dispositivo
const updateDevice = async (req, res) => {
  try {
    await req.device.update(req.body);
    res.json(req.device);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Eliminar dispositivo
const deleteDevice = async (req, res) => {
  await req.device.destroy();
  res.status(204).send();
};

export default {
  createDevice,
  getUserDevices,
  updateDevice,
  deleteDevice,
  checkOwnership
};