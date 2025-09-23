// server.js
require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const { Sequelize } = require('sequelize');
const userRoutes = require('./routes/users');
const dataRoutes = require('./routes/data');
const tournamentRoutes = require('./routes/tournaments'); 
const matchRoutes = require('./routes/matches');
const adminRoutes = require('./routes/admin');
const notificationRoutes = require('./routes/notifications');
const WebSocketService = require('./services/websocketService');
const paymentRoutes = require('./routes/payments');
const sequelize = require('./config/database');
const authRoutes = require('./routes/auth');
const friendRoutes = require('./routes/friends');
const verificationRoutes = require('./routes/verification');


const app = express();

// Security Middleware
app.use(helmet()); // Sets various security headers
app.use(cors({
  origin: [
    process.env.FRONTEND_URL ,
     'http://localhost:3000',
     
    ]// Your React app's URL
}));
app.use(express.json({ limit: '10kb' })); // Parse JSON bodies, max 10kb


// Strict limiter for auth (login, register)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // only 5 requests in 15 min per IP
  message: 'Too many login attempts, please try again later.'
});

// Relaxed limiter for everything else
const generalLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 1000, // allow 1000 requests per minute
  message: 'Too many requests, slow down.'
});

// Apply strict limiter only on login & register
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);

// Apply relaxed limiter on all other API routes
app.use('/api/', generalLimiter);


// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes); 
app.use('/api/data', dataRoutes);
app.use('/api/tournaments', tournamentRoutes);
app.use('/api/matches', matchRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/friends', friendRoutes);
app.use('/api/auth/verification', verificationRoutes);

// Health Check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'OK', message: 'Server is running!' });
});

// 404 Handler
app.all('*', (req, res) => {
  res.status(404).json({ message: 'Route not found at all' });
});

// Global Error Handler
app.use((error, req, res, next) => {
  console.error(error.stack);
  const status = error.statusCode || 500;
  const message = error.message || 'Internal Server Error';
  res.status(status).json({ message });
});

// Database connection and server start
const PORT = process.env.PORT || 5000;

sequelize.authenticate()
  .then(() => {
    console.log('✅ Database connection established successfully.');
    return sequelize.sync(); 
  })
  .then(() => {
    const server = app.listen(PORT, () => {
      console.log(`🚀 Server is running on port ${PORT}`);
    });

    // Initialize WebSocket service with the same HTTP server
    WebSocketService.initialize(server);
  })
  .catch(err => {
    console.error('❌ Unable to connect to the database:', err);
  });
