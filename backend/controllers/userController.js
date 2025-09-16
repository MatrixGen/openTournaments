// controllers/userController.js
const { User } = require('../models');

const getProfile = async (req, res, next) => {
  try {
    // req.user is already set by the authenticateToken middleware
    res.json({
      user: req.user
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getProfile
};