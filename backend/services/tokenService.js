const crypto = require('crypto');

class TokenService {
  // Generate random token for email verification and password reset
  static generateToken(length = 32) {
    return crypto.randomBytes(length).toString('hex');
  }

  // Generate numeric code for phone verification
  static generateVerificationCode(length = 6) {
    return Math.floor(Math.random() * Math.pow(10, length))
      .toString()
      .padStart(length, '0');
  }

  // Calculate expiration time (default 1 hour)
  static getExpirationTime(hours = 1) {
    return new Date(Date.now() + hours * 60 * 60 * 1000);
  }

  // Check if token is expired
  static isTokenExpired(expirationTime) {
    return new Date() > new Date(expirationTime);
  }

  // Generate JWT token for authenticated operations
  static generateAuthToken(payload, expiresIn = '1h') {
    const jwt = require('jsonwebtoken');
    return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn });
  }
}

module.exports = TokenService;