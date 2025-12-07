const express = require('express');
const router = express.Router();
const PaymentController = require('../controllers/paymentController');
const { authenticateToken } = require('../middleware/auth');

// IMPORTANT: Use raw body for webhook routes to verify signature
const rawBodyMiddleware = express.raw({
    type: 'application/json',
    verify: (req, res, buf) => {
        // Store raw body for signature verification
        req.rawBody = buf.toString('utf8');
    }
});

// Public webhook endpoint (no auth, raw body)
router.post('/webhook', rawBodyMiddleware, PaymentController.handlePaymentWebhook);

// Protected user routes
router.post('/deposit/initiate', authenticateToken, PaymentController.initiateWalletDeposit);
router.get('/deposit/status/:orderReference', authenticateToken, PaymentController.checkDepositStatus);
router.get('/deposit/history', authenticateToken, PaymentController.getDepositHistory);
router.post('/validate-phone', authenticateToken, PaymentController.validatePhoneNumber);
router.get('/wallet/balance', authenticateToken, PaymentController.getWalletBalance);
router.post('/deposit/cancel/:orderReference', authenticateToken, PaymentController.cancelPendingDeposit);
router.get('/deposit/stats', authenticateToken, PaymentController.getDepositStats);

module.exports = router;