/**
 * Session Routes
 * 
 * Firebase-based authentication endpoints.
 * These routes replace the legacy JWT-based authentication.
 * 
 * POST /api/auth/session - Create session (login)
 * GET /api/auth/session - Get current session
 * DELETE /api/auth/session - End session (logout)
 */

const express = require('express');
const router = express.Router();
const { createSession, getSession, deleteSession } = require('../controllers/sessionController');
const { firebaseAuthWithAutoCreate, requireFirebaseUser } = require('../middleware/firebaseAuth');

/**
 * @swagger
 * /auth/session:
 *   post:
 *     summary: Create or retrieve session for Firebase-authenticated user
 *     tags: [Session]
 *     security:
 *       - firebaseAuth: []
 *     responses:
 *       200:
 *         description: Session created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 user:
 *                   type: object
 *                 chat:
 *                   type: object
 *                   properties:
 *                     accessToken:
 *                       type: string
 *                     refreshToken:
 *                       type: string
 *                     userId:
 *                       type: string
 *       401:
 *         description: Invalid or missing Firebase token
 *       403:
 *         description: User is banned
 */
router.post('/session', firebaseAuthWithAutoCreate, createSession);

/**
 * @swagger
 * /auth/session:
 *   get:
 *     summary: Get current session info
 *     tags: [Session]
 *     security:
 *       - firebaseAuth: []
 *     responses:
 *       200:
 *         description: Current session info
 *       401:
 *         description: Not authenticated
 */
router.get('/session', requireFirebaseUser, getSession);

/**
 * @swagger
 * /auth/session:
 *   delete:
 *     summary: End current session (logout)
 *     tags: [Session]
 *     security:
 *       - firebaseAuth: []
 *     responses:
 *       200:
 *         description: Session ended successfully
 */
router.delete('/session', requireFirebaseUser, deleteSession);

module.exports = router;
