'use strict';

const { User } = require('../models');
const { resolveRequestCurrency } = require('../utils/requestCurrency');

const buildExcludedMatcher = (excludedPaths = []) => {
  const normalized = excludedPaths
    .map((path) => (path.startsWith('/') ? path : `/${path}`))
    .filter(Boolean);

  return (reqPath) => normalized.some((path) => reqPath.startsWith(path));
};

const requireCurrency = (options = {}) => {
  const isExcluded = buildExcludedMatcher(options.excludedPaths);

  return async (req, res, next) => {
    if (isExcluded(req.path)) {
      return next();
    }

    try {
      const resolvedCurrency = resolveRequestCurrency(req);
      // Attach resolved currency to request for downstream handlers.
      req.requestCurrency = resolvedCurrency;

      if (req.user?.id) {
        let walletCurrency = req.user.wallet_currency;

        if (!walletCurrency) {
          const user = await User.findByPk(req.user.id, {
            attributes: ['id', 'wallet_currency'],
          });
          if (!user) {
            return res.status(404).json({
              code: 'USER_NOT_FOUND',
              message: 'User not found',
            });
          }
          walletCurrency = user.wallet_currency;
        }

        const requestCurrencyNormalized = resolvedCurrency.toUpperCase();
        const walletCurrencyNormalized = String(walletCurrency).toUpperCase();
        if (requestCurrencyNormalized !== walletCurrencyNormalized) {
          return res.status(409).json({
            code: 'CURRENCY_MISMATCH',
            message: 'Request currency does not match wallet currency.',
            wallet_currency: walletCurrencyNormalized,
            request_currency: requestCurrencyNormalized,
          });
        }
      }

      return next();
    } catch (error) {
      const code = error.code || 'INVALID_CURRENCY';
      const message = error.message || 'currency is required';
      return res.status(400).json({ code, message });
    }
  };
};

module.exports = requireCurrency;
