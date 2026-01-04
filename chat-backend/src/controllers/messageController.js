// controllers/messageController.js
const { 
  Message, 
  Channel, 
  User, 
  ChannelMember, 
  ReadReceipt, 
  Attachment, 
  Reaction, 
  Sequelize 
} = require('../../models');
const { successResponse, errorResponse } = require('../middleware/responseFormatter');
const contentModerator = require('../utils/profanityFilter');
const { Op } = Sequelize;


const path = require('path');
const fs = require('fs').promises;
const { v4: uuidv4 } = require('uuid');


// ============================================
// CONTROLLER FUNCTIONS
// ============================================

/**
 * Get messages for a channel with pagination and optional filters
 */
const getChannelMessages = async (req, res) => {
  try {
    const { channelId } = req.params;
    const { before, after, limit = 50, includeAttachments = true, type } = req.query;

    const membership = await ChannelMember.findOne({
      where: { channelId, userId: req.user.id }
    });

    if (!membership) {
      return res.status(403).json(
        errorResponse('You are not a member of this channel', 'FORBIDDEN')
      );
    }

    const where = { 
      channelId,
      isDeleted: false
    };
    
    if (type && ['text', 'image', 'video', 'audio', 'file', 'system'].includes(type)) {
      where.type = type;
    }
    
    if (before) {
      where.createdAt = { [Op.lt]: new Date(before) };
    }
    
    if (after) {
      where.createdAt = { [Op.gt]: new Date(after) };
    }

    const include = [
      {
        model: User,
        as: 'user',
        attributes: ['id', 'username', 'profilePicture', 'status']
      },
      {
        model: Message,
        as: 'parentMessage',
        include: [{
          model: User,
          as: 'user',
          attributes: ['id', 'username']
        }]
      }
    ];

    if (includeAttachments === 'true' || includeAttachments === true) {
      include.push({
        model: Attachment,
        as: 'attachments',
        attributes: ['id', 'url', 'type', 'fileName', 'metadata', 'thumbnailUrl', 'fileSize', 'mimeType']
      });
    }

    include.push({
      model: Reaction,
      as: 'reactions',
      attributes: ['id', 'emoji', 'userId', 'createdAt'],
      include: [{
        model: User,
        as: 'user',
        attributes: ['id', 'username', 'profilePicture']
      }]
    });

    const messages = await Message.findAll({
      where,
      include,
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit)
    });

    let hasMore = false;
    if (messages.length === parseInt(limit)) {
      const nextMessage = await Message.findOne({
        where: {
          ...where,
          createdAt: { [Op.lt]: messages[messages.length - 1].createdAt }
        },
        order: [['createdAt', 'DESC']]
      });
      hasMore = !!nextMessage;
    }

    const chronologicalMessages = messages.reverse();

    await membership.update({ lastReadAt: new Date() });

    res.json(
      successResponse(
        { 
          messages: chronologicalMessages,
          hasMore 
        },
        'Messages retrieved successfully'
      )
    );
  } catch (error) {
    console.error('Get messages error:', error.message);
    res.status(500).json(
      errorResponse('Failed to retrieve messages', 'MESSAGES_RETRIEVAL_ERROR')
    );
  }
};

/**
 * Send a message (text or media)
 */
const sendMessage = async (req, res) => {
  let uploadedFilePath = null;
  
  try {
    const { channelId } = req.params;
    const { content, replyTo, type = 'text', mediaCaption, fileName, fileSize, mimeType, originalName } = req.body;
    const mediaFile = req.file;

    // Mute check
    if (contentModerator.isUserMuted(req.user.id)) {
      return res.status(423).json(
        errorResponse('You are temporarily muted for violating community guidelines', 'USER_MUTED')
      );
    }

    // Membership check
    const membership = await ChannelMember.findOne({
      where: { channelId, userId: req.user.id }
    });

    if (!membership) {
      return res.status(403).json(
        errorResponse('You are not a member of this channel', 'FORBIDDEN')
      );
    }

    // Type validation
    const allowedTypes = ['text', 'image', 'video', 'file', 'audio', 'system'];
    if (!allowedTypes.includes(type)) {
      return res.status(400).json(
        errorResponse('Invalid message type', 'INVALID_TYPE', { allowedTypes })
      );
    }

    // Content validation
    if (type === 'text' && (!content || content.trim().length === 0)) {
      return res.status(400).json(
        errorResponse('Message content is required for text messages', 'MISSING_CONTENT')
      );
    }

    let mediaUrl = null;
    let mediaMetadata = null;
    let thumbnailUrl = null;

    // Media handling
    if (mediaFile && req.uploadUtils) {
      try {
        // Move from temp to permanent location
        const moveResult = await req.uploadUtils.moveToPermanent(mediaFile.path, type);
        uploadedFilePath = moveResult.absolutePath;
        mediaUrl = moveResult.publicUrl;
        
        // Prepare metadata
        mediaMetadata = {
          originalName: originalName || mediaFile.originalname,
          mimeType: mimeType || mediaFile.mimetype,
          size: fileSize ? parseInt(fileSize) : mediaFile.size,
          dimensions: null,
          duration: null
        };

        // Generate thumbnail for images/videos
        if (type === 'image' || type === 'video') {
          try {
            const thumbnailFileName = `${uuidv4()}.jpg`;
            const thumbnailPath = path.join(req.uploadUtils.thumbnailsDir, thumbnailFileName);
            thumbnailUrl = req.uploadUtils.getPublicUrl(thumbnailPath);
          } catch (thumbnailError) {
            console.warn('Thumbnail generation failed:', thumbnailError.message);
          }
        }
      } catch (uploadError) {
        console.error('File upload error:', uploadError.message);
        return res.status(500).json(
          errorResponse('Failed to process uploaded file', 'UPLOAD_ERROR')
        );
      }
    }

    // Content moderation
    const messageContent = content || mediaCaption || '';
    const moderationResult = messageContent ? 
      contentModerator.scanMessage(messageContent, req.user.id) : 
      { isClean: true, filteredContent: '', shouldBlock: false, violations: [] };

    if (moderationResult.shouldBlock) {
      if (uploadedFilePath) {
        await req.uploadUtils.cleanupFile(uploadedFilePath);
      }
      
      return res.status(422).json(
        errorResponse('Message contains prohibited content', 'CONTENT_BLOCKED', {
          violations: moderationResult.violations
        })
      );
    }

    // Create message
    const message = await Message.create({
      content: moderationResult.filteredContent,
      type: type,
      channelId,
      userId: req.user.id,
      replyTo: replyTo || null,
      mediaUrl,
      mediaMetadata: mediaMetadata ? JSON.stringify(mediaMetadata) : null,
      isEdited: false,
      isModerated: !moderationResult.isClean,
      moderationFlags: moderationResult.violations
    });

    // Create attachment if media exists
    if (mediaUrl && uploadedFilePath) {
      const attachmentData = {
        messageId: message.id,
        url: mediaUrl,
        thumbnailUrl,
        type: type,
        fileName: fileName || mediaFile.originalname,
        fileSize: fileSize ? parseInt(fileSize) : mediaFile.size,
        mimeType: mimeType || mediaFile.mimetype,
        metadata: mediaMetadata ? JSON.stringify(mediaMetadata) : null,
        storagePath: uploadedFilePath
      };

      try {
        await Attachment.create(attachmentData);
      } catch (attachmentError) {
        console.error('Attachment creation failed:', attachmentError.message);
      }
    }

    // Load full message with associations
    const messageWithAssociations = await Message.findByPk(message.id, {
      include: [
        { 
          model: User, 
          as: 'user', 
          attributes: ['id', 'username', 'profilePicture', 'status'] 
        },
        { 
          model: Attachment, 
          as: 'attachments', 
          attributes: ['id', 'url', 'type', 'fileName', 'metadata', 'thumbnailUrl', 'fileSize', 'mimeType', 'storagePath'] 
        },
        { 
          model: Message, 
          as: 'parentMessage', 
          include: [{ 
            model: User, 
            as: 'user', 
            attributes: ['id', 'username'] 
          }] 
        }
      ]
    });

    // Update last read timestamp
    await membership.update({ lastReadAt: new Date() });

    // Emit socket event
    if (req.app.get('io')) {
      const socketData = {
        message: messageWithAssociations,
        tempId: req.body.tempId || null
      };
      req.app.get('io').to(`channel:${channelId}`).emit('new_message', socketData);
    }

    return res.status(201).json(
      successResponse(
        { 
          message: messageWithAssociations,
          moderation: {
            wasFiltered: !moderationResult.isClean,
            violations: moderationResult.violations
          }
        },
        'Message sent successfully'
      )
    );

  } catch (error) {
    // Cleanup on error
    if (uploadedFilePath && req.uploadUtils) {
      await req.uploadUtils.cleanupFile(uploadedFilePath);
    }

    console.error('Send message error:', error.message);
    res.status(500).json(
      errorResponse('Failed to send message', 'MESSAGE_SEND_ERROR')
    );
  }
};

/**
 * Mark messages as read
 */
const markAsRead = async (req, res) => {
  try {
    const { messageIds = [] } = req.body;
    const { channelId } = req.params;

    const membership = await ChannelMember.findOne({
      where: { channelId, userId: req.user.id }
    });

    if (!membership) {
      return res.status(403).json(
        errorResponse('You are not a member of this channel', 'FORBIDDEN')
      );
    }

    if (!Array.isArray(messageIds)) {
      return res.status(400).json(
        errorResponse('messageIds must be an array', 'INVALID_REQUEST')
      );
    }

    if (messageIds.length === 0) {
      await ChannelMember.update(
        { lastReadAt: new Date() },
        { where: { channelId, userId: req.user.id } }
      );

      return res.json(
        successResponse(
          { readReceipts: [] },
          'Updated last read timestamp'
        )
      );
    }

    const readReceipts = await Promise.all(
      messageIds.map(async (messageId) => {
        const [receipt] = await ReadReceipt.findOrCreate({
          where: { messageId, userId: req.user.id },
          defaults: { messageId, userId: req.user.id }
        });
        return receipt;
      })
    );

    await ChannelMember.update(
      { lastReadAt: new Date() },
      { where: { channelId, userId: req.user.id } }
    );

    return res.json(
      successResponse(
        { readReceipts },
        'Messages marked as read successfully'
      )
    );
  } catch (error) {
    console.error('Mark as read error:', error.message);
    return res.status(500).json(
      errorResponse('Failed to mark messages as read', 'MARK_READ_ERROR')
    );
  }
};

/**
 * Delete a message (soft delete) with file cleanup
 */
const deleteMessage = async (req, res) => {
  try {
    const { messageId } = req.params;

    const message = await Message.findByPk(messageId, {
      include: [
        {
          model: Attachment,
          as: 'attachments'
        }
      ]
    });

    if (!message) {
      return res.status(404).json(
        errorResponse('Message not found', 'MESSAGE_NOT_FOUND')
      );
    }

    // Check permissions
    if (message.userId !== req.user.id) {
      const membership = await ChannelMember.findOne({
        where: {
          channelId: message.channelId,
          userId: req.user.id,
          role: { [Op.in]: ['admin', 'moderator', 'owner'] }
        }
      });

      if (!membership) {
        return res.status(403).json(
          errorResponse('You can only delete your own messages', 'FORBIDDEN')
        );
      }
    }

    if (message.isDeleted) {
      return res.status(400).json(
        errorResponse('Message is already deleted', 'MESSAGE_ALREADY_DELETED')
      );
    }

    // Delete associated files
    if (message.attachments) {
      for (const attachment of message.attachments) {
        try {
          let filePath;
          if (attachment.storagePath) {
            filePath = attachment.storagePath;
          } else if (attachment.url) {
            const paths = getUploadPaths();
            filePath = paths.getAbsolutePath(attachment.url);
          }
          
          if (filePath) {
            await fs.unlink(filePath).catch(() => {});
          }
          
          if (attachment.thumbnailUrl) {
            const thumbnailPath = getUploadPaths().getAbsolutePath(attachment.thumbnailUrl);
            await fs.unlink(thumbnailPath).catch(() => {});
          }
        } catch (fileError) {
          console.error('Failed to delete file:', fileError.message);
        }
      }
      
      await Attachment.destroy({ where: { messageId } });
    }

    // Soft delete message
    await message.update({ 
      content: '[This message was deleted]',
      mediaUrl: null,
      mediaMetadata: null,
      isDeleted: true,
      deletedAt: new Date(),
      deletedBy: req.user.id
    });

    res.status(200).json(
      successResponse(
        null,
        'Message deleted successfully'
      )
    );

  } catch (error) {
    console.error('Delete message error:', error.message);
    res.status(500).json(
      errorResponse('Failed to delete message', 'MESSAGE_DELETE_ERROR')
    );
  }
};

/**
 * Edit a message
 */
const editMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    const { content } = req.body;

    if (!content || content.trim().length === 0) {
      return res.status(400).json(
        errorResponse('Message content is required', 'MISSING_CONTENT')
      );
    }

    const message = await Message.findByPk(messageId);

    if (!message) {
      return res.status(404).json(
        errorResponse('Message not found', 'MESSAGE_NOT_FOUND')
      );
    }

    if (message.userId !== req.user.id) {
      return res.status(403).json(
        errorResponse('You can only edit your own messages', 'FORBIDDEN')
      );
    }

    if (message.isDeleted) {
      return res.status(400).json(
        errorResponse('Cannot edit a deleted message', 'MESSAGE_DELETED')
      );
    }

    const editWindow = 15 * 60 * 1000;
    const messageAge = Date.now() - new Date(message.createdAt).getTime();
    if (messageAge > editWindow) {
      return res.status(400).json(
        errorResponse('Message is too old to edit', 'EDIT_WINDOW_EXPIRED')
      );
    }

    const moderationResult = contentModerator.scanMessage(content, req.user.id);

    if (moderationResult.shouldBlock) {
      return res.status(422).json(
        errorResponse('Edited message contains prohibited content', 'CONTENT_BLOCKED', {
          violations: moderationResult.violations
        })
      );
    }

    await message.update({
      content: moderationResult.filteredContent,
      isEdited: true,
      editedAt: new Date(),
      isModerated: !moderationResult.isClean || message.isModerated,
      moderationFlags: moderationResult.violations.length > 0 ? 
        [...(message.moderationFlags || []), ...moderationResult.violations] : 
        message.moderationFlags
    });

    const updatedMessage = await Message.findByPk(messageId, {
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'username', 'profilePicture', 'status']
        },
        {
          model: Attachment,
          as: 'attachments',
          attributes: ['id', 'url', 'type', 'fileName', 'metadata', 'thumbnailUrl']
        }
      ]
    });

    res.status(200).json(
      successResponse(
        { message: updatedMessage },
        'Message edited successfully'
      )
    );

  } catch (error) {
    console.error('Edit message error:', error.message);
    res.status(500).json(
      errorResponse('Failed to edit message', 'MESSAGE_EDIT_ERROR')
    );
  }
};

/**
 * Toggle reaction on a message
 */
const toggleReaction = async (req, res) => {
  try {
    const { messageId } = req.params;
    const { emoji } = req.body;

    if (!emoji || emoji.trim().length === 0) {
      return res.status(400).json(
        errorResponse('Emoji is required', 'MISSING_EMOJI')
      );
    }

    const emojiRegex = /[\p{Emoji}]/u;
    if (!emojiRegex.test(emoji)) {
      return res.status(400).json(
        errorResponse('Invalid emoji', 'INVALID_EMOJI')
      );
    }

    const message = await Message.findByPk(messageId);

    if (!message) {
      return res.status(404).json(
        errorResponse('Message not found', 'MESSAGE_NOT_FOUND')
      );
    }

    const membership = await ChannelMember.findOne({
      where: { channelId: message.channelId, userId: req.user.id }
    });

    if (!membership) {
      return res.status(403).json(
        errorResponse('You are not a member of this channel', 'FORBIDDEN')
      );
    }

    const existingReaction = await Reaction.findOne({
      where: { 
        messageId, 
        userId: req.user.id,
        emoji 
      }
    });

    let reaction;
    
    if (existingReaction) {
      await existingReaction.destroy();
      reaction = null;
    } else {
      reaction = await Reaction.create({
        messageId,
        userId: req.user.id,
        emoji
      });
      
      reaction = await Reaction.findByPk(reaction.id, {
        include: [{
          model: User,
          as: 'user',
          attributes: ['id', 'username', 'profilePicture']
        }]
      });
    }

    const updatedMessage = await Message.findByPk(messageId, {
      include: [
        {
          model: Reaction,
          as: 'reactions',
          attributes: ['id', 'emoji', 'userId', 'createdAt'],
          include: [{
            model: User,
            as: 'user',
            attributes: ['id', 'username', 'profilePicture']
          }]
        }
      ]
    });

    res.status(200).json(
      successResponse(
        { 
          reaction,
          message: updatedMessage 
        },
        existingReaction ? 'Reaction removed successfully' : 'Reaction added successfully'
      )
    );

  } catch (error) {
    console.error('Toggle reaction error:', error.message);
    res.status(500).json(
      errorResponse('Failed to toggle reaction', 'REACTION_ERROR')
    );
  }
};

/**
 * Get message by ID
 */
const getMessage = async (req, res) => {
  try {
    const { messageId } = req.params;

    const message = await Message.findByPk(messageId, {
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'username', 'profilePicture', 'status']
        },
        {
          model: Attachment,
          as: 'attachments',
          attributes: ['id', 'url', 'type', 'fileName', 'metadata', 'thumbnailUrl']
        },
        {
          model: Reaction,
          as: 'reactions',
          attributes: ['id', 'emoji', 'userId', 'createdAt'],
          include: [{
            model: User,
            as: 'user',
            attributes: ['id', 'username', 'profilePicture']
          }]
        },
        {
          model: Message,
          as: 'parentMessage',
          include: [{
            model: User,
            as: 'user',
            attributes: ['id', 'username']
          }]
        }
      ]
    });

    if (!message) {
      return res.status(404).json(
        errorResponse('Message not found', 'MESSAGE_NOT_FOUND')
      );
    }

    const membership = await ChannelMember.findOne({
      where: { channelId: message.channelId, userId: req.user.id }
    });

    if (!membership) {
      return res.status(403).json(
        errorResponse('You are not a member of this channel', 'FORBIDDEN')
      );
    }

    res.status(200).json(
      successResponse(
        { message },
        'Message retrieved successfully'
      )
    );

  } catch (error) {
    console.error('Get message error:', error.message);
    res.status(500).json(
      errorResponse('Failed to retrieve message', 'MESSAGE_RETRIEVAL_ERROR')
    );
  }
};

/**
 * Get unread message count for a channel
 */
const getUnreadCount = async (req, res) => {
  try {
    const { channelId } = req.params;

    const membership = await ChannelMember.findOne({
      where: { channelId, userId: req.user.id }
    });

    if (!membership) {
      return res.status(403).json(
        errorResponse('You are not a member of this channel', 'FORBIDDEN')
      );
    }

    const lastReadAt = membership.lastReadAt || new Date(0);

    const unreadCount = await Message.count({
      where: {
        channelId,
        userId: { [Op.ne]: req.user.id },
        createdAt: { [Op.gt]: lastReadAt },
        isDeleted: false
      }
    });

    res.status(200).json(
      successResponse(
        { unreadCount },
        'Unread count retrieved successfully'
      )
    );

  } catch (error) {
    console.error('Get unread count error:', error.message);
    res.status(500).json(
      errorResponse('Failed to get unread count', 'UNREAD_COUNT_ERROR')
    );
  }
};

/**
 * Get all reactions for a specific message
 */
const getMessageReactions = async (req, res) => {
  try {
    const { messageId } = req.params;

    const message = await Message.findByPk(messageId);

    if (!message) {
      return res.status(404).json(
        errorResponse('Message not found', 'MESSAGE_NOT_FOUND')
      );
    }

    const reactions = await Reaction.findAll({
      where: { messageId },
      include: [{
        model: User,
        as: 'user',
        attributes: ['id', 'username', 'profilePicture']
      }],
      order: [['createdAt', 'ASC']]
    });

    const groupedReactions = reactions.reduce((acc, reaction) => {
      if (!acc[reaction.emoji]) {
        acc[reaction.emoji] = [];
      }
      acc[reaction.emoji].push({
        userId: reaction.userId,
        username: reaction.user?.username,
        profilePicture: reaction.user?.profilePicture,
        reactedAt: reaction.createdAt
      });
      return acc;
    }, {});

    res.status(200).json(
      successResponse(
        { 
          reactions: groupedReactions,
          totalCount: reactions.length
        },
        'Reactions retrieved successfully'
      )
    );

  } catch (error) {
    console.error('Get message reactions error:', error.message);
    res.status(500).json(
      errorResponse('Failed to retrieve reactions', 'REACTIONS_RETRIEVAL_ERROR')
    );
  }
};

// ============================================
// MODULE EXPORTS
// ============================================
module.exports = {
  getChannelMessages,
  sendMessage,
  markAsRead,
  deleteMessage,
  editMessage,
  toggleReaction,
  getMessage,
  getUnreadCount,
  getMessageReactions,
 
};