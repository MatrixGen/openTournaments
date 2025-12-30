const jwt = require('jsonwebtoken');

// Ensure environment variables are set
if (!process.env.JWT_SECRET) {
  console.warn('JWT_SECRET not set, using fallback for development');
  process.env.JWT_SECRET = 'dev-jwt-secret-fallback';
}

if (!process.env.JWT_REFRESH_SECRET) {
  console.warn('JWT_REFRESH_SECRET not set, using fallback for development');
  process.env.JWT_REFRESH_SECRET = 'dev-refresh-secret-fallback';
}

const generateAccessToken = (user) => {
  return jwt.sign(
    { 
      userId: user.id, 
      email: user.email,
      username: user.username
    },
    process.env.JWT_SECRET,
    { expiresIn: '24h' }
  );
};

const generateRefreshToken = (user) => {
  return jwt.sign(
    { userId: user.id },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: '7d' }
  );
};

const verifyAccessToken = (token) => {
  return jwt.verify(token, process.env.JWT_SECRET);
};

const verifyRefreshToken = (token) => {
  return jwt.verify(token, process.env.JWT_REFRESH_SECRET);
};

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  verifyRefreshToken
};