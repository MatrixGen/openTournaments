// routes/payoutRoutes.js
const express = require("express");
const router = express.Router();
const PayoutController = require("../controllers/payoutController");
const { authenticateToken, optionalAuth } = require("../middleware/auth");

const currencyMiddleware = require('../middleware/currencyMiddleware');

// Apply to all payment routes
router.use(currencyMiddleware);

// Mobile Money Payouts
router.post(
  "/withdraw/mobile-money/preview",
  authenticateToken,
  PayoutController.previewMobileMoneyPayout
);
router.post(
  "/withdraw/mobile-money/create",
  authenticateToken,
  PayoutController.createMobileMoneyPayout
);

// Bank Payouts
router.post(
  "/withdraw/bank/preview",
  authenticateToken,
  PayoutController.previewBankPayout
);
router.post(
  "/withdraw/bank/create",
  authenticateToken,
  PayoutController.createBankPayout
);

// Payout Status & History
router.get(
  "/withdraw/status/:orderReference",
  authenticateToken,
  PayoutController.getPayoutStatus
);
router.get(
  "/withdraw/history",
  authenticateToken,
  PayoutController.getWithdrawalHistory
);

router.post('/convert-currency',
  authenticateToken,
  PayoutController.convertCurrencyEndpoint
);


// Statistics
router.get(
  "/withdraw/stats",
  authenticateToken,
  PayoutController.getWithdrawalStats
);

// Reconciliation
router.post(
  "/withdraw/reconcile/:orderReference",
  authenticateToken,
  PayoutController.reconcilePayoutStatus
);

// Banks List
//router.get("/banks", authenticateToken, PayoutController.getBanksList);

// Webhook (no authentication required - uses signature verification)
router.post("/webhook/payout", PayoutController.handlePayoutWebhook);

module.exports = router;