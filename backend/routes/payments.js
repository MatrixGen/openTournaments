const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');
const { authenticateToken } = require('../middleware/auth');

// Public webhook route (ClickPesa callback)
router.post('/webhook', paymentController.handleWebhook);

// Protected user routes
router.use(authenticateToken);
router.post('/initiate', paymentController.initiatePayment);
router.get('/status/:paymentId', paymentController.checkPaymentStatus);
//router.get('/transactions', paymentController.getTransactions); // optional: keep user transaction history

// Admin-only payout route
// If you have an admin check, you can add it here, e.g. inside controller
router.post('/payouts/prize', paymentController.disbursePrize);

module.exports = router;
