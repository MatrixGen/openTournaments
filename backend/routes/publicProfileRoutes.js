// routes/publicProfileRoutes.js
const express = require('express');
const router = express.Router();
const publicProfileController = require('../controllers/publicProfileController');
const { uploadAvatar } = require('../controllers/userController');
const { authenticateToken } = require('../middleware/auth');
const { uploadSingle } = require('../middleware/uploadMiddleware');

// Authenticated self routes
router.post('/me/avatar', authenticateToken, uploadSingle('file'), uploadAvatar);

// Public routes (no auth required)
router.get('/:userId/profile', publicProfileController.getPublicProfile);
router.get('/:userId/followers', publicProfileController.getFollowers);
router.get('/:userId/following', publicProfileController.getFollowing);
router.get('/:userId/friends', publicProfileController.getFriends);
router.get('/:userId/tournaments', publicProfileController.getUserTournaments);
router.get('/:userId/achievements', publicProfileController.getUserAchievements);

// Users listing and search routes
router.get('/search', publicProfileController.searchUsers);
router.get('/list', publicProfileController.searchUsers);
router.get('/suggested', authenticateToken, publicProfileController.getSuggestedUsers);
router.get('/top', publicProfileController.getTopPlayers);

// Follow status batch check (requires auth)
router.post('/follow-status/batch', authenticateToken, publicProfileController.checkMultipleFollowStatus);

// Protected routes (require auth)
router.post('/:userId/follow', authenticateToken, publicProfileController.followUser);
router.delete('/:userId/follow', authenticateToken, publicProfileController.unfollowUser);
router.post('/:userId/report', authenticateToken, publicProfileController.reportUser);
router.get('/:userId/follow-status', authenticateToken, publicProfileController.checkFollowStatus);

module.exports = router;
