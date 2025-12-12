const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const messageController = require('../controllers/messageController');
const { xss } = require('../middleware/security');


/**
 * @swagger
 * /messages/{channelId}/messages:
 *   get:
 *     summary: Get channel messages
 *     tags: [Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: channelId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: before
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Get messages before this timestamp
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *     responses:
 *       200:
 *         description: Messages retrieved
 *       403:
 *         description: Not a member of this channel
 */
router.get('/:channelId/messages', authenticateToken, messageController.getChannelMessages);

/**
 * @swagger
 * /messages/{channelId}/messages:
 *   post:
 *     summary: Send a message
 *     tags: [Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: channelId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - content
 *             properties:
 *               content:
 *                 type: string
 *               replyTo:
 *                 type: string
 *                 description: ID of message to reply to
 *     responses:
 *       201:
 *         description: Message sent
 */
router.post(
  '/:channelId/messages',
  authenticateToken,
  xss(), // sanitize input
  messageController.sendMessage
);


/**
 * @swagger
 * /messages/{channelId}/messages/read:
 *   post:
 *     summary: Mark messages as read
 *     tags: [Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: channelId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - messageIds
 *             properties:
 *               messageIds:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       200:
 *         description: Messages marked as read
 */
router.post('/:channelId/messages/read', authenticateToken, messageController.markAsRead);

module.exports = router;