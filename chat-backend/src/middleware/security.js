const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const hpp = require('hpp');
const cors = require('cors');
const rateLimit = require('express-rate-limit');

  // =====================
  // CORS configuration
  // =====================
  const allowedOrigins = [
    process.env.CLIENT_URL,          // Production URL, e.g., https://myapp.com
    'http://localhost:3000',         // Local dev
    'http://localhost:5173',         // Vite dev server
    'http://127.0.0.1:5173',        // Sometimes localhost resolves to 127.0.0.1
    'http://192.168.132.201:5173',  // LAN dev IP (replace with yours)
    'https://open-tournament.com',
    'https://www.open-tournament.com'         // Production domain
  ].filter(Boolean);

  const corsOptions = {
    origin: function (origin, callback) {
      // Allow server-to-server requests or non-browser requests
      if (!origin) return callback(null, true);

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      } else {
        console.warn('CORS blocked:', origin);
        return callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
    optionsSuccessStatus: 200, // For legacy browsers
  };


// =====================
// Security headers with Helmet
// =====================
const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "ws:", "wss:"],
    },
  },
  crossOriginEmbedderPolicy: false, // Socket.IO compatible
});

// =====================
// HTTP Parameter Pollution protection
// =====================
const hppProtection = hpp({
  whitelist: ['page', 'limit', 'sort', 'fields', 'before', 'after']
});

// =====================
// Helper function to get client IP (IPv6 compatible)
// =====================
const getClientIp = (req) => {
  // Try to get IP from various headers (for proxies)
  const ip = req.ip || 
             req.connection?.remoteAddress || 
             req.socket?.remoteAddress ||
             req.connection?.socket?.remoteAddress;
  
  // Handle IPv6 format - convert to consistent format
  if (ip && ip.includes('::ffff:')) {
    return ip.replace('::ffff:', '');
  }
  
  return ip;
};

// =====================
// Rate limiters
// =====================

// General API limiter
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // Limit each IP to 1000 requests per windowMs
  message: {
    success: false,
    error: { code: 'RATE_LIMIT_EXCEEDED', message: 'Too many requests from this IP, please try again later.' }
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => getClientIp(req)
});

// Auth (login) limiter - more strict
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit each IP to 10 login attempts per windowMs
  message: {
    success: false,
    error: { code: 'AUTH_RATE_LIMIT', message: 'Too many authentication attempts, please try again later.' }
  },
  skipSuccessfulRequests: true, // Don't count successful logins
  keyGenerator: (req) => getClientIp(req)
});

// Message rate limiter - user-based with IP fallback
const messageLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 60, // Limit each user to 60 messages per minute
  keyGenerator: (req) => {
    // Use user ID if available (authenticated users)
    if (req.user?.id) {
      return `user:${req.user.id}`;
    }
    // Fallback to IP for unauthenticated (though messages should require auth)
    return getClientIp(req);
  },
  message: {
    success: false,
    error: { code: 'MESSAGE_RATE_LIMIT', message: 'Message rate limit exceeded. Please slow down.' }
  }
});

// =====================
// Export
// =====================
module.exports = {
  corsOptions,
  securityHeaders,
  mongoSanitize,
  xss,
  hppProtection,
  generalLimiter,
  authLimiter,
  messageLimiter
};