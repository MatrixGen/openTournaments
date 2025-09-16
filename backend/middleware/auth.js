// middleware/auth.js
const jwt = require('jsonwebtoken');
const { User } = require('../models');

const authenticateToken = async (req, res, next) => {
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

module.exports = {
  authenticateToken,
  requireAdmin
};