/**
 * Firebase Authentication Middleware
 * 
 * Verifies Firebase ID tokens and attaches user info to request.
 * This replaces platform JWT verification for Firebase-authenticated users.
 * 
 * Usage:
 *   router.get('/protected', firebaseAuth, (req, res) => {
 *     // req.firebaseUser contains decoded token
 *     // req.user contains platform user (if found)
 *   });
 */

const admin = require('../config/fireBaseConfig');
const { User } = require('../models');

/**
 * Verify Firebase ID token and attach user info to request
 * @param {boolean} options.createUser - Auto-create user if not found (default: false)
 * @param {boolean} options.required - Fail if no token (default: true)
 */
const firebaseAuth = (options = {}) => {
  const { createUser = false, required = true } = options;

  return async (req, res, next) => {
    try {
      // Extract token from Authorization header
      const authHeader = req.headers.authorization;
      
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        if (required) {
          return res.status(401).json({
            success: false,
            error: 'MISSING_TOKEN',
            message: 'Firebase ID token is required'
          });
        }
        return next();
      }

      const idToken = authHeader.split('Bearer ')[1];

      // Verify the Firebase ID token
      let decodedToken;
      try {
        decodedToken = await admin.auth().verifyIdToken(idToken);
      } catch (verifyError) {
        console.error('[FirebaseAuth] Token verification failed:', verifyError.code);
        
        // Handle specific Firebase errors
        if (verifyError.code === 'auth/id-token-expired') {
          return res.status(401).json({
            success: false,
            error: 'TOKEN_EXPIRED',
            message: 'Firebase token has expired. Please refresh.'
          });
        }
        
        if (verifyError.code === 'auth/id-token-revoked') {
          return res.status(401).json({
            success: false,
            error: 'TOKEN_REVOKED',
            message: 'Firebase token has been revoked'
          });
        }

        return res.status(401).json({
          success: false,
          error: 'INVALID_TOKEN',
          message: 'Invalid Firebase ID token'
        });
      }

      // Attach decoded token to request
      req.firebaseUser = {
        uid: decodedToken.uid,
        email: decodedToken.email,
        emailVerified: decodedToken.email_verified,
        name: decodedToken.name,
        picture: decodedToken.picture,
        signInProvider: decodedToken.firebase?.sign_in_provider,
        authTime: new Date(decodedToken.auth_time * 1000)
      };

      console.log(`[FirebaseAuth] Token verified for: ${decodedToken.email} (${decodedToken.uid})`);

      // Find platform user by firebase_uid
      let user = await User.findOne({
        where: { firebase_uid: decodedToken.uid }
      });

      // If not found by firebase_uid, try by email (for migration)
      if (!user && decodedToken.email) {
        user = await User.findOne({
          where: { email: decodedToken.email }
        });

        // Link existing user to Firebase UID
        if (user && !user.firebase_uid) {
          console.log(`[FirebaseAuth] Linking existing user ${user.id} to Firebase UID`);
          user.firebase_uid = decodedToken.uid;
          user.oauth_provider = 'firebase';
          user.email_verified = decodedToken.email_verified || user.email_verified;
          await user.save();
        }
      }

      // Auto-create user if option enabled and user not found
      if (!user && createUser) {
        console.log(`[FirebaseAuth] Creating new user for Firebase UID: ${decodedToken.uid}`);
        user = await createPlatformUser(decodedToken);
      }

      // Check if user is banned
      if (user?.is_banned) {
        return res.status(403).json({
          success: false,
          error: 'USER_BANNED',
          message: 'Your account has been suspended'
        });
      }

      // Attach platform user to request
      req.user = user;

      next();
    } catch (error) {
      console.error('[FirebaseAuth] Unexpected error:', error);
      return res.status(500).json({
        success: false,
        error: 'AUTH_ERROR',
        message: 'Authentication failed'
      });
    }
  };
};

/**
 * Create a new platform user from Firebase token data
 */
async function createPlatformUser(decodedToken) {
  // Generate username from email or name
  let baseUsername = decodedToken.email?.split('@')[0] || 
                     decodedToken.name?.replace(/\s+/g, '_').toLowerCase() || 
                     'user';
  
  // Ensure username is unique
  let username = baseUsername;
  let counter = 1;
  
  while (await User.findOne({ where: { username } })) {
    username = `${baseUsername}_${counter}`;
    counter++;
    if (counter > 100) {
      // Fallback to random suffix
      username = `${baseUsername}_${Date.now().toString().slice(-6)}`;
      break;
    }
  }

  // Create the user
  const newUser = await User.create({
    firebase_uid: decodedToken.uid,
    email: decodedToken.email,
    username: username,
    oauth_provider: 'firebase',
    email_verified: decodedToken.email_verified || false,
    avatar_url: decodedToken.picture || null,
    role: 'user',
    is_verified: decodedToken.email_verified || false
  });

  console.log(`[FirebaseAuth] Created new user: ${newUser.id} (${newUser.email})`);
  return newUser;
}

/**
 * Simple middleware that requires Firebase auth AND platform user
 */
const requireFirebaseUser = firebaseAuth({ createUser: false, required: true });

/**
 * Middleware that auto-creates platform user if not found
 */
const firebaseAuthWithAutoCreate = firebaseAuth({ createUser: true, required: true });

/**
 * Optional Firebase auth - doesn't fail if no token
 */
const optionalFirebaseAuth = firebaseAuth({ createUser: false, required: false });

module.exports = {
  firebaseAuth,
  requireFirebaseUser,
  firebaseAuthWithAutoCreate,
  optionalFirebaseAuth,
  createPlatformUser
};
