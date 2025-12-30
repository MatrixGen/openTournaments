const {
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken
} = require('../../../src/utils/tokens');

// Mock environment variables for testing
process.env.JWT_SECRET = 'test-jwt-secret';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret';

describe('Token Utility', () => {
  const mockUser = {
    id: '123',
    email: 'test@example.com',
    username: 'testuser'
  };

  describe('generateAccessToken', () => {
    it('should generate a valid access token', () => {
      const token = generateAccessToken(mockUser);
      
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      
      // Verify the token can be decoded
      const decoded = verifyAccessToken(token);
      expect(decoded.userId).toBe(mockUser.id);
      expect(decoded.email).toBe(mockUser.email);
    });
  });

  describe('generateRefreshToken', () => {
    it('should generate a valid refresh token', () => {
      const token = generateRefreshToken(mockUser);
      
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
    });
  });

  describe('verifyAccessToken', () => {
    it('should throw error for invalid token', () => {
      expect(() => {
        verifyAccessToken('invalid-token');
      }).toThrow();
    });

    it('should throw error for expired token', () => {
      // Create an expired token
      const jwt = require('jsonwebtoken');
      const expiredToken = jwt.sign(
        { userId: mockUser.id, exp: Math.floor(Date.now() / 1000) - 60 }, // expired 60 seconds ago
        process.env.JWT_SECRET
      );

      expect(() => {
        verifyAccessToken(expiredToken);
      }).toThrow();
    });
  });
});