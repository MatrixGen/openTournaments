const { Message, User, Channel, Report, UserBlock, UserViolation } = require('../../models');
const { successResponse, errorResponse } = require('../middleware/responseFormatter');
const contentModerator = require('../utils/profanityFilter');
const { Op } = require('sequelize');

class ModerationController {
  // Report a message
  async reportMessage(req, res) {
    try {
      const { messageId, reason, description } = req.body;
      const reporterId = req.user.id;

      // Find the message
      const message = await Message.findByPk(messageId, {
        include: [{ model: User, as: 'user' }]
      });

      if (!message) {
        return res.status(404).json(
          errorResponse('Message not found', 'MESSAGE_NOT_FOUND')
        );
      }

      // Check if user has already reported this message
      const existingReport = await Report.findOne({
        where: { messageId, reporterId }
      });

      if (existingReport) {
        return res.status(409).json(
          errorResponse('You have already reported this message', 'ALREADY_REPORTED')
        );
      }

      // Create report
      const report = await Report.create({
        messageId,
        reporterId,
        reportedUserId: message.userId,
        reason,
        description,
        status: 'pending'
      });

      // Auto-scan the message content
      const scanResult = contentModerator.scanMessage(message.content, message.userId);

      // Create violation record if automated detection found issues
      if (scanResult.violations.length > 0) {
        await UserViolation.create({
          userId: message.userId,
          type: scanResult.violations[0],
          severity: 'medium',
          messageContent: message.content,
          automated: true
        });
      }

      res.status(201).json(
        successResponse(
          { report },
          'Message reported successfully'
        )
      );

    } catch (error) {
      console.error('Report message error:', error);
      res.status(500).json(
        errorResponse('Failed to report message', 'REPORT_ERROR')
      );
    }
  }

  // Get reports with filtering
  async getReports(req, res) {
    try {
      const { status, page = 1, limit = 20 } = req.query;
      const offset = (page - 1) * limit;

      const where = {};
      if (status) where.status = status;

      const reports = await Report.findAll({
        where,
        include: [
          {
            model: Message,
            as: 'message',
            include: [{
              model: User,
              as: 'user',
              attributes: ['id', 'username', 'profilePicture']
            }]
          },
          {
            model: User,
            as: 'reporter',
            attributes: ['id', 'username']
          },
          {
            model: User,
            as: 'reportedUser',
            attributes: ['id', 'username', 'profilePicture']
          }
        ],
        order: [['createdAt', 'DESC']],
        limit: parseInt(limit),
        offset: parseInt(offset)
      });

      const total = await Report.count({ where });

      res.json(
        successResponse(
          { 
            reports,
            pagination: {
              page: parseInt(page),
              limit: parseInt(limit),
              total,
              pages: Math.ceil(total / limit)
            }
          },
          'Reports retrieved successfully'
        )
      );

    } catch (error) {
      console.error('Get reports error:', error);
      res.status(500).json(
        errorResponse('Failed to retrieve reports', 'REPORTS_RETRIEVAL_ERROR')
      );
    }
  }

  // Resolve a report
  async resolveReport(req, res) {
    try {
      const { reportId } = req.params;
      const { action, notes, blockDuration } = req.body;
      const moderatorId = req.user.id;

      const report = await Report.findByPk(reportId, {
        include: [
          { model: Message, as: 'message' },
          { model: User, as: 'reportedUser' }
        ]
      });

      if (!report) {
        return res.status(404).json(
          errorResponse('Report not found', 'REPORT_NOT_FOUND')
        );
      }

      let updateData = {
        status: 'resolved',
        resolvedBy: moderatorId,
        resolvedAt: new Date(),
        moderatorNotes: notes
      };

      // Take action based on resolution type
      switch (action) {
        case 'delete_message':
          if (report.message) {
            await report.message.update({
              content: '[This message has been removed by a moderator]',
              isDeleted: true
            });
          }
          break;

        case 'block_user':
          if (report.reportedUser) {
            const blockedUntil = new Date();
            blockedUntil.setHours(blockedUntil.getHours() + (blockDuration || 24));
            
            await UserBlock.create({
              userId: report.reportedUser.id,
              moderatorId,
              reason: `Report resolution: ${notes || 'No reason provided'}`,
              blockedUntil,
              isActive: true
            });

            // Update user status
            await User.update(
              { status: 'suspended' },
              { where: { id: report.reportedUser.id } }
            );
          }
          break;

        case 'warn_user':
          // Create a violation record as warning
          await UserViolation.create({
            userId: report.reportedUser.id,
            type: 'harassment', // Default type for warnings
            severity: 'low',
            messageContent: report.message?.content,
            automated: false,
            resolved: true
          });
          break;

        case 'dismiss':
          updateData.status = 'dismissed';
          break;
      }

      await report.update(updateData);

      res.json(
        successResponse(
          { report },
          `Report ${action} completed successfully`
        )
      );

    } catch (error) {
      console.error('Resolve report error:', error);
      res.status(500).json(
        errorResponse('Failed to resolve report', 'RESOLVE_ERROR')
      );
    }
  }

  // Block a user
  async blockUser(req, res) {
    try {
      const { userId } = req.params;
      const { reason, duration, notes } = req.body;
      const moderatorId = req.user.id;

      const user = await User.findByPk(userId);
      if (!user) {
        return res.status(404).json(
          errorResponse('User not found', 'USER_NOT_FOUND')
        );
      }

      const blockedUntil = new Date();
      blockedUntil.setHours(blockedUntil.getHours() + duration);

      const block = await UserBlock.create({
        userId,
        moderatorId,
        reason,
        blockedUntil,
        notes,
        isActive: true
      });

      // Update user status
      await user.update({ status: 'suspended' });

      res.json(
        successResponse(
          { block },
          `User blocked until ${blockedUntil.toISOString()}`
        )
      );

    } catch (error) {
      console.error('Block user error:', error);
      res.status(500).json(
        errorResponse('Failed to block user', 'BLOCK_ERROR')
      );
    }
  }

  // Unblock a user
  async unblockUser(req, res) {
    try {
      const { userId } = req.params;
      const moderatorId = req.user.id;

      // Deactivate all active blocks for user
      await UserBlock.update(
        { isActive: false },
        {
          where: {
            userId,
            isActive: true,
            blockedUntil: { [Op.gt]: new Date() }
          }
        }
      );

      // Update user status
      await User.update(
        { status: 'offline' },
        { where: { id: userId } }
      );

      res.json(
        successResponse(
          null,
          'User unblocked successfully'
        )
      );

    } catch (error) {
      console.error('Unblock user error:', error);
      res.status(500).json(
        errorResponse('Failed to unblock user', 'UNBLOCK_ERROR')
      );
    }
  }

  // Get moderation dashboard data
  async getModerationDashboard(req, res) {
    try {
      const pendingReports = await Report.count({
        where: { status: 'pending' }
      });

      const activeBlocks = await UserBlock.count({
        where: { 
          isActive: true,
          blockedUntil: { [Op.gte]: new Date() }
        }
      });

      const recentViolations = await UserViolation.count({
        where: {
          createdAt: {
            [Op.gte]: new Date(Date.now() - 24 * 60 * 60 * 1000)
          }
        }
      });

      const recentReports = await Report.findAll({
        where: {
          createdAt: {
            [Op.gte]: new Date(Date.now() - 24 * 60 * 60 * 1000)
          }
        },
        include: [
          {
            model: User,
            as: 'reportedUser',
            attributes: ['id', 'username']
          }
        ],
        limit: 10,
        order: [['createdAt', 'DESC']]
      });

      res.json(
        successResponse({
          stats: {
            pendingReports,
            activeBlocks,
            recentViolations
          },
          recentReports
        }, 'Moderation dashboard data retrieved')
      );

    } catch (error) {
      console.error('Moderation dashboard error:', error);
      res.status(500).json(
        errorResponse('Failed to retrieve moderation data', 'DASHBOARD_ERROR')
      );
    }
  }

  // Delete inappropriate message
  async deleteMessage(req, res) {
    try {
      const { messageId } = req.params;
      const moderatorId = req.user.id;

      const message = await Message.findByPk(messageId);
      if (!message) {
        return res.status(404).json(
          errorResponse('Message not found', 'MESSAGE_NOT_FOUND')
        );
      }

      // Soft delete the message
      await message.update({ 
        content: '[This message has been removed by a moderator]',
        isDeleted: true,
        deletedBy: moderatorId,
        deletedAt: new Date()
      });

      res.json(
        successResponse(
          null,
          'Message deleted successfully'
        )
      );

    } catch (error) {
      console.error('Delete message error:', error);
      res.status(500).json(
        errorResponse('Failed to delete message', 'DELETE_ERROR')
      );
    }
  }

  // Get user violations
  async getUserViolations(req, res) {
    try {
      const { userId, type, resolved } = req.query;
      const where = {};

      if (userId) where.userId = userId;
      if (type) where.type = type;
      if (resolved !== undefined) where.resolved = resolved === 'true';

      const violations = await UserViolation.findAll({
        where,
        include: [
          {
            model: User,
            as: 'user',
            attributes: ['id', 'username', 'profilePicture']
          }
        ],
        order: [['createdAt', 'DESC']],
        limit: 50
      });

      res.json(
        successResponse(
          { violations },
          'Violations retrieved successfully'
        )
      );

    } catch (error) {
      console.error('Get violations error:', error);
      res.status(500).json(
        errorResponse('Failed to retrieve violations', 'VIOLATIONS_ERROR')
      );
    }
  }
}

module.exports = new ModerationController();