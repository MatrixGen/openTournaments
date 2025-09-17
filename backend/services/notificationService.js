const { Notification, User } = require('../models');

class NotificationService {
  // Create a new notification
  static async createNotification(userId, title, message, type = 'info', relatedEntityType = null, relatedEntityId = null) {
    try {
      const notification = await Notification.create({
        user_id: userId,
        title,
        message,
        type,
        related_entity_type: relatedEntityType,
        related_entity_id: relatedEntityId
      });
      
      // In a real application, you would also send push notifications or emails here
      console.log(`Notification created for user ${userId}: ${title}`);
      
      return notification;
    } catch (error) {
      console.error('Error creating notification:', error);
      throw error;
    }
  }

  // Create notifications for multiple users
  static async bulkCreateNotifications(userIds, title, message, type = 'info', relatedEntityType = null, relatedEntityId = null) {
    try {
      const notifications = userIds.map(userId => ({
        user_id: userId,
        title,
        message,
        type,
        related_entity_type: relatedEntityType,
        related_entity_id: relatedEntityId
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
      const notifications = await Notification.findAll({
        where: { user_id: userId },
        order: [['created_at', 'DESC']],
        limit,
        offset
      });
      
      return notifications;
    } catch (error) {
      console.error('Error getting user notifications:', error);
      throw error;
    }
  }

  // Mark a notification as read
  static async markAsRead(notificationId, userId) {
    try {
      const notification = await Notification.findOne({
        where: { id: notificationId, user_id: userId }
      });
      
      if (!notification) {
        throw new Error('Notification not found');
      }
      
      await notification.update({ is_read: true });
      return notification;
    } catch (error) {
      console.error('Error marking notification as read:', error);
      throw error;
    }
  }

  // Mark all notifications as read for a user
  static async markAllAsRead(userId) {
    try {
      const result = await Notification.update(
        { is_read: true },
        { where: { user_id: userId, is_read: false } }
      );
      
      console.log(`Marked ${result[0]} notifications as read for user ${userId}`);
      return result[0];
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      throw error;
    }
  }

  // Get unread notification count for a user
  static async getUnreadCount(userId) {
    try {
      const count = await Notification.count({
        where: { user_id: userId, is_read: false }
      });
      
      return count;
    } catch (error) {
      console.error('Error getting unread notification count:', error);
      throw error;
    }
  }
}

module.exports = NotificationService;