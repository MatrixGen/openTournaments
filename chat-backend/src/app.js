// src/app.js
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
//const morgan = require('morgan');
require('dotenv').config();

// Swagger
const { swaggerUi, specs } = require('./config/swagger');

// Security middleware
const {
  corsOptions,
  securityHeaders,
  mongoSanitize,
  xss,
  hppProtection,
  generalLimiter,
  authLimiter,
  messageLimiter
} = require('./middleware/security');

const app = express();

// =====================
// Global Middleware
// =====================
app.use(helmet());                   // Security headers
app.use(cors(corsOptions));          // CORS
//app.use(morgan('combined'));         // Logging
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Extra security
app.use(mongoSanitize());            // Prevent NoSQL injection
app.use(xss());                      // Prevent XSS
app.use(hppProtection);              // Prevent HTTP parameter pollution

// =====================
// Rate Limiting
// =====================
// Apply general rate limiting to all routes

app.use(generalLimiter);

// Apply specific rate limiters
app.use('/api/v1/auth/login', authLimiter);
app.use('/api/v1/auth/register', authLimiter);
app.use('/api/v1/messages', messageLimiter);

// =====================
// Health Check
// =====================
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    uptime: process.uptime(),
  });
});

// =====================
// Swagger Docs
// =====================
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs));

// =====================
// API Routes
// =====================
app.use('/api/v1/auth', require('./routes/auth'));
app.use('/api/v1/users', require('./routes/users'));
app.use('/api/v1/channels', require('./routes/channels'));
app.use('/api/v1/messages', require('./routes/messages'));
app.use('/api/v1/moderation', require('./routes/moderation'));

// =====================
// 404 Handler
// =====================
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: 'Route not found'
    },
    meta: {
      timestamp: new Date().toISOString(),
      path: req.originalUrl
    }
  });
});

// =====================
// Error Handler
// =====================
app.use((err, req, res, next) => {
  console.error('Error stack:', err.stack);
  
  // Handle rate limit errors
  if (err.status === 429) {
    return res.status(429).json({
      success: false,
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many requests, please try again later.'
      }
    });
  }

  res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: process.env.NODE_ENV === 'production' 
        ? 'Internal Server Error' 
        : err.message
    },
    meta: {
      timestamp: new Date().toISOString()
    }
  });
});

module.exports = app;