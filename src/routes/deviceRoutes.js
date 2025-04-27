import { Router } from 'express';
import deviceController from '../controllers/deviceController.js';
import authMiddleware from '../middlewares/authMiddleware.js';

const router = Router();

router.use(authMiddleware);

/**
 * @swagger
 * tags:
 *   name: Devices
 *   description: Gestión de dispositivos IoT
 */

/**
 * @swagger
 * /api/device/create-device:
 *   post:
 *     summary: Crear un nuevo dispositivo
 *     tags: [Devices]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/DeviceInput'
 *     responses:
 *       201:
 *         description: Dispositivo creado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Device'
 */
router.post('/create-device', deviceController.createDevice);

/**
 * @swagger
 * /api/device/device-list:
 *   get:
 *     summary: Obtener todos los dispositivos del usuario
 *     tags: [Devices]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de dispositivos
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Device'
 */
router.get('/device-list', deviceController.getUserDevices);

/**
 * @swagger
 * /api/device/update-device/{id}:
 *   put:
 *     summary: Actualizar un dispositivo
 *     tags: [Devices]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/DeviceInput'
 *     responses:
 *       200:
 *         description: Dispositivo actualizado
 *       403:
 *         description: No eres el propietario
 *       404:
 *         description: Dispositivo no encontrado
 */
router.put('/update-device/:id', deviceController.checkOwnership, deviceController.updateDevice);

/**
 * @swagger
 * /api/device/delete-device/{id}:
 *   delete:
 *     summary: Eliminar un dispositivo
 *     tags: [Devices]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       204:
 *         description: Dispositivo eliminado
 *       403:
 *         description: No eres el propietario
 */
router.delete('/delete-device/:id', deviceController.checkOwnership, deviceController.deleteDevice);

export default router;