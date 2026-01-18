const express = require('express');
const router = express.Router();
const { register, login, refreshToken, logout } = require('../controllers/authController');
const { platformLogin, platformLogout } = require('../controllers/platformAuthController');
const { authenticateToken } = require('../middleware/auth');
const { validate, authValidation } = require('../middleware/validation');

/**
 * ========================================
 * PLATFORM AUTHENTICATION ROUTES (NEW)
 * ========================================
 * These routes are secured by X-Platform-Secret header
 * and used by the platform backend to authenticate users.
 */

/**
 * @swagger
 * /auth/platform-login:
 *   post:
 *     summary: Authenticate user via platform backend
 *     tags: [Platform Authentication]
 *     security:
 *       - platformSecret: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - platformUserId
 *               - email
 *               - username
 *             properties:
 *               platformUserId:
 *                 type: integer
 *                 description: Platform user ID
 *               email:
 *                 type: string
 *                 format: email
 *               username:
 *                 type: string
 *               profilePicture:
 *                 type: string
 *     responses:
 *       200:
 *         description: Login successful
 *       401:
 *         description: Invalid platform secret
 */
router.post('/platform-login', platformLogin);

/**
 * @swagger
 * /auth/platform-logout:
 *   post:
 *     summary: Logout user via platform backend
 *     tags: [Platform Authentication]
 *     security:
 *       - platformSecret: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - platformUserId
 *             properties:
 *               platformUserId:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Logout successful
 */
router.post('/platform-logout', platformLogout);

/**
 * ========================================
 * LEGACY AUTHENTICATION ROUTES
 * ========================================
 * These routes are DEPRECATED and will be removed.
 * Use platform-login for new integrations.
 */

/**
 * @swagger
 * /auth/register:
 *   post:
 *     summary: Register a new user (DEPRECATED - use platform-login)
 *     deprecated: true
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *               - username
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *                 minLength: 6
 *               username:
 *                 type: string
 *                 minLength: 3
 *     responses:
 *       201:
 *         description: User registered successfully
 *       409:
 *         description: User already exists
 */
router.post('/register', validate(authValidation.register), register);

/**
 * @swagger
 * /auth/login:
 *   post:
 *     summary: Authenticate user (DEPRECATED - use platform-login)
 *     deprecated: true
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Login successful
 *       401:
 *         description: Invalid credentials
 */
router.post('/login', validate(authValidation.login), login);

/**
 * @swagger
 * /auth/refresh:
 *   post:
 *     summary: Refresh access token (DEPRECATED - use platform-login)
 *     deprecated: true
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - refreshToken
 *             properties:
 *               refreshToken:
 *                 type: string
 *     responses:
 *       200:
 *         description: Token refreshed
 *       403:
 *         description: Invalid refresh token
 */
router.post('/refresh',validate(authValidation.refreshToken), refreshToken);

/**
 * @swagger
 * /auth/logout:
 *   post:
 *     summary: Logout user
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Logged out successfully
 */
router.post('/logout', authenticateToken, logout);

// Exchange platform token for chat token
router.post('/exchange-token', async (req, res) => {
  try {
    const { platform_token } = req.body;
    
    // Verify platform token
    const platformPayload = jwt.verify(platform_token, process.env.PLATFORM_JWT_SECRET);
    
    // Find chat user by platform_user_id
    const chatUser = await User.findOne({ 
      where: { platform_user_id: platformPayload.userId } 
    });
    
    if (!chatUser) {
      return res.status(404).json({ message: 'Chat user not found' });
    }
    
    // Generate chat token
    const chatToken = jwt.sign(
      { 
        userId: chatUser.id, 
        email: chatUser.email,
        platformUserId: chatUser.platform_user_id 
      },
      process.env.CHAT_JWT_SECRET,
      { expiresIn: '24h' }
    );
    
    res.json({
      token: chatToken,
      refreshToken: jwt.sign({ userId: chatUser.id }, process.env.CHAT_JWT_SECRET, { expiresIn: '7d' }),
      user: {
        id: chatUser.id,
        email: chatUser.email,
        username: chatUser.username
      }
    });
    
  } catch (error) {
    console.error('Token exchange error:', error);
    res.status(401).json({ message: 'Invalid platform token' });
  }
});

module.exports = router;