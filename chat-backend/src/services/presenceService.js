const { User } = require('../../models');
const redisService = require('./redisService');

class PresenceService {
  constructor() {
    console.log('[PresenceService] Initialized');
  }

  async updateUserPresence(userId, status, sessionId = null) {
    const debugPrefix = `[PresenceService.updateUserPresence] userId=${userId}, status=${status}, sessionId=${sessionId}`;
    console.log(`${debugPrefix} - Starting`);
    
    try {
      // Get current presence for comparison
      const currentPresence = await this.getUserPresence(userId);
      const previousStatus = currentPresence?.status || 'offline';
      
      console.log(`${debugPrefix} - Previous status: ${previousStatus}, New status: ${status}`);
      
      // Update in Redis
      const redisResult = await redisService.updateUserPresence(userId, status, sessionId);
      console.log(`${debugPrefix} - Redis update successful:`, redisResult);
      
      // Handle session management if sessionId is provided
      if (sessionId) {
        if (status === 'online') {
          // Add session
          await redisService.addUserSession(userId, sessionId, {
            status,
            connectedAt: new Date().toISOString(),
            lastActive: Date.now()
          });
          console.log(`${debugPrefix} - Added session ${sessionId} for user`);
        } else if (status === 'offline') {
          // Remove this specific session
          await redisService.removeUserSession(userId, sessionId);
          console.log(`${debugPrefix} - Removed session ${sessionId} for user`);
        }
      }
      
      // Update online users set based on status change
      if (previousStatus !== 'online' && status === 'online') {
        // User just came online
        const newCount = await redisService.addOnlineUser(userId);
        console.log(`${debugPrefix} - Added user to online set. New count: ${newCount}`);
      } else if (previousStatus === 'online' && status !== 'online') {
        // User is no longer online, check if they have other active sessions
        const sessions = await redisService.getUserSessions(userId);
        const activeSessions = Object.keys(sessions || {}).length;
        
        console.log(`${debugPrefix} - User changing from online to ${status}. Active sessions: ${activeSessions}`);
        
        if (activeSessions === 0) {
          // No active sessions, remove from online set
          const newCount = await redisService.removeOnlineUser(userId);
          console.log(`${debugPrefix} - Removed user from online set. New count: ${newCount}`);
        } else {
          console.log(`${debugPrefix} - User still has ${activeSessions} active session(s), keeping in online set`);
        }
      }
      
      // Update heartbeat for online users
      if (status === 'online') {
        await redisService.updateUserHeartbeat(userId);
        console.log(`${debugPrefix} - Updated heartbeat for online user`);
      }
      
      // Update in database (for persistence)
      if (['online', 'offline', 'away', 'busy'].includes(status)) {
        try {
          await User.update(
            { status, lastSeen: new Date() },
            { where: { id: userId } }
          );
          console.log(`${debugPrefix} - Database update successful`);
        } catch (dbError) {
          console.error(`${debugPrefix} - Database update failed:`, dbError);
          // Continue even if DB update fails
        }
      }
      
      console.log(`${debugPrefix} - Successfully completed`);
      return {
        success: true,
        userId,
        status,
        previousStatus,
        sessionId,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error(`${debugPrefix} - ERROR:`, error);
      return {
        success: false,
        error: error.message,
        userId,
        status
      };
    }
  }

  async getUserPresence(userId) {
    const debugPrefix = `[PresenceService.getUserPresence] userId=${userId}`;
    console.log(`${debugPrefix} - Starting`);
    
    try {
      // Try Redis first
      const redisPresence = await redisService.getUserPresence(userId);
      
      if (redisPresence) {
        console.log(`${debugPrefix} - Found in Redis:`, redisPresence);
        
        // Validate that online users actually have active sessions
        if (redisPresence.status === 'online') {
          const sessions = await redisService.getUserSessions(userId);
          const activeSessions = Object.keys(sessions || {}).length;
          
          if (activeSessions === 0) {
            console.log(`${debugPrefix} - User marked as online but has no active sessions. Correcting to offline.`);
            
            // Auto-correct: user is actually offline
            await this.updateUserPresence(userId, 'offline');
            
            return {
              status: 'offline',
              lastSeen: redisPresence.lastSeen || new Date().toISOString(),
              userId,
              corrected: true
            };
          }
        }
        
        return {
          status: redisPresence.status || 'offline',
          lastSeen: redisPresence.lastSeen || new Date().toISOString(),
          userId,
          updatedAt: redisPresence.updatedAt
        };
      }
      
      console.log(`${debugPrefix} - Not found in Redis, checking database`);
      
      // Fallback to database
      try {
        const user = await User.findByPk(userId, {
          attributes: ['id', 'status', 'lastSeen']
        });

        if (user) {
          console.log(`${debugPrefix} - Found in database:`, user.toJSON());
          return {
            status: user.status || 'offline',
            lastSeen: user.lastSeen || new Date().toISOString(),
            userId: user.id,
            source: 'database'
          };
        }
      } catch (dbError) {
        console.error(`${debugPrefix} - Database query failed:`, dbError);
      }
      
      // Default fallback
      console.log(`${debugPrefix} - No data found anywhere, returning default offline`);
      return {
        status: 'offline',
        lastSeen: new Date().toISOString(),
        userId,
        source: 'default'
      };
    } catch (error) {
      console.error(`${debugPrefix} - ERROR:`, error);
      return {
        status: 'offline',
        lastSeen: new Date().toISOString(),
        userId,
        error: error.message,
        source: 'error'
      };
    }
  }

  async getOnlineUsers(channelId = null) {
    const debugPrefix = `[PresenceService.getOnlineUsers] channelId=${channelId || 'global'}`;
    console.log(`${debugPrefix} - Starting`);
    
    try {
      if (channelId) {
        console.log(`${debugPrefix} - Getting online users for specific channel`);
        
        // Get online users in specific channel
        const userIds = await redisService.getChannelOnlineUsers(channelId);
        console.log(`${debugPrefix} - Raw user IDs from channel:`, userIds);
        
        const onlineUsers = [];
        const userDetails = [];
        
        for (const userId of userIds) {
          const presence = await this.getUserPresence(userId);
          
          if (presence.status === 'online') {
            try {
              const user = await User.findByPk(userId, {
                attributes: ['id', 'username', 'profilePicture', 'email']
              });
              
              if (user) {
                const userData = {
                  ...user.toJSON(),
                  ...presence
                };
                onlineUsers.push(userData);
                userDetails.push({
                  userId,
                  username: user.username,
                  presence: presence.status
                });
              }
            } catch (userError) {
              console.error(`${debugPrefix} - Error fetching user ${userId}:`, userError);
            }
          }
        }
        
        console.log(`${debugPrefix} - Found ${onlineUsers.length} online users in channel:`, userDetails);
        return onlineUsers;
      } else {
        console.log(`${debugPrefix} - Getting all online users globally`);
        
        // Get all online users
        const userIds = await redisService.getOnlineUsers();
        const count = userIds.length;
        
        console.log(`${debugPrefix} - Raw online user IDs:`, userIds);
        console.log(`${debugPrefix} - Count: ${count}`);
        
        // Get detailed presence for each user
        const detailedUsers = [];
        for (const userId of userIds) {
          const presence = await this.getUserPresence(userId);
          if (presence.status === 'online') {
            detailedUsers.push({
              userId,
              presence
            });
          }
        }
        
        console.log(`${debugPrefix} - After validation: ${detailedUsers.length} users actually online`);
        
        // Update count if there's discrepancy
        if (detailedUsers.length !== count) {
          console.log(`${debugPrefix} - Count discrepancy detected! Redis says ${count}, validation says ${detailedUsers.length}`);
          
          // Re-sync the online set
          const validOnlineUsers = detailedUsers.map(u => u.userId);
          const currentSet = await redisService.getOnlineUsers();
          
          // Remove invalid users from set
          for (const userId of currentSet) {
            if (!validOnlineUsers.includes(userId)) {
              await redisService.removeOnlineUser(userId);
              console.log(`${debugPrefix} - Removed invalid user ${userId} from online set`);
            }
          }
        }
        
        const finalCount = detailedUsers.length;
        console.log(`${debugPrefix} - Final result: ${finalCount} online users`);
        
        return {
          count: finalCount,
          userIds: detailedUsers.map(u => u.userId),
          timestamp: new Date().toISOString()
        };
      }
    } catch (error) {
      console.error(`${debugPrefix} - ERROR:`, error);
      return channelId ? [] : { count: 0, userIds: [], error: error.message };
    }
  }

  async getUserOnlineStatus(userId) {
    const debugPrefix = `[PresenceService.getUserOnlineStatus] userId=${userId}`;
    console.log(`${debugPrefix} - Starting`);
    
    try {
      const presence = await this.getUserPresence(userId);
      const isOnline = presence.status === 'online';
      
      console.log(`${debugPrefix} - Result: ${isOnline ? 'online' : 'offline'}`);
      return {
        isOnline,
        ...presence
      };
    } catch (error) {
      console.error(`${debugPrefix} - ERROR:`, error);
      return { isOnline: false, error: error.message };
    }
  }

  async updateUserHeartbeat(userId) {
    const debugPrefix = `[PresenceService.updateUserHeartbeat] userId=${userId}`;
    console.log(`${debugPrefix} - Starting`);
    
    try {
      const result = await redisService.updateUserHeartbeat(userId);
      console.log(`${debugPrefix} - Success: ${result}`);
      return result;
    } catch (error) {
      console.error(`${debugPrefix} - ERROR:`, error);
      return null;
    }
  }

  async joinChannel(userId, channelId) {
    const debugPrefix = `[PresenceService.joinChannel] userId=${userId}, channelId=${channelId}`;
    console.log(`${debugPrefix} - Starting`);
    
    try {
      const result = await redisService.addUserToChannel(userId, channelId);
      console.log(`${debugPrefix} - Result: ${result}`);
      return result;
    } catch (error) {
      console.error(`${debugPrefix} - ERROR:`, error);
      return false;
    }
  }

  async leaveChannel(userId, channelId) {
    const debugPrefix = `[PresenceService.leaveChannel] userId=${userId}, channelId=${channelId}`;
    console.log(`${debugPrefix} - Starting`);
    
    try {
      const result = await redisService.removeUserFromChannel(userId, channelId);
      console.log(`${debugPrefix} - Result: ${result}`);
      return result;
    } catch (error) {
      console.error(`${debugPrefix} - ERROR:`, error);
      return false;
    }
  }

  async getChannelPresence(channelId) {
    const debugPrefix = `[PresenceService.getChannelPresence] channelId=${channelId}`;
    console.log(`${debugPrefix} - Starting`);
    
    try {
      const members = await redisService.getChannelMembers(channelId);
      const onlineUsers = await redisService.getChannelOnlineUsers(channelId);
      
      console.log(`${debugPrefix} - Members: ${members.length}, Online: ${onlineUsers.length}`);
      
      return {
        channelId,
        totalMembers: members.length,
        onlineCount: onlineUsers.length,
        onlineUsers,
        allMembers: members,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error(`${debugPrefix} - ERROR:`, error);
      return {
        channelId,
        totalMembers: 0,
        onlineCount: 0,
        onlineUsers: [],
        error: error.message
      };
    }
  }

  async cleanupStalePresence() {
    const debugPrefix = `[PresenceService.cleanupStalePresence]`;
    console.log(`${debugPrefix} - Starting automatic cleanup`);
    
    try {
      const redisResult = await redisService.cleanupStalePresence();
      console.log(`${debugPrefix} - Redis cleanup result:`, redisResult);
      
      // Also clean up stale sessions
      const sessionResult = await redisService.cleanupStaleSessions();
      console.log(`${debugPrefix} - Session cleanup removed ${sessionResult} sessions`);
      
      // Get updated online count
      const onlineCount = await redisService.getOnlineCount();
      console.log(`${debugPrefix} - Final online count after cleanup: ${onlineCount}`);
      
      return {
        success: true,
        ...redisResult,
        sessionsCleaned: sessionResult,
        onlineCount,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error(`${debugPrefix} - ERROR:`, error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async broadcastPresenceUpdate(userId, status, io = null) {
    const debugPrefix = `[PresenceService.broadcastPresenceUpdate] userId=${userId}, status=${status}`;
    console.log(`${debugPrefix} - Starting`);
    
    try {
      const presence = await this.getUserPresence(userId);
      
      const updateEvent = {
        userId,
        status,
        presence,
        timestamp: new Date().toISOString()
      };
      
      console.log(`${debugPrefix} - Update event:`, updateEvent);
      
      // Broadcast to all connected clients if io instance is provided
      if (io && typeof io.emit === 'function') {
        io.emit('user_presence_updated', updateEvent);
        
        // Specific events for online/offline
        if (status === 'online') {
          io.emit('user_online', updateEvent);
        } else if (status === 'offline') {
          io.emit('user_offline', updateEvent);
        }
        
        console.log(`${debugPrefix} - Broadcasted via Socket.IO`);
      }
      
      return updateEvent;
    } catch (error) {
      console.error(`${debugPrefix} - ERROR:`, error);
      return { success: false, error: error.message };
    }
  }

  async debugSystemStatus() {
    console.log('[PresenceService.debugSystemStatus] - Starting comprehensive debug');
    
    try {
      const onlineData = await this.getOnlineUsers();
      const redisDebug = await redisService.debugGetAllPresenceData();
      
      const result = {
        system: 'Presence Service Debug',
        timestamp: new Date().toISOString(),
        online: onlineData,
        redis: redisDebug,
        summary: {
          totalOnline: onlineData.count || 0,
          onlineUsers: onlineData.userIds || [],
          redisKeys: redisDebug.keys
        }
      };
      
      console.log('[PresenceService.debugSystemStatus] - Complete result:', JSON.stringify(result, null, 2));
      return result;
    } catch (error) {
      console.error('[PresenceService.debugSystemStatus] - ERROR:', error);
      return { error: error.message };
    }
  }
}

module.exports = new PresenceService();