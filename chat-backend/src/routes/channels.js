const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const channelController = require('../controllers/channelController');
const { validate, channelValidation } = require('../middleware/validation');

/**
 * @swagger
 * /channels:
 *   get:
 *     summary: Get user's channels with enhanced data
 *     tags: [Channels]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number for pagination
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *         description: Number of items per page
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [direct, group, channel]
 *         description: Filter by channel type
 *       - in: query
 *         name: isPrivate
 *         schema:
 *           type: boolean
 *         description: Filter by privacy status
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by channel name or description
 *       - in: query
 *         name: joined
 *         schema:
 *           type: boolean
 *         description: Filter by user membership status
 *     responses:
 *       200:
 *         description: User's channels retrieved with enhanced data
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
 *                     channels:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                           name:
 *                             type: string
 *                           description:
 *                             type: string
 *                           type:
 *                             type: string
 *                           isPrivate:
 *                             type: boolean
 *                           memberCount:
 *                             type: integer
 *                           isMember:
 *                             type: boolean
 *                           userRole:
 *                             type: string
 *                           ownerId:
 *                             type: string
 *                           latestMessage:
 *                             type: object
 *                             nullable: true
 *                     pagination:
 *                       type: object
 *                       properties:
 *                         page:
 *                           type: integer
 *                         limit:
 *                           type: integer
 *                         total:
 *                           type: integer
 *                         pages:
 *                           type: integer
 */
router.get('/', authenticateToken, channelController.getUserChannels);

/**
 * @swagger
 * /channels:
 *   post:
 *     summary: Create a new channel with participants
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
 *                 minLength: 1
 *                 maxLength: 100
 *                 description: Channel name
 *               description:
 *                 type: string
 *                 maxLength: 500
 *                 description: Channel description
 *               type:
 *                 type: string
 *                 enum: [direct, group, channel]
 *                 description: Channel type
 *               isPrivate:
 *                 type: boolean
 *                 default: false
 *                 description: Whether channel is private
 *               maxMembers:
 *                 type: integer
 *                 minimum: 0
 *                 maximum: 1000
 *                 description: Maximum number of members (0 for unlimited)
 *               tags:
 *                 type: array
 *                 items:
 *                   type: string
 *                 maxItems: 10
 *                 description: Channel tags
 *               participantIds:
 *                 type: array
 *                 items:
 *                   type: string
 *                 maxItems: 100
 *                 description: Initial participant user IDs
 *     responses:
 *       201:
 *         description: Channel created successfully
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
 *                     channel:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                         name:
 *                           type: string
 *                         description:
 *                           type: string
 *                         type:
 *                           type: string
 *                         isPrivate:
 *                           type: boolean
 *                         memberCount:
 *                           type: integer
 *                         isMember:
 *                           type: boolean
 *                         userRole:
 *                           type: string
 *                         ownerId:
 *                           type: string
 *                         creator:
 *                           type: object
 *                         members:
 *                           type: array
 *                           items:
 *                             type: object
 *                 message:
 *                   type: string
 *       400:
 *         description: Validation error or invalid request
 *       403:
 *         description: User not authorized to create channels
 */
router.post('/', authenticateToken, validate(channelValidation.create), channelController.createChannel);

/**
 * @swagger
 * /channels/{channelId}:
 *   get:
 *     summary: Get complete channel details
 *     tags: [Channels]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: channelId
 *         required: true
 *         schema:
 *           type: string
 *         description: Channel ID
 *     responses:
 *       200:
 *         description: Channel details retrieved
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
 *                     channel:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                         name:
 *                           type: string
 *                         description:
 *                           type: string
 *                         type:
 *                           type: string
 *                         isPrivate:
 *                           type: boolean
 *                         memberCount:
 *                           type: integer
 *                         isMember:
 *                           type: boolean
 *                         userRole:
 *                           type: string
 *                         admins:
 *                           type: array
 *                           items:
 *                             type: string
 *                         ownerId:
 *                           type: string
 *                         owner:
 *                           type: object
 *                         latestMessage:
 *                           type: object
 *                           nullable: true
 *                         creator:
 *                           type: object
 *                         members:
 *                           type: array
 *                 message:
 *                   type: string
 *       403:
 *         description: Not a member of this private channel
 *       404:
 *         description: Channel not found
 */
router.get('/:channelId', authenticateToken, channelController.getChannel);

/**
 * @swagger
 * /channels/{channelId}:
 *   put:
 *     summary: Update channel information
 *     tags: [Channels]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: channelId
 *         required: true
 *         schema:
 *           type: string
 *         description: Channel ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 100
 *                 description: New channel name
 *               description:
 *                 type: string
 *                 maxLength: 500
 *                 description: New channel description
 *               tags:
 *                 type: array
 *                 items:
 *                   type: string
 *                 maxItems: 10
 *                 description: New channel tags
 *               isPrivate:
 *                 type: boolean
 *                 description: New privacy setting
 *               maxMembers:
 *                 type: integer
 *                 minimum: 0
 *                 maximum: 1000
 *                 description: New maximum member limit
 *     responses:
 *       200:
 *         description: Channel updated successfully
 *       403:
 *         description: Only admins can update channels
 *       404:
 *         description: Channel not found
 */
router.put('/:channelId', authenticateToken, validate(channelValidation.update), channelController.updateChannel);

/**
 * @swagger
 * /channels/{channelId}/join:
 *   post:
 *     summary: Join a public channel
 *     tags: [Channels]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: channelId
 *         required: true
 *         schema:
 *           type: string
 *         description: Channel ID
 *     responses:
 *       200:
 *         description: Joined channel successfully
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
 *                     channel:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                         name:
 *                           type: string
 *                         memberCount:
 *                           type: integer
 *                         isMember:
 *                           type: boolean
 *                 message:
 *                   type: string
 *       403:
 *         description: Cannot join private channel without invitation
 *       404:
 *         description: Channel not found
 *       409:
 *         description: Already a member of this channel
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
 *         description: Channel ID
 *     responses:
 *       200:
 *         description: Left channel successfully
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
 *                     memberCount:
 *                       type: integer
 *                     isMember:
 *                       type: boolean
 *                 message:
 *                   type: string
 *       400:
 *         description: Channel owner cannot leave (transfer or delete instead)
 *       404:
 *         description: Channel not found
 */
router.post('/:channelId/leave', authenticateToken, channelController.leaveChannel);

/**
 * @swagger
 * /channels/{channelId}/members:
 *   get:
 *     summary: Get channel members with pagination and filtering
 *     tags: [Channels]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: channelId
 *         required: true
 *         schema:
 *           type: string
 *         description: Channel ID
 *       - in: query
 *         name: role
 *         schema:
 *           type: string
 *           enum: [member, admin, moderator]
 *         description: Filter members by role
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search members by username or email
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number for pagination
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *         description: Number of members per page
 *     responses:
 *       200:
 *         description: Channel members retrieved successfully
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
 *                     members:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                           username:
 *                             type: string
 *                           profilePicture:
 *                             type: string
 *                           status:
 *                             type: string
 *                           lastSeen:
 *                             type: string
 *                           joinedAt:
 *                             type: string
 *                           role:
 *                             type: string
 *                           isOnline:
 *                             type: boolean
 *                     pagination:
 *                       type: object
 *                     roleDistribution:
 *                       type: array
 *                     canManage:
 *                       type: boolean
 *                 message:
 *                   type: string
 *       403:
 *         description: Not a member of this private channel
 *       404:
 *         description: Channel not found
 */
router.get('/:channelId/members', authenticateToken, channelController.getChannelMembers);

/**
 * @swagger
 * /channels/{channelId}/invite:
 *   post:
 *     summary: Invite users to a private channel
 *     tags: [Channels]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: channelId
 *         required: true
 *         schema:
 *           type: string
 *         description: Channel ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - userIds
 *             properties:
 *               userIds:
 *                 type: array
 *                 items:
 *                   type: string
 *                 minItems: 1
 *                 maxItems: 50
 *                 description: User IDs to invite
 *     responses:
 *       200:
 *         description: Users invited successfully
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
 *                     invitedUsers:
 *                       type: array
 *                     invitedCount:
 *                       type: integer
 *                     totalMembers:
 *                       type: integer
 *                 message:
 *                   type: string
 *       400:
 *         description: Invalid request (all users already members, would exceed limit, or public channel)
 *       403:
 *         description: Only admins can invite users
 *       404:
 *         description: Channel not found
 */
router.post('/:channelId/invite', authenticateToken, validate(channelValidation.invite), channelController.inviteUsers);

/**
 * @swagger
 * /channels/{channelId}/members/{userId}:
 *   delete:
 *     summary: Remove a member from a channel
 *     tags: [Channels]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: channelId
 *         required: true
 *         schema:
 *           type: string
 *         description: Channel ID
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID to remove
 *     responses:
 *       200:
 *         description: Member removed successfully
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
 *                     removedUserId:
 *                       type: string
 *                     memberCount:
 *                       type: integer
 *                 message:
 *                   type: string
 *       400:
 *         description: Invalid request (cannot remove self, owner, or admin without permission)
 *       403:
 *         description: Only admins can remove members
 *       404:
 *         description: Channel or user not found
 */
router.delete('/:channelId/members/:userId', authenticateToken, channelController.removeMember);

/**
 * @swagger
 * /channels/{channelId}:
 *   delete:
 *     summary: Delete a channel
 *     tags: [Channels]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: channelId
 *         required: true
 *         schema:
 *           type: string
 *         description: Channel ID
 *     responses:
 *       200:
 *         description: Channel deleted successfully
 *       403:
 *         description: Only admins can delete channels
 *       404:
 *         description: Channel not found
 */
router.delete('/:channelId', authenticateToken, channelController.deleteChannel);

/**
 * @swagger
 * /channels/{channelId}/members/{userId}/role:
 *   put:
 *     summary: Update a member's role
 *     tags: [Channels]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: channelId
 *         required: true
 *         schema:
 *           type: string
 *         description: Channel ID
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID whose role to update
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - role
 *             properties:
 *               role:
 *                 type: string
 *                 enum: [member, admin, moderator]
 *                 description: New role for the member
 *     responses:
 *       200:
 *         description: Member role updated successfully
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
 *                     userId:
 *                       type: string
 *                     role:
 *                       type: string
 *                     updatedBy:
 *                       type: string
 *                 message:
 *                   type: string
 *       400:
 *         description: Invalid request (cannot update self or owner)
 *       403:
 *         description: Only admins can update roles
 *       404:
 *         description: Channel or user not found
 */
router.put('/:channelId/members/:userId/role', authenticateToken, validate(channelValidation.updateRole), channelController.updateMemberRole);

module.exports = router;