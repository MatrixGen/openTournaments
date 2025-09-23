// controllers/authController.js
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { User } = require('../models');
const { validationResult } = require('express-validator'); 
const { Op } = require('sequelize');
const VerificationService = require('../services/verificationService');
const PasswordResetService = require('../services/passwordResetService');

const register = async (req, res, next) => {
  try {
    // 1. Check for validation errors (will be set by our middleware)
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
      // wallet_balance, role, is_verified, is_banned use defaults
    });

    // 5. Generate a JWT token
    const token = jwt.sign(
      { userId: newUser.id },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    // 6. Respond (omit password_hash from response)
    res.status(201).json({
      message: 'User registered successfully!',
      token,
      user: {
        id: newUser.id,
        username: newUser.username,
        email: newUser.email,
        phone_number: newUser.phone_number,
        wallet_balance: newUser.wallet_balance
      }
    });
    try {
      await VerificationService.sendEmailVerification(newUser);
    } catch (error) {
      console.error('Failed to send verification email:', error);
      // Don't fail registration if email sending fails
    }

    // Send phone verification if phone number provided
    if (newUser.phone_number) {
      try {
        await VerificationService.sendPhoneVerification(newUser);
      } catch (error) {
        console.error('Failed to send phone verification:', error);
        // Don't fail registration if SMS sending fails
      }
    }

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

    const { login, password } = req.body; // 'login' can be email or username

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

    // 6. Generate JWT token
    const token = jwt.sign(
      { userId: user.id },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    // 7. Respond with user data (omit password_hash)
    res.json({
      message: 'Login successful!',
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        phone_number: user.phone_number,
        wallet_balance: user.wallet_balance,
        role: user.role
      }
    });

  } catch (error) {
    next(error);
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
  register,
  login
};
