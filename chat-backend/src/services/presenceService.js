const redisService = require('./redisService');
const { User } = require('../../models');

class PresenceService {
  async updateUserPresence(userId, status = 'online') {
    const user = await User.findByPk(userId, {
      attributes: ['id', 'username', 'email', 'profilePicture']
    });

    if (!user) return;

    const presenceData = {
      userId: user.id,
      username: user.username,
      profilePicture: user.profilePicture,
      status,
      lastSeen: new Date().toISOString()
    };

    if (status === 'online') {
      await redisService.setUserOnline(userId, presenceData);
      // Update database
      await User.update(
        { status: 'online', isOnline: true },
        { where: { id: userId } }
      );
    } else {
      await redisService.setUserOffline(userId);
      // Update database
      await User.update(
        { status: 'offline', isOnline: false, lastSeen: new Date() },
        { where: { id: userId } }
      );
    }

    return presenceData;
  }

  async broadcastPresenceUpdate(userId, status, io) {
    const presenceData = await this.updateUserPresence(userId, status);
    
    // Get user's channels to broadcast presence
    const userChannels = await redisService.getUserChannels(userId);
    
    userChannels.forEach(channelId => {
      io.to(`channel:${channelId}`).emit('presence_update', {
        userId,
        ...presenceData
      });
    });
  }

  async getUserPresence(userId) {
    const redisPresence = await redisService.getUserPresence(userId);
    
    if (!redisPresence) {
      // Fallback to database
      const user = await User.findByPk(userId, {
        attributes: ['id', 'username', 'profilePicture', 'status', 'lastSeen']
      });
      return user ? {
        userId: user.id,
        username: user.username,
        profilePicture: user.profilePicture,
        status: user.status,
        lastSeen: user.lastSeen
      } : null;
    }
    
    return redisPresence;
  }

  async getOnlineUsersInChannel(channelId) {
    const userIds = await redisService.getChannelUsers(channelId);
    const onlineUsers = [];
    
    for (const userId of userIds) {
      const presence = await this.getUserPresence(userId);
      if (presence && presence.status === 'online') {
        onlineUsers.push(presence);
      }
    }
    
    return onlineUsers;
  }
}

module.exports = new PresenceService();