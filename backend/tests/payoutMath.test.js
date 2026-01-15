const assert = require("assert");

const calculateDebitUsd = (receiveUsd, rate, clickpesaFeeTzs, platformFeeTzs) => {
  const receiveTzs = receiveUsd * rate;
  const grossTzs = receiveTzs + clickpesaFeeTzs + platformFeeTzs;
  return grossTzs / rate;
};

(() => {
  const receiveUsd = 1;
  const rate = 2400;
  const clickpesaFeeTzs = 112;
  const platformFeeTzs = clickpesaFeeTzs;
  const expectedDebitUsd = (2400 + clickpesaFeeTzs + platformFeeTzs) / 2400;

  const debitUsd = calculateDebitUsd(
    receiveUsd,
    rate,
    clickpesaFeeTzs,
    platformFeeTzs
  );

  assert.ok(
    Math.abs(debitUsd - expectedDebitUsd) < 1e-12,
    `Expected ${expectedDebitUsd} but got ${debitUsd}`
  );
})();
