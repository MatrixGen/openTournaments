const { Channel, User, ChannelMember, Message } = require('../../models');
const { successResponse, errorResponse } = require('../middleware/responseFormatter');
const { Op } = require('sequelize');

const getUserChannels = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    // 1️⃣ Fetch channels where the user is a member
    const channels = await Channel.findAll({
      include: [
        {
          model: User,
          as: 'members',
          where: { id: req.user.id },
          attributes: [],
          through: { attributes: [] }
        },
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'username', 'profilePicture']
        }
      ],
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['updatedAt', 'DESC']]
      
    });

    // 2️⃣ Fetch latest message for each channel
    const channelWithLatestMessages = await Promise.all(
      channels.map(async (channel) => {
        const latestMessage = await Message.findOne({
          where: { channelId: channel.id },
          include: [{ model: User, as: 'user', attributes: ['id', 'username', 'profilePicture'] }],
          order: [['createdAt', 'DESC']]
        });

        return {
          ...channel.get({ plain: true }),
          latestMessage: latestMessage ? latestMessage.get({ plain: true }) : null
        };
      })
    );

    // 3️⃣ Respond
    res.json(
      successResponse(
        { channels: channelWithLatestMessages },
        'Channels retrieved successfully'
      )
    );

  } catch (error) {
    console.error('Get channels error:', error);
    res.status(500).json(
      errorResponse('Failed to retrieve channels', 'CHANNELS_RETRIEVAL_ERROR')
    );
  }
};

const createChannel = async (req, res) => {
  
  try {
    const { name, description, type, isPrivate, participantIds = [] } = req.body;

    // Create channel
    const channel = await Channel.create({
      name,
      description,
      type,
      isPrivate: isPrivate || false,
      createdBy: req.user.id
    });

    // Add creator as admin member
    await ChannelMember.create({
      channelId: channel.id,
      userId: req.user.id,
      role: 'admin'
    });

    // Add other participants
    if (participantIds.length > 0) {
      const memberPromises = participantIds.map(userId =>
        ChannelMember.create({
          channelId: channel.id,
          userId,
          role: 'member'
        })
      );
      await Promise.all(memberPromises);
    }

    // Load channel with creator info
    const channelWithCreator = await Channel.findByPk(channel.id, {
      include: [
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'username', 'profilePicture']
        },
        {
          model: User,
          as: 'members',
          attributes: ['id', 'username', 'profilePicture', 'status']
        }
      ]
    });

    res.status(201).json(
      successResponse(
        { channel: channelWithCreator },
        'Channel created successfully'
      )
    );
  } catch (error) {
    console.error('Create channel error:', error);
    res.status(500).json(
      errorResponse('Failed to create channel', 'CHANNEL_CREATION_ERROR')
    );
  }
};

const getChannel = async (req, res) => {
  try {
    const { channelId } = req.params;

    // Check if user is member
    const membership = await ChannelMember.findOne({
      where: { channelId, userId: req.user.id }
    });

    if (!membership) {
      return res.status(403).json(
        errorResponse('You are not a member of this channel', 'FORBIDDEN')
      );
    }

    const channel = await Channel.findByPk(channelId, {
      include: [
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'username', 'profilePicture']
        },
        {
          model: User,
          as: 'members',
          attributes: ['id', 'username', 'profilePicture', 'status'],
          through: { attributes: ['role', 'joinedAt'] }
        }
      ]
    });

    if (!channel) {
      return res.status(404).json(
        errorResponse('Channel not found', 'CHANNEL_NOT_FOUND')
      );
    }

    res.json(
      successResponse(
        { channel },
        'Channel retrieved successfully'
      )
    );
  } catch (error) {
    console.error('Get channel error:', error);
    res.status(500).json(
      errorResponse('Failed to retrieve channel', 'CHANNEL_RETRIEVAL_ERROR')
    );
  }
};

const updateChannel = async (req, res) => {
  try {
    const { channelId } = req.params;
    const { name, description } = req.body;

    // Check if user is admin of channel
    const membership = await ChannelMember.findOne({
      where: { 
        channelId, 
        userId: req.user.id,
        role: ['admin', 'moderator']
      }
    });

    if (!membership) {
      return res.status(403).json(
        errorResponse('Only admins and moderators can update channels', 'FORBIDDEN')
      );
    }

    await Channel.update(
      { name, description },
      { where: { id: channelId } }
    );

    const updatedChannel = await Channel.findByPk(channelId);

    res.json(
      successResponse(
        { channel: updatedChannel },
        'Channel updated successfully'
      )
    );
  } catch (error) {
    console.error('Update channel error:', error);
    res.status(500).json(
      errorResponse('Failed to update channel', 'CHANNEL_UPDATE_ERROR')
    );
  }
};

const joinChannel = async (req, res) => {
  try {
    const { channelId } = req.params;

    const channel = await Channel.findByPk(channelId);
    if (!channel) {
      return res.status(404).json(
        errorResponse('Channel not found', 'CHANNEL_NOT_FOUND')
      );
    }

    // Check if already a member
    const existingMembership = await ChannelMember.findOne({
      where: { channelId, userId: req.user.id }
    });

    if (existingMembership) {
      return res.status(409).json(
        errorResponse('Already a member of this channel', 'ALREADY_MEMBER')
      );
    }

    // Join channel
    await ChannelMember.create({
      channelId,
      userId: req.user.id,
      role: 'member'
    });

    res.json(
      successResponse(
        null,
        'Joined channel successfully'
      )
    );
  } catch (error) {
    console.error('Join channel error:', error);
    res.status(500).json(
      errorResponse('Failed to join channel', 'JOIN_CHANNEL_ERROR')
    );
  }
};

const leaveChannel = async (req, res) => {
  try {
    const { channelId } = req.params;

    await ChannelMember.destroy({
      where: { channelId, userId: req.user.id }
    });

    res.json(
      successResponse(
        null,
        'Left channel successfully'
      )
    );
  } catch (error) {
    console.error('Leave channel error:', error);
    res.status(500).json(
      errorResponse('Failed to leave channel', 'LEAVE_CHANNEL_ERROR')
    );
  }
};

const getChannelMembers = async (req, res) => {
  try {
    const { channelId } = req.params;

    // Check if user is member
    const membership = await ChannelMember.findOne({
      where: { channelId, userId: req.user.id }
    });

    if (!membership) {
      return res.status(403).json(
        errorResponse('You are not a member of this channel', 'FORBIDDEN')
      );
    }

    const members = await ChannelMember.findAll({
      where: { channelId },
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'username', 'profilePicture', 'status', 'lastSeen']
        }
      ],
      order: [['role', 'DESC'], ['joinedAt', 'ASC']]
    });

    res.json(
      successResponse(
        { members },
        'Channel members retrieved successfully'
      )
    );
  } catch (error) {
    console.error('Get channel members error:', error);
    res.status(500).json(
      errorResponse('Failed to retrieve channel members', 'MEMBERS_RETRIEVAL_ERROR')
    );
  }
};

module.exports = {
  getUserChannels,
  createChannel,
  getChannel,
  updateChannel,
  joinChannel,
  leaveChannel,
  getChannelMembers
};