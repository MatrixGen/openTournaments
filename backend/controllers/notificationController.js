const NotificationService = require('../services/notificationService');

const getNotifications = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    const notifications = await NotificationService.getUserNotifications(userId, parseInt(limit), offset);
    const unreadCount = await NotificationService.getUnreadCount(userId);

    res.json({
      notifications,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: await Notification.count({ where: { user_id: userId } })
      },
      unreadCount
    });
  } catch (error) {
    next(error);
  }
};

const markAsRead = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const notification = await NotificationService.markAsRead(id, userId);
    res.json({ message: 'Notification marked as read', notification });
  } catch (error) {
    next(error);
  }
};

const markAllAsRead = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const count = await NotificationService.markAllAsRead(userId);
    res.json({ message: `Marked ${count} notifications as read` });
  } catch (error) {
    next(error);
  }
};

const getUnreadCount = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const count = await NotificationService.getUnreadCount(userId);
    res.json({ count });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getNotifications,
  markAsRead,
  markAllAsRead,
  getUnreadCount
};