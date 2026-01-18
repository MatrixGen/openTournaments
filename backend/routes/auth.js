// routes/auth.js
const express = require('express');
const { register, login,validateChatToken,refreshChatToken,googleAuth,googleAuthCallback, linkGoogleAccount, unlinkGoogleAccount, addPasswordForGoogleUser, changeGoogleUserPassword } = require('../controllers/authController'); 
const { validateRegistration, validateLogin } = require('../middleware/validation'); 
const { authenticateToken } = require('../middleware/auth');
const sessionRoutes = require('./session');

const router = express.Router();

// ========== NEW FIREBASE SESSION ROUTES ==========
// Recommended: Use these for Firebase-based authentication
router.use('/', sessionRoutes);

// ========== LEGACY ROUTES (DEPRECATED) ==========
// These routes are deprecated and will be removed in a future version.
// Please migrate to the Firebase session endpoints above.

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
router.post('/unlink/google', authenticateToken, unlinkGoogleAccount);

// In authRoutes.js
router.post('/google/add-password', authenticateToken, addPasswordForGoogleUser);
router.post('/google/change-password', authenticateToken, changeGoogleUserPassword);

module.exports = router;