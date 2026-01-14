// middleware/currencyMiddleware.js
const { resolveRequestCurrency } = require('../utils/requestCurrency');

const currencyMiddleware = (req, res, next) => {
  try {
    const currency = resolveRequestCurrency(req);
    req.clientCurrency = currency;
    res.setHeader('X-Client-Currency', currency);
    next();
  } catch (error) {
    return res.status(400).json({
      success: false,
      error: error.message,
      code: error.code
    });
  }
};

module.exports = currencyMiddleware;
