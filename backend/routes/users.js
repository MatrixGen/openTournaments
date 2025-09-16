// routes/users.js
const express = require('express');
const { getProfile } = require('../controllers/userController');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Protect all routes in this file
router.use(authenticateToken);

router.get('/profile', getProfile);

module.exports = router;