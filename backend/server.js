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


const sequelize = require('./config/database');
const authRoutes = require('./routes/auth');

const app = express();

// Security Middleware
app.use(helmet()); // Sets various security headers
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000' // Your React app's URL
}));
app.use(express.json({ limit: '10kb' })); // Parse JSON bodies, max 10kb

// Rate Limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});
app.use('/api/', limiter); // Apply to all API routes

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes); 
app.use('/api/data', dataRoutes);
app.use('/api/tournaments', tournamentRoutes);

// Health Check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'OK', message: 'Server is running!' });
});

// 404 Handler
app.all('*', (req, res) => {
  res.status(404).json({ message: 'Route not found' });
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
    return sequelize.sync(); // { force: true } drops tables and recreates them. Use with extreme caution!
  })
  .then(() => {
    app.listen(PORT, () => {
      console.log(`🚀 Server is running on port ${PORT}`);
    });
  })
  .catch(err => {
    console.error('❌ Unable to connect to the database:', err);
  });