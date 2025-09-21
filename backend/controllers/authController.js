// controllers/authController.js
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { User } = require('../models');
const { validationResult } = require('express-validator'); // We'll add validation next
const { Op } = require('sequelize');

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

// Update the exports
module.exports = {
  register,
  login
};