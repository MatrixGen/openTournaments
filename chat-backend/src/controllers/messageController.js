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
const path = require('path');
const fs = require('fs').promises;
const { v4: uuidv4 } = require('uuid');
const { Op } = Sequelize;

/**
 * Get messages for a channel with pagination and optional filters
 */
const getChannelMessages = async (req, res) => {
  console.log('control reached to getChannelMessages');
  
  try {
    const { channelId } = req.params;
    const { before, after, limit = 50, includeAttachments = true, type } = req.query;

    // Check if user is member of channel
    const membership = await ChannelMember.findOne({
      where: { channelId, userId: req.user.id }
    });

    if (!membership) {
      return res.status(403).json(
        errorResponse('You are not a member of this channel', 'FORBIDDEN')
      );
    }

    // Build where clause for pagination
    const where = { 
      channelId,
      isDeleted: false // Exclude deleted messages
    };
    
    // Apply type filter if specified
    if (type && ['text', 'image', 'video', 'audio', 'file', 'system'].includes(type)) {
      where.type = type;
    }
    
    // Time-based pagination
    if (before) {
      where.createdAt = { [Op.lt]: new Date(before) };
    }
    
    if (after) {
      where.createdAt = { [Op.gt]: new Date(after) };
    }

    // Build include array
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

    // Conditionally include attachments
    if (includeAttachments === 'true' || includeAttachments === true) {
      include.push({
        model: Attachment,
        as: 'attachments',
        attributes: ['id', 'url', 'type', 'fileName', 'metadata', 'thumbnailUrl']
      });
    }

    // Include reactions
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

    // Check if there are more messages
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

    // Reverse to get chronological order
    const chronologicalMessages = messages.reverse();

    // Update last read for user
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
    console.error('Get messages error:', error);
    res.status(500).json(
      errorResponse('Failed to retrieve messages', 'MESSAGES_RETRIEVAL_ERROR', { error: error.message })
    );
  }
};

/**
 * Send a message (text or media)
 */
const sendMessage = async (req, res) => {
  const logPrefix = `[${new Date().toISOString()}]`;
  console.log(`${logPrefix} [START] sendMessage handler initiated.`);

  let tempFilePath = null;
  
  try {
    const { channelId } = req.params;
    const { content, replyTo, type = 'text', mediaCaption, fileName, fileSize, mimeType, originalName } = req.body;
    const mediaFile = req.file;

    console.log(`${logPrefix} [INPUT] Channel: ${channelId} | User: ${req.user.id} | Type: ${type}`);
    console.log(`${logPrefix} [INPUT] Content: ${content?.substring(0, 50) || 'none'} | ReplyTo: ${replyTo || 'N/A'}`);
    console.log(`${logPrefix} [INPUT] Media file: ${mediaFile ? `Yes (${mediaFile.originalname})` : 'No'}`);
    console.log(`${logPrefix} [INPUT] Body metadata:`, { fileName, fileSize, mimeType, originalName });

    // --- 1. MUTE CHECK ---
    if (contentModerator.isUserMuted(req.user.id)) {
      console.log(`${logPrefix} [ACTION] BLOCKED: User ${req.user.id} is MUTED.`);
      return res.status(423).json(
        errorResponse('You are temporarily muted for violating community guidelines', 'USER_MUTED')
      );
    }

    // --- 2. MEMBERSHIP CHECK ---
    const membership = await ChannelMember.findOne({
      where: { channelId, userId: req.user.id }
    });

    if (!membership) {
      console.log(`${logPrefix} [ACTION] BLOCKED: User ${req.user.id} is not a member of channel ${channelId}.`);
      return res.status(403).json(
        errorResponse('You are not a member of this channel', 'FORBIDDEN')
      );
    }

    // --- 3. TYPE VALIDATION ---
    const allowedTypes = ['text', 'image', 'video', 'file', 'audio', 'system'];
    if (!allowedTypes.includes(type)) {
      console.log(`${logPrefix} [ACTION] BLOCKED: Invalid message type '${type}'.`);
      return res.status(400).json(
        errorResponse('Invalid message type', 'INVALID_TYPE', { allowedTypes })
      );
    }

    // --- 4. CONTENT VALIDATION ---
    if (type === 'text' && (!content || content.trim().length === 0)) {
      console.log(`${logPrefix} [ACTION] BLOCKED: Text message requires content.`);
      return res.status(400).json(
        errorResponse('Message content is required for text messages', 'MISSING_CONTENT')
      );
    }

    let mediaUrl = null;
    let mediaMetadata = null;
    let thumbnailUrl = null;
    let finalFileName = null;
    let finalFileSize = null;
    let finalMimeType = null;
    let finalOriginalName = null;

    // --- 5. MEDIA HANDLING ---
    if (mediaFile) {
      console.log(`${logPrefix} [MEDIA] Processing file: ${mediaFile.originalname}`);
      tempFilePath = mediaFile.path;

      // Validate file type against message type
      const allowedMimeTypes = {
        image: ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'],
        video: ['video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/webm', 'video/x-matroska'],
        audio: ['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/webm', 'audio/aac'],
        file: [
          'application/pdf',
          'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'text/plain',
          'application/zip'
        ]
      };

      const allowedForType = allowedMimeTypes[type];
      if (!allowedForType || !allowedForType.includes(mediaFile.mimetype)) {
        console.log(`${logPrefix} [ACTION] BLOCKED: Invalid media type ${mediaFile.mimetype} for ${type}`);
        await fs.unlink(mediaFile.path).catch(console.error);
        return res.status(400).json(
          errorResponse(`File type ${mediaFile.mimetype} not allowed for message type ${type}`, 'INVALID_MEDIA_TYPE')
        );
      }

      // Validate file size
      const maxSize = type === 'file' ? 50 * 1024 * 1024 : 
                     type === 'video' ? 100 * 1024 * 1024 : 10 * 1024 * 1024;
      
      if (mediaFile.size > maxSize) {
        console.log(`${logPrefix} [ACTION] BLOCKED: File too large (${mediaFile.size} > ${maxSize})`);
        await fs.unlink(mediaFile.path).catch(console.error);
        return res.status(400).json(
          errorResponse(`File too large. Max size: ${maxSize / (1024 * 1024)}MB`, 'FILE_TOO_LARGE')
        );
      }

      // Prepare file metadata (use from request body or fall back to file object)
      finalFileName = fileName || mediaFile.originalname;
      finalFileSize = fileSize ? parseInt(fileSize) : mediaFile.size;
      finalMimeType = mimeType || mediaFile.mimetype;
      finalOriginalName = originalName || mediaFile.originalname;

      // Generate unique filename and move file
      const fileExtension = path.extname(mediaFile.originalname);
      const uniqueFileName = `${uuidv4()}${fileExtension}`;
      
      const uploadDir = path.join(__dirname, '../../uploads/messages');
      const thumbnailDir = path.join(uploadDir, 'thumbnails');
      
      await fs.mkdir(uploadDir, { recursive: true });
      await fs.mkdir(thumbnailDir, { recursive: true });
      
      const newPath = path.join(uploadDir, uniqueFileName);
      console.log(`${logPrefix} [UPLOAD] Moving file to ${newPath}`);
      await fs.rename(mediaFile.path, newPath);
      tempFilePath = null; // File moved successfully, clear temp path

      mediaUrl = `/uploads/messages/${uniqueFileName}`;
      mediaMetadata = {
        originalName: finalOriginalName,
        mimeType: finalMimeType,
        size: finalFileSize,
        dimensions: null,
        duration: null
      };

      // Generate thumbnail for images/videos
      if (type === 'image' || type === 'video') {
        try {
          thumbnailUrl = `/uploads/messages/thumbnails/${uuidv4()}.jpg`;
          // TODO: Implement thumbnail generation logic here
          console.log(`${logPrefix} [THUMBNAIL] Thumbnail URL generated: ${thumbnailUrl}`);
        } catch (thumbnailError) {
          console.warn(`${logPrefix} [WARN] Thumbnail generation failed:`, thumbnailError.message);
        }
      }

      console.log(`${logPrefix} [MEDIA] Upload complete: ${mediaUrl}`);
    }

    // --- 6. CONTENT MODERATION ---
    const messageContent = content || mediaCaption || '';
    console.log(`${logPrefix} [MODERATION] Scanning content: ${messageContent.substring(0, 100)}`);

    const moderationResult = messageContent ? 
      contentModerator.scanMessage(messageContent, req.user.id) : 
      { isClean: true, filteredContent: '', shouldBlock: false, violations: [] };

    console.log(`${logPrefix} [MODERATION] Result:`, {
      isClean: moderationResult.isClean,
      shouldBlock: moderationResult.shouldBlock,
      violations: moderationResult.violations
    });

    if (moderationResult.shouldBlock) {
      console.log(`${logPrefix} [ACTION] BLOCKED: Content moderation failed`);
      
      // Clean up uploaded file if content is blocked
      if (mediaUrl) {
        const filePath = path.join(__dirname, '../..', mediaUrl);
        await fs.unlink(filePath).catch(console.error);
      }
      
      return res.status(422).json(
        errorResponse('Message contains prohibited content', 'CONTENT_BLOCKED', {
          violations: moderationResult.violations
        })
      );
    }

    // --- 7. CREATE MESSAGE ---
    console.log(`${logPrefix} [DB] Creating message record`);
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

    console.log(`${logPrefix} [DB] Message created with ID: ${message.id}`);

    // --- 8. CREATE ATTACHMENT (if media exists) ---
    if (mediaUrl && mediaFile) {
      console.log(`${logPrefix} [DB] Creating attachment record`);
      
      // Ensure we have all required fields
      if (!finalFileSize || !finalMimeType) {
        throw new Error('Missing required attachment fields: fileSize or mimeType');
      }

      const attachmentData = {
        messageId: message.id,
        url: mediaUrl,
        thumbnailUrl,
        type: type,
        fileName: finalFileName,
        fileSize: finalFileSize, // REQUIRED
        mimeType: finalMimeType, // REQUIRED
        metadata: mediaMetadata ? JSON.stringify(mediaMetadata) : null,
      };

      console.log(`${logPrefix} [ATTACHMENT] Data:`, {
        fileSize: attachmentData.fileSize,
        mimeType: attachmentData.mimeType,
        fileName: attachmentData.fileName
      });

      try {
        const attachment = await Attachment.create(attachmentData);
        console.log(`${logPrefix} [DB] Attachment created with ID: ${attachment.id}`);
      } catch (attachmentError) {
        console.error(`${logPrefix} [ERROR] Attachment creation failed:`, attachmentError.message);
        
        // Don't fail the whole message if attachment fails
        // Log error but continue
        if (attachmentError.name === 'SequelizeValidationError') {
          console.error(`${logPrefix} [ERROR] Validation errors:`, 
            attachmentError.errors.map(e => `${e.path}: ${e.message}`)
          );
        }
      }
    }

    // --- 9. LOAD FULL MESSAGE WITH ASSOCIATIONS ---
    console.log(`${logPrefix} [DB] Loading full message with associations`);
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
          attributes: ['id', 'url', 'type', 'fileName', 'metadata', 'thumbnailUrl', 'fileSize', 'mimeType'] 
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

    // --- 10. UPDATE LAST READ TIMESTAMP ---
    await membership.update({ lastReadAt: new Date() });

    // --- 11. SOCKET EMIT (if needed) ---
   // After creating the message, emit via WebSocket
    if (req.app.get('io')) {
      const socketData = {
        message: messageWithAssociations,
        tempId: req.body.tempId || null // Include tempId from frontend
      };
      
      req.app.get('io').to(`channel:${channelId}`).emit('new_message', socketData);
      console.log(`${logPrefix} [SOCKET] Emitted new_message with tempId: ${req.body.tempId || 'none'}`);
    }

    // --- 12. SUCCESS RESPONSE ---
    console.log(`${logPrefix} [END] SUCCESS: Message sent with ID ${message.id}`);
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
    // --- ERROR HANDLING ---
    console.error(`${logPrefix} [ERROR] CRITICAL EXCEPTION: Failed to send message.`);
    console.error(`${logPrefix} [ERROR] Details: ${error.message}`);
    console.error(`${logPrefix} [ERROR] Stack: ${error.stack}`);
    
    // Clean up temporary file if it exists
    if (tempFilePath) {
      console.log(`${logPrefix} [CLEANUP] Removing temp file: ${tempFilePath}`);
      await fs.unlink(tempFilePath).catch(unlinkError => {
        console.error(`${logPrefix} [CLEANUP] Failed to remove temp file:`, unlinkError.message);
      });
    }
    
    // Clean up uploaded file if error occurred after moving
    if (req.file && req.file.path && tempFilePath === null) {
      // This means file was moved to permanent location but error occurred later
      // You might want to clean up the moved file too
      console.warn(`${logPrefix} [WARN] File was moved to permanent location but error occurred`);
    }

    res.status(500).json(
      errorResponse('Failed to send message', 'MESSAGE_SEND_ERROR', { 
        error: error.message,
        code: error.code || 'UNKNOWN_ERROR'
      })
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

    // Validate channel membership
    const membership = await ChannelMember.findOne({
      where: { channelId, userId: req.user.id }
    });

    if (!membership) {
      return res.status(403).json(
        errorResponse('You are not a member of this channel', 'FORBIDDEN')
      );
    }

    // Must be array
    if (!Array.isArray(messageIds)) {
      return res.status(400).json(
        errorResponse('messageIds must be an array', 'INVALID_REQUEST')
      );
    }

    // If no messageIds, just update lastReadAt
    if (messageIds.length === 0) {
      await ChannelMember.update(
        { lastReadAt: new Date() },
        { where: { channelId, userId: req.user.id } }
      );

      return res.json(
        successResponse(
          { readReceipts: [] },
          'No messageIds provided; updated last read timestamp'
        )
      );
    }

    // Create read receipts safely
    const readReceipts = await Promise.all(
      messageIds.map(async (messageId) => {
        const [receipt] = await ReadReceipt.findOrCreate({
          where: { messageId, userId: req.user.id },
          defaults: { messageId, userId: req.user.id }
        });
        return receipt;
      })
    );

    // Update channel membership last read
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
    console.error('Mark as read error:', error);
    return res.status(500).json(
      errorResponse('Failed to mark messages as read', 'MARK_READ_ERROR', { error: error.message })
    );
  }
};

/**
 * Delete a message (soft delete)
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

    // Check if user is the sender or has admin privileges
    if (message.userId !== req.user.id) {
      // Check if user is channel admin/moderator
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

    // Check if message is already deleted
    if (message.isDeleted) {
      return res.status(400).json(
        errorResponse('Message is already deleted', 'MESSAGE_ALREADY_DELETED')
      );
    }

    // Soft delete the message
    await message.update({ 
      content: '[This message was deleted]',
      mediaUrl: null,
      mediaMetadata: null,
      isDeleted: true,
      deletedAt: new Date(),
      deletedBy: req.user.id
    });

    // Optionally: Delete associated files from storage
    // if (message.attachments) {
    //   for (const attachment of message.attachments) {
    //     const filePath = path.join(__dirname, '../..', attachment.url);
    //     await fs.unlink(filePath).catch(console.error);
    //   }
    //   await Attachment.destroy({ where: { messageId } });
    // }

    res.status(200).json(
      successResponse(
        null,
        'Message deleted successfully'
      )
    );

  } catch (error) {
    console.error('Delete message error:', error);
    res.status(500).json(
      errorResponse('Failed to delete message', 'MESSAGE_DELETE_ERROR', { error: error.message })
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

    // Check if user is the sender
    if (message.userId !== req.user.id) {
      return res.status(403).json(
        errorResponse('You can only edit your own messages', 'FORBIDDEN')
      );
    }

    // Check if message is deleted
    if (message.isDeleted) {
      return res.status(400).json(
        errorResponse('Cannot edit a deleted message', 'MESSAGE_DELETED')
      );
    }

    // Check if message is too old to edit (e.g., 15 minutes)
    const editWindow = 15 * 60 * 1000; // 15 minutes in milliseconds
    const messageAge = Date.now() - new Date(message.createdAt).getTime();
    if (messageAge > editWindow) {
      return res.status(400).json(
        errorResponse('Message is too old to edit', 'EDIT_WINDOW_EXPIRED')
      );
    }

    // Scan edited content
    const moderationResult = contentModerator.scanMessage(content, req.user.id);

    if (moderationResult.shouldBlock) {
      return res.status(422).json(
        errorResponse('Edited message contains prohibited content', 'CONTENT_BLOCKED', {
          violations: moderationResult.violations
        })
      );
    }

    // Update message
    await message.update({
      content: moderationResult.filteredContent,
      isEdited: true,
      editedAt: new Date(),
      isModerated: !moderationResult.isClean || message.isModerated,
      moderationFlags: moderationResult.violations.length > 0 ? 
        [...(message.moderationFlags || []), ...moderationResult.violations] : 
        message.moderationFlags
    });

    // Reload message with associations
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

    // Emit socket event for real-time update
    // req.app.get('io').to(`channel:${message.channelId}`).emit('message_edited', updatedMessage);

    res.status(200).json(
      successResponse(
        { message: updatedMessage },
        'Message edited successfully'
      )
    );

  } catch (error) {
    console.error('Edit message error:', error);
    res.status(500).json(
      errorResponse('Failed to edit message', 'MESSAGE_EDIT_ERROR', { error: error.message })
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

    // Validate emoji (basic check)
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

    // Check if user is member of the channel
    const membership = await ChannelMember.findOne({
      where: { channelId: message.channelId, userId: req.user.id }
    });

    if (!membership) {
      return res.status(403).json(
        errorResponse('You are not a member of this channel', 'FORBIDDEN')
      );
    }

    // Check if reaction already exists
    const existingReaction = await Reaction.findOne({
      where: { 
        messageId, 
        userId: req.user.id,
        emoji 
      }
    });

    let reaction;
    
    if (existingReaction) {
      // Remove reaction
      await existingReaction.destroy();
      reaction = null;
    } else {
      // Add reaction
      reaction = await Reaction.create({
        messageId,
        userId: req.user.id,
        emoji
      });
      
      // Load reaction with user data
      reaction = await Reaction.findByPk(reaction.id, {
        include: [{
          model: User,
          as: 'user',
          attributes: ['id', 'username', 'profilePicture']
        }]
      });
    }

    // Reload message with updated reactions
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

    // Emit socket event for real-time update
    // req.app.get('io').to(`channel:${message.channelId}`).emit('message_reacted', {
    //   messageId,
    //   reaction,
    //   userId: req.user.id,
    //   action: existingReaction ? 'removed' : 'added'
    // });

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
    console.error('Toggle reaction error:', error);
    res.status(500).json(
      errorResponse('Failed to toggle reaction', 'REACTION_ERROR', { error: error.message })
    );
  }
};

/**
 * Get message by ID (for single message retrieval)
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

    // Check if user is member of the channel
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
    console.error('Get message error:', error);
    res.status(500).json(
      errorResponse('Failed to retrieve message', 'MESSAGE_RETRIEVAL_ERROR', { error: error.message })
    );
  }
};

/**
 * Get unread message count for a channel
 */
const getUnreadCount = async (req, res) => {
  try {
    const { channelId } = req.params;

    // Get user's last read time for this channel
    const membership = await ChannelMember.findOne({
      where: { channelId, userId: req.user.id }
    });

    if (!membership) {
      return res.status(403).json(
        errorResponse('You are not a member of this channel', 'FORBIDDEN')
      );
    }

    const lastReadAt = membership.lastReadAt || new Date(0);

    // Count messages created after last read
    const unreadCount = await Message.count({
      where: {
        channelId,
        userId: { [Op.ne]: req.user.id }, // Don't count own messages
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
    console.error('Get unread count error:', error);
    res.status(500).json(
      errorResponse('Failed to get unread count', 'UNREAD_COUNT_ERROR', { error: error.message })
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

    // Get all reactions for the message
    const reactions = await Reaction.findAll({
      where: { messageId },
      include: [{
        model: User,
        as: 'user',
        attributes: ['id', 'username', 'profilePicture']
      }],
      order: [['createdAt', 'ASC']]
    });

    // Group reactions by emoji
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
    console.error('Get message reactions error:', error);
    res.status(500).json(
      errorResponse('Failed to retrieve reactions', 'REACTIONS_RETRIEVAL_ERROR', { error: error.message })
    );
  }
};

module.exports = {
  getChannelMessages,
  sendMessage,
  markAsRead,
  deleteMessage,
  editMessage,
  toggleReaction,
  getMessage,
  getUnreadCount,
  getMessageReactions
};