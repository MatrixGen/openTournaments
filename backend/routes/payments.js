const express = require('express');
const { getPaymentMethods, initiateDeposit,getTransactions } = require('../controllers/paymentController');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

router.use(authenticateToken);
router.post('/deposit', initiateDeposit);
router.get('/methods', getPaymentMethods);
router.get('/transactions', getTransactions);

module.exports = router;