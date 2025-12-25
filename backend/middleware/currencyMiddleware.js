// middleware/currencyMiddleware.js
const supportedCurrencies = ['TZS', 'USD'];

const currencyMiddleware = (req, res, next) => {
  // Get currency from multiple sources (header, body, query)
  const currencyFromHeader = req.headers['x-currency'];
  const currencyFromBody = req.body?.currency || req.body?.request_currency;
  const currencyFromQuery = req.query?.currency;
  
  // Priority: Body > Header > Query
  let currency = currencyFromBody || currencyFromHeader || currencyFromQuery || 'TZS';
  
  // Normalize to uppercase
  currency = currency.toUpperCase().trim();
  
  // Validate currency
  if (!supportedCurrencies.includes(currency)) {
    return res.status(400).json({
      success: false,
      error: `Unsupported currency: ${currency}. Supported: ${supportedCurrencies.join(', ')}`
    });
  }
  
  // Attach to request object
  req.clientCurrency = currency;
  
  // Add to response headers for debugging
  res.setHeader('X-Client-Currency', currency);
  
  next();
};

module.exports = currencyMiddleware;