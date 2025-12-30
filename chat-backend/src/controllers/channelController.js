const { Channel, User, ChannelMember, Message } = require('../../models');
const { successResponse, errorResponse } = require('../middleware/responseFormatter');
const { Op, Sequelize } = require('sequelize');

const getUserChannels = async (req, res) => {
  try {
    const { page = 1, limit = 20, type, isPrivate, search } = req.query;
    const offset = (page - 1) * limit;

    // Build where conditions
    const whereConditions = {};

    if (type) {
      whereConditions.type = type;
    }

    if (isPrivate !== undefined) {
      whereConditions.isPrivate = isPrivate === 'true';
    }

    if (search) {
      whereConditions[Op.or] = [
        { name: { [Op.iLike]: `%${search}%` } },
        { description: { [Op.iLike]: `%${search}%` } }
      ];
    }

    // 1️⃣ Fetch channels with enhanced information
    const channels = await Channel.findAll({
      where: whereConditions,
      include: [
        {
          model: User,
          as: 'members',
          where: { id: req.user.id },
          attributes: [],
          through: { 
            attributes: ['role', 'joinedAt'],
            where: { userId: req.user.id }
          }
        },
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'username', 'profilePicture']
        },
        {
          model: User,
          as: 'members',
          attributes: ['id', 'username', 'profilePicture', 'status'],
          through: { attributes: ['role'] }
        }
      ],
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['updatedAt', 'DESC']],
      distinct: true
    });

    // 2️⃣ Get member count and current user's role for each channel
    const channelsWithDetails = await Promise.all(
      channels.map(async (channel) => {
        // Get member count
        const memberCount = await ChannelMember.count({
          where: { channelId: channel.id }
        });

        // Get current user's role in this channel
        const userMembership = await ChannelMember.findOne({
          where: { 
            channelId: channel.id,
            userId: req.user.id
          }
        });

        // Get latest message
        const latestMessage = await Message.findOne({
          where: { channelId: channel.id },
          include: [
            { 
              model: User, 
              as: 'user', 
              attributes: ['id', 'username', 'profilePicture'] 
            }
          ],
          order: [['createdAt', 'DESC']]
        });

        // Get admin users for this channel
        const adminMembers = await ChannelMember.findAll({
          where: { 
            channelId: channel.id,
            role: 'admin'
          },
          include: [
            {
              model: User,
              as: 'user',
              attributes: ['id', 'username']
            }
          ]
        });

        const plainChannel = channel.get({ plain: true });
        
        return {
          ...plainChannel,
          memberCount,
          isMember: true, 
          userRole: userMembership?.role || 'member',
          admins: adminMembers.map(member => member.user?.id),
          adminUsers: adminMembers.map(member => member.user),
          ownerId: channel.createdBy,
          owner: channel.creator,
          latestMessage: latestMessage ? {
            id: latestMessage.id,
            content: latestMessage.content,
            type: latestMessage.type,
            createdAt: latestMessage.createdAt,
            user: latestMessage.user
          } : null,
          // Add additional fields for frontend
          hasUnread: false, // You can implement unread logic later
          notificationCount: 0,
          isMuted: false
        };
      })
    );

    // 3️⃣ Filter channels by membership if requested
    let filteredChannels = channelsWithDetails;
    if (req.query.joined === 'true') {
      // Already filtered by membership in the query
    } else if (req.query.joined === 'false') {
      // This would require a different approach - get all channels and filter out joined ones
      // For now, return empty array
      filteredChannels = [];
    }

    // 4️⃣ Get total count for pagination
    const totalChannels = await Channel.count({
      where: whereConditions,
      include: [
        {
          model: User,
          as: 'members',
          where: { id: req.user.id },
          attributes: [],
          through: { attributes: [] }
        }
      ]
    });

    // 5️⃣ Respond with enhanced data
    res.json(
      successResponse(
        { 
          channels: filteredChannels,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total: totalChannels,
            pages: Math.ceil(totalChannels / limit)
          }
        },
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
    const { name, description, type, isPrivate, participantIds = [], tags = [] } = req.body;

    // Validate direct message - must have exactly one participant
    if (type === 'direct' && participantIds.length !== 1) {
      return res.status(400).json(
        errorResponse('Direct messages must have exactly one participant', 'VALIDATION_ERROR')
      );
    }

    // Create channel
    const channel = await Channel.create({
      name,
      description,
      type,
      isPrivate: isPrivate || (type === 'direct' ? true : false), // Direct messages are always private
      createdBy: req.user.id,
      tags: tags || []
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
          role: type === 'direct' ? 'member' : 'member' // For direct messages, both are members
        })
      );
      await Promise.all(memberPromises);
    }

    // Load channel with complete info
    const channelWithDetails = await Channel.findByPk(channel.id, {
      include: [
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'username', 'profilePicture', 'status']
        },
        {
          model: User,
          as: 'members',
          attributes: ['id', 'username', 'profilePicture', 'status'],
          through: { attributes: ['role', 'joinedAt'] }
        }
      ]
    });

    // Get member count
    const memberCount = await ChannelMember.count({
      where: { channelId: channel.id }
    });

    // Get admin users
    const adminMembers = await ChannelMember.findAll({
      where: { 
        channelId: channel.id,
        role: 'admin'
      },
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'username']
        }
      ]
    });

    const enhancedChannel = {
      ...channelWithDetails.get({ plain: true }),
      memberCount,
      isMember: true,
      userRole: 'admin', // Creator is admin
      admins: adminMembers.map(member => member.user?.id),
      adminUsers: adminMembers.map(member => member.user),
      ownerId: req.user.id,
      owner: channelWithDetails.creator,
      latestMessage: null,
      hasUnread: false,
      notificationCount: 0,
      isMuted: false
    };

    res.status(201).json(
      successResponse(
        { channel: enhancedChannel },
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

    // Check if user is member (except for public channels)
    const channel = await Channel.findByPk(channelId);
    
    if (!channel) {
      return res.status(404).json(
        errorResponse('Channel not found', 'CHANNEL_NOT_FOUND')
      );
    }

    // For public channels, allow viewing even if not a member
    const membership = await ChannelMember.findOne({
      where: { channelId, userId: req.user.id }
    });

    if (channel.isPrivate && !membership && channel.type !== 'direct') {
      return res.status(403).json(
        errorResponse('You are not a member of this private channel', 'FORBIDDEN')
      );
    }

    // Load channel with complete info
    const channelWithDetails = await Channel.findByPk(channelId, {
      include: [
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'username', 'profilePicture', 'status']
        },
        {
          model: User,
          as: 'members',
          attributes: ['id', 'username', 'profilePicture', 'status'],
          through: { attributes: ['role', 'joinedAt'] }
        }
      ]
    });

    // Get member count
    const memberCount = await ChannelMember.count({
      where: { channelId }
    });

    // Get admin users
    const adminMembers = await ChannelMember.findAll({
      where: { 
        channelId,
        role: 'admin'
      },
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'username']
        }
      ]
    });

    // Get latest message
    const latestMessage = await Message.findOne({
      where: { channelId },
      include: [
        { 
          model: User, 
          as: 'user', 
          attributes: ['id', 'username', 'profilePicture'] 
        }
      ],
      order: [['createdAt', 'DESC']]
    });

    // Get current user's membership status
    const userMembership = await ChannelMember.findOne({
      where: { 
        channelId,
        userId: req.user.id
      }
    });

    const enhancedChannel = {
      ...channelWithDetails.get({ plain: true }),
      memberCount,
      isMember: !!userMembership,
      userRole: userMembership?.role || null,
      admins: adminMembers.map(member => member.user?.id),
      adminUsers: adminMembers.map(member => member.user),
      ownerId: channel.createdBy,
      owner: channelWithDetails.creator,
      latestMessage: latestMessage ? {
        id: latestMessage.id,
        content: latestMessage.content,
        type: latestMessage.type,
        createdAt: latestMessage.createdAt,
        user: latestMessage.user
      } : null,
      hasUnread: false,
      notificationCount: 0,
      isMuted: false
    };

    res.json(
      successResponse(
        { channel: enhancedChannel },
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
    const { name, description, tags, isPrivate, maxMembers } = req.body;

    // Check if user is admin of channel
    const membership = await ChannelMember.findOne({
      where: { 
        channelId, 
        userId: req.user.id,
        role: ['admin']
      }
    });

    if (!membership) {
      return res.status(403).json(
        errorResponse('Only admins can update channels', 'FORBIDDEN')
      );
    }

    // Prepare update data
    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (tags !== undefined) updateData.tags = tags;
    if (isPrivate !== undefined) updateData.isPrivate = isPrivate;
    if (maxMembers !== undefined) updateData.maxMembers = maxMembers;

    await Channel.update(updateData, { where: { id: channelId } });

    // Get updated channel with enhanced data
    const updatedChannel = await Channel.findByPk(channelId, {
      include: [
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'username', 'profilePicture', 'status']
        },
        {
          model: User,
          as: 'members',
          attributes: ['id', 'username', 'profilePicture', 'status'],
          through: { attributes: ['role', 'joinedAt'] }
        }
      ]
    });

    // Get member count
    const memberCount = await ChannelMember.count({
      where: { channelId }
    });

    // Get admin users
    const adminMembers = await ChannelMember.findAll({
      where: { 
        channelId,
        role: 'admin'
      },
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'username']
        }
      ]
    });

    const enhancedChannel = {
      ...updatedChannel.get({ plain: true }),
      memberCount,
      isMember: true,
      userRole: membership.role,
      admins: adminMembers.map(member => member.user?.id),
      adminUsers: adminMembers.map(member => member.user),
      ownerId: updatedChannel.createdBy,
      owner: updatedChannel.creator,
      hasUnread: false,
      notificationCount: 0,
      isMuted: false
    };

    res.json(
      successResponse(
        { channel: enhancedChannel },
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

    // Check if channel is private
    if (channel.isPrivate && channel.type !== 'direct') {
      return res.status(403).json(
        errorResponse('Cannot join private channel without invitation', 'FORBIDDEN')
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

    // Check max members limit
    const memberCount = await ChannelMember.count({ where: { channelId } });
    if (channel.maxMembers && memberCount >= channel.maxMembers) {
      return res.status(400).json(
        errorResponse('Channel has reached maximum member limit', 'MAX_MEMBERS_REACHED')
      );
    }

    // Join channel
    await ChannelMember.create({
      channelId,
      userId: req.user.id,
      role: 'member'
    });

    // Get updated channel info
    const updatedChannel = await Channel.findByPk(channelId, {
      include: [
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'username', 'profilePicture']
        }
      ]
    });

    // Get new member count
    const newMemberCount = await ChannelMember.count({ where: { channelId } });

    res.json(
      successResponse(
        { 
          channel: {
            ...updatedChannel.get({ plain: true }),
            memberCount: newMemberCount,
            isMember: true
          }
        },
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

    // Check if user is the owner
    const channel = await Channel.findByPk(channelId);
    if (channel.createdBy === req.user.id) {
      return res.status(400).json(
        errorResponse('Channel owner cannot leave the channel. Transfer ownership or delete channel instead.', 'OWNER_CANNOT_LEAVE')
      );
    }

    await ChannelMember.destroy({
      where: { channelId, userId: req.user.id }
    });

    // Get updated member count
    const memberCount = await ChannelMember.count({ where: { channelId } });

    res.json(
      successResponse(
        { 
          memberCount,
          isMember: false
        },
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
    const { role, search, page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;

    // Check if user can view members (must be member for private channels)
    const channel = await Channel.findByPk(channelId);
    const userMembership = await ChannelMember.findOne({
      where: { channelId, userId: req.user.id }
    });

    if (channel.isPrivate && !userMembership && channel.type !== 'direct') {
      return res.status(403).json(
        errorResponse('You are not a member of this channel', 'FORBIDDEN')
      );
    }

    // Build where conditions for members
    const memberWhere = { channelId };
    if (role) {
      memberWhere.role = role;
    }

    // Build include conditions for user search
    const userInclude = {
      model: User,
      as: 'user',
      attributes: ['id', 'username', 'profilePicture', 'status', 'lastSeen', 'createdAt']
    };

    if (search) {
      userInclude.where = {
        [Op.or]: [
          { username: { [Op.iLike]: `%${search}%` } },
          { email: { [Op.iLike]: `%${search}%` } }
        ]
      };
    }

    const { count, rows: members } = await ChannelMember.findAndCountAll({
      where: memberWhere,
      include: [userInclude],
      order: [
        ['role', 'DESC'],
        ['joinedAt', 'ASC']
      ],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    // Transform data for frontend
    const transformedMembers = members.map(member => ({
      id: member.user.id,
      username: member.user.username,
      profilePicture: member.user.profilePicture,
      status: member.user.status,
      lastSeen: member.user.lastSeen,
      joinedAt: member.joinedAt,
      role: member.role,
      isOnline: member.user.status === 'online'
    }));

    // Get member roles distribution
    const roleDistribution = await ChannelMember.findAll({
      where: { channelId },
      attributes: ['role', [Sequelize.fn('COUNT', Sequelize.col('role')), 'count']],
      group: ['role'],
      raw: true
    });

    res.json(
      successResponse(
        { 
          members: transformedMembers,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total: count,
            pages: Math.ceil(count / limit)
          },
          roleDistribution,
          canManage: userMembership?.role === 'admin' || channel.createdBy === req.user.id
        },
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

const inviteUsers = async (req, res) => {
  try {
    const { channelId } = req.params;
    const { userIds } = req.body;

    // Check if user has permission to invite
    const userMembership = await ChannelMember.findOne({
      where: { 
        channelId, 
        userId: req.user.id,
        role: ['admin']
      }
    });

    const channel = await Channel.findByPk(channelId);
    
    if (!userMembership && channel.createdBy !== req.user.id) {
      return res.status(403).json(
        errorResponse('Only admins can invite users to this channel', 'FORBIDDEN')
      );
    }

    // Check if channel is private
    if (!channel.isPrivate && channel.type !== 'direct') {
      return res.status(400).json(
        errorResponse('Cannot invite users to public channels. Users can join freely.', 'PUBLIC_CHANNEL')
      );
    }

    // Get existing members to avoid duplicates
    const existingMembers = await ChannelMember.findAll({
      where: { 
        channelId,
        userId: userIds
      },
      attributes: ['userId']
    });

    const existingUserIds = existingMembers.map(m => m.userId);
    const newUserIds = userIds.filter(id => !existingUserIds.includes(id));

    if (newUserIds.length === 0) {
      return res.status(400).json(
        errorResponse('All users are already members of this channel', 'ALREADY_MEMBERS')
      );
    }

    // Check max members limit
    const currentMemberCount = await ChannelMember.count({ where: { channelId } });
    if (channel.maxMembers && (currentMemberCount + newUserIds.length) > channel.maxMembers) {
      return res.status(400).json(
        errorResponse('Inviting these users would exceed the maximum member limit', 'MAX_MEMBERS_REACHED')
      );
    }

    // Create new memberships
    const memberPromises = newUserIds.map(userId =>
      ChannelMember.create({
        channelId,
        userId,
        role: 'member'
      })
    );

    await Promise.all(memberPromises);

    // Get invited users info
    const invitedUsers = await User.findAll({
      where: { id: newUserIds },
      attributes: ['id', 'username', 'profilePicture']
    });

    res.json(
      successResponse(
        { 
          invitedUsers,
          invitedCount: newUserIds.length,
          totalMembers: currentMemberCount + newUserIds.length
        },
        'Users invited successfully'
      )
    );
  } catch (error) {
    console.error('Invite users error:', error);
    res.status(500).json(
      errorResponse('Failed to invite users', 'INVITE_USERS_ERROR')
    );
  }
};

const removeMember = async (req, res) => {
  try {
    const { channelId, userId } = req.params;

    // Check if user has permission to remove members
    const userMembership = await ChannelMember.findOne({
      where: { 
        channelId, 
        userId: req.user.id,
        role: ['admin']
      }
    });

    const channel = await Channel.findByPk(channelId);
    
    if (!userMembership && channel.createdBy !== req.user.id) {
      return res.status(403).json(
        errorResponse('Only admins can remove members', 'FORBIDDEN')
      );
    }

    // Check if trying to remove self
    if (userId === req.user.id) {
      return res.status(400).json(
        errorResponse('Use the leave endpoint to remove yourself', 'CANNOT_REMOVE_SELF')
      );
    }

    // Check if trying to remove owner
    if (userId === channel.createdBy) {
      return res.status(400).json(
        errorResponse('Cannot remove channel owner', 'CANNOT_REMOVE_OWNER')
      );
    }

    // Check if target user is an admin (only owner can remove admins)
    const targetMembership = await ChannelMember.findOne({
      where: { channelId, userId }
    });

    if (targetMembership?.role === 'admin' && channel.createdBy !== req.user.id) {
      return res.status(403).json(
        errorResponse('Only channel owner can remove admins', 'CANNOT_REMOVE_ADMIN')
      );
    }

    await ChannelMember.destroy({
      where: { channelId, userId }
    });

    // Get updated member count
    const memberCount = await ChannelMember.count({ where: { channelId } });

    res.json(
      successResponse(
        { 
          removedUserId: userId,
          memberCount
        },
        'Member removed successfully'
      )
    );
  } catch (error) {
    console.error('Remove member error:', error);
    res.status(500).json(
      errorResponse('Failed to remove member', 'REMOVE_MEMBER_ERROR')
    );
  }
};

const updateMemberRole = async (req, res) => {
  try {
    const { channelId, userId } = req.params;
    const { role } = req.body;

    // Check if user has permission to update roles
    const userMembership = await ChannelMember.findOne({
      where: { 
        channelId, 
        userId: req.user.id,
        role: ['admin']
      }
    });

    const channel = await Channel.findByPk(channelId);
    
    if (!userMembership && channel.createdBy !== req.user.id) {
      return res.status(403).json(
        errorResponse('Only admins can update member roles', 'FORBIDDEN')
      );
    }

    // Check if trying to update self (except owner can demote themselves)
    if (userId === req.user.id && channel.createdBy !== req.user.id) {
      return res.status(400).json(
        errorResponse('Cannot update your own role', 'CANNOT_UPDATE_SELF')
      );
    }

    // Check if trying to update owner's role
    if (userId === channel.createdBy) {
      return res.status(400).json(
        errorResponse('Cannot change channel owner role', 'CANNOT_UPDATE_OWNER')
      );
    }

    // Update role
    await ChannelMember.update(
      { role },
      { where: { channelId, userId } }
    );

    res.json(
      successResponse(
        { 
          userId,
          role,
          updatedBy: req.user.id
        },
        'Member role updated successfully'
      )
    );
  } catch (error) {
    console.error('Update member role error:', error);
    res.status(500).json(
      errorResponse('Failed to update member role', 'UPDATE_ROLE_ERROR')
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
  getChannelMembers,
  inviteUsers,
  removeMember,
  updateMemberRole
};