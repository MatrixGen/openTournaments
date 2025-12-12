const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const channelController = require('../controllers/channelController');
const { validate, channelValidation } = require('../middleware/validation');

/**
 * @swagger
 * /channels:
 *   get:
 *     summary: Get user's channels
 *     tags: [Channels]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *     responses:
 *       200:
 *         description: User's channels retrieved
 */
router.get('/', authenticateToken, channelController.getUserChannels);

/**
 * @swagger
 * /channels:
 *   post:
 *     summary: Create a new channel
 *     tags: [Channels]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - type
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               type:
 *                 type: string
 *                 enum: [direct, group, channel]
 *               isPrivate:
 *                 type: boolean
 *                 default: false
 *               participantIds:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       201:
 *         description: Channel created
 */

router.post('/', authenticateToken, validate(channelValidation.create), channelController.createChannel);
/**
 * @swagger
 * /channels/{channelId}:
 *   get:
 *     summary: Get channel details
 *     tags: [Channels]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: channelId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Channel details retrieved
 *       403:
 *         description: Not a member of this channel
 */
router.get('/:channelId', authenticateToken, channelController.getChannel);

/**
 * @swagger
 * /channels/{channelId}:
 *   put:
 *     summary: Update channel
 *     tags: [Channels]
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
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *     responses:
 *       200:
 *         description: Channel updated
 */
router.put('/:channelId', authenticateToken, channelController.updateChannel);

/**
 * @swagger
 * /channels/{channelId}/join:
 *   post:
 *     summary: Join a channel
 *     tags: [Channels]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: channelId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Joined channel successfully
 */
router.post('/:channelId/join', authenticateToken, channelController.joinChannel);

/**
 * @swagger
 * /channels/{channelId}/leave:
 *   post:
 *     summary: Leave a channel
 *     tags: [Channels]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: channelId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Left channel successfully
 */
router.post('/:channelId/leave', authenticateToken, channelController.leaveChannel);

/**
 * @swagger
 * /channels/{channelId}/members:
 *   get:
 *     summary: Get channel members
 *     tags: [Channels]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: channelId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Channel members retrieved
 */
router.get('/:channelId/members', authenticateToken, channelController.getChannelMembers);

module.exports = router;