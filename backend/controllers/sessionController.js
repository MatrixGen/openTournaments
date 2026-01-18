/**
 * Firebase Session Controller
 * 
 * Handles Firebase-based authentication sessions.
 * Creates/retrieves platform user and obtains chat tokens.
 * 
 * POST /api/auth/session
 *   - Verifies Firebase ID token
 *   - Creates or retrieves platform user
 *   - Gets chat tokens via platform-login
 *   - Returns complete session data
 */

const { User } = require('../models');
const ChatAuthService = require('../services/chatAuthService');

/**
 * Create or retrieve session for Firebase-authenticated user
 * 
 * Expected: Firebase ID token in Authorization header
 * Returns: Platform user + chat tokens
 */
const createSession = async (req, res) => {
  try {
    // req.firebaseUser is set by firebaseAuth middleware
    // req.user is the platform user (created if needed)
    const { firebaseUser, user } = req;

    if (!firebaseUser) {
      return res.status(401).json({
        success: false,
        error: 'NO_FIREBASE_USER',
        message: 'Firebase authentication required'
      });
    }

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'USER_NOT_FOUND',
        message: 'Platform user not found. Please complete registration.'
      });
    }

    // Update last login
    user.last_login = new Date();
    await user.save();

    console.log(`[Session] Creating session for user ${user.id} (${user.email})`);

    // Get chat tokens via platform-login
    let chatTokens = null;
    try {
      const chatAuth = await ChatAuthService.platformLogin({
        platformUserId: user.id,
        email: user.email,
        username: user.username,
        firebaseUid: user.firebase_uid,
        avatarUrl: user.avatar_url
        });

        // Chat backend wraps payload in { success, message, data: { token, refreshToken, user } }
        const payload = chatAuth?.data ? chatAuth.data : chatAuth;      // supports both styles
        const chatData = payload?.data ? payload.data : payload;

        chatTokens = {
        token: chatData?.token || null,
        refreshToken: chatData?.refreshToken || null,
        user: chatData?.user || null
        };

      
      console.log(`[Session] Chat tokens obtained for user ${user.id}`);
    } catch (chatError) {
      console.error(`[Session] Chat auth failed for user ${user.id}:`, chatError.message);
      // Continue without chat tokens - user can still access platform
    }

    // Build response
    const response = {
      success: true,
      message: 'Session created successfully',
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        phone_number: user.phone_number,
        avatar_url: user.avatar_url,
        wallet_balance: user.wallet_balance,
        wallet_currency: user.wallet_currency,
        role: user.role,
        is_verified: user.is_verified,
        email_verified: user.email_verified,
        phone_verified: user.phone_verified,
        oauth_provider: user.oauth_provider,
        firebase_uid: user.firebase_uid,
        created_at: user.createdAt
      },
      chat: chatTokens,
      // Include Firebase info for debugging
      firebase: {
        uid: firebaseUser.uid,
        signInProvider: firebaseUser.signInProvider,
        emailVerified: firebaseUser.emailVerified
      }
    };

    res.json(response);

  } catch (error) {
    console.error('[Session] Error creating session:', error);
    res.status(500).json({
      success: false,
      error: 'SESSION_ERROR',
      message: 'Failed to create session'
    });
  }
};

/**
 * Get current session info (for already authenticated users)
 */
const getSession = async (req, res) => {
  try {
    const { user } = req;

    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'NOT_AUTHENTICATED',
        message: 'No active session'
      });
    }

    res.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        phone_number: user.phone_number,
        avatar_url: user.avatar_url,
        wallet_balance: user.wallet_balance,
        wallet_currency: user.wallet_currency,
        role: user.role,
        is_verified: user.is_verified,
        email_verified: user.email_verified,
        oauth_provider: user.oauth_provider
      }
    });

  } catch (error) {
    console.error('[Session] Error getting session:', error);
    res.status(500).json({
      success: false,
      error: 'SESSION_ERROR',
      message: 'Failed to get session'
    });
  }
};

/**
 * Delete session (logout from chat)
 */
const deleteSession = async (req, res) => {
  try {
    const { user } = req;

    if (user) {
      // Optionally notify chat backend of logout
      try {
        await ChatAuthService.platformLogout(user.id);
      } catch (chatError) {
        console.warn('[Session] Chat logout notification failed:', chatError.message);
      }
    }

    res.json({
      success: true,
      message: 'Session ended successfully'
    });

  } catch (error) {
    console.error('[Session] Error deleting session:', error);
    res.status(500).json({
      success: false,
      error: 'SESSION_ERROR',
      message: 'Failed to end session'
    });
  }
};

module.exports = {
  createSession,
  getSession,
  deleteSession
};
