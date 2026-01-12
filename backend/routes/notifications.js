const express = require('express');
const { 
  getNotifications, 
  markAsRead, 
  markAllAsRead, 
  getUnreadCount,
  saveDeviceToken // new controller function
} = require('../controllers/notificationController');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

router.use(authenticateToken);

router.get('/', getNotifications);
router.patch('/:id/read', markAsRead);
router.patch('/read-all', markAllAsRead);
router.get('/unread-count', getUnreadCount);

// NEW: Save device token for push notifications
router.post('/device-token', saveDeviceToken);

module.exports = router;
