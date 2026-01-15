const assert = require('assert');

const PaymentController = require('../controllers/paymentController');

(() => {
  const mapped = PaymentController.mapClickPesaStatus('SETTLED');
  assert.strictEqual(mapped, 'completed');

  assert.strictEqual(PaymentController.isValidDepositStatus('completed'), true);
  assert.strictEqual(PaymentController.isValidDepositStatus('successful'), false);
})();
