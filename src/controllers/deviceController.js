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
    // Verificación adicional
    if (!req.user?.uuid) {
      return res.status(400).json({ error: "Usuario no identificado correctamente" });
    }

    const device = await Device.create({
      name: req.body.name,
      status: req.body.status || true,
      ownerId: req.user.uuid
    });

    res.status(201).json({
      uuid: device.uuid,
      name: device.name,
      status: device.status,
      createdAt: device.createdAt
    });
  } catch (error) {
    console.error("Error detallado:", error);
    res.status(400).json({
      error: "Error al crear dispositivo",
      details: error.errors?.map(e => e.message) || error.message
    });
  }
};

// Obtener todos los dispositivos del usuario
const getUserDevices = async (req, res) => {
  const devices = await Device.findAll({
    where: { ownerId: req.user.uuid },
    attributes: { exclude: ['token'] }
  });
  res.json(devices);
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