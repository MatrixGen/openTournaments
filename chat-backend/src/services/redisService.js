const { redisClient } = require('../config/redis');

class RedisService {
  // User presence management
  async setUserOnline(userId, userData) {
    const key = `user:${userId}:presence`;
    const data = {
      ...userData,
      lastSeen: new Date().toISOString(),
      status: 'online',
      serverId: process.env.SERVER_INSTANCE_ID || 'single'
    };
    
    await redisClient.setex(key, 300, JSON.stringify(data)); // 5 minute TTL
    await redisClient.sadd('online_users', userId);
  }

  async setUserOffline(userId) {
    const key = `user:${userId}:presence`;
    const existing = await this.getUserPresence(userId);
    
    if (existing) {
      const data = {
        ...existing,
        status: 'offline',
        lastSeen: new Date().toISOString()
      };
      await redisClient.setex(key, 86400, JSON.stringify(data)); // 24 hour TTL for offline status
    }
    
    await redisClient.srem('online_users', userId);
  }

  async getUserPresence(userId) {
    const key = `user:${userId}:presence`;
    const data = await redisClient.get(key);
    return data ? JSON.parse(data) : null;
  }

  async getOnlineUsers() {
    const userIds = await redisClient.smembers('online_users');
    const users = [];
    
    for (const userId of userIds) {
      const presence = await this.getUserPresence(userId);
      if (presence) {
        users.push(presence);
      }
    }
    
    return users;
  }

  // Channel presence (who's in which channel)
  async addUserToChannel(userId, channelId) {
    await redisClient.sadd(`channel:${channelId}:users`, userId);
    await redisClient.sadd(`user:${userId}:channels`, channelId);
  }

  async removeUserFromChannel(userId, channelId) {
    await redisClient.srem(`channel:${channelId}:users`, userId);
    await redisClient.srem(`user:${userId}:channels`, channelId);
  }

  async getChannelUsers(channelId) {
    const userIds = await redisClient.smembers(`channel:${channelId}:users`);
    return userIds;
  }

  // Rate limiting
  async checkRateLimit(key, maxRequests, windowMs) {
    const now = Date.now();
    const windowStart = now - windowMs;
    
    // Remove old requests
    await redisClient.zremrangebyscore(key, 0, windowStart);
    
    // Count current requests
    const requestCount = await redisClient.zcard(key);
    
    if (requestCount >= maxRequests) {
      return { allowed: false, remaining: 0 };
    }
    
    // Add new request
    await redisClient.zadd(key, now, `${now}-${Math.random()}`);
    await redisClient.expire(key, Math.ceil(windowMs / 1000));
    
    return { allowed: true, remaining: maxRequests - requestCount - 1 };
  }

  // Message caching for recent messages
  async cacheChannelMessage(channelId, message, ttl = 3600) {
    const key = `channel:${channelId}:recent_messages`;
    await redisClient.lpush(key, JSON.stringify(message));
    await redisClient.ltrim(key, 0, 99); // Keep only 100 most recent
    await redisClient.expire(key, ttl);
  }

  async getCachedChannelMessages(channelId, count = 50) {
    const key = `channel:${channelId}:recent_messages`;
    const messages = await redisClient.lrange(key, 0, count - 1);
    return messages.map(msg => JSON.parse(msg));
  }
}

module.exports = new RedisService();