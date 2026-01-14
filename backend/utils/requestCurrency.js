'use strict';

const CurrencyUtils = require('./currencyUtils');
const { WalletError } = require('../errors/WalletError');

const resolveRequestCurrency = (req) => {
  const headerCurrency = req.headers?.['x-currency'];
  const bodyCurrency = req.body?.currency;
  const bodyRequestCurrency = req.body?.request_currency;
  const bodyClientCurrency = req.body?.client_currency;
  const queryCurrency = req.query?.currency;

  const rawCurrency = headerCurrency || bodyCurrency || bodyRequestCurrency || bodyClientCurrency || queryCurrency;

  if (!rawCurrency || typeof rawCurrency !== 'string' || rawCurrency.trim().length === 0) {
    throw new WalletError('MISSING_CURRENCY', 'currency is required');
  }

  const normalized = rawCurrency.trim().toUpperCase();

  if (!CurrencyUtils.isValidCurrency(normalized)) {
    throw new WalletError('INVALID_CURRENCY', `Unsupported currency: ${normalized}`);
  }

  return normalized;
};

module.exports = {
  resolveRequestCurrency,
};
