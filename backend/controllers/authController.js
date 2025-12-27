// controllers/authController.js
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { User } = require('../models');
const { validationResult } = require('express-validator'); 
const { Op } = require('sequelize');
const VerificationService = require('../services/verificationService');
const PasswordResetService = require('../services/passwordResetService');
const ChatAuthService = require('../services/chatAuthService');
const axios = require('axios'); 
const passport = require('passport'); 

// ========== HELPER FUNCTIONS ==========

/**
 * Handle OAuth redirect based on request type
 */
const handleOAuthRedirect = async (req, res, data) => {
  console.log('=== HANDLE OAUTH REDIRECT ===');
  
  const frontendBase = process.env.FRONTEND_URL;
  
  // Clean up the base URL (remove trailing slash)
  const cleanBase = frontendBase.endsWith('/') 
    ? frontendBase.slice(0, -1) 
    : frontendBase;
  
  // Build redirect URL
  const token = encodeURIComponent(data.tokens.platform);
  const user = encodeURIComponent(JSON.stringify(data.user));
  const redirectUrl = `${cleanBase}/oauth-callback?token=${token}&user=${user}`;
  
  console.log('🎯 Redirect URL:', redirectUrl);
  
  // 🔥 CRITICAL: Use res.redirect() NOT res.json()
  res.redirect(302, redirectUrl);
};

/**
 * Handle OAuth errors gracefully
 */
const handleOAuthError = (res, error) => {
  const errorRedirect = process.env.FRONTEND_ERROR_URL || 
                       process.env.FRONTEND_URL;
  
  const errorMessage = encodeURIComponent(
    error.message || 'Authentication failed'
  );
  
  res.redirect(`${errorRedirect}/login?error=${errorMessage}`);
};

/**
 * Verify Google ID token
 */
const verifyGoogleToken = async (idToken) => {
  const { OAuth2Client } = require('google-auth-library');
  const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
  
  const ticket = await client.verifyIdToken({
    idToken: idToken,
    audience: process.env.GOOGLE_CLIENT_ID
  });
  
  return ticket.getPayload();
};

// ========== REGISTRATION & LOGIN FUNCTIONS ==========

const register = async (req, res, next) => {
  try {
    // 1. Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { username, email, password, phone_number } = req.body;

    // 2. Check if user already exists
    const existingUser = await User.findOne({
      where: {
        [Op.or]: [{ email }, { username }] 
      }
    });

    if (existingUser) {
      // NEW: Check if existing user is Google OAuth user
      if (existingUser.oauth_provider === 'google') {
        return res.status(409).json({ 
          message: 'This email is associated with a Google account. Please sign in with Google.',
          authMethod: 'google'
        });
      }
      return res.status(409).json({ message: 'User already exists with this email or username.' });
    }

    // 3. Hash the password
    const saltRounds = 12;
    const password_hash = await bcrypt.hash(password, saltRounds);

    // 4. Create the user in the database
    const newUser = await User.create({
      username,
      email,
      password_hash,
      phone_number,
      oauth_provider: 'none' // Explicitly set for traditional registration
    });

    // 5. Generate platform JWT token
    const platformToken = jwt.sign(
      { userId: newUser.id, email: newUser.email },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    let chatToken = null;
    let chatRefreshToken = null;
    let chatUserId = null;

    // 6. Get chat authentication token
    try {
      const chatAuth = await ChatAuthService.getChatTokenForUser(newUser, password);
      chatToken = chatAuth.data.token || chatAuth.data.accessToken;
      chatRefreshToken = chatAuth.refreshToken;
      chatUserId = chatAuth.data.userId || chatAuth.data.id;
      
      console.log(`✅ Chat authentication successful for user: ${newUser.username}`);
    } catch (chatError) {
      console.error('⚠️ Chat authentication failed (but platform user created):', chatError.message);
      // Don't fail registration if chat auth fails
    }

    // 7. Send verification emails
    try {
      await VerificationService.sendEmailVerification(newUser);
    } catch (error) {
      console.error('Failed to send verification email:', error);
    }

    if (newUser.phone_number) {
      try {
        await VerificationService.sendPhoneVerification(newUser);
      } catch (error) {
        console.error('Failed to send phone verification:', error);
      }
    }

    // 8. Respond with both tokens
    res.status(201).json({
      message: 'User registered successfully!',
      tokens: {
        platform: platformToken,
        chat: chatToken,
        chatRefresh: chatRefreshToken
      },
      user: {
        id: newUser.id,
        username: newUser.username,
        email: newUser.email,
        phone_number: newUser.phone_number,
        wallet_balance: newUser.wallet_balance,
        chatUserId: chatUserId,
        oauth_provider: newUser.oauth_provider,
        has_password: !!newUser.password_hash
      }
    });

  } catch (error) {
    next(error);
  }
};

const login = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { login, password } = req.body;

    // 1. Find user by email OR username
    const user = await User.findOne({
      where: {
        [Op.or]: [{ email: login }, { username: login }]
      }
    });

    // 2. If user doesn't exist or password is wrong
    if (!user) {
      return res.status(401).json({ message: 'Invalid login credentials.' });
    }

    // NEW: Check if user is Google OAuth user
    if (user.oauth_provider === 'google' && !user.password_hash) {
      return res.status(400).json({ 
        message: 'This account uses Google Sign-In. Please sign in with Google.',
        authMethod: 'google'
      });
    }

    // 3. Check if user is banned
    if (user.is_banned) {
      return res.status(403).json({ message: 'Account has been banned.' });
    }

    // 4. Verify password - Only if user has password_hash
    if (!user.password_hash) {
      return res.status(401).json({ message: 'Invalid login credentials.' });
    }
    
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Invalid login credentials.' });
    }

    // 5. Update last login
    user.last_login = new Date();
    await user.save();

    // 6. Generate platform JWT token
    const platformToken = jwt.sign(
      { userId: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    let chatToken = null;
    let chatRefreshToken = null;
    let chatUserId = null;

    // 7. Get chat authentication token
    try {
      const chatAuth = await ChatAuthService.getChatTokenForUser(user, password);
      console.log('auth status :', chatAuth);
      
      chatToken = chatAuth.data.token || chatAuth.accessToken;
      chatRefreshToken = chatAuth.data.refreshToken;
      chatUserId = chatAuth.data.userId || chatAuth.data.id;
      
      console.log(`✅ Chat authentication successful for user: ${user.username}`);
    } catch (chatError) {
      console.error('⚠️ Chat authentication failed:', chatError.message);
      // Still allow login, but without chat token
    }

    // 8. Respond with both tokens
    res.json({
      message: 'Login successful!',
      tokens: {
        platform: platformToken,
        chat: chatToken,
        chatRefresh: chatRefreshToken
      },
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        phone_number: user.phone_number,
        wallet_balance: user.wallet_balance,
        role: user.role,
        chatUserId: chatUserId,
        oauth_provider: user.oauth_provider, 
        has_password: !!user.password_hash
      }
    });

  } catch (error) {
    next(error);
  }
};

// ========== GOOGLE OAUTH FUNCTIONS ==========

/**
 * Initiate Google OAuth flow
 */
const googleAuth = (req, res, next) => {
  // Pass custom state parameter for redirect URL
  const state = req.query.redirect_uri || '/';
  passport.authenticate('google', {
    scope: ['profile', 'email'],
    session: false,
    state: Buffer.from(state).toString('base64') // Encode redirect URI
  })(req, res, next);
};

/**
 * Google OAuth callback handler
 */
const googleAuthCallback = async (req, res, next) => {
  try {
    passport.authenticate('google', { session: false }, async (err, user, info) => {
      try {
        if (err) {
          console.error('Google OAuth error:', err);
          return handleOAuthError(res, err);
        }

        if (!user) {
          return handleOAuthError(res, new Error('Authentication failed'));
        }

        // Update last login
        user.last_login = new Date();
        await user.save();

        // Generate platform JWT token
        const platformToken = jwt.sign(
          { userId: user.id, email: user.email },
          process.env.JWT_SECRET,
          { expiresIn: '24h' }
        );

        let chatToken = null;
        let chatRefreshToken = null;
        let chatUserId = null;

        // Handle chat authentication based on user type
        if (user.oauth_provider === 'google') {
          // Google user - check if they have password set
          if (user.password_hash) {
            try {
              // Get chat token using stored password from verification_token
              const chatAuth = await ChatAuthService.getChatTokenForGoogleUser(user);
              chatToken = chatAuth.data?.token || chatAuth.token;
              chatRefreshToken = chatAuth.data?.refreshToken || chatAuth.refreshToken;
              chatUserId = chatAuth.data?.userId || chatAuth.userId;
              console.log(`✅ Chat authentication successful for Google user`);
            } catch (chatError) {
              console.error('⚠️ Chat auth failed for Google user:', chatError.message);
              // Continue without chat - user can set password later
            }
          } else {
            console.log(`ℹ️ Google user ${user.email} has no password set, chat unavailable`);
          }
        } else {
          // Regular user - use their password for chat
          try {
            const chatAuth = await ChatAuthService.getChatTokenForUser(user, req.body?.password);
            chatToken = chatAuth.data?.token || chatAuth.accessToken;
            chatRefreshToken = chatAuth.data?.refreshToken;
            chatUserId = chatAuth.data?.userId || chatAuth.data.id;
          } catch (chatError) {
            console.error('Chat auth failed:', chatError.message);
          }
        }

        // Prepare response
        const responseData = {
          message: 'Google authentication successful!',
          tokens: {
            platform: platformToken,
            chat: chatToken,
            chatRefresh: chatRefreshToken
          },
          user: {
            id: user.id,
            username: user.username,
            email: user.email,
            phone_number: user.phone_number,
            wallet_balance: user.wallet_balance,
            role: user.role,
            chatUserId: chatUserId,
            oauth_provider: user.oauth_provider,
            email_verified: user.email_verified,
            has_password: !!user.password_hash
          }
        };

        // Handle redirect
        await handleOAuthRedirect(req, res, responseData);

      } catch (innerError) {
        console.error('Error in Google callback:', innerError);
        handleOAuthError(res, innerError);
      }
    })(req, res, next);
  } catch (error) {
    next(error);
  }
};

/**
 * Link existing account to Google
 */
const linkGoogleAccount = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { googleToken } = req.body;

    if (!googleToken) {
      return res.status(400).json({ message: 'Google token is required' });
    }

    // Verify Google token
    const googleUser = await verifyGoogleToken(googleToken);
    
    // Check if Google account is already linked
    const existingGoogleUser = await User.findOne({
      where: { google_id: googleUser.sub }
    });

    if (existingGoogleUser) {
      return res.status(409).json({ 
        message: 'This Google account is already linked to another user' 
      });
    }

    // Update current user with Google info
    const user = await User.findByPk(userId);
    user.google_id = googleUser.sub;
    user.oauth_provider = 'google';
    user.email_verified = user.email_verified || true; // Google emails are verified
    
    await user.save();

    res.json({
      message: 'Google account linked successfully',
      user: {
        id: user.id,
        email: user.email,
        oauth_provider: user.oauth_provider
      }
    });

  } catch (error) {
    next(error);
  }
};

/**
 * Unlink Google account
 */
const unlinkGoogleAccount = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const user = await User.findByPk(userId);

    // Ensure user has another auth method
    if (!user.password_hash) {
      return res.status(400).json({ 
        message: 'Cannot unlink Google account. Please set a password first.' 
      });
    }

    user.google_id = null;
    user.oauth_provider = user.password_hash ? 'none' : user.oauth_provider;
    await user.save();

    res.json({
      message: 'Google account unlinked successfully',
      user: {
        id: user.id,
        email: user.email,
        oauth_provider: user.oauth_provider
      }
    });

  } catch (error) {
    next(error);
  }
};

/**
 * Add password for Google user
 */
const addPasswordForGoogleUser = async (req, res, next) => {
  try {
    const { password } = req.body;
    const userId = req.user.id;

    const user = await User.findByPk(userId);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check if user is Google OAuth user
    if (user.oauth_provider !== 'google') {
      return res.status(400).json({ message: 'This account is not a Google account' });
    }

    // Check if user already has a password
    if (user.password_hash) {
      return res.status(400).json({ message: 'Password already set for this account' });
    }

    // Validate password strength
    if (!password || password.length < 8) {
      return res.status(400).json({ message: 'Password must be at least 8 characters' });
    }

    // Hash password for platform authentication (bcrypt)
    const saltRounds = 12;
    const password_hash = await bcrypt.hash(password, saltRounds);

    // Update user with platform password
    user.password_hash = password_hash;
    await user.save();

    // Initialize chat with plain password
    let chatInitialized = false;
    let chatError = null;
    
    try {
      await ChatAuthService.initializeChatForGoogleUser(user, password);
      chatInitialized = true;
    } catch (error) {
      chatError = error.message;
      console.error('⚠️ Chat initialization failed:', error.message);
      // Don't fail the whole operation - chat is optional
    }

    // Update user context with hasPassword flag
    if (req.auth && req.auth.updateUser) {
      req.auth.updateUser({ hasPassword: true });
    }

    res.json({
      message: 'Password set successfully!',
      chatInitialized,
      chatError: chatError,
      user: {
        id: user.id,
        email: user.email,
        hasPassword: true,
        oauth_provider: user.oauth_provider
      }
    });

  } catch (error) {
    next(error);
  }
};

/**
 * Change password for Google user
 */
const changeGoogleUserPassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user.id;

    const user = await User.findByPk(userId);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (user.oauth_provider !== 'google') {
      return res.status(400).json({ message: 'This account is not a Google account' });
    }

    // If user has no password yet, they can't change it
    if (!user.password_hash) {
      return res.status(400).json({ message: 'No password set for this account. Use add-password instead.' });
    }

    // Verify current password
    const isPasswordValid = await bcrypt.compare(currentPassword, user.password_hash);
    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Current password is incorrect' });
    }

    // Validate new password
    if (!newPassword || newPassword.length < 8) {
      return res.status(400).json({ message: 'New password must be at least 8 characters' });
    }

    // Hash new password
    const saltRounds = 12;
    const password_hash = await bcrypt.hash(newPassword, saltRounds);

    // Update password
    user.password_hash = password_hash;
    await user.save();

    res.json({
      message: 'Password changed successfully!',
      user: {
        id: user.id,
        email: user.email
      }
    });

  } catch (error) {
    next(error);
  }
};

// ========== VERIFICATION FUNCTIONS ==========

// Send email verification
const sendEmailVerification = async (req, res, next) => {
  try {
    const user = req.user;

    if (user.email_verified) {
      return res.status(400).json({ message: 'Email is already verified.' });
    }

    await VerificationService.sendEmailVerification(user);

    res.json({ message: 'Verification email sent successfully.' });
  } catch (error) {
    next(error);
  }
};

// Verify email with token
const verifyEmail = async (req, res, next) => {
  try {
    const { token } = req.body;

    const user = await VerificationService.verifyEmail(token);

    res.json({ 
      message: 'Email verified successfully!',
      user: {
        id: user.id,
        email: user.email,
        email_verified: user.email_verified
      }
    });
  } catch (error) {
    next(error);
  }
};

// Send phone verification
const sendPhoneVerification = async (req, res, next) => {
  try {
    const user = req.user;

    if (!user.phone_number) {
      return res.status(400).json({ message: 'Phone number not found.' });
    }

    if (user.phone_verified) {
      return res.status(400).json({ message: 'Phone is already verified.' });
    }

    await VerificationService.sendPhoneVerification(user);

    res.json({ message: 'Verification code sent to your phone.' });
  } catch (error) {
    next(error);
  }
};

// Verify phone with code
const verifyPhone = async (req, res, next) => {
  try {
    const { code } = req.body;
    const user_id = req.user.id;

    const user = await VerificationService.verifyPhone(code, user_id);

    res.json({ 
      message: 'Phone number verified successfully!',
      user: {
        id: user.id,
        phone_number: user.phone_number,
        phone_verified: user.phone_verified
      }
    });
  } catch (error) {
    next(error);
  }
};

// ========== PASSWORD RESET FUNCTIONS ==========

// Request password reset via email
const requestPasswordResetEmail = async (req, res, next) => {
  try {
    const { email } = req.body;

    await PasswordResetService.requestEmailReset(email);

    res.json({ 
      message: 'If an account with that email exists, a password reset link has been sent.'
    });
  } catch (error) {
    next(error);
  }
};

// Request password reset via SMS
const requestPasswordResetSMS = async (req, res, next) => {
  try {
    const { phone_number } = req.body;

    await PasswordResetService.requestSMSReset(phone_number);

    res.json({ 
      message: 'If an account with that phone number exists, a password reset code has been sent.'
    });
  } catch (error) {
    next(error);
  }
};

// Reset password with token (email)
const resetPasswordWithToken = async (req, res, next) => {
  try {
    const { token, new_password } = req.body;
    
    // Validate password strength
    PasswordResetService.validatePassword(new_password);

    const user = await PasswordResetService.resetPasswordWithToken(token, new_password);

    res.json({ 
      message: 'Password reset successfully!',
      user: {
        id: user.id,
        email: user.email
      }
    });
  } catch (error) {
    next(error);
  }
};

// Reset password with code (SMS)
const resetPasswordWithCode = async (req, res, next) => {
  try {
    const { phone_number, code, new_password } = req.body;

    // Validate password strength
    PasswordResetService.validatePassword(new_password);

    const user = await PasswordResetService.resetPasswordWithCode(phone_number, code, new_password);

    res.json({ 
      message: 'Password reset successfully!',
      user: {
        id: user.id,
        phone_number: user.phone_number
      }
    });
  } catch (error) {
    next(error);
  }
};

// ========== CHAT TOKEN FUNCTIONS ==========

// Add endpoint to refresh chat token
const refreshChatToken = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    const userId = req.userId; // From middleware

    if (!refreshToken) {
      return res.status(400).json({ message: 'Refresh token is required' });
    }

    // Call chat backend to refresh token
    const response = await axios.post(`${process.env.CHAT_BACKEND_URL}/api/v1/auth/refresh`, {
      refreshToken
    });

    res.json({
      token: response.data.token,
      refreshToken: response.data.refreshToken,
      expiresIn: response.data.expiresIn
    });

  } catch (error) {
    console.error('Chat token refresh failed:', error.message);
    res.status(401).json({ message: 'Failed to refresh chat token' });
  }
};

// Add endpoint to validate chat token
const validateChatToken = async (req, res, next) => {
  try {
    const { chatToken } = req.body;

    if (!chatToken) {
      return res.status(400).json({ message: 'Chat token is required' });
    }

    // Call chat backend to validate token
    const response = await axios.get(`${process.env.CHAT_BACKEND_URL}/api/v1/auth/validate`, {
      headers: { Authorization: `Bearer ${chatToken}` }
    });

    res.json({
      valid: true,
      user: response.data.user
    });

  } catch (error) {
    console.error('Chat token validation failed:', error.message);
    res.status(401).json({ valid: false, message: 'Invalid chat token' });
  }
};

module.exports = {
  // Registration & Login
  register,
  login,
  
  // Google OAuth
  googleAuth,
  googleAuthCallback,
  linkGoogleAccount,
  unlinkGoogleAccount,
  addPasswordForGoogleUser,
  changeGoogleUserPassword,
  
  // Verification
  sendEmailVerification,
  verifyEmail,
  sendPhoneVerification,
  verifyPhone,
  
  // Password Reset
  requestPasswordResetEmail,
  requestPasswordResetSMS,
  resetPasswordWithToken,
  resetPasswordWithCode,
  
  // Chat Tokens
  refreshChatToken,
  validateChatToken,
  
  // Helper functions (optional export)
  verifyGoogleToken
};