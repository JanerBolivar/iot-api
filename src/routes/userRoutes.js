import { Router } from 'express';
import userController from '../controllers/userController.js';
import authMiddleware from '../middlewares/authMiddleware.js';

const userRouter = Router();

/**
 * @swagger
 * /api/user/register:
 *   post:
 *     summary: Registrar un nuevo usuario
 *     tags: [Users]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       201:
 *         description: Usuario registrado
 */
userRouter.post('/register', userController.register);

/**
 * @swagger
 * /api/user/login:
 *   post:
 *     summary: Iniciar sesión
 *     tags: [Users]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Token JWT generado
 */
userRouter.post('/login', userController.login);

/**
 * @swagger
 * /api/user/profile:
 *   get:
 *     summary: Obtener perfil del usuario
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Perfil del usuario
 */
userRouter.get('/profile', authMiddleware, userController.getProfile);

/**
 * @swagger
 * /api/user/update-password:
 *   put:
 *     summary: Actualizar contraseña del usuario
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - currentPassword
 *               - newPassword
 *             properties:
 *               currentPassword:
 *                 type: string
 *                 format: password
 *                 description: Contraseña actual
 *                 example: "oldPassword123"
 *               newPassword:
 *                 type: string
 *                 format: password
 *                 description: Nueva contraseña
 *                 example: "newSecurePassword456"
 *     responses:
 *       200:
 *         description: Contraseña actualizada exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *       401:
 *         description: Contraseña actual incorrecta o no autorizado
 *       400:
 *         description: Error en la solicitud
 */
userRouter.put('/update-password', authMiddleware, userController.updatePassword);

/**
 * @swagger
 * /api/user/request-password-reset:
 *   post:
 *     summary: Solicitar recuperación de contraseña
 *     tags: [Users]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 description: Email del usuario
 *                 example: "usuario@example.com"
 *     responses:
 *       200:
 *         description: Si el email existe, se enviarán instrucciones
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 resetToken:
 *                   type: string
 *                   description: Solo en desarrollo - token para resetear
 *       404:
 *         description: Usuario no encontrado
 */
userRouter.post('/request-password-reset', userController.requestPasswordReset);

/**
 * @swagger
 * /api/user/reset-password:
 *   post:
 *     summary: Restablecer contraseña con token válido
 *     tags: [Users]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - token
 *               - newPassword
 *             properties:
 *               token:
 *                 type: string
 *                 description: Token recibido por email
 *               newPassword:
 *                 type: string
 *                 format: password
 *                 description: Nueva contraseña
 *                 example: "newSecurePassword456"
 *     responses:
 *       200:
 *         description: Contraseña restablecida exitosamente
 *       401:
 *         description: Token expirado o inválido
 *       400:
 *         description: Error en la solicitud
 */
userRouter.post('/reset-password', userController.resetPassword);

export default userRouter;