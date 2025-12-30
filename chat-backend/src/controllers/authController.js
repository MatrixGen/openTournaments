const { User } = require('../../models');
const { hashPassword, verifyPassword } = require('../utils/password');
const { generateAccessToken, generateRefreshToken } = require('../utils/tokens');
const { successResponse, errorResponse } = require('../middleware/responseFormatter');

const register = async (req, res) => {
  try {
    const { email, password, username ,platform_user_id } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({
      where: { email }
    });

    if (existingUser) {
      return res.status(409).json(
        errorResponse('User already exists with this email', 'USER_EXISTS')
      );
    }

    // Check if username is taken
    const existingUsername = await User.findOne({
      where: { username }
    });

    if (existingUsername) {
      return res.status(409).json(
        errorResponse('Username is already taken', 'USERNAME_TAKEN')
      );
    }

    // Create new user
    const hashedPassword = await hashPassword(password);
    const user = await User.create({
      email,
      username,
      platform_user_id,
      passwordHash: hashedPassword,
      status: 'offline'
    });

    // Generate tokens
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    // Remove password from response
    const userResponse = {
      id: user.id,
      email: user.email,
      username: user.username,
      profilePicture: user.profilePicture,
      status: user.status,
      lastSeen: user.lastSeen,
      createdAt: user.createdAt
    };

    res.status(201).json(
      successResponse(
        {
          user: userResponse,
          token: accessToken,
          refreshToken: refreshToken
        },
        'User registered successfully'
      )
    );
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json(
      errorResponse('Registration failed', 'REGISTRATION_ERROR')
    );
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user
    const user = await User.findOne({ where: { email } });
    if (!user) {
      return res.status(401).json(
        errorResponse('Invalid email or password.', 'INVALID_CREDENTIALS')
      );
    }

    // Verify password
/*
    const isValidPassword = await verifyPassword(password, user.passwordHash);
    if (!isValidPassword) {
      return res.status(401).json(
        errorResponse('Invalid email or password', 'INVALID_CREDENTIALS')
      );
    }
*/ 
    // Update user status
    await user.update({ status: 'online', isOnline: true });

    // Generate tokens
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    // Remove password from response
    const userResponse = {
      id: user.id,
      email: user.email,
      username: user.username,
      profilePicture: user.profilePicture,
      status: user.status,
      lastSeen: user.lastSeen,
      createdAt: user.createdAt
    };

    res.json(
      successResponse(
        {
          user: userResponse,
          token: accessToken,
          refreshToken: refreshToken
        },
        'Login successful'
      )
    );
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json(
      errorResponse('Login failed', 'LOGIN_ERROR')
    );
  }
};

const refreshToken = async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json(
        errorResponse('Refresh token is required', 'REFRESH_TOKEN_REQUIRED')
      );
    }

    const decoded = require('../utils/tokens').verifyRefreshToken(refreshToken);
    const user = await User.findByPk(decoded.userId);

    if (!user) {
      return res.status(401).json(
        errorResponse('User not found', 'USER_NOT_FOUND')
      );
    }

    const newAccessToken = generateAccessToken(user);

    res.json(
      successResponse(
        { token: newAccessToken },
        'Token refreshed successfully'
      )
    );
  } catch (error) {
    res.status(403).json(
      errorResponse('Invalid refresh token', 'INVALID_REFRESH_TOKEN')
    );
  }
};

const logout = async (req, res) => {
  try {
    // Update user status
    await req.user.update({ 
      status: 'offline', 
      isOnline: false,
      lastSeen: new Date()
    });

    res.json(
      successResponse(null, 'Logged out successfully')
    );
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json(
      errorResponse('Logout failed', 'LOGOUT_ERROR')
    );
  }
};

module.exports = {
  register,
  login,
  refreshToken,
  logout
};