const { Notification, User } = require('../models');
const WebSocketService = require('./websocketService');
const EmailService = require('./emailService');
const SMSService = require('./smsService');

class NotificationService {
  // Create a new notification
  static async createNotification(
    userId,
    title,
    message,
    type = 'info',
    relatedEntityType = null,
    relatedEntityId = null
  ) {
    try {
      // Save notification in DB
      const notification = await Notification.create({
        user_id: userId,
        title,
        message,
        type,
        related_entity_type: relatedEntityType,
        related_entity_id: relatedEntityId,
      });

      console.log(`Notification created for user ${userId}: ${title}`);

      // Try to send WebSocket message
      try {
        WebSocketService.sendToUser(userId, {
          type: 'NEW_NOTIFICATION',
          data: notification,
        });
      } catch (wsError) {
        console.error('Error sending WebSocket notification:', wsError);
      }

      // Try to send email if enabled
      try {
        const user = await User.findByPk(userId);
        if (user && user.email && user.email_notifications) {
          if (['tournament', 'match', 'payment'].includes(type)) {
            await EmailService.sendEmail(user.email, title, message);
          }
        }
      } catch (emailError) {
        console.error('Error sending email notification:', emailError);
      }
      // Send SMS notification if user has SMS notifications enabled
      try {
        const user = await User.findByPk(userId);
        if (user && user.phone_number && user.sms_notifications) {
          // For certain notification types, send SMS
          if (['tournament', 'match'].includes(type)) {
            await SMSService.sendSMS(
              user.phone_number,
              `${title}: ${message}`
            );
          }
        }
      } catch (error) {
        console.error('Error sending SMS notification:', error);
      }

      return notification;
    } catch (error) {
      console.error('Error creating notification:', error);
      throw error;
    }
    
  }

  // Bulk create notifications
  static async bulkCreateNotifications(
    userIds,
    title,
    message,
    type = 'info',
    relatedEntityType = null,
    relatedEntityId = null
  ) {
    try {
      const notifications = userIds.map((userId) => ({
        user_id: userId,
        title,
        message,
        type,
        related_entity_type: relatedEntityType,
        related_entity_id: relatedEntityId,
      }));

      const createdNotifications = await Notification.bulkCreate(notifications);
      console.log(`Created ${createdNotifications.length} notifications`);

      return createdNotifications;
    } catch (error) {
      console.error('Error creating bulk notifications:', error);
      throw error;
    }
  }

  // Get all notifications for a user
  static async getUserNotifications(userId, limit = 20, offset = 0) {
    try {
      return await Notification.findAll({
        where: { user_id: userId },
        order: [['created_at', 'DESC']],
        limit,
        offset,
      });
    } catch (error) {
      console.error('Error getting user notifications:', error);
      throw error;
    }
  }

  // Mark one as read
  static async markAsRead(notificationId, userId) {
    try {
      const notification = await Notification.findOne({
        where: { id: notificationId, user_id: userId },
      });

      if (!notification) throw new Error('Notification not found');

      await notification.update({ is_read: true });
      return notification;
    } catch (error) {
      console.error('Error marking notification as read:', error);
      throw error;
    }
  }

  // Mark all as read
  static async markAllAsRead(userId) {
    try {
      const [updatedCount] = await Notification.update(
        { is_read: true },
        { where: { user_id: userId, is_read: false } }
      );

      console.log(`Marked ${updatedCount} notifications as read for user ${userId}`);
      return updatedCount;
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      throw error;
    }
  }

  // Count unread
  static async getUnreadCount(userId) {
    try {
      return await Notification.count({
        where: { user_id: userId, is_read: false },
      });
    } catch (error) {
      console.error('Error getting unread notification count:', error);
      throw error;
    }
  }
}

module.exports = NotificationService;
