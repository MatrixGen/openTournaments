// routes/users.js
const express = require('express');
const { getProfile, getNotificationPreferences, updateNotificationPreferences,getWalletBalance } = require('../controllers/userController');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Protect all routes in this file
router.use(authenticateToken);
router.get('/preferences/notifications', getNotificationPreferences);
router.put('/preferences/notifications', updateNotificationPreferences);
router.get('/wallet', getWalletBalance);
router.get('/profile', getProfile);

module.exports = router;