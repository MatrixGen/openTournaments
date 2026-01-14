'use strict';

const buildExcludedMatcher = (excludedPaths = []) => {
  const normalized = excludedPaths
    .map((path) => (path.startsWith('/') ? path : `/${path}`))
    .filter(Boolean);

  return (reqPath) => normalized.some((path) => reqPath.startsWith(path));
};

const attachResponseCurrency = (options = {}) => {
  const isExcluded = buildExcludedMatcher(options.excludedPaths);

  return (req, res, next) => {
    if (isExcluded(req.path)) {
      return next();
    }

    const originalJson = res.json.bind(res);

    res.json = (body) => {
      const resolvedCurrency = req.requestCurrency;
      if (resolvedCurrency) {
        res.set('X-Currency', resolvedCurrency);
      }

      if (body === null || body === undefined) {
        return originalJson(body);
      }

      if (typeof body === 'object' && !Array.isArray(body)) {
        const normalizedBody =
          typeof body.toJSON === 'function' ? body.toJSON() : body;
        const hasCurrencyKey =
          Object.prototype.hasOwnProperty.call(normalizedBody, 'currency') ||
          Object.prototype.hasOwnProperty.call(normalizedBody, 'request_currency') ||
          Object.prototype.hasOwnProperty.call(normalizedBody, 'client_currency') ||
          Object.prototype.hasOwnProperty.call(normalizedBody, 'wallet_currency');

        if (!hasCurrencyKey && resolvedCurrency) {
          return originalJson({ ...normalizedBody, currency: resolvedCurrency });
        }

        return originalJson(normalizedBody);
      }

      if (resolvedCurrency) {
        return originalJson({ currency: resolvedCurrency, data: body });
      }

      return originalJson(body);
    };

    return next();
  };
};

module.exports = attachResponseCurrency;
