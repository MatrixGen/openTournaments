// controllers/userController.js
const { User } = require('../models');

const getProfile = async (req, res, next) => {
  try {
    // req.user is already set by the authenticateToken middleware
    res.json({
      user: req.user
    });
  } catch (error) {
    next(error);
  }
};

const getNotificationPreferences = async (req, res, next) => {
  try {
    const user = req.user;
    
    res.json({
      email_notifications: user.email_notifications,
      push_notifications: user.push_notifications,
      sms_notifications: user.sms_notifications
    });
  } catch (error) {
    next(error);
  }
};

const updateNotificationPreferences = async (req, res, next) => {
  try {
    const { email_notifications, push_notifications, sms_notifications } = req.body;
    const user = req.user;
    
    await user.update({
      email_notifications: email_notifications !== undefined ? email_notifications : user.email_notifications,
      push_notifications: push_notifications !== undefined ? push_notifications : user.push_notifications,
      sms_notifications: sms_notifications !== undefined ? sms_notifications : user.sms_notifications
    });
    
    res.json({
      message: 'Notification preferences updated successfully',
      preferences: {
        email_notifications: user.email_notifications,
        push_notifications: user.push_notifications,
        sms_notifications: user.sms_notifications
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getProfile,
  updateNotificationPreferences,
  getNotificationPreferences,
  
};