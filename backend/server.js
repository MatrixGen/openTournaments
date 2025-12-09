require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const { Sequelize } = require('sequelize');
const path = require('path');
const schedule = require('node-schedule');

// 🧱 Import routes
const userRoutes = require('./routes/users');
const dataRoutes = require('./routes/data');
const tournamentRoutes = require('./routes/tournaments');
const matchRoutes = require('./routes/matches');
const adminRoutes = require('./routes/admin');
const notificationRoutes = require('./routes/notifications');
const paymentRoutes = require('./routes/payments');
const transactions = require ('./routes/transactions')
const authRoutes = require('./routes/auth');
const friendRoutes = require('./routes/friends');
const verificationRoutes = require('./routes/verification');
// In server.js, add this import
const supportRoutes = require('./routes/support');



// ⚙️ Services
const WebSocketService = require('./services/websocketService');
const AutoConfirmService = require('./services/autoConfirmService');
const AutoDeleteTournamentService = require('./services/autoDeleteTournamentService');
const FileCleanupService = require('./services/fileCleanupService');

// 🗄️ Database
const sequelize = require('./config/database');

const app = express();
const PORT = process.env.PORT || 5000;
const ENV = process.env.NODE_ENV || 'development';
console.log(`🌱 Starting server in '${ENV}' mode...`);

// ✅ Security Middleware
app.use(helmet({
  contentSecurityPolicy: false, // disable CSP to simplify CORS/preflight
}));

// ✅ CORS
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  'http://138.197.39.55:5173',
  'http://138.197.39.55',
  'http://open-tournament.com',
  'https://open-tournament.com',  // ✅ Add HTTPS version
  process.env.FRONTEND_URL?.trim(),
];


app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (allowedOrigins.some(o => origin.startsWith(o))) {
      return callback(null, true);
    }
    console.warn('🚫 Blocked by CORS:', origin);
    callback(new Error('Not allowed by CORS'));
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}));

// Enable preflight for all routes
app.options('*', cors());

// ✅ Serve static uploads
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ✅ Body parser
app.use(express.json({ limit: '10kb' }));

// ✅ Rate limiting
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50,
  message: 'Too many login attempts, please try again later.',
});
const generalLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 1000,
  message: 'Too many requests, slow down.',
});
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);
app.use('/api/', generalLimiter);

// ✅ Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/data', dataRoutes);
app.use('/api/tournaments', tournamentRoutes);
app.use('/api/matches', matchRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/transactions',transactions)
app.use('/api/friends', friendRoutes);
app.use('/api/auth/verification', verificationRoutes);
app.use('/api/support', supportRoutes);

// ✅ Health check
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'OK', environment: ENV, message: 'Server is running! 🚀' });
});

// 🚫 404 Handler
app.all('*', (req, res) => {
  res.status(404).json({ message: 'Route not found ❌' });
});

// 🧯 Global error handler
app.use((error, req, res, next) => {
  console.error('💥 Global Error:', error.stack);
  const status = error.statusCode || 500;
  const message = error.message || 'Internal Server Error';
  res.status(status).json({ message });
});

// 🗓 Schedule daily file cleanup at 2 AM
schedule.scheduleJob('0 2 * * *', () => {
  console.log('🧹 Running file cleanup...');
  FileCleanupService.cleanupOrphanedFiles();
  FileCleanupService.cleanupOldFiles(30); // keep files for 30 days
});

// 🚀 Start server after DB connection & AutoConfirm restore
sequelize.authenticate()
  .then(async () => {
    console.log('✅ Database connection established successfully.');
    console.log(`🗄️ Connected to: ${sequelize.config.database}`);
    console.log(`💾 Host: ${sequelize.config.host}`);

    await sequelize.sync();

    console.log('🕐 Restoring scheduled tournament auto-confirm jobs...');
    await AutoConfirmService.restoreScheduledJobs();
    console.log('✅ Auto-confirm jobs restored successfully.');

    await AutoDeleteTournamentService.restoreScheduledJobs();
    console.log('✅ Auto-delete jobs restored successfully.');

    const server = app.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 Server running on port ${PORT} 🌐`);
    });

    WebSocketService.initialize(server);
  })
  .catch((err) => {
    console.error('❌ Unable to connect to the database:', err);
    process.exit(1);
  });
