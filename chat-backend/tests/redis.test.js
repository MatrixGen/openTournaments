const redisService = require('../src/services/redisService');
const { redisClient } = require('../src/config/redis');

describe('Redis Service', () => {
  beforeEach(async () => {
    // Clean up test data
    await redisClient.del('test_user:presence');
    await redisClient.del('online_users');
  });

  afterAll(async () => {
    // Close Redis connection to allow Jest to exit cleanly
    await redisClient.quit();
  });

  it('should set and get user presence', async () => {
    const userId = 'test-user-123';
    const userData = {
      username: 'testuser',
      status: 'online'
    };

    await redisService.setUserOnline(userId, userData);
    const presence = await redisService.getUserPresence(userId);

    expect(presence.username).toBe('testuser');
    expect(presence.status).toBe('online');
  });

  it('should handle rate limiting', async () => {
    const key = 'test_rate_limit';
    const result1 = await redisService.checkRateLimit(key, 5, 60000);
    expect(result1.allowed).toBe(true);

    // Exceed limit
    for (let i = 0; i < 5; i++) {
      await redisService.checkRateLimit(key, 5, 60000);
    }

    const result2 = await redisService.checkRateLimit(key, 5, 60000);
    expect(result2.allowed).toBe(false);
  });
});
