const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const messageController = require('../controllers/messageController');
const { xss } = require('../middleware/security');
const { upload, uploadUtils, validateUpload, handleUpload } = require('../middleware/upload');

/**
 * @swagger
 * components:
 *   schemas:
 *     Message:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         content:
 *           type: string
 *         type:
 *           type: string
 *           enum: [text, image, video, audio, file, system]
 *           default: text
 *         channelId:
 *           type: string
 *           format: uuid
 *         userId:
 *           type: string
 *           format: uuid
 *         replyTo:
 *           type: string
 *           format: uuid
 *         mediaUrl:
 *           type: string
 *         mediaMetadata:
 *           type: object
 *         isEdited:
 *           type: boolean
 *         editedAt:
 *           type: string
 *           format: date-time
 *         isDeleted:
 *           type: boolean
 *         deletedAt:
 *           type: string
 *           format: date-time
 *         deletedBy:
 *           type: string
 *           format: uuid
 *         isModerated:
 *           type: boolean
 *         moderationFlags:
 *           type: array
 *           items:
 *             type: string
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *     Attachment:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         url:
 *           type: string
 *         thumbnailUrl:
 *           type: string
 *         type:
 *           type: string
 *           enum: [image, video, audio, file]
 *         fileName:
 *           type: string
 *         fileSize:
 *           type: integer
 *         mimeType:
 *           type: string
 *     Reaction:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         emoji:
 *           type: string
 *         userId:
 *           type: string
 *           format: uuid
 *         createdAt:
 *           type: string
 *           format: date-time
 *     SendMessageRequest:
 *       type: object
 *       properties:
 *         content:
 *           type: string
 *           description: Message content or caption for media
 *         type:
 *           type: string
 *           enum: [text, image, video, audio, file]
 *           default: text
 *         replyTo:
 *           type: string
 *           format: uuid
 *           description: ID of message to reply to
 *         mediaCaption:
 *           type: string
 *           description: Caption for media message
 *     MarkAsReadRequest:
 *       type: object
 *       properties:
 *         messageIds:
 *           type: array
 *           items:
 *             type: string
 *             format: uuid
 *     EditMessageRequest:
 *       type: object
 *       required:
 *         - content
 *       properties:
 *         content:
 *           type: string
 *           description: New message content
 *     ReactionRequest:
 *       type: object
 *       required:
 *         - emoji
 *       properties:
 *         emoji:
 *           type: string
 *           description: Emoji character or shortcode
 */

/**
 * @swagger
 * /messages/{channelId}/messages:
 *   get:
 *     summary: Get messages from a channel with pagination
 *     tags: [Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: channelId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Channel ID
 *       - in: query
 *         name: before
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Get messages before this timestamp (for pagination)
 *       - in: query
 *         name: after
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Get messages after this timestamp (for newer messages)
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *           maximum: 100
 *         description: Number of messages to retrieve
 *       - in: query
 *         name: includeAttachments
 *         schema:
 *           type: boolean
 *           default: true
 *         description: Include attachment data in response
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [text, image, video, audio, file, system]
 *         description: Filter messages by type
 *     responses:
 *       200:
 *         description: Messages retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     messages:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Message'
 *                     hasMore:
 *                       type: boolean
 *                 message:
 *                   type: string
 *       403:
 *         description: Not a member of this channel
 *       500:
 *         description: Server error
 */
router.get('/:channelId/messages', authenticateToken, messageController.getChannelMessages);

/**
 * @swagger
 * /messages/{channelId}/messages/unread-count:
 *   get:
 *     summary: Get unread message count for a channel
 *     tags: [Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: channelId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Channel ID
 *     responses:
 *       200:
 *         description: Unread count retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     unreadCount:
 *                       type: integer
 *                 message:
 *                   type: string
 *       403:
 *         description: Not a member of this channel
 *       500:
 *         description: Server error
 */
router.get('/:channelId/messages/unread-count', authenticateToken, messageController.getUnreadCount);

/**
 * @swagger
 * /messages/{channelId}/messages:
 *   post:
 *     summary: Send a message (text or media)
 *     tags: [Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: channelId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Channel ID
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               content:
 *                 type: string
 *                 description: Message content or caption for media
 *               type:
 *                 type: string
 *                 enum: [text, image, video, audio, file]
 *                 default: text
 *               replyTo:
 *                 type: string
 *                 format: uuid
 *               mediaCaption:
 *                 type: string
 *               media:
 *                 type: string
 *                 format: binary
 *                 description: Media file (image, video, audio, or document)
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/SendMessageRequest'
 *     responses:
 *       201:
 *         description: Message sent successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     message:
 *                       $ref: '#/components/schemas/Message'
 *                     moderation:
 *                       type: object
 *                       properties:
 *                         wasFiltered:
 *                           type: boolean
 *                         violations:
 *                           type: array
 *                           items:
 *                             type: string
 *                 message:
 *                   type: string
 *       400:
 *         description: Bad request (missing content, invalid file type, etc.)
 *       403:
 *         description: Not a member of this channel
 *       422:
 *         description: Message blocked by content moderation
 *       423:
 *         description: User is muted
 *       500:
 *         description: Server error
 */
router.post(
  '/:channelId/messages',
  authenticateToken,
  handleUpload, 
  uploadUtils,
  validateUpload,
  xss(),
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
 *           format: uuid
 *         description: Channel ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/MarkAsReadRequest'
 *     responses:
 *       200:
 *         description: Messages marked as read
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     readReceipts:
 *                       type: array
 *                       items:
 *                         type: object
 *                 message:
 *                   type: string
 *       400:
 *         description: Invalid request (messageIds not an array)
 *       403:
 *         description: Not a member of this channel
 *       500:
 *         description: Server error
 */
router.post('/:channelId/messages/read', authenticateToken, messageController.markAsRead);

/**
 * @swagger
 * /messages/{messageId}:
 *   get:
 *     summary: Get a specific message by ID
 *     tags: [Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: messageId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Message ID
 *     responses:
 *       200:
 *         description: Message retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     message:
 *                       $ref: '#/components/schemas/Message'
 *                 message:
 *                   type: string
 *       403:
 *         description: Not authorized to view this message
 *       404:
 *         description: Message not found
 *       500:
 *         description: Server error
 */
router.get('/:messageId', authenticateToken, messageController.getMessage);

/**
 * @swagger
 * /messages/{messageId}:
 *   delete:
 *     summary: Delete a message (soft delete)
 *     tags: [Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: messageId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Message ID to delete
 *     responses:
 *       200:
 *         description: Message deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: null
 *                 message:
 *                   type: string
 *       400:
 *         description: Message is already deleted
 *       403:
 *         description: Not authorized to delete this message
 *       404:
 *         description: Message not found
 *       500:
 *         description: Server error
 */
router.delete('/:messageId', authenticateToken, messageController.deleteMessage);

/**
 * @swagger
 * /messages/{messageId}/edit:
 *   put:
 *     summary: Edit a message
 *     tags: [Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: messageId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Message ID to edit
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/EditMessageRequest'
 *     responses:
 *       200:
 *         description: Message edited successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     message:
 *                       $ref: '#/components/schemas/Message'
 *                 message:
 *                   type: string
 *       400:
 *         description: Missing content, message too old to edit, or message already deleted
 *       403:
 *         description: Not authorized to edit this message
 *       404:
 *         description: Message not found
 *       422:
 *         description: Edited content blocked by moderation
 *       500:
 *         description: Server error
 */
router.put(
  '/:messageId/edit',
  authenticateToken,
  xss(),
  messageController.editMessage
);

/**
 * @swagger
 * /messages/{messageId}/react:
 *   post:
 *     summary: Add or remove a reaction to a message
 *     tags: [Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: messageId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Message ID to react to
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ReactionRequest'
 *     responses:
 *       200:
 *         description: Reaction toggled successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     reaction:
 *                       $ref: '#/components/schemas/Reaction'
 *                     message:
 *                       $ref: '#/components/schemas/Message'
 *                 message:
 *                   type: string
 *       400:
 *         description: Missing or invalid emoji
 *       403:
 *         description: Not a member of the channel
 *       404:
 *         description: Message not found
 *       500:
 *         description: Server error
 */
router.post('/:messageId/react', authenticateToken, messageController.toggleReaction);

/**
 * @swagger
 * /messages/{messageId}/reactions:
 *   get:
 *     summary: Get all reactions for a message
 *     tags: [Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: messageId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Message ID
 *     responses:
 *       200:
 *         description: Reactions retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     reactions:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Reaction'
 *                 message:
 *                   type: string
 *       404:
 *         description: Message not found
 *       500:
 *         description: Server error
 */
router.get('/:messageId/reactions', authenticateToken, messageController.getMessageReactions);

module.exports = router;