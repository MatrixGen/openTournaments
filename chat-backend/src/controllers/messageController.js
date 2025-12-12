const { Message, Channel, User, ChannelMember, ReadReceipt } = require('../../models');
const { successResponse, errorResponse } = require('../middleware/responseFormatter');
const contentModerator = require('../utils/profanityFilter');

const getChannelMessages = async (req, res) => {
  try {
    const { channelId } = req.params;
    const { before, limit = 50 } = req.query;

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
    const where = { channelId };
    if (before) {
      where.createdAt = { [require('sequelize').Op.lt]: new Date(before) };
    }

    const messages = await Message.findAll({
      where,
      include: [
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
      ],
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit)
    });

    // Reverse to get chronological order
    const chronologicalMessages = messages.reverse();

    res.json(
      successResponse(
        { messages: chronologicalMessages },
        'Messages retrieved successfully'
      )
    );
  } catch (error) {
    console.error('Get messages error:', error);
    res.status(500).json(
      errorResponse('Failed to retrieve messages', 'MESSAGES_RETRIEVAL_ERROR')
    );
  }
};


// Updated sendMessage function
const sendMessage = async (req, res) => {
  try {
    const { channelId } = req.params;
    const { content, replyTo } = req.body;

    // Check if user is muted
    if (contentModerator.isUserMuted(req.user.id)) {
      return res.status(423).json(
        errorResponse('You are temporarily muted for violating community guidelines', 'USER_MUTED')
      );
    }

    // Check if user is member of channel
    const membership = await ChannelMember.findOne({
      where: { channelId, userId: req.user.id }
    });

    if (!membership) {
      return res.status(403).json(
        errorResponse('You are not a member of this channel', 'FORBIDDEN')
      );
    }

    // Scan message content
    const moderationResult = contentModerator.scanMessage(content, req.user.id);

    if (moderationResult.shouldBlock) {
      return res.status(422).json(
        errorResponse('Message contains prohibited content', 'CONTENT_BLOCKED', {
          violations: moderationResult.violations
        })
      );
    }

    // Create message with filtered content if needed
    const message = await Message.create({
      content: moderationResult.filteredContent,
      channelId,
      userId: req.user.id,
      replyTo: replyTo || null,
      type: 'text',
      isModerated: !moderationResult.isClean,
      moderationFlags: moderationResult.violations
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

    // Update last read for sender
    await membership.update({ lastReadAt: new Date() });

    res.status(201).json(
      successResponse(
        { 
          message: messageWithUser,
          moderation: {
            wasFiltered: !moderationResult.isClean,
            violations: moderationResult.violations
          }
        },
        'Message sent successfully'
      )
    );
  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json(
      errorResponse('Failed to send message', 'MESSAGE_SEND_ERROR')
    );
  }
};

const markAsRead = async (req, res) => {
  try {
    const { messageIds = [] } = req.body; // ✅ Default to empty array
    const { channelId } = req.params;

    // 🔐 Validate channel membership
    const membership = await ChannelMember.findOne({
      where: { channelId, userId: req.user.id }
    });

    if (!membership) {
      return res.status(403).json(
        errorResponse('You are not a member of this channel', 'FORBIDDEN')
      );
    }

    // 🧩 Defensive: must be array
    if (!Array.isArray(messageIds)) {
      return res.status(400).json(
        errorResponse('messageIds must be an array', 'INVALID_REQUEST')
      );
    }

    // 📨 If no messageIds, just update lastReadAt
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

    // ✅ Create read receipts safely
    const readReceipts = await Promise.all(
      messageIds.map(async (messageId) => {
        const [receipt] = await ReadReceipt.findOrCreate({
          where: { messageId, userId: req.user.id },
          defaults: { messageId, userId: req.user.id }
        });
        return receipt;
      })
    );

    // 🕓 Update channel membership last read
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
    console.error('❌ Mark as read error:', error);
    return res.status(500).json(
      errorResponse('Failed to mark messages as read', 'MARK_READ_ERROR', { error: error.message })
    );
  }
};


module.exports = {
  getChannelMessages,
  sendMessage,
  markAsRead
};