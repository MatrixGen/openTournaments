// controllers/authController.js
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { User } = require('../models');
const { validationResult } = require('express-validator'); 
const { Op } = require('sequelize');
const VerificationService = require('../services/verificationService');
const PasswordResetService = require('../services/passwordResetService');

const ChatAuthService = require('../services/chatAuthService'); // Add this

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
      phone_number
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
        chatUserId: chatUserId
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

    // 3. Check if user is banned
    if (user.is_banned) {
      return res.status(403).json({ message: 'Account has been banned.' });
    }

    // 4. Verify password
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
      console.log('auth status :',chatAuth);
      
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
        chatUserId: chatUserId
      }
    });

  } catch (error) {
    next(error);
  }
};

// 9. Add endpoint to refresh chat token
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

// 10. Add endpoint to validate chat token
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

module.exports = {
  sendEmailVerification,
  verifyEmail,
  sendPhoneVerification,
  verifyPhone,
  requestPasswordResetEmail,
  requestPasswordResetSMS,
  resetPasswordWithToken,
  resetPasswordWithCode,
  refreshChatToken,
  validateChatToken,
  register,
  login
};
