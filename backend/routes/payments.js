const express = require('express');
const router = express.Router();
const PaymentController = require('../controllers/paymentController');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

// IMPORTANT: Use raw body for webhook routes to verify signature
const rawBodyMiddleware = express.raw({
    type: 'application/json',
    verify: (req, res, buf) => {
        // Store raw body for signature verification
        req.rawBody = buf.toString('utf8');
    }
});

// ============================================
// PUBLIC ROUTES (No authentication)
// ============================================

// Payment webhook from ClickPesa
router.post('/webhook/payment', rawBodyMiddleware, PaymentController.handlePaymentWebhook);

// Test webhook endpoint (for development only)
if (process.env.NODE_ENV === 'development') {
    router.get('/webhook/test', PaymentController.testWebhook);
}

// ============================================
// PROTECTED USER ROUTES (Require user authentication)
// ============================================

// Wallet deposit
router.post('/deposit/initiate', authenticateToken, PaymentController.initiateWalletDeposit);
router.get('/deposit/status/:orderReference', authenticateToken, PaymentController.checkDepositStatus);
router.post('/deposit/cancel/:orderReference', authenticateToken, PaymentController.cancelPendingDeposit);

// Deposit history and stats
router.get('/deposit/history', authenticateToken, PaymentController.getDepositHistory);
router.get('/deposit/stats', authenticateToken, PaymentController.getDepositStats);

// Wallet operations
router.get('/wallet/balance', authenticateToken, PaymentController.getWalletBalance);

// Phone validation
router.post('/validate-phone', authenticateToken, PaymentController.validatePhoneNumber);

// Manual payment status check with force reconciliation
router.post('/deposit/:orderReference/reconcile', authenticateToken, PaymentController.userReconcilePaymentStatus);

// ============================================
// ADMIN ROUTES (Require admin privileges)
// ============================================

// Admin reconciliation endpoints
router.post('/admin/payments/:orderReference/reconcile', 
    authenticateToken, 
    requireAdmin, 
    PaymentController.adminReconcilePayment
);

router.post('/admin/payments/batch-reconcile', 
    authenticateToken, 
    requireAdmin, 
    PaymentController.adminBatchReconcile
);

// Admin dashboard - get stuck payments
router.get('/admin/payments/stuck', 
    authenticateToken, 
    requireAdmin, 
    async (req, res) => {
        try {
            const { limit = 100, hours = 24 } = req.query;
            
            const stuckPayments = await PaymentController.getStuckPayments(
                parseInt(limit),
                parseInt(hours)
            );
            
            res.json({
                success: true,
                data: stuckPayments,
            });
        } catch (error) {
            console.error('Get stuck payments error:', error);
            res.status(500).json({
                success: false,
                error: error.message,
            });
        }
    }
);

// Admin endpoint to manually update wallet for successful deposit
router.post('/admin/payments/:orderReference/manual-update', 
    authenticateToken, 
    requireAdmin, 
    async (req, res) => {
        try {
            const { orderReference } = req.params;
            const result = await PaymentController.updateWalletForDeposit(orderReference);
            
            if (!result.success) {
                return res.status(400).json(result);
            }
            
            res.json({
                success: true,
                message: 'Wallet manually updated',
                data: result,
            });
        } catch (error) {
            console.error('Manual wallet update error:', error);
            res.status(500).json({
                success: false,
                error: error.message,
            });
        }
    }
);

module.exports = router;