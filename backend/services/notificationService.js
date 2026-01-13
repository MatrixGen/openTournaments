'use strict';

const WebSocketService = require('./websocketService');
const { EmailService } = require('./emailService');
const SMSService = require('./smsService');
const fcmService = require('./fcmService');

// Import models
const db = require('../models');
const Notification = db.Notification;
const User = db.User;

class NotificationService {
  
  /**
   * Create a single notification and dispatch to all enabled channels
   */
  static async createNotification(
    userId,
    title,
    message,
    type = 'info',
    relatedEntityType = null,
    relatedEntityId = null
  ) {
    try {
      // 1. Save notification in Database
      const notification = await Notification.create({
        user_id: userId,
        title,
        message,
        type,
        is_read: false,
        related_entity_type: relatedEntityType,
        related_entity_id: relatedEntityId,
      });

      console.log(`[Notification] Created ID ${notification.id} for User ${userId}`);

      // 2. Get user for preferences (Check if they want Push/Email/SMS)
      const user = await User.findByPk(userId);
      if (!user) {
        console.warn(`[Notification] User ${userId} not found, skipping external dispatches.`);
        return notification;
      }

      // 3. Send Push Notification via FCM
    // --- Inside createNotification ---

// 3. Send Push Notification via FCM
try {
  console.log(`[DEBUG] Attempting push notification for User: ${userId}`);
  
  // We call the service and capture the result
  const fcmResult=await fcmService.sendToUser(userId, {
  notification: { 
    title,
    body: message,
    icon: '/icon-192x192.png'
  },
  data: {
    notification_id: String(notification.id),
    type: String(type),
    related_entity_type: String(relatedEntityType || ''),
    related_entity_id: String(relatedEntityId || '')
  }
});


  if (fcmResult.success) {
    console.log(`[DEBUG] FCM Success: Sent to ${fcmResult.successCount} devices. Failures: ${fcmResult.failureCount}`);
  } else {
    // This triggers if no tokens were found in the DB
    console.warn(`[DEBUG] FCM Skipped: ${fcmResult.message}`);
  }

} catch (fcmError) {
  // This triggers if there is a code error or Network/Firebase Auth issue
  console.error('[DEBUG] FCM Critical Error:', fcmError);
}

      // 4. Send WebSocket Message (Real-time UI update)
      try {
        WebSocketService.sendToUser(userId, {
          type: 'NEW_NOTIFICATION',
          data: notification,
        });
      } catch (wsError) {
        console.error('[Notification] WebSocket Error:', wsError.message);
      }

      // 5. Send Email if enabled
     /* try {
        if (user.email && user.email_notifications) {
          // Note: If your EmailService requires extra objects (like 'opponent'), 
          // you should pass them in the arguments of this function.
          switch (title) {
            case 'Tournament Invite':
              await EmailService.sendTournamentInvitation(user, relatedEntityType);
              break;
            case 'Match Scheduled':
              await EmailService.sendMatchScheduled(user, relatedEntityType);
              break;
            default:
              await EmailService.sendEmail(user.email, title, message);
          }
        }
      } catch (emailError) {
        console.error('[Notification] Email Error:', emailError.message);
      }*/
      
      // 6. Send SMS if enabled
      try {
        if (user.phone_number && user.sms_notifications) {
          // Only send SMS for high-priority types
          if (['tournament', 'match', 'urgent'].includes(type)) {
            await SMSService.sendSMS(
              user.phone_number,
              `${title}: ${message}`
            );
          }
        }
      } catch (smsError) {
        console.error('[Notification] SMS Error:', smsError.message);
      }

      return notification;
    } catch (error) {
      console.error('[Notification] Critical Error creating notification:', error);
      throw error;
    }
  }

  /**
   * Create notifications for multiple users (e.g., Tournament starting)
   */
  static async bulkCreateNotifications(
    userIds,
    title,
    message,
    type = 'info',
    relatedEntityType = null,
    relatedEntityId = null
  ) {
    try {
      if (!userIds || userIds.length === 0) return [];

      const notifications = userIds.map((userId) => ({
        user_id: userId,
        title,
        message,
        type,
        is_read: false,
        related_entity_type: relatedEntityType,
        related_entity_id: relatedEntityId,
      }));

      // 1. Bulk Insert to DB
      const createdNotifications = await Notification.bulkCreate(notifications);
      console.log(`[Notification] Bulk created ${createdNotifications.length} records`);

      // 2. Bulk Send Push Notifications via FCM Multicast
      try {
        await fcmService.sendToMultipleUsers(userIds, {
          title,
          body: message,
          data: {
            type: String(type),
            related_entity_type: String(relatedEntityType || ''),
            related_entity_id: String(relatedEntityId || '')
          }
        });
      } catch (fcmError) {
        console.error('[Notification] Bulk FCM Error:', fcmError.message);
      }

      // 3. Optional: Trigger WebSockets in a loop or via a broadcast
      userIds.forEach(uId => {
        WebSocketService.sendToUser(uId, { type: 'NEW_NOTIFICATION_BULK', title });
      });

      return createdNotifications;
    } catch (error) {
      console.error('[Notification] Error creating bulk notifications:', error);
      throw error;
    }
  }

  /**
   * Fetch paginated notifications for a user
   */
  static async getUserNotifications(userId, limit = 20, offset = 0) {
    try {
      return await Notification.findAll({
        where: { user_id: userId },
        order: [['created_at', 'DESC']],
        limit: parseInt(limit),
        offset: parseInt(offset),
      });
    } catch (error) {
      console.error('[Notification] Error fetching user notifications:', error);
      throw error;
    }
  }

  /**
   * Mark a specific notification as read
   */
  static async markAsRead(notificationId, userId) {
    try {
      const notification = await Notification.findOne({
        where: { id: notificationId, user_id: userId },
      });

      if (!notification) throw new Error('Notification not found');

      await notification.update({ is_read: true });
      return notification;
    } catch (error) {
      console.error('[Notification] Error marking as read:', error);
      throw error;
    }
  }

  /**
   * Mark all notifications as read for a user
   */
  static async markAllAsRead(userId) {
    try {
      const [updatedCount] = await Notification.update(
        { is_read: true },
        { where: { user_id: userId, is_read: false } }
      );

      return updatedCount;
    } catch (error) {
      console.error('[Notification] Error marking all as read:', error);
      throw error;
    }
  }

  /**
   * Get total unread count for UI badges
   */
  static async getUnreadCount(userId) {
    try {
      return await Notification.count({
        where: { user_id: userId, is_read: false },
      });
    } catch (error) {
      console.error('[Notification] Error getting unread count:', error);
      throw error;
    }
  }
}

module.exports = NotificationService;