const { redisClient } = require('../config/redis');

class RedisService {
  constructor() {
    console.log('[RedisService] Initialized');
  }

    // --- MESSAGE CACHING ---
  async cacheChannelMessage(channelId, message) {
    const debugPrefix = `[RedisService.cacheChannelMessage] channelId=${channelId}, messageId=${message.id}`;
    console.log(`${debugPrefix} - Starting`);
    
    try {
      const cacheKey = `channel:${channelId}:recent_messages`;
      const messageData = message.toJSON ? message.toJSON() : message;
      
      // Add message to sorted set with timestamp as score
      const score = new Date(messageData.createdAt || Date.now()).getTime();
      await redisClient.zadd(cacheKey, score, JSON.stringify(messageData));
      
      // Keep only last 100 messages per channel
      await redisClient.zremrangebyrank(cacheKey, 0, -101);
      
      // Set expiry for the cache (1 day)
      await redisClient.expire(cacheKey, 86400);
      
      console.log(`${debugPrefix} - Successfully cached message`);
      return true;
    } catch (error) {
      console.error(`${debugPrefix} - ERROR:`, error);
      return false;
    }
  }

  async getCachedChannelMessages(channelId, limit = 50) {
    const debugPrefix = `[RedisService.getCachedChannelMessages] channelId=${channelId}, limit=${limit}`;
    console.log(`${debugPrefix} - Starting`);
    
    try {
      const cacheKey = `channel:${channelId}:recent_messages`;
      
      // Get messages in reverse chronological order (newest first)
      const messages = await redisClient.zrevrange(cacheKey, 0, limit - 1);
      
      const parsedMessages = messages.map(msg => {
        try {
          return JSON.parse(msg);
        } catch (e) {
          console.warn(`${debugPrefix} - Failed to parse cached message:`, e);
          return null;
        }
      }).filter(msg => msg !== null);
      
      console.log(`${debugPrefix} - Found ${parsedMessages.length} cached messages`);
      return parsedMessages;
    } catch (error) {
      console.error(`${debugPrefix} - ERROR:`, error);
      return [];
    }
  }

  async clearChannelCache(channelId) {
    const debugPrefix = `[RedisService.clearChannelCache] channelId=${channelId}`;
    console.log(`${debugPrefix} - Starting`);
    
    try {
      const cacheKey = `channel:${channelId}:recent_messages`;
      await redisClient.del(cacheKey);
      console.log(`${debugPrefix} - Successfully cleared cache`);
      return true;
    } catch (error) {
      console.error(`${debugPrefix} - ERROR:`, error);
      return false;
    }
  }

  // --- USER PRESENCE ---
  async updateUserPresence(userId, status, sessionId = null) {
    const debugPrefix = `[RedisService.updateUserPresence] userId=${userId}, status=${status}, sessionId=${sessionId}`;
    console.log(`${debugPrefix} - Starting`);
    
    try {
      const userKey = `user:${userId}:presence`;
      const now = Date.now();
      const isoTime = new Date().toISOString();
      
      // Get current session count
      const sessionCount = await this.getUserSessionCount(userId);
      
      const data = {
        status,
        lastSeen: isoTime,
        updatedAt: now,
        userId: userId.toString(),
        sessionCount,
        lastSessionId: sessionId
      };

      console.log(`${debugPrefix} - Setting presence data:`, data);
      
      // Redis v3 uses hmset with key and object
      await redisClient.hmset(userKey, data);
      
      // Set TTL based on status
      if (status === 'online') {
        await redisClient.expire(userKey, 300); // 5 minutes for online (refreshed by heartbeat)
        console.log(`${debugPrefix} - Set TTL to 300 seconds for online status`);
        
        // Add to online set only if coming online
        const wasOnline = await this.isUserOnline(userId);
        if (!wasOnline) {
          await this.addOnlineUser(userId);
          console.log(`${debugPrefix} - Added user to online users set`);
        }
        
        // Update heartbeat
        await this.updateUserHeartbeat(userId);
      } else {
        await redisClient.expire(userKey, 86400); // 24 hours for offline/away
        console.log(`${debugPrefix} - Set TTL to 86400 seconds for ${status} status`);
        
        // Only remove from online set if going offline AND no active sessions
        if (status === 'offline' && sessionCount === 0) {
          await this.removeOnlineUser(userId);
          console.log(`${debugPrefix} - Removed user from online users set (no active sessions)`);
        }
      }

      console.log(`${debugPrefix} - Successfully updated presence`);
      return data;
    } catch (error) {
      console.error(`${debugPrefix} - ERROR:`, error);
      throw error;
    }
  }

  async getUserPresence(userId) {
    const debugPrefix = `[RedisService.getUserPresence] userId=${userId}`;
    console.log(`${debugPrefix} - Starting`);
    
    try {
      const userKey = `user:${userId}:presence`;
      const data = await redisClient.hgetall(userKey);
      
      console.log(`${debugPrefix} - Raw Redis data:`, data);
      
      if (!data || Object.keys(data).length === 0) {
        console.log(`${debugPrefix} - No presence data found in Redis`);
        return null;
      }
      
      // Convert string values to appropriate types
      if (data.updatedAt) {
        data.updatedAt = parseInt(data.updatedAt);
      }
      if (data.sessionCount) {
        data.sessionCount = parseInt(data.sessionCount);
      }
      
      console.log(`${debugPrefix} - Processed data:`, data);
      return data;
    } catch (error) {
      console.error(`${debugPrefix} - ERROR:`, error);
      return null;
    }
  }

  // --- SESSION MANAGEMENT (FIXED) ---
  async addUserSession(userId, sessionId, sessionData) {
    const debugPrefix = `[RedisService.addUserSession] userId=${userId}, sessionId=${sessionId}`;
    console.log(`${debugPrefix} - Starting`);
    
    try {
      // Store session with metadata
      const sessionKey = `session:${sessionId}`;
      const sessionDataWithMetadata = {
        ...sessionData,
        userId,
        createdAt: Date.now(),
        lastActive: Date.now(),
        status: 'active'
      };
      
      // Store session data
      await redisClient.hmset(sessionKey, sessionDataWithMetadata);
      await redisClient.expire(sessionKey, 86400); // 24 hours
      
      // Add to user's session set
      await redisClient.sadd(`user:${userId}:sessions`, sessionId);
      await redisClient.expire(`user:${userId}:sessions`, 86400);
      
      // Add to active sessions set
      await redisClient.sadd('global:active_sessions', sessionId);
      
      console.log(`${debugPrefix} - Successfully added session`);
      return true;
    } catch (error) {
      console.error(`${debugPrefix} - ERROR:`, error);
      return false;
    }
  }

  async removeUserSession(userId, sessionId) {
    const debugPrefix = `[RedisService.removeUserSession] userId=${userId}, sessionId=${sessionId}`;
    console.log(`${debugPrefix} - Starting`);
    
    try {
      // Remove from user's session set
      await redisClient.srem(`user:${userId}:sessions`, sessionId);
      
      // Remove session data
      await redisClient.del(`session:${sessionId}`);
      
      // Remove from active sessions set
      await redisClient.srem('global:active_sessions', sessionId);
      
      // Check if user has any remaining sessions
      const remainingSessions = await this.getUserSessionCount(userId);
      
      // If no remaining sessions, mark as offline if not already
      if (remainingSessions === 0) {
        const presence = await this.getUserPresence(userId);
        if (presence && presence.status === 'online') {
          await this.updateUserPresence(userId, 'offline', sessionId);
        }
      }
      
      console.log(`${debugPrefix} - Successfully removed session. Remaining: ${remainingSessions}`);
      return true;
    } catch (error) {
      console.error(`${debugPrefix} - ERROR:`, error);
      return false;
    }
  }

  async getUserSessions(userId) {
    const debugPrefix = `[RedisService.getUserSessions] userId=${userId}`;
    console.log(`${debugPrefix} - Starting`);
    
    try {
      const sessionSetKey = `user:${userId}:sessions`;
      const sessionIds = await redisClient.smembers(sessionSetKey);
      
      if (!sessionIds || sessionIds.length === 0) {
        console.log(`${debugPrefix} - No sessions found`);
        return {};
      }
      
      // Fetch all session data in parallel
      const sessions = {};
      for (const sessionId of sessionIds) {
        try {
          const data = await redisClient.hgetall(`session:${sessionId}`);
          if (data && Object.keys(data).length > 0) {
            // Convert numeric fields
            if (data.createdAt) data.createdAt = parseInt(data.createdAt);
            if (data.lastActive) data.lastActive = parseInt(data.lastActive);
            sessions[sessionId] = data;
          } else {
            // Session key expired, remove from set
            await redisClient.srem(sessionSetKey, sessionId);
          }
        } catch (e) {
          console.warn(`${debugPrefix} - Error fetching session ${sessionId}:`, e);
        }
      }
      
      console.log(`${debugPrefix} - Found ${Object.keys(sessions).length} active session(s)`);
      return sessions;
    } catch (error) {
      console.error(`${debugPrefix} - ERROR:`, error);
      return {};
    }
  }

  async getUserSessionCount(userId) {
    const debugPrefix = `[RedisService.getUserSessionCount] userId=${userId}`;
    console.log(`${debugPrefix} - Starting`);
    
    try {
      const count = await redisClient.scard(`user:${userId}:sessions`);
      console.log(`${debugPrefix} - Count: ${count}`);
      return count;
    } catch (error) {
      console.error(`${debugPrefix} - ERROR:`, error);
      return 0;
    }
  }

  async getSession(sessionId) {
    const debugPrefix = `[RedisService.getSession] sessionId=${sessionId}`;
    console.log(`${debugPrefix} - Starting`);
    
    try {
      const data = await redisClient.hgetall(`session:${sessionId}`);
      
      if (!data || Object.keys(data).length === 0) {
        console.log(`${debugPrefix} - Session not found`);
        return null;
      }
      
      // Convert numeric fields
      if (data.createdAt) data.createdAt = parseInt(data.createdAt);
      if (data.lastActive) data.lastActive = parseInt(data.lastActive);
      
      console.log(`${debugPrefix} - Found session for user: ${data.userId}`);
      return data;
    } catch (error) {
      console.error(`${debugPrefix} - ERROR:`, error);
      return null;
    }
  }

  async updateSessionActivity(sessionId) {
    const debugPrefix = `[RedisService.updateSessionActivity] sessionId=${sessionId}`;
    console.log(`${debugPrefix} - Starting`);
    
    try {
      const sessionKey = `session:${sessionId}`;
      const now = Date.now();
      
      // Update last active timestamp
      await redisClient.hset(sessionKey, 'lastActive', now);
      
      // Refresh TTL
      await redisClient.expire(sessionKey, 86400);
      
      console.log(`${debugPrefix} - Updated lastActive to ${now}`);
      return true;
    } catch (error) {
      console.error(`${debugPrefix} - ERROR:`, error);
      return false;
    }
  }

  async getUserBySessionId(sessionId) {
    const debugPrefix = `[RedisService.getUserBySessionId] sessionId=${sessionId}`;
    console.log(`${debugPrefix} - Starting`);
    
    try {
      const sessionData = await this.getSession(sessionId);
      return sessionData ? sessionData.userId : null;
    } catch (error) {
      console.error(`${debugPrefix} - ERROR:`, error);
      return null;
    }
  }

  async getAllActiveSessions() {
    try {
      const sessionIds = await redisClient.smembers('global:active_sessions');
      return sessionIds;
    } catch (error) {
      console.error('[RedisService.getAllActiveSessions] - ERROR:', error);
      return [];
    }
  }

  // --- ONLINE USER TRACKING (UNIQUE USERS) ---
  async addOnlineUser(userId) {
    const debugPrefix = `[RedisService.addOnlineUser] userId=${userId}`;
    console.log(`${debugPrefix} - Starting`);
    
    try {
      // Log what we're trying to add
      console.log(`${debugPrefix} - Adding user to global:online_users_set`);
      
      // Add to global online set
      const added = await redisClient.sadd('global:online_users_set', userId);
      
      if (added === 1) {
        console.log(`${debugPrefix} - User was newly added to online set`);
      } else {
        console.log(`${debugPrefix} - User was already in online set`);
      }
      
      // Also add a key to verify Redis is working
      await redisClient.set(`debug:${userId}:test`, 'online');
      const testValue = await redisClient.get(`debug:${userId}:test`);
      console.log(`${debugPrefix} - Test set/get: ${testValue}`);
      
      // Update counter for backward compatibility
      const count = await redisClient.scard('global:online_users_set');
      await redisClient.set('global:online_users_count', count);
      
      console.log(`${debugPrefix} - Online users count updated to: ${count}`);
      
      // Also check what's actually in the set
      const members = await redisClient.smembers('global:online_users_set');
      console.log(`${debugPrefix} - Current set members:`, members);
      
      return count;
    } catch (error) {
      console.error(`${debugPrefix} - ERROR:`, error);
      throw error;
    }
  }

  async removeOnlineUser(userId) {
    const debugPrefix = `[RedisService.removeOnlineUser] userId=${userId}`;
    console.log(`${debugPrefix} - Starting`);
    
    try {
      // Remove from global online set
      const removed = await redisClient.srem('global:online_users_set', userId);
      
      if (removed === 1) {
        console.log(`${debugPrefix} - User was removed from online set`);
      } else {
        console.log(`${debugPrefix} - User was not in online set`);
      }
      
      // Update counter
      const count = await redisClient.scard('global:online_users_set');
      await redisClient.set('global:online_users_count', count);
      
      console.log(`${debugPrefix} - Online users count updated to: ${count}`);
      return count;
    } catch (error) {
      console.error(`${debugPrefix} - ERROR:`, error);
      throw error;
    }
  }

  async getOnlineUsers() {
    const debugPrefix = `[RedisService.getOnlineUsers]`;
    console.log(`${debugPrefix} - Starting`);
    
    try {
      const userIds = await redisClient.smembers('global:online_users_set');
      const count = userIds.length;
      
      console.log(`${debugPrefix} - Found ${count} online user(s):`, userIds);
      return userIds;
    } catch (error) {
      console.error(`${debugPrefix} - ERROR:`, error);
      return [];
    }
  }

  async getOnlineCount() {
    const debugPrefix = `[RedisService.getOnlineCount]`;
    console.log(`${debugPrefix} - Starting`);
    
    try {
      const count = await redisClient.scard('global:online_users_set');
      console.log(`${debugPrefix} - Count from set: ${count}`);
      
      // Also update the counter key for compatibility
      await redisClient.set('global:online_users_count', count);
      
      return count;
    } catch (error) {
      console.error(`${debugPrefix} - ERROR:`, error);
      return 0;
    }
  }

  async isUserOnline(userId) {
    const debugPrefix = `[RedisService.isUserOnline] userId=${userId}`;
    console.log(`${debugPrefix} - Starting`);
    
    try {
      const isMember = await redisClient.sismember('global:online_users_set', userId);
      console.log(`${debugPrefix} - Is member: ${isMember === 1}`);
      return isMember === 1;
    } catch (error) {
      console.error(`${debugPrefix} - ERROR:`, error);
      return false;
    }
  }

  // --- CHANNEL PRESENCE ---
  async addUserToChannel(userId, channelId) {
    const debugPrefix = `[RedisService.addUserToChannel] userId=${userId}, channelId=${channelId}`;
    console.log(`${debugPrefix} - Starting`);
    
    try {
      // Add to channel's member set (permanent membership)
      await redisClient.sadd(`channel:${channelId}:members`, userId);
      
      // Add to user's channel set
      await redisClient.sadd(`user:${userId}:channels`, channelId);
      
      console.log(`${debugPrefix} - Added to channel membership sets`);
      
      // Only add to online set if user is actually online
      const isOnline = await this.isUserOnline(userId);
      if (isOnline) {
        await redisClient.sadd(`channel:${channelId}:online`, userId);
        console.log(`${debugPrefix} - User is online, added to channel online set`);
      } else {
        console.log(`${debugPrefix} - User is not online, skipping channel online set`);
      }
      
      return true;
    } catch (error) {
      console.error(`${debugPrefix} - ERROR:`, error);
      return false;
    }
  }

  async removeUserFromChannel(userId, channelId) {
    const debugPrefix = `[RedisService.removeUserFromChannel] userId=${userId}, channelId=${channelId}`;
    console.log(`${debugPrefix} - Starting`);
    
    try {
      // Remove from channel's online set
      await redisClient.srem(`channel:${channelId}:online`, userId);
      
      // Remove from user's channel set
      await redisClient.srem(`user:${userId}:channels`, channelId);
      
      console.log(`${debugPrefix} - Removed from channel sets`);
      return true;
    } catch (error) {
      console.error(`${debugPrefix} - ERROR:`, error);
      return false;
    }
  }

  async getChannelOnlineUsers(channelId) {
    const debugPrefix = `[RedisService.getChannelOnlineUsers] channelId=${channelId}`;
    console.log(`${debugPrefix} - Starting`);
    
    try {
      const userIds = await redisClient.smembers(`channel:${channelId}:online`);
      console.log(`${debugPrefix} - Found ${userIds.length} online user(s) in channel`);
      return userIds;
    } catch (error) {
      console.error(`${debugPrefix} - ERROR:`, error);
      return [];
    }
  }

  async getChannelMembers(channelId) {
    const debugPrefix = `[RedisService.getChannelMembers] channelId=${channelId}`;
    console.log(`${debugPrefix} - Starting`);
    
    try {
      const userIds = await redisClient.smembers(`channel:${channelId}:members`);
      console.log(`${debugPrefix} - Found ${userIds.length} member(s) in channel`);
      return userIds;
    } catch (error) {
      console.error(`${debugPrefix} - ERROR:`, error);
      return [];
    }
  }

  // --- HEARTBEAT SYSTEM ---
  async updateUserHeartbeat(userId) {
    const debugPrefix = `[RedisService.updateUserHeartbeat] userId=${userId}`;
    console.log(`${debugPrefix} - Starting`);
    
    try {
      const heartbeatKey = `user:${userId}:heartbeat`;
      const now = Date.now();
      
      await redisClient.set(heartbeatKey, now);
      await redisClient.expire(heartbeatKey, 120); // Expire after 2 minutes
      
      console.log(`${debugPrefix} - Heartbeat updated to ${now}`);
      return now;
    } catch (error) {
      console.error(`${debugPrefix} - ERROR:`, error);
      return null;
    }
  }

  async getUserHeartbeat(userId) {
    const debugPrefix = `[RedisService.getUserHeartbeat] userId=${userId}`;
    console.log(`${debugPrefix} - Starting`);
    
    try {
      const timestamp = await redisClient.get(`user:${userId}:heartbeat`);
      const result = timestamp ? parseInt(timestamp) : null;
      
      console.log(`${debugPrefix} - Heartbeat timestamp: ${result}`);
      return result;
    } catch (error) {
      console.error(`${debugPrefix} - ERROR:`, error);
      return null;
    }
  }

  // --- MAINTENANCE & CLEANUP ---
  async cleanupStaleSessions() {
    const debugPrefix = `[RedisService.cleanupStaleSessions]`;
    console.log(`${debugPrefix} - Starting cleanup`);
    
    try {
      // Get all active sessions
      const sessionIds = await redisClient.smembers('global:active_sessions');
      console.log(`${debugPrefix} - Found ${sessionIds.length} active sessions`);
      
      const now = Date.now();
      let cleaned = 0;
      
      for (const sessionId of sessionIds) {
        const ttl = await redisClient.ttl(`session:${sessionId}`);
        
        if (ttl < 0 || ttl === -2) { // Key expired or doesn't exist
          // Get session data before deletion
          const sessionData = await this.getSession(sessionId);
          
          if (sessionData) {
            // Remove from user's session set
            await redisClient.srem(`user:${sessionData.userId}:sessions`, sessionId);
            
            // Remove from active sessions set
            await redisClient.srem('global:active_sessions', sessionId);
            
            // Update user presence if needed
            const remainingSessions = await this.getUserSessionCount(sessionData.userId);
            if (remainingSessions === 0) {
              const presence = await this.getUserPresence(sessionData.userId);
              if (presence && presence.status === 'online') {
                await this.updateUserPresence(sessionData.userId, 'offline', sessionId);
              }
            }
            
            cleaned++;
            console.log(`${debugPrefix} - Cleaned up expired session: ${sessionId} for user: ${sessionData.userId}`);
          }
        } else {
          // Check for stale sessions (last active > 30 minutes)
          const sessionData = await this.getSession(sessionId);
          if (sessionData && sessionData.lastActive) {
            const timeInactive = now - sessionData.lastActive;
            if (timeInactive > 30 * 60 * 1000) { // 30 minutes
              await this.removeUserSession(sessionData.userId, sessionId);
              cleaned++;
              console.log(`${debugPrefix} - Cleaned up stale session: ${sessionId} (inactive for ${Math.floor(timeInactive / 60000)} minutes)`);
            }
          }
        }
      }
      
      console.log(`${debugPrefix} - Cleanup completed. Removed ${cleaned} stale sessions.`);
      return cleaned;
    } catch (error) {
      console.error(`${debugPrefix} - ERROR:`, error);
      return 0;
    }
  }

  async cleanupStalePresence() {
    const debugPrefix = `[RedisService.cleanupStalePresence]`;
    console.log(`${debugPrefix} - Starting cleanup`);
    
    try {
      const onlineUsers = await this.getOnlineUsers();
      console.log(`${debugPrefix} - Checking ${onlineUsers.length} online users`);
      
      const now = Date.now();
      let markedAway = 0;
      let markedOffline = 0;
      
      for (const userId of onlineUsers) {
        // Check if user has active sessions
        const sessionCount = await this.getUserSessionCount(userId);
        
        if (sessionCount === 0) {
          // No active sessions, mark as offline
          await this.updateUserPresence(userId, 'offline');
          markedOffline++;
          console.log(`${debugPrefix} - Marked user ${userId} as offline (no sessions)`);
        } else {
          // Check heartbeat for active sessions
          const lastHeartbeat = await this.getUserHeartbeat(userId);
          
          if (lastHeartbeat) {
            const timeSinceHeartbeat = now - lastHeartbeat;
            
            if (timeSinceHeartbeat > 120000) { // 2 minutes
              // Has sessions but no heartbeat, mark as away
              await this.updateUserPresence(userId, 'away');
              markedAway++;
              console.log(`${debugPrefix} - Marked user ${userId} as away (stale heartbeat)`);
            }
          } else if (sessionCount > 0) {
            // Has sessions but never sent heartbeat (shouldn't happen normally)
            await this.updateUserPresence(userId, 'away');
            markedAway++;
            console.log(`${debugPrefix} - Marked user ${userId} as away (no heartbeat with sessions)`);
          }
        }
      }
      
      console.log(`${debugPrefix} - Cleanup completed. Marked ${markedAway} as away, ${markedOffline} as offline.`);
      return { markedAway, markedOffline };
    } catch (error) {
      console.error(`${debugPrefix} - ERROR:`, error);
      return { markedAway: 0, markedOffline: 0 };
    }
  }

  // --- DEBUG METHODS ---
  async debugGetAllPresenceData() {
    console.log('[RedisService.debugGetAllPresenceData] - Starting');
    
    try {
      const onlineUsers = await this.getOnlineUsers();
      const onlineCount = onlineUsers.length;
      const activeSessions = await this.getAllActiveSessions();
      
      const sampleData = [];
      const sampleSize = Math.min(5, onlineUsers.length);
      
      for (let i = 0; i < sampleSize; i++) {
        const userId = onlineUsers[i];
        const presence = await this.getUserPresence(userId);
        const sessions = await this.getUserSessions(userId);
        const sessionCount = await this.getUserSessionCount(userId);
        const heartbeat = await this.getUserHeartbeat(userId);
        
        sampleData.push({
          userId,
          presence,
          sessionCount,
          sessions: Object.keys(sessions),
          heartbeat,
          sessionDetails: sessions
        });
      }
      
      const result = {
        online: {
          count: onlineCount,
          users: onlineUsers
        },
        sessions: {
          active: activeSessions.length,
          ids: activeSessions
        },
        sampleData,
        timestamp: Date.now()
      };
      
      console.log('[RedisService.debugGetAllPresenceData] - Result:', JSON.stringify(result, null, 2));
      return result;
    } catch (error) {
      console.error('[RedisService.debugGetAllPresenceData] - ERROR:', error);
      return { error: error.message };
    }
  }

  // --- HELPER METHODS ---
  async keys(pattern) {
    return await redisClient.keys(pattern);
  }

  async del(key) {
    return await redisClient.del(key);
  }

  async get(key) {
    return await redisClient.get(key);
  }

  async set(key, value) {
    return await redisClient.set(key, value);
  }

  async ttl(key) {
    return await redisClient.ttl(key);
  }
}

module.exports = new RedisService();