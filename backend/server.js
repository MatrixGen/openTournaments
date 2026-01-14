// server.js — safe + production-friendly (migrations only, no sequelize.sync)

require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const path = require('path');
const schedule = require('node-schedule');

// 🧱 Routes
const userRoutes = require('./routes/users');
const publicProfileRoutes = require('./routes/publicProfileRoutes');
const dataRoutes = require('./routes/data');
const tournamentRoutes = require('./routes/tournaments');
const matchRoutes = require('./routes/matches');
const adminRoutes = require('./routes/admin');
const notificationRoutes = require('./routes/notifications');
const paymentRoutes = require('./routes/payments');
const payoutRoutes = require('./routes/payout');
const transactions = require('./routes/transactions');
const authRoutes = require('./routes/auth');
const friendRoutes = require('./routes/friends');
const verificationRoutes = require('./routes/verification');
const supportRoutes = require('./routes/support');
const requireCurrency = require('./middleware/requireCurrency');
const attachResponseCurrency = require('./middleware/attachResponseCurrency');

// ⚙️ Services
const WebSocketService = require('./services/websocketService');
const AutoConfirmService = require('./services/autoConfirmService');
const AutoDeleteTournamentService = require('./services/autoDeleteTournamentService');
const FileCleanupService = require('./services/fileCleanupService');
const MatchDeadlineService = require('./services/matchDeadlineService');
const { pingRedis } = require('./config/redis');

// 🗄️ Database
const sequelize = require('./config/database');

// Auth
const passport = require('./config/passport');

const app = express();
const PORT = Number(process.env.PORT) || 5000;
const ENV = process.env.NODE_ENV || 'development';

console.log(`🌱 Starting server in '${ENV}' mode...`);

/* =========================
   Security + CORS
   ========================= */

app.use(
  helmet({
    contentSecurityPolicy: false,
  })
);

// Normalize allowed origins
const allowedOrigins = [
  'http://localhost:5173',
  'https://www.open-tournament.com',
  'https://open-tournament.com',
  'https://chatapi.open-tournament.com',
  process.env.FRONTEND_URL?.trim(),
].filter(Boolean);

const corsOptions = {
  origin: (origin, callback) => {
    // Allow curl/Postman/server-to-server
    if (!origin) return callback(null, true);

    if (allowedOrigins.includes(origin)) return callback(null, true);

    console.warn('🚫 Blocked by CORS:', origin);
    return callback(new Error(`CORS blocked: ${origin}`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Currency', 'X-Request-Timestamp'],
};

// Apply CORS to all routes
app.use(cors(corsOptions));

// Handle preflight once (don’t duplicate)
app.options('*', cors(corsOptions));

/* =========================
   Basic middleware
   ========================= */

// Serve uploads
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Body parser
app.use(express.json({ limit: '10kb' }));

// Rate limiting
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: 'Too many login attempts, please try again later.',
});

const generalLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 1000,
  message: 'Too many requests, slow down.',
});

app.use(passport.initialize());
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);
app.use('/api/', generalLimiter);
app.use(
  '/api',
  requireCurrency({
    excludedPaths: [
      '/health',
      '/health/redis',
      '/auth',
      '/payments/webhook/payment',
      '/payouts/webhook/payout',
    ],
  })
);
app.use(
  '/api',
  attachResponseCurrency({
    excludedPaths: [
      '/health',
      '/health/redis',
      '/auth',
      '/payments/webhook/payment',
      '/payouts/webhook/payout',
    ],
  })
);

/* =========================
   Routes
   ========================= */

app.use('/api/auth', authRoutes);
app.use('/api/users', publicProfileRoutes);
app.use('/api/user', userRoutes);
app.use('/api/data', dataRoutes);
app.use('/api/tournaments', tournamentRoutes);
app.use('/api/matches', matchRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/payouts', payoutRoutes);
app.use('/api/transactions', transactions);
app.use('/api/friends', friendRoutes);
app.use('/api/auth/verification', verificationRoutes);
app.use('/api/support', supportRoutes);

/* =========================
   Health checks
   ========================= */

app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    environment: ENV,
    message: 'Server is running! 🚀',
  });
});

app.get('/api/health/redis', async (req, res) => {
  try {
    await pingRedis();
    res.status(200).json({ ok: true });
  } catch (error) {
    res.status(503).json({ ok: false, error: error?.message || 'Redis ping failed' });
  }
});

/* =========================
   404 + Error handling
   ========================= */

app.all('*', (req, res) => {
  res.status(404).json({ message: 'Route not found ❌' });
});

// Better global error logging (don’t hide root causes)
app.use((error, req, res, next) => {
  console.error('💥 Global Error:', {
    name: error?.name,
    message: error?.message,
    stack: error?.stack,
    original: error?.original?.message,
    sql: error?.sql,
  });

  const status = error.statusCode || 500;
  res.status(status).json({ message: error.message || 'Internal Server Error' });
});

/* =========================
   Scheduled jobs
   ========================= */

// Daily file cleanup at 2 AM
schedule.scheduleJob('0 2 * * *', () => {
  console.log('🧹 Running file cleanup...');
  FileCleanupService.cleanupOrphanedFiles();
  FileCleanupService.cleanupOldFiles(30); // keep files for 30 days
});

/* =========================
   Startup + graceful shutdown
   ========================= */

let server; // HTTP server
let shuttingDown = false;

async function start() {
  try {
    await sequelize.authenticate();
    console.log('✅ Database connection established successfully.');
    console.log(`🗄️ Connected to: ${sequelize.config.database}`);
    console.log(`💾 Host: ${sequelize.config.host}`);

    // NOTE: migrations only — do NOT call sequelize.sync()

    console.log('🕐 Restoring scheduled tournament auto-confirm jobs...');
    await AutoConfirmService.restoreScheduledJobs();
    console.log('✅ Auto-confirm jobs restored successfully.');

    await AutoDeleteTournamentService.restoreScheduledJobs();
    console.log('✅ Auto-delete jobs restored successfully.');

    server = app.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 Server running on port ${PORT} 🌐`);
    });

    WebSocketService.initialize(server);
    MatchDeadlineService.startDeadlineWorker();
  } catch (err) {
    console.error('❌ Startup failed:', err);
    process.exit(1);
  }
}

async function shutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;

  console.log(`🛑 ${signal} received. Shutting down...`);

  try {
    // Close websockets (if your service exposes a close method)
    if (typeof WebSocketService.close === 'function') {
      await WebSocketService.close();
    }

    // Stop accepting new HTTP connections
    if (server) {
      await new Promise((resolve) => server.close(resolve));
      console.log('✅ HTTP server closed');
    }

    // Close DB connection
    await sequelize.close();
    console.log('✅ DB connection closed');

    process.exit(0);
  } catch (err) {
    console.error('❌ Shutdown error:', err);
    process.exit(1);
  }
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

process.on('uncaughtException', (err) => {
  console.error('🔥 Uncaught Exception:', err);
  shutdown('uncaughtException');
});

process.on('unhandledRejection', (err) => {
  console.error('🔥 Unhandled Rejection:', err);
  shutdown('unhandledRejection');
});

// Boot
start();
