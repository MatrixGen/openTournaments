const { verifyAccessToken } = require('../utils/tokens');
const { User, Channel, ChannelMember,Message } = require('../../models');
const redisService = require('../services/redisService');
const presenceService = require('../services/presenceService');
const { createAdapter } = require('@socket.io/redis-adapter');
const { redisClient } = require('../config/redis');

const setupSocket = (io) => {
  // Setup Redis adapter for scaling
  const pubClient = redisClient.duplicate();
  const subClient = redisClient.duplicate();
  
  io.adapter(createAdapter(pubClient, subClient));
  console.log('🔌 Socket.IO Redis adapter initialized');

  // Authentication middleware for Socket.IO
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token || socket.handshake.headers.token;
      
      if (!token) {
        return next(new Error('Authentication error: No token provided'));
      }

      const decoded = verifyAccessToken(token);
      const user = await User.findByPk(decoded.userId);
      
      if (!user) {
        return next(new Error('Authentication error: User not found'));
      }

      socket.userId = user.id;
      socket.user = user;
      next();
    } catch (error) {
      next(new Error('Authentication error: Invalid token'));
    }
  });

  io.on('connection', async (socket) => {
    console.log(`User ${socket.user.username} connected to instance ${process.env.SERVER_INSTANCE_ID || 'single'}`);

    // Update user presence
    await presenceService.updateUserPresence(socket.userId, 'online');

    // Join user to their channels
    socket.on('join_channels', async () => {
      try {
        const memberships = await ChannelMember.findAll({
          where: { userId: socket.userId },
          include: [{ model: Channel, as: 'channel' }]
        });

        for (const membership of memberships) {
          socket.join(`channel:${membership.channelId}`);
          await redisService.addUserToChannel(socket.userId, membership.channelId);
          console.log(`User ${socket.user.username} joined channel ${membership.channelId}`);
        }

        // Broadcast user online status to all instances
        socket.broadcast.emit('user_online', {
          userId: socket.userId,
          username: socket.user.username,
          status: 'online',
          instanceId: process.env.SERVER_INSTANCE_ID
        });
      } catch (error) {
        console.error('Error joining channels:', error);
      }
    });

    // Handle sending messages with delivery tracking
    socket.on('send_message', async (data, callback) => {
      try {
        const { channelId, content, replyTo, tempId } = data;

        // Verify user is member of channel
        const membership = await ChannelMember.findOne({
          where: { channelId, userId: socket.userId }
        });

        if (!membership) {
          socket.emit('error', { message: 'Not a member of this channel' });
          if (callback) callback({ success: false, error: 'Not a member' });
          return;
        }

        // Create message
        const message = await Message.create({
          content,
          channelId,
          userId: socket.userId,
          replyTo: replyTo || null,
          type: 'text'
        });

        // Load message with user data
        const messageWithUser = await Message.findByPk(message.id, {
          include: [
            {
              model: User,
              as: 'user',
              attributes: ['id', 'username', 'profilePicture', 'status']
            }
          ]
        });

        // Cache recent message for fast retrieval
        await redisService.cacheChannelMessage(channelId, messageWithUser);

        // Broadcast to channel across all instances
        io.to(`channel:${channelId}`).emit('new_message', {
          message: messageWithUser,
          tempId // Client can use this to confirm delivery
        });

        // Update last read for sender
        await membership.update({ lastReadAt: new Date() });

        if (callback) {
          callback({ 
            success: true, 
            messageId: message.id,
            tempId 
          });
        }

      } catch (error) {
        console.error('Send message error:', error);
        socket.emit('error', { message: 'Failed to send message' });
        if (callback) callback({ success: false, error: 'Send failed' });
      }
    });

    // Handle typing indicators with Redis for cross-instance sync
    socket.on('typing_start', async (data) => {
      const { channelId } = data;
      
      // Store typing state in Redis with 3 second TTL
      await redisClient.setex(
        `typing:${channelId}:${socket.userId}`, 
        3, 
        JSON.stringify({ 
          username: socket.user.username,
          startedAt: new Date().toISOString() 
        })
      );

      socket.to(`channel:${channelId}`).emit('user_typing', {
        userId: socket.userId,
        username: socket.user.username,
        channelId,
        isTyping: true
      });
    });

    socket.on('typing_stop', (data) => {
      const { channelId } = data;
      
      // Remove typing state
      redisClient.del(`typing:${channelId}:${socket.userId}`);

      socket.to(`channel:${channelId}`).emit('user_typing', {
        userId: socket.userId,
        username: socket.user.username,
        channelId,
        isTyping: false
      });
    });

    // Handle disconnect
    socket.on('disconnect', async (reason) => {
      console.log(`User ${socket.user.username} disconnected: ${reason}`);

      // Update user presence
      await presenceService.updateUserPresence(socket.userId, 'offline');

      // Broadcast user offline status to all instances
      socket.broadcast.emit('user_offline', {
        userId: socket.userId,
        username: socket.user.username,
        status: 'offline',
        lastSeen: new Date().toISOString(),
        instanceId: process.env.SERVER_INSTANCE_ID
      });
    });

    // Handle manual presence updates
    socket.on('update_presence', async (data) => {
      const { status } = data;
      await presenceService.updateUserPresence(socket.userId, status);
    });
  });
};

module.exports = { setupSocket };