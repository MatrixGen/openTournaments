// routes/auth.js
const express = require('express');
const { register, login,validateChatToken,refreshChatToken,googleAuth,googleAuthCallback, linkGoogleAccount, unlinkGoogleAccount } = require('../controllers/authController'); 
const { validateRegistration, validateLogin } = require('../middleware/validation'); 
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

router.post('/register', validateRegistration, register);
router.post('/login', validateLogin, login); 

router.post('/chat/refresh',refreshChatToken);
router.post('/chat/validate',validateChatToken);

// ========== NEW GOOGLE OAUTH ROUTES ==========
// Initiate Google OAuth flow
router.get('/google', googleAuth);

// Google OAuth callback
router.get('/google/callback', googleAuthCallback);

// Alternative: Direct Google auth with token (for mobile/SPA)
router.post('/google/token', googleAuthCallback);

// Account linking
router.post('/link/google', authenticateToken, linkGoogleAccount);
router.post('/unlink/google', authenticateToken, unlinkGoogleAccount);;

module.exports = router;