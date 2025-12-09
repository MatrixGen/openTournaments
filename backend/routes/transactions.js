const express = require('express');
const router = express.Router();
const TransactionController = require('../controllers/transactionController');
const { authenticateToken } = require('../middleware/auth');

// Get all transactions with filters
router.get('/', authenticateToken, TransactionController.getTransactions);

// Static routes FIRST
router.get('/stats', authenticateToken, TransactionController.getTransactionStats);
router.get('/pending', authenticateToken, TransactionController.getPendingTransactions);
router.get('/export', authenticateToken, TransactionController.exportTransactions);
router.get('/summary', authenticateToken, TransactionController.getTransactionSummary);

// Batch reconcile transactions
router.post('/batch-reconcile', authenticateToken, TransactionController.batchReconcileTransactions);

// Dynamic routes LAST
router.get('/:id', authenticateToken, TransactionController.getTransactionById);
router.post('/:id/reconcile', authenticateToken, TransactionController.reconcileTransaction);

module.exports = router;
