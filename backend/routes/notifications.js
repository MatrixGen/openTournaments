const express = require('express');
const { getNotifications, markAsRead, markAllAsRead, getUnreadCount } = require('../controllers/notificationController');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

router.use(authenticateToken);

router.get('/', getNotifications);
router.patch('/:id/read', markAsRead);
router.patch('/read-all', markAllAsRead);
router.get('/unread-count', getUnreadCount);

module.exports = router;