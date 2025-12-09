// middleware/auth.js
const jwt = require('jsonwebtoken');
const { User } = require('../models');

const authenticateToken = async (req, res, next) => {
  //this if statement apply to get tournament by id for unatheticated user
  if (req.method === 'GET' && req.path === '/:id') {
    return next(); 
  }
  
  try {
    // 1. Get token from header
    const authHeader = req.headers['authorization'] || req.headers['Authorization'];

    const token = authHeader && authHeader.split(' ')[1]; // Format: "Bearer <TOKEN>"

    if (!token) {
      return res.status(401).json({ message: 'Access token required.' });
    }

    // 2. Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // 3. Find user from token payload
    const user = await User.findByPk(decoded.userId, {
      attributes: { exclude: ['password_hash'] } 
    });

    if (!user) {
      return res.status(401).json({ message: 'Invalid token.' });
    }

    // 4. Check if user is banned
    if (user.is_banned) {
      return res.status(403).json({ message: 'Account has been banned.' });
    }

    // 5. Attach user to request object
    req.user = user;
    next();

  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(403).json({ message: 'Invalid or expired token.' });
    }
    next(error);
  }
};

// Optional: Admin-only middleware
const requireAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Admin access required.' });
  }
  next();
};

// Add this function to your existing auth.js middleware file
const optionalAuthenticate = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    // No token provided, continue without user
    req.user = null;
    return next();
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      // Invalid token, continue without user
      req.user = null;
      return next();
    }
    req.user = user;
    next();
  });
};

module.exports = {
  optionalAuthenticate,
  authenticateToken,
  requireAdmin
};