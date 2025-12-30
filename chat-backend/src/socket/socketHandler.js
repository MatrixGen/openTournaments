const { verifyAccessToken } = require("../utils/tokens");
const {
  User,
  Channel,
  ChannelMember,
  Message,
  Reaction,
  Attachment,
} = require("../../models");
const redisService = require("../services/redisService");
const presenceService = require("../services/presenceService");
const contentModerator = require("../utils/profanityFilter");
const { createAdapter } = require("@socket.io/redis-adapter");
const { redisClient } = require("../config/redis");
const { Op } = require("sequelize");
const channel = require("../../models/channel");

const setupSocket = (io) => {
  console.log('[SocketHandler] Setting up Socket.IO with Redis adapter');
  
  // Setup Redis adapter for scaling
  const pubClient = redisClient.duplicate();
  const subClient = redisClient.duplicate();

  io.adapter(createAdapter(pubClient, subClient));
  console.log('[SocketHandler] Redis adapter initialized');

  // Authentication middleware for Socket.IO
  io.use(async (socket, next) => {
    const socketId = socket.id;
    console.log(`[SocketHandler.auth] Socket ${socketId} attempting authentication`);
    
    try {
      const token =
        socket.handshake.auth.token ||
        socket.handshake.headers.authorization?.replace("Bearer ", "");

      if (!token) {
        console.log(`[SocketHandler.auth] Socket ${socketId} - No token provided`);
        return next(new Error("Authentication error: No token provided"));
      }

      const decoded = verifyAccessToken(token);
      console.log(`[SocketHandler.auth] Socket ${socketId} - Token decoded for userId: ${decoded.userId}`);
      
      const user = await User.findByPk(decoded.userId, {
        attributes: ["id", "username", "email", "profilePicture", "status"],
      });

      if (!user) {
        console.log(`[SocketHandler.auth] Socket ${socketId} - User ${decoded.userId} not found`);
        return next(new Error("Authentication error: User not found"));
      }

      socket.userId = user.id;
      socket.user = user;
      socket.sessionId = socket.id;
      
      console.log(`[SocketHandler.auth] Socket ${socketId} - Authenticated as ${user.username} (${user.id})`);
      next();
    } catch (error) {
      console.error(`[SocketHandler.auth] Socket ${socketId} - ERROR:`, error.message);
      next(new Error("Authentication error: Invalid token"));
    }
  });

  io.on("connection", async (socket) => {
    const sessionId = socket.id;
    const userId = socket.userId;
    const username = socket.user.username;
    
    console.log(`[SocketHandler.connection] NEW CONNECTION - User: ${username} (${userId}), Socket: ${sessionId}`);

    try {
      // STEP 1: Update user presence to online
      console.log(`[SocketHandler.connection] Step 1 - Updating presence to online for ${username}`);
      const presenceResult = await presenceService.updateUserPresence(
        userId,
        "online",
        sessionId
      );
      
      console.log(`[SocketHandler.connection] Presence update result:`, presenceResult);

      // STEP 2: Store session info in Redis
      await redisService.addUserSession(userId, sessionId, {
        username: socket.user.username,
        connectedAt: new Date().toISOString(),
        instanceId: process.env.SERVER_INSTANCE_ID || 'single',
      });

      // Join user to their personal room for direct messages
      socket.join(`user:${userId}`);

      // STEP 3: Get updated online users count (AFTER adding current user)
      const onlineData = await presenceService.getOnlineUsers();
      console.log(`[SocketHandler.connection] Current online users: ${onlineData.count}`);
      
      // STEP 4: Send connection confirmation WITH online users list
      socket.emit("connected", {
        userId,
        username,
        sessionId,
        onlineCount: onlineData.count,
        timestamp: new Date().toISOString(),
      });

      // STEP 5: Send initial online users list to NEW user
      socket.emit('online_users_initial', {
        channelId:'global',
        count: onlineData.count,
        userIds: onlineData.userIds,
        timestamp: new Date().toISOString()
      });

      // STEP 6: Broadcast updated online count to ALL users
      io.emit("online_users_update", {
        channelId:'global',
        count: onlineData.count,
        timestamp: new Date().toISOString()
      });

      // STEP 7: Notify ALL other users that this user is online
      // Use io.emit NOT socket.broadcast.emit to reach ALL users
      io.emit("user_online", {
        channelId:'global',
        userId,
        username,
        profilePicture: socket.user.profilePicture,
        status: "online",
        instanceId: process.env.SERVER_INSTANCE_ID || 'single',
        timestamp: new Date().toISOString(),
      });

      console.log(`[SocketHandler.connection] Connection setup completed for ${username}`);

      // --- EVENT HANDLERS ---

      // Join user to their channels
      socket.on("join_channels", async () => {
        console.log(`[SocketHandler.join_channels] ${username} requesting to join channels`);
        
        try {
          const memberships = await ChannelMember.findAll({
            where: { userId },
            include: [{ model: Channel, as: "channel" }],
          });

          console.log(`[SocketHandler.join_channels] ${username} is member of ${memberships.length} channels`);

          for (const membership of memberships) {
            const room = `channel:${membership.channelId}`;
            socket.join(room);
            
            // Update channel presence
            await presenceService.joinChannel(userId, membership.channelId);
            await redisService.addUserToChannel(userId, membership.channelId);
            
            console.log(`[SocketHandler.join_channels] ${username} joined channel ${membership.channelId}, room: ${room}`);

            // Notify others in the channel that user joined
            socket.to(room).emit("user_joined_channel", {
              channelId: membership.channelId,
              user: {
                id: userId,
                username,
                profilePicture: socket.user.profilePicture,
              },
              timestamp: new Date().toISOString(),
            });
          }

          console.log(`[SocketHandler.join_channels] ${username} successfully joined all channels`);
        } catch (error) {
          console.error(`[SocketHandler.join_channels] ERROR for ${username}:`, error);
          socket.emit("error", { 
            message: "Failed to join channels",
            details: error.message 
          });
        }
      });

      // Join specific channel
      socket.on("join_channel", async (data, callback) => {
        const { channelId } = data;
        console.log(`[SocketHandler.join_channel] ${username} requesting to join channel ${channelId}`);
        
        try {
          const membership = await ChannelMember.findOne({
            where: { channelId, userId },
          });

          if (!membership) {
            console.log(`[SocketHandler.join_channel] ${username} is not a member of channel ${channelId}`);
            if (callback) callback({ success: false, error: "Not a member of this channel" });
            return;
          }

          const room = `channel:${channelId}`;
          socket.join(room);
          await presenceService.joinChannel(userId, channelId);
          await redisService.addUserToChannel(userId, channelId);
          
          console.log(`[SocketHandler.join_channel] ${username} joined channel ${channelId}, room: ${room}`);

          // Notify others in the channel
          socket.to(room).emit("user_joined_channel", {
            channelId,
            user: {
              id: userId,
              username,
              profilePicture: socket.user.profilePicture,
            },
            timestamp: new Date().toISOString(),
          });

          if (callback) callback({ success: true, channelId });
        } catch (error) {
          console.error(`[SocketHandler.join_channel] ERROR for ${username}, channel ${channelId}:`, error);
          if (callback) callback({ success: false, error: "Failed to join channel" });
        }
      });

      // Leave channel
      socket.on("leave_channel", async (data, callback) => {
        const { channelId } = data;
        console.log(`[SocketHandler.leave_channel] ${username} leaving channel ${channelId}`);
        
        try {
          const room = `channel:${channelId}`;
          socket.leave(room);
          await presenceService.leaveChannel(userId, channelId);
          await redisService.removeUserFromChannel(userId, channelId);
          
          console.log(`[SocketHandler.leave_channel] ${username} left channel ${channelId}`);

          // Notify others
          socket.to(room).emit("user_left_channel", {
            channelId,
            userId,
            username,
            timestamp: new Date().toISOString(),
          });

          if (callback) callback({ success: true });
        } catch (error) {
          console.error(`[SocketHandler.leave_channel] ERROR for ${username}, channel ${channelId}:`, error);
          if (callback) callback({ success: false, error: "Failed to leave channel" });
        }
      });

      // Handle sending messages with comprehensive features
      socket.on("send_message", async (data, callback) => {
        console.log(`[SocketHandler.send_message] ${username} sending message to channel ${data.channelId}`);
        
        try {
          const {
            channelId,
            content,
            type = "text",
            replyTo,
            tempId,
            mediaUrl,
            mediaMetadata,
          } = data;

          // Verify user is member of channel
          const membership = await ChannelMember.findOne({
            where: { channelId, userId },
          });

          if (!membership) {
            console.log(`[SocketHandler.send_message] ${username} is not a member of channel ${channelId}`);
            if (callback)
              callback({ success: false, error: "Not a member of this channel" });
            return;
          }

          // Check if user is muted
          if (contentModerator.isUserMuted(userId)) {
            console.log(`[SocketHandler.send_message] ${username} is muted, cannot send message`);
            if (callback)
              callback({
                success: false,
                error:
                  "You are temporarily muted for violating community guidelines",
                code: "USER_MUTED",
              });
            return;
          }

          // Validate message type
          const allowedTypes = [
            "text",
            "image",
            "video",
            "audio",
            "file",
            "system",
          ];
          if (!allowedTypes.includes(type)) {
            console.log(`[SocketHandler.send_message] Invalid message type: ${type}`);
            if (callback)
              callback({
                success: false,
                error: "Invalid message type",
                code: "INVALID_TYPE",
              });
            return;
          }

          // Validate content for text messages
          if (type === "text" && (!content || content.trim().length === 0)) {
            console.log(`[SocketHandler.send_message] Missing content for text message`);
            if (callback)
              callback({
                success: false,
                error: "Message content is required for text messages",
                code: "MISSING_CONTENT",
              });
            return;
          }

          // Scan message content for moderation
          const moderationResult = content
            ? contentModerator.scanMessage(content, userId)
            : {
                isClean: true,
                filteredContent: content || "",
                shouldBlock: false,
                violations: [],
              };

          if (moderationResult.shouldBlock) {
            console.log(`[SocketHandler.send_message] Message blocked for violations:`, moderationResult.violations);
            if (callback)
              callback({
                success: false,
                error: "Message contains prohibited content",
                code: "CONTENT_BLOCKED",
                violations: moderationResult.violations,
              });
            return;
          }

          // Create message
          const message = await Message.create({
            content: moderationResult.filteredContent,
            type,
            channelId,
            userId: userId,
            replyTo: replyTo || null,
            mediaUrl,
            mediaMetadata: mediaMetadata ? JSON.stringify(mediaMetadata) : null,
            isEdited: false,
            isModerated: !moderationResult.isClean,
            moderationFlags: moderationResult.violations,
          });

          console.log(`[SocketHandler.send_message] Created message ${message.id} in channel ${channelId}`);

          // Create attachment if mediaUrl exists
          if (mediaUrl) {
            await Attachment.create({
              messageId: message.id,
              url: mediaUrl,
              type,
              metadata: mediaMetadata,
              fileName: mediaMetadata?.originalName || "file",
            });
          }

          // Load message with all associations
          const messageWithAssociations = await Message.findByPk(message.id, {
            include: [
              {
                model: User,
                as: "user",
                attributes: ["id", "username", "profilePicture", "status"],
              },
              {
                model: Attachment,
                as: "attachments",
                attributes: ["id", "url", "type", "fileName", "metadata"],
              },
              {
                model: Message,
                as: "parentMessage",
                include: [
                  {
                    model: User,
                    as: "user",
                    attributes: ["id", "username"],
                  },
                ],
              },
            ],
          });

          // Cache recent message for fast retrieval
          await redisService.cacheChannelMessage(
            channelId,
            messageWithAssociations
          );

          // Update channel activity timestamp
          await redisClient.set(
            `channel:${channelId}:last_activity`,
            new Date().toISOString()
          );

          // Prepare and send message data
          const messageData = {
            message: messageWithAssociations.toJSON(),
            tempId: tempId || null,
            moderation: {
              wasFiltered: !moderationResult.isClean,
              violations: moderationResult.violations,
            },
          };

          // Emit to channel
          io.to(`channel:${channelId}`).emit("new_message", messageData);
          
          // Send confirmation to sender
          socket.emit("message_sent", {
            tempId,
            messageId: message.id,
            messageData,
            success: true,
          });

          // Update last read for sender
          await membership.update({ lastReadAt: new Date() });

          console.log(`[SocketHandler.send_message] Message ${message.id} sent successfully`);

          if (callback) {
            callback({
              success: true,
              messageId: message.id,
              tempId,
              moderation: messageData.moderation,
            });
          }
        } catch (error) {
          console.error(`[SocketHandler.send_message] ERROR for ${username}:`, error);
          socket.emit("message_error", {
            tempId: data.tempId,
            error: "Failed to send message",
            code: "MESSAGE_SEND_ERROR",
          });
          if (callback) callback({ success: false, error: "Send failed" });
        }
      });

      // Handle editing messages
      socket.on("edit_message", async (data, callback) => {
        console.log(`[SocketHandler.edit_message] ${username} editing message ${data.messageId}`);
        
        try {
          const { messageId, content } = data;

          if (!content || content.trim().length === 0) {
            console.log(`[SocketHandler.edit_message] Missing content for edit`);
            if (callback)
              callback({ success: false, error: "Message content is required" });
            return;
          }

          const message = await Message.findByPk(messageId);

          if (!message) {
            console.log(`[SocketHandler.edit_message] Message ${messageId} not found`);
            if (callback)
              callback({ success: false, error: "Message not found" });
            return;
          }

          // Check if user is the sender
          if (message.userId !== userId) {
            console.log(`[SocketHandler.edit_message] ${username} trying to edit someone else's message`);
            if (callback)
              callback({
                success: false,
                error: "You can only edit your own messages",
              });
            return;
          }

          // Check if message is deleted
          if (message.isDeleted) {
            console.log(`[SocketHandler.edit_message] Cannot edit deleted message`);
            if (callback)
              callback({
                success: false,
                error: "Cannot edit a deleted message",
              });
            return;
          }

          // Check edit window (15 minutes)
          const editWindow = 15 * 60 * 1000;
          const messageAge = Date.now() - new Date(message.createdAt).getTime();
          if (messageAge > editWindow) {
            console.log(`[SocketHandler.edit_message] Message too old to edit (age: ${messageAge}ms)`);
            if (callback)
              callback({ success: false, error: "Message is too old to edit" });
            return;
          }

          // Scan edited content
          const moderationResult = contentModerator.scanMessage(
            content,
            userId
          );

          if (moderationResult.shouldBlock) {
            console.log(`[SocketHandler.edit_message] Edited message contains violations`);
            if (callback)
              callback({
                success: false,
                error: "Edited message contains prohibited content",
                violations: moderationResult.violations,
              });
            return;
          }

          // Update message
          await message.update({
            content: moderationResult.filteredContent,
            isEdited: true,
            editedAt: new Date(),
            isModerated: !moderationResult.isClean || message.isModerated,
            moderationFlags:
              moderationResult.violations.length > 0
                ? [
                    ...(message.moderationFlags || []),
                    ...moderationResult.violations,
                  ]
                : message.moderationFlags,
          });

          // Reload with associations
          const updatedMessage = await Message.findByPk(messageId, {
            include: [
              {
                model: User,
                as: "user",
                attributes: ["id", "username", "profilePicture", "status"],
              },
              {
                model: Attachment,
                as: "attachments",
                attributes: ["id", "url", "type", "fileName", "metadata"],
              },
            ],
          });

          // Broadcast edit to channel
          io.to(`channel:${message.channelId}`).emit("message_edited", {
            message: updatedMessage.toJSON(),
            editedBy: userId,
            timestamp: new Date().toISOString(),
          });

          console.log(`[SocketHandler.edit_message] Message ${messageId} edited successfully`);

          if (callback) callback({ success: true, message: updatedMessage });
        } catch (error) {
          console.error(`[SocketHandler.edit_message] ERROR for ${username}:`, error);
          if (callback)
            callback({ success: false, error: "Failed to edit message" });
        }
      });

      // Handle deleting messages
      socket.on("delete_message", async (data, callback) => {
        console.log(`[SocketHandler.delete_message] ${username} deleting message ${data.messageId}`);
        
        try {
          const { messageId } = data;

          const message = await Message.findByPk(messageId, {
            include: [
              {
                model: Attachment,
                as: "attachments",
              },
            ],
          });

          if (!message) {
            console.log(`[SocketHandler.delete_message] Message ${messageId} not found`);
            if (callback)
              callback({ success: false, error: "Message not found" });
            return;
          }

          // Check if user can delete (sender or admin/moderator)
          let canDelete = message.userId === userId;

          if (!canDelete) {
            const membership = await ChannelMember.findOne({
              where: {
                channelId: message.channelId,
                userId: userId,
                role: { [Op.in]: ["admin", "moderator", "owner"] },
              },
            });
            canDelete = !!membership;
          }

          if (!canDelete) {
            console.log(`[SocketHandler.delete_message] ${username} cannot delete this message`);
            if (callback)
              callback({
                success: false,
                error: "You cannot delete this message",
              });
            return;
          }

          // Check if already deleted
          if (message.isDeleted) {
            console.log(`[SocketHandler.delete_message] Message already deleted`);
            if (callback)
              callback({ success: false, error: "Message is already deleted" });
            return;
          }

          // Soft delete
          await message.update({
            content: "[This message was deleted]",
            mediaUrl: null,
            mediaMetadata: null,
            isDeleted: true,
            deletedAt: new Date(),
            deletedBy: userId,
          });

          // Broadcast deletion
          io.to(`channel:${message.channelId}`).emit("message_deleted", {
            messageId: message.id,
            channelId: message.channelId,
            deletedBy: userId,
            timestamp: new Date().toISOString(),
          });

          console.log(`[SocketHandler.delete_message] Message ${messageId} deleted successfully`);

          if (callback) callback({ success: true });
        } catch (error) {
          console.error(`[SocketHandler.delete_message] ERROR for ${username}:`, error);
          if (callback)
            callback({ success: false, error: "Failed to delete message" });
        }
      });

      // Handle reactions
      socket.on("toggle_reaction", async (data, callback) => {
        console.log(`[SocketHandler.toggle_reaction] ${username} toggling reaction on message ${data.messageId}`);
        
        try {
          const { messageId, emoji } = data;

          if (!emoji || emoji.trim().length === 0) {
            console.log(`[SocketHandler.toggle_reaction] Missing emoji`);
            if (callback)
              callback({ success: false, error: "Emoji is required" });
            return;
          }

          const message = await Message.findByPk(messageId);

          if (!message) {
            console.log(`[SocketHandler.toggle_reaction] Message ${messageId} not found`);
            if (callback)
              callback({ success: false, error: "Message not found" });
            return;
          }

          // Check if user is member of channel
          const membership = await ChannelMember.findOne({
            where: { channelId: message.channelId, userId },
          });

          if (!membership) {
            console.log(`[SocketHandler.toggle_reaction] ${username} not a member of channel ${message.channelId}`);
            if (callback)
              callback({ success: false, error: "Not a member of this channel" });
            return;
          }

          // Check if reaction already exists
          const existingReaction = await Reaction.findOne({
            where: {
              messageId,
              userId,
              emoji,
            },
          });

          if (existingReaction) {
            // Remove reaction
            await existingReaction.destroy();
            console.log(`[SocketHandler.toggle_reaction] Reaction removed`);
          } else {
            // Add reaction
            await Reaction.create({
              messageId,
              userId,
              emoji,
            });
            console.log(`[SocketHandler.toggle_reaction] Reaction added`);
          }

          // Get updated reactions
          const reactions = await Reaction.findAll({
            where: { messageId },
            include: [
              {
                model: User,
                as: "user",
                attributes: ["id", "username", "profilePicture"],
              },
            ],
          });

          // Broadcast reaction update
          io.to(`channel:${message.channelId}`).emit("message_reaction_updated", {
            messageId,
            userId,
            emoji,
            action: existingReaction ? "removed" : "added",
            reactions: reactions.map((r) => ({
              id: r.id,
              emoji: r.emoji,
              user: r.user,
              createdAt: r.createdAt,
            })),
            timestamp: new Date().toISOString(),
          });

          if (callback)
            callback({
              success: true,
              action: existingReaction ? "removed" : "added",
              reactions,
            });
        } catch (error) {
          console.error(`[SocketHandler.toggle_reaction] ERROR for ${username}:`, error);
          if (callback)
            callback({ success: false, error: "Failed to toggle reaction" });
        }
      });

      // Handle typing indicators with debouncing
      const typingTimers = new Map();

      socket.on("typing_start", async (data) => {
        const { channelId } = data;
        console.log(`[SocketHandler.typing_start] ${username} started typing in channel ${channelId}`);
        
        const key = `${userId}:${channelId}`;

        // Clear existing timer
        if (typingTimers.has(key)) {
          clearTimeout(typingTimers.get(key));
        }

        // Store typing state in Redis with 3 second TTL
        await redisClient.setex(
          `typing:${channelId}:${userId}`,
          3,
          JSON.stringify({
            username: socket.user.username,
            profilePicture: socket.user.profilePicture,
            startedAt: new Date().toISOString(),
          })
        );

        // Emit to others in channel
        socket.to(`channel:${channelId}`).emit("user_typing", {
          userId,
          username: socket.user.username,
          profilePicture: socket.user.profilePicture,
          channelId,
          isTyping: true,
          timestamp: new Date().toISOString(),
        });

        // Set timer to auto-stop typing after 3 seconds
        typingTimers.set(
          key,
          setTimeout(async () => {
            await redisClient.del(`typing:${channelId}:${userId}`);
            socket.to(`channel:${channelId}`).emit("user_typing", {
              userId,
              username: socket.user.username,
              channelId,
              isTyping: false,
              timestamp: new Date().toISOString(),
            });
            typingTimers.delete(key);
          }, 3000)
        );
      });

      socket.on("typing_stop", async (data) => {
        const { channelId } = data;
        console.log(`[SocketHandler.typing_stop] ${username} stopped typing in channel ${channelId}`);
        
        const key = `${userId}:${channelId}`;

        // Clear timer
        if (typingTimers.has(key)) {
          clearTimeout(typingTimers.get(key));
          typingTimers.delete(key);
        }

        // Remove typing state
        await redisClient.del(`typing:${channelId}:${userId}`);

        socket.to(`channel:${channelId}`).emit("user_typing", {
          userId,
          username: socket.user.username,
          channelId,
          isTyping: false,
          timestamp: new Date().toISOString(),
        });
      });

      // Mark messages as read
      socket.on("mark_messages_read", async (data, callback) => {
        console.log(`[SocketHandler.mark_messages_read] ${username} marking messages as read in channel ${data.channelId}`);
        
        try {
          const { channelId, messageIds = [] } = data;

          const membership = await ChannelMember.findOne({
            where: { channelId, userId },
          });

          if (!membership) {
            console.log(`[SocketHandler.mark_messages_read] ${username} not a member of channel ${channelId}`);
            if (callback)
              callback({ success: false, error: "Not a member of this channel" });
            return;
          }

          // Update last read for user in channel
          await membership.update({ lastReadAt: new Date() });

          // Broadcast read receipt if it's a specific message
          if (messageIds.length > 0) {
            // For each message, emit read receipt to sender
            for (const messageId of messageIds) {
              const message = await Message.findByPk(messageId);
              if (message && message.userId !== userId) {
                io.to(`user:${message.userId}`).emit("message_read", {
                  messageId,
                  channelId,
                  readBy: userId,
                  readAt: new Date().toISOString(),
                });
              }
            }
          }

          console.log(`[SocketHandler.mark_messages_read] Messages marked as read by ${username}`);

          if (callback) callback({ success: true });
        } catch (error) {
          console.error(`[SocketHandler.mark_messages_read] ERROR for ${username}:`, error);
          if (callback)
            callback({
              success: false,
              error: "Failed to mark messages as read",
            });
        }
      });

      // Get typing users for a channel
      socket.on("get_typing_users", async (data, callback) => {
        console.log(`[SocketHandler.get_typing_users] ${username} requesting typing users for channel ${data.channelId}`);
        
        try {
          const { channelId } = data;

          const keys = await redisClient.keys(`typing:${channelId}:*`);
          const typingUsers = [];

          for (const key of keys) {
            const typingData = await redisClient.get(key);
            if (typingData) {
              const data = JSON.parse(typingData);
              const userId = key.split(":")[2];
              typingUsers.push({
                userId,
                ...data,
              });
            }
          }

          if (callback) callback({ success: true, typingUsers });
        } catch (error) {
          console.error(`[SocketHandler.get_typing_users] ERROR for ${username}:`, error);
          if (callback)
            callback({ success: false, error: "Failed to get typing users" });
        }
      });

      // Heartbeat handler
      socket.on("heartbeat", async () => {
        console.log(`[SocketHandler.heartbeat] ${username} sent heartbeat`);
        
        try {
          await presenceService.updateUserHeartbeat(userId);
          
          socket.emit("heartbeat_ack", {
            timestamp: new Date().toISOString(),
            serverTime: Date.now(),
          });
          
          console.log(`[SocketHandler.heartbeat] ${username} heartbeat acknowledged`);
        } catch (error) {
          console.error(`[SocketHandler.heartbeat] ERROR for ${username}:`, error);
        }
      });

      // Manual presence update
      socket.on("update_presence", async (data, callback) => {
        const { status } = data;
        console.log(`[SocketHandler.update_presence] ${username} manually updating presence to ${status}`);
        
        try {
          const result = await presenceService.updateUserPresence(userId, status, sessionId);
          
          if (result.success) {
            // Broadcast the update
            const broadcastResult = await presenceService.broadcastPresenceUpdate(userId, status, io);
            
            console.log(`[SocketHandler.update_presence] ${username} presence updated to ${status}`);
            
            if (callback) callback({ 
              success: true, 
              status,
              broadcasted: broadcastResult.success 
            });
          } else {
            if (callback) callback({ success: false, error: result.error });
          }
        } catch (error) {
          console.error(`[SocketHandler.update_presence] ERROR for ${username}:`, error);
          if (callback) callback({ success: false, error: error.message });
        }
      });

      // Get online users
      socket.on("get_online_users", async (data, callback) => {
        const { channelId } = data || {};
        console.log(`[SocketHandler.get_online_users] ${username} requesting online users for ${channelId ? 'channel ' + channelId : 'global'}`);
        
        try {
          const result = await presenceService.getOnlineUsers(channelId);
          
          if (callback) callback({
            success: true,
            ...result,
            requestedAt: new Date().toISOString()
          });
          
          console.log(`[SocketHandler.get_online_users] Sent ${channelId ? 'channel' : 'global'} online users to ${username}`);
        } catch (error) {
          console.error(`[SocketHandler.get_online_users] ERROR for ${username}:`, error);
          if (callback) callback({ success: false, error: error.message });
        }
      });

      // Disconnect handler
      socket.on("disconnect", async (reason) => {
        console.log(`[SocketHandler.disconnect] ${username} DISCONNECTED - Reason: ${reason}, Socket: ${sessionId}`);
        console.log(`[SocketHandler.disconnect] Active sockets after disconnect: ${io.engine.clientsCount - 1}`);
        
        try {
          // Remove this specific session
          console.log(`[SocketHandler.disconnect] Removing session ${sessionId} for ${username}`);
          await redisService.removeUserSession(userId, sessionId);
          
          // Check if user has other active sessions
          const sessions = await redisService.getUserSessions(userId);
          const activeSessions = Object.keys(sessions || {}).length;
          
          console.log(`[SocketHandler.disconnect] ${username} has ${activeSessions} remaining active session(s)`);
          
          if (activeSessions === 0) {
            // No active sessions, update to offline
            console.log(`[SocketHandler.disconnect] No active sessions left for ${username}, updating to offline`);
            
            const updateResult = await presenceService.updateUserPresence(userId, "offline");
            console.log(`[SocketHandler.disconnect] Presence update result:`, updateResult);
            
            // Broadcast offline status
            io.emit("user_offline", {
              userId,
              username,
              profilePicture: socket.user.profilePicture,
              status: "offline",
              lastSeen: new Date().toISOString(),
              instanceId: process.env.SERVER_INSTANCE_ID || 'single',
            });

            // Update online count for everyone
            const onlineCount = await redisService.getOnlineCount();
            io.emit("online_users_update", {
              count: onlineCount,
              timestamp: new Date().toISOString()
            });
            
            console.log(`[SocketHandler.disconnect] Broadcasted offline status for ${username}. New online count: ${onlineCount}`);
          } else {
            console.log(`[SocketHandler.disconnect] ${username} still has ${activeSessions} active session(s), keeping as online`);
            
            // User still has other sessions, update heartbeat to show they're still active on other devices
            await presenceService.updateUserHeartbeat(userId);
          }
          
          // Clean up typing indicators for this user
          const typingKeys = await redisClient.keys(`typing:*:${userId}`);
          for (const key of typingKeys) {
            await redisClient.del(key);
          }
          
          // Clean up timers
          for (const [key, timer] of typingTimers.entries()) {
            if (key.startsWith(`${userId}:`)) {
              clearTimeout(timer);
              typingTimers.delete(key);
            }
          }
          
          console.log(`[SocketHandler.disconnect] Cleanup completed for ${username}`);
        } catch (error) {
          console.error(`[SocketHandler.disconnect] ERROR during cleanup for ${username}:`, error);
        }
      });

      // Error handler
      socket.on("error", (error) => {
        console.error(`[SocketHandler.socket_error] ${username} socket error:`, error);
      });

      // Debug endpoint (admin only)
      socket.on("debug_presence", async (data, callback) => {
        console.log(`[SocketHandler.debug_presence] ${username} requesting debug info`);
        
        // In production, add admin check here
        try {
          const debugInfo = await presenceService.debugSystemStatus();
          
          if (callback) callback({
            success: true,
            ...debugInfo
          });
          
          console.log(`[SocketHandler.debug_presence] Sent debug info to ${username}`);
        } catch (error) {
          console.error(`[SocketHandler.debug_presence] ERROR:`, error);
          if (callback) callback({ success: false, error: error.message });
        }
      });

    } catch (error) {
      console.error(`[SocketHandler.connection] ERROR during connection setup for ${username}:`, error);
      socket.emit("connection_error", {
        message: "Failed to establish connection",
        error: error.message
      });
      socket.disconnect();
    }
  });

  // Periodic cleanup for typing indicators and stale presence
  console.log('[SocketHandler] Setting up periodic cleanup (every 60 seconds)');
  setInterval(async () => {
    console.log('[SocketHandler.cleanup] Starting scheduled cleanup');
    
    try {
      // Clean up stale typing indicators
      const typingKeys = await redisClient.keys("typing:*");
      for (const key of typingKeys) {
        const ttl = await redisClient.ttl(key);
        if (ttl < 0) {
          await redisClient.del(key);
        }
      }
      
      // Clean up stale presence
      const result = await presenceService.cleanupStalePresence();
      console.log('[SocketHandler.cleanup] Scheduled cleanup completed:', result);
      
      // Broadcast updated count if it changed
      if (result.success && (result.markedAway > 0 || result.markedOffline > 0)) {
        const onlineCount = await redisService.getOnlineCount();
        io.emit("online_users_update", {
          count: onlineCount,
          timestamp: new Date().toISOString(),
          cleanup: result
        });
        
        console.log('[SocketHandler.cleanup] Broadcasted updated count:', onlineCount);
      }
    } catch (error) {
      console.error('[SocketHandler.cleanup] ERROR during scheduled cleanup:', error);
    }
  }, 60000); // Every minute

  console.log('[SocketHandler] Setup complete. Presence system ready.');
};

module.exports = { setupSocket };