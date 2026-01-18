// middleware/auth.js
const jwt = require('jsonwebtoken');
const { User } = require('../models');
const admin = require('../config/fireBaseConfig');

/**
 * Unified authentication middleware
 * Supports both Firebase ID tokens and legacy platform JWTs
 */
const authenticateToken = async (req, res, next) => {
  //this if statement apply to get tournament by id for unauthenticated user
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

    // 2. Try Firebase token first (Firebase tokens are longer and have different structure)
    let user = null;
    let isFirebaseToken = false;

    try {
      // Attempt Firebase verification
      const decodedFirebase = await admin.auth().verifyIdToken(token);
      isFirebaseToken = true;

      // Find user by firebase_uid
      user = await User.findOne({
        where: { firebase_uid: decodedFirebase.uid },
        attributes: { exclude: ['password_hash'] }
      });

      // If not found by firebase_uid, try by email (for migration)
      if (!user && decodedFirebase.email) {
        user = await User.findOne({
          where: { email: decodedFirebase.email },
          attributes: { exclude: ['password_hash'] }
        });

        // Link the firebase_uid if found by email
        if (user && !user.firebase_uid) {
          user.firebase_uid = decodedFirebase.uid;
          await user.save();
        }
      }

      if (!user) {
        return res.status(401).json({ message: 'User not found. Please complete registration.' });
      }

    } catch (firebaseError) {
      // Not a valid Firebase token, try legacy JWT
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        user = await User.findByPk(decoded.userId, {
          attributes: { exclude: ['password_hash'] }
        });

        if (!user) {
          return res.status(401).json({ message: 'Invalid token.' });
        }

      } catch (jwtError) {
        // Neither Firebase nor JWT worked
        return res.status(403).json({ message: 'Invalid or expired token.' });
      }
    }

    // 3. Check if user is banned
    if (user.is_banned) {
      return res.status(403).json({ message: 'Account has been banned.' });
    }

    // 4. Attach user to request object
    req.user = user;
    req.isFirebaseAuth = isFirebaseToken;
    next();

  } catch (error) {
    console.error('[Auth] Unexpected error:', error);
    return res.status(500).json({ message: 'Authentication error.' });
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
const optionalAuthenticate = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    // No token provided, continue without user
    req.user = null;
    return next();
  }

  // Try Firebase first
  try {
    const decodedFirebase = await admin.auth().verifyIdToken(token);
    const user = await User.findOne({
      where: { firebase_uid: decodedFirebase.uid },
      attributes: { exclude: ['password_hash'] }
    });
    req.user = user;
    req.isFirebaseAuth = true;
    return next();
  } catch {
    // Not Firebase, try JWT
  }

  // Try legacy JWT
  jwt.verify(token, process.env.JWT_SECRET, async (err, decoded) => {
    if (err) {
      // Invalid token, continue without user
      req.user = null;
      return next();
    }
    try {
      const user = await User.findByPk(decoded.userId, {
        attributes: { exclude: ['password_hash'] }
      });
      req.user = user;
      req.isFirebaseAuth = false;
    } catch {
      req.user = null;
    }
    next();
  });
};

module.exports = {
  optionalAuthenticate,
  authenticateToken,
  requireAdmin
};