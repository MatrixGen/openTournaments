// routes/users.js
const express = require('express');
const { 
  getProfile, 
  getNotificationPreferences, 
  updateNotificationPreferences,
  getWalletBalance,
  updateProfile,
  getUserStats,
  getUserTournaments,
  getUserActivity
} = require('../controllers/userController');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Protect all routes in this file
router.use(authenticateToken);

// User profile routes
router.get('/profile', getProfile);
router.put('/profile', updateProfile);

// User statistics
router.get('/stats', getUserStats);

// User tournaments with pagination
router.get('/tournaments', getUserTournaments);

// User activity log
router.get('/activity', getUserActivity);

// Notification preferences
router.get('/preferences/notifications', getNotificationPreferences);
router.put('/preferences/notifications', updateNotificationPreferences);

// Wallet
router.get('/wallet', getWalletBalance);

module.exports = router;