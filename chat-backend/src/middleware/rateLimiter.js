const redisService = require('../services/redisService');

const createRateLimiter = (maxRequests, windowMs, keyGenerator) => {
  return async (req, res, next) => {
    try {
      const key = keyGenerator ? keyGenerator(req) : `rate_limit:${req.ip}:${req.path}`;
      
      const limit = await redisService.checkRateLimit(key, maxRequests, windowMs);
      
      if (!limit.allowed) {
        return res.status(429).json({
          success: false,
          error: {
            code: 'RATE_LIMIT_EXCEEDED',
            message: 'Too many requests, please try again later'
          },
          meta: {
            retryAfter: Math.ceil(windowMs / 1000),
            limit: maxRequests,
            window: windowMs
          }
        });
      }
      
      // Add rate limit headers
      res.set({
        'X-RateLimit-Limit': maxRequests,
        'X-RateLimit-Remaining': limit.remaining,
        'X-RateLimit-Reset': new Date(Date.now() + windowMs).toISOString()
      });
      
      next();
    } catch (error) {
      console.error('Rate limiting error:', error);
      next(); // Fail open - don't block requests if Redis is down
    }
  };
};

// Pre-configured rate limiters
const rateLimiters = {
  // Strict limits for authentication
  auth: createRateLimiter(5, 15 * 60 * 1000, (req) => 
    `rate_limit:auth:${req.ip}` // 5 attempts per 15 minutes
  ),
  
  // Message sending limits
  messages: createRateLimiter(60, 60 * 1000, (req) => 
    `rate_limit:messages:${req.user?.id || req.ip}` // 60 messages per minute
  ),
  
  // General API limits
  api: createRateLimiter(1000, 15 * 60 * 1000, (req) => 
    `rate_limit:api:${req.ip}` // 1000 requests per 15 minutes
  ),
  
  // WebSocket connection limits
  websocket: createRateLimiter(10, 60 * 1000, (req) => 
    `rate_limit:ws:${req.ip}` // 10 connections per minute
  )
};

module.exports = rateLimiters;