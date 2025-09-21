const express = require('express');
const { 
  sendFriendRequest, 
  getFriendRequests, 
  respondToFriendRequest, 
  getFriends 
} = require('../controllers/friendController');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

router.use(authenticateToken);

router.post('/requests', sendFriendRequest);
router.get('/requests', getFriendRequests);
router.post('/requests/:id/respond', respondToFriendRequest);
router.get('/', getFriends);

module.exports = router;