import { Router } from 'express';
import {
    register,
    login,
    getProfile,
    updatePassword,
    requestPasswordReset,
    resetPassword,
    getAllUsers,
    getUserById,
    updateUser,
    deleteUser,
    activateUser
} from '../controllers/userController.js';
import { protect, authorize } from '../middlewares/authMiddleware.js';

const router = Router();

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
 *               first_name:
 *                 type: string
 *                 example: "Juan"
 *               last_name:
 *                 type: string
 *                 example: "Pérez"
 *               email:
 *                 type: string
 *                 example: "juan.perez@example.com"
 *               password:
 *                 type: string
 *                 format: password
 *                 example: "password123"
 *     responses:
 *       201:
 *         description: Usuario registrado
 */
router.post('/register', register);

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
router.post('/login', login);

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
router.post('/request-password-reset', requestPasswordReset);

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
router.post('/reset-password', resetPassword);


// Middleware de protección
router.use(protect);


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
router.get('/profile', getProfile);

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
router.put('/update-password', updatePassword);


// Middleware de autorización
router.use(authorize('admin'));

// Rutas de administración
/**
 * @swagger
 * /api/user/users:
 *   get:
 *     summary: Obtener todos los usuarios
 *     tags: [Admin]
 *     responses:
 *       200:
 *         description: Lista de usuarios
 */
router.get('/users', getAllUsers);

/**
 * @swagger
 * /api/user/{id}:
 *   get:
 *     summary: Obtener usuario por ID
 *     tags: [Admin]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: ID del usuario
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Usuario encontrado
 *       404:
 *         description: Usuario no encontrado
 */
router.get('/:id', getUserById);

/**
 * @swagger
 * /api/user/{id}:
 *   put:
 *     summary: Actualizar usuario por ID
 *     tags: [Admin]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: ID del usuario
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               first_name:
 *                 type: string
 *                 example: "Juan"
 *               last_name:
 *                 type: string
 *                 example: "Pérez"
 *               email:
 *                 type: string
 *                 example: "juan.perez@example.com"
 *               role:
 *                 type: string
 *                 example: "admin"
 *               status:
 *                 type: boolean
 *                 example: true
 *     responses:
 *       200:
 *         description: Usuario actualizado
 *       404:
 *         description: Usuario no encontrado
 */
router.put('/:id', updateUser);

/**
 * @swagger
 * /api/user/{id}:
 *   delete:
 *     summary: Eliminar usuario por ID
 *     tags: [Admin]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: ID del usuario
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Usuario eliminado
 *       404:
 *         description: Usuario no encontrado
 */
router.delete('/:id', deleteUser);

/**
 * @swagger
 * /api/user/{id}/activate:
 *   patch:
 *     summary: Activar usuario por ID
 *     tags: [Admin]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: ID del usuario
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Usuario activado
 *       404:
 *         description: Usuario no encontrado
 */
router.patch('/:id/activate', activateUser);


export default router;