const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const moderationController = require('../controllers/moderationController');
const { validate } = require('../middleware/validation');

// ✅ FIXED: Correct joi-objectid setup
const Joi = require('joi');
const JoiObjectId = require('joi-objectid')(Joi); // Properly extend Joi

// ✅ FIXED: Secure moderator middleware with proper validation
const requireModerator = (req, res, next) => {
  // Check if req.user exists (authentication passed)
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: 'Authentication required'
      }
    });
  }

  // Check if user has moderator or admin privileges
  const isModerator = Boolean(req.user.isModerator);
  const isAdmin = Boolean(req.user.isAdmin);

  if (!isModerator && !isAdmin) {
    return res.status(403).json({
      success: false,
      error: {
        code: 'FORBIDDEN',
        message: 'Insufficient permissions. Moderator or admin access required.'
      }
    });
  }
  next();
};

/**
 * @swagger
 * /moderation/reports:
 *   post:
 *     summary: Report a message
 *     tags: [Moderation]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - messageId
 *               - reason
 *             properties:
 *               messageId:
 *                 type: string
 *               reason:
 *                 type: string
 *                 enum: [spam, harassment, inappropriate_content, hate_speech, other]
 *               description:
 *                 type: string
 *     responses:
 *       201:
 *         description: Message reported successfully
 */
router.post('/reports', 
  authenticateToken, 
  validate(Joi.object({
    messageId: JoiObjectId().required(), // ✅ FIXED: Use JoiObjectId() instead of Joi.objectId()
    reason: Joi.string().valid('spam', 'harassment', 'inappropriate_content', 'hate_speech', 'other').required(),
    description: Joi.string().max(500).optional()
  })),
  moderationController.reportMessage
);

/**
 * @swagger
 * /moderation/reports:
 *   get:
 *     summary: Get reported messages (moderators only)
 *     tags: [Moderation]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, reviewed, resolved, dismissed]
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
 *         description: Reports retrieved successfully
 */
router.get('/reports', 
  authenticateToken, 
  requireModerator,
  moderationController.getReports
);

/**
 * @swagger
 * /moderation/reports/{reportId}/resolve:
 *   patch:
 *     summary: Resolve a report (moderators only)
 *     tags: [Moderation]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: reportId
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
 *               - action
 *             properties:
 *               action:
 *                 type: string
 *                 enum: [dismiss, warn_user, delete_message, block_user]
 *               notes:
 *                 type: string
 *               blockDuration:
 *                 type: integer
 *                 description: Duration in hours (only for block_user action)
 *     responses:
 *       200:
 *         description: Report resolved successfully
 */
router.patch('/reports/:reportId/resolve',
  authenticateToken,
  requireModerator,
  validate(Joi.object({
    action: Joi.string().valid('dismiss', 'warn_user', 'delete_message', 'block_user').required(),
    notes: Joi.string().max(1000).optional(),
    blockDuration: Joi.number().integer().min(1).max(720).when('action', {
      is: 'block_user',
      then: Joi.required(),
      otherwise: Joi.forbidden()
    })
  })),
  moderationController.resolveReport
);

/**
 * @swagger
 * /moderation/users/{userId}/block:
 *   post:
 *     summary: Block a user (moderators only)
 *     tags: [Moderation]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
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
 *               - reason
 *               - duration
 *             properties:
 *               reason:
 *                 type: string
 *               duration:
 *                 type: integer
 *                 description: Block duration in hours
 *               notes:
 *                 type: string
 *     responses:
 *       200:
 *         description: User blocked successfully
 */
router.post('/users/:userId/block',
  authenticateToken,
  requireModerator,
  validate(Joi.object({
    reason: Joi.string().min(1).max(500).required(),
    duration: Joi.number().integer().min(1).max(720).required(),
    notes: Joi.string().max(1000).optional()
  })),
  moderationController.blockUser
);

/**
 * @swagger
 * /moderation/users/{userId}/unblock:
 *   post:
 *     summary: Unblock a user (moderators only)
 *     tags: [Moderation]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: User unblocked successfully
 */
router.post('/users/:userId/unblock',
  authenticateToken,
  requireModerator,
  moderationController.unblockUser
);

/**
 * @swagger
 * /moderation/dashboard:
 *   get:
 *     summary: Get moderation dashboard (moderators only)
 *     tags: [Moderation]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Dashboard data retrieved
 */
router.get('/dashboard',
  authenticateToken,
  requireModerator,
  moderationController.getModerationDashboard
);

/**
 * @swagger
 * /moderation/messages/{messageId}:
 *   delete:
 *     summary: Delete a message (moderators only)
 *     tags: [Moderation]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: messageId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Message deleted successfully
 */
router.delete('/messages/:messageId',
  authenticateToken,
  requireModerator,
  moderationController.deleteMessage
);

/**
 * @swagger
 * /moderation/violations:
 *   get:
 *     summary: Get user violations (moderators only)
 *     tags: [Moderation]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: userId
 *         schema:
 *           type: string
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *       - in: query
 *         name: resolved
 *         schema:
 *           type: boolean
 *     responses:
 *       200:
 *         description: Violations retrieved
 */
router.get('/violations',
  authenticateToken,
  requireModerator,
  moderationController.getUserViolations
);

module.exports = router;