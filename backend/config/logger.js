// config/logger.js
const winston = require('winston');
const path = require('path');
const fs = require('fs');

// Ensure log directory exists
const logDir = process.env.LOG_DIR || 'logs';
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

// Define log format
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

// Define console format (simpler, colored output)
const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'HH:mm:ss' }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    let metaStr = '';
    
    // Handle different meta data structures
    if (Object.keys(meta).length > 0) {
      if (meta.stack) {
        metaStr = `\n${meta.stack}`;
      } else if (meta.meta && Object.keys(meta.meta).length > 0) {
        // For structured logging
        metaStr = ' ' + JSON.stringify(meta.meta, null, 2);
      } else if (meta.message) {
        // For error objects
        metaStr = ` ${meta.message}`;
      }
    }
    
    return `[${timestamp}] ${level}: ${message}${metaStr}`;
  })
);

// Create transports array
const transports = [];

// Console transport for all environments
transports.push(
  new winston.transports.Console({
    format: consoleFormat,
    level: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),
  })
);

// File transports for production
if (process.env.NODE_ENV === 'production') {
  // Combined log file
  transports.push(
    new winston.transports.File({
      filename: path.join(logDir, 'combined.log'),
      format: logFormat,
      maxsize: 5242880, // 5MB
      maxFiles: 5,
      level: 'info',
    })
  );
  
  // Error log file
  transports.push(
    new winston.transports.File({
      filename: path.join(logDir, 'error.log'),
      format: logFormat,
      maxsize: 5242880, // 5MB
      maxFiles: 5,
      level: 'error',
    })
  );
  
  // Access log file (for HTTP requests)
  transports.push(
    new winston.transports.File({
      filename: path.join(logDir, 'access.log'),
      format: logFormat,
      maxsize: 5242880, // 5MB
      maxFiles: 5,
      level: 'http',
    })
  );
}

// Development-specific file transport
if (process.env.NODE_ENV === 'development') {
  transports.push(
    new winston.transports.File({
      filename: path.join(logDir, 'development.log'),
      format: logFormat,
      level: 'debug',
    })
  );
}

// Create the logger instance
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: logFormat,
  transports,
  exitOnError: false, // Don't crash on logger errors
});

// Create a stream for Morgan (HTTP request logging)
logger.stream = {
  write: (message) => {
    logger.http(message.trim());
  },
};

// Helper methods for structured logging
logger.infoWithMeta = (message, meta) => {
  logger.info(message, { meta });
};

logger.errorWithMeta = (message, meta) => {
  logger.error(message, { meta });
};

logger.warnWithMeta = (message, meta) => {
  logger.warn(message, { meta });
};

logger.debugWithMeta = (message, meta) => {
  logger.debug(message, { meta });
};

// Request logging middleware
logger.logRequest = (req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    const logData = {
      method: req.method,
      url: req.originalUrl || req.url,
      status: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip || req.connection.remoteAddress,
      userAgent: req.get('User-Agent'),
      userId: req.user?.id || 'anonymous',
    };
    
    // Don't log health checks in production
    if (req.path === '/health' && process.env.NODE_ENV === 'production') {
      return;
    }
    
    if (res.statusCode >= 400) {
      logger.warn('HTTP Request', logData);
    } else {
      logger.info('HTTP Request', logData);
    }
  });
  
  next();
};

// Error logging middleware
logger.logError = (error, req = null) => {
  const errorLog = {
    message: error.message,
    stack: error.stack,
    name: error.name,
    code: error.code,
  };
  
  if (req) {
    errorLog.request = {
      method: req.method,
      url: req.originalUrl || req.url,
      ip: req.ip || req.connection.remoteAddress,
      userId: req.user?.id,
      params: req.params,
      query: req.query,
      body: redactSensitiveData(req.body),
    };
  }
  
  logger.error('Application Error', errorLog);
};

// Security: Redact sensitive data from logs
function redactSensitiveData(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  
  const sensitiveFields = [
    'password',
    'token',
    'secret',
    'key',
    'authorization',
    'cookie',
    'creditCard',
    'ssn',
    'cvv',
  ];
  
  const redacted = { ...obj };
  
  for (const key in redacted) {
    if (redacted[key] && typeof redacted[key] === 'object') {
      redacted[key] = redactSensitiveData(redacted[key]);
    } else if (sensitiveFields.some(field => key.toLowerCase().includes(field))) {
      redacted[key] = '[REDACTED]';
    }
  }
  
  return redacted;
}

// Database query logger (if using Sequelize)
logger.logDatabaseQuery = (sequelize) => {
  if (process.env.NODE_ENV === 'development') {
    sequelize.options.logging = (sql, timing) => {
      if (timing && timing > 1000) { // Log slow queries (>1 second)
        logger.warn('Slow Database Query', {
          sql,
          timing: `${timing}ms`,
        });
      } else {
        logger.debug('Database Query', { sql, timing: timing ? `${timing}ms` : undefined });
      }
    };
  } else {
    sequelize.options.logging = (sql, timing) => {
      if (timing && timing > 2000) { // Log very slow queries (>2 seconds) in production
        logger.warn('Slow Database Query', {
          sql: sql.substring(0, 500), // Limit SQL length
          timing: `${timing}ms`,
        });
      }
    };
  }
};

// Application startup/shutdown logging
logger.logStartup = (appName, version, port) => {
  logger.info(`${appName} v${version} starting...`, {
    app: appName,
    version,
    port,
    nodeVersion: process.version,
    environment: process.env.NODE_ENV || 'development',
    pid: process.pid,
  });
};

logger.logShutdown = (signal) => {
  logger.info(`Received ${signal}. Starting graceful shutdown...`);
};

// Performance monitoring
logger.startTimer = (operation) => {
  const start = process.hrtime.bigint();
  return {
    end: () => {
      const end = process.hrtime.bigint();
      const duration = Number(end - start) / 1000000; // Convert to milliseconds
      logger.debug(`${operation} completed`, { operation, duration: `${duration.toFixed(2)}ms` });
      return duration;
    },
  };
};

// Audit logging for sensitive operations
logger.audit = (action, userId, details) => {
  logger.info('Audit Log', {
    action,
    userId,
    timestamp: new Date().toISOString(),
    details: redactSensitiveData(details),
    ip: details?.ip || 'unknown',
  });
};

// Export the logger
module.exports = logger;