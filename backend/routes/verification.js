const express = require('express');
const {
  sendEmailVerification,
  verifyEmail,
  sendPhoneVerification,
  verifyPhone,
  requestPasswordResetEmail,
  requestPasswordResetSMS,
  resetPasswordWithToken,
  resetPasswordWithCode
} = require('../controllers/authController');
const {
  validateEmailVerification,
  validatePhoneVerification,
  validatePasswordResetRequest,
  validatePasswordReset
} = require('../middleware/validation');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

router.post('/email/send', authenticateToken, sendEmailVerification);
router.post('/email/verify', validateEmailVerification, verifyEmail);

// Phone verification routes
router.post('/phone/send', authenticateToken, sendPhoneVerification);
router.post('/phone/verify', authenticateToken, validatePhoneVerification, verifyPhone);

// Password reset routes
router.post('/password/reset/email', validatePasswordResetRequest, requestPasswordResetEmail);
router.post('/password/reset/sms', validatePasswordResetRequest, requestPasswordResetSMS);
router.post('/password/reset/token', validatePasswordReset, resetPasswordWithToken);
router.post('/password/reset/code', validatePasswordReset, resetPasswordWithCode);

module.exports = router;