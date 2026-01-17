const { Channel, User, ChannelMember, Message } = require('../../models');
const { successResponse, errorResponse } = require('../middleware/responseFormatter');
const { Op, Sequelize } = require('sequelize');

const MAX_MEMBERS_CAP = 500;
const VISIBILITY_VALUES = ['public', 'private', 'invite_only'];
const JOIN_POLICY_VALUES = ['open', 'request', 'invite'];
const SQUAD_TYPE_VALUES = ['casual', 'competitive', 'tournament'];
const CHANNEL_TYPES = ['direct', 'group', 'channel', 'squad'];

const parseBoolean = (value) => {
  if (value === undefined || value === null) return undefined;
  if (value === true || value === false) return value;
  if (value === 'true') return true;
  if (value === 'false') return false;
  return undefined;
};

const parseInteger = (value) => {
  if (value === undefined || value === null || value === '') return undefined;
  const parsed = Number(value);
  if (Number.isNaN(parsed)) return undefined;
  return parsed;
};

const isValidHexColor = (value) => /^#[0-9A-Fa-f]{6}$/.test(value || '');

const resolveVisibility = (channel) => {
  if (channel.visibility) return channel.visibility;
  return channel.isPrivate ? 'private' : 'public';
};

const resolveJoinPolicy = (channel) => {
  if (channel.joinPolicy) return channel.joinPolicy;
  return channel.isPrivate ? 'invite' : 'open';
};

const syncIsPrivateFromVisibility = (updateData) => {
  if (!updateData.visibility) return updateData;
  if (updateData.visibility === 'public') {
    updateData.isPrivate = false;
  } else {
    updateData.isPrivate = true;
  }
  return updateData;
};

const buildLatestMessageMap = async (channelIds) => {
  if (!channelIds.length) return new Map();

  const rows = await Channel.sequelize.query(
    `SELECT DISTINCT ON ("Messages"."channelId")
      "Messages"."id",
      "Messages"."content",
      "Messages"."type",
      "Messages"."createdAt",
      "Messages"."channelId",
      "chatUsers"."id" AS "userId",
      "chatUsers"."username" AS "username",
      "chatUsers"."profilePicture" AS "profilePicture"
     FROM "Messages"
     LEFT JOIN "chatUsers"
       ON "chatUsers"."id" = "Messages"."userId"
     WHERE "Messages"."channelId" IN (:channelIds)
     ORDER BY "Messages"."channelId", "Messages"."createdAt" DESC;`,
    {
      replacements: { channelIds },
      type: Sequelize.QueryTypes.SELECT,
    }
  );

  const messageMap = new Map();
  rows.forEach((row) => {
    messageMap.set(row.channelId, {
      id: row.id,
      content: row.content,
      type: row.type,
      createdAt: row.createdAt,
      user: row.userId
        ? {
            id: row.userId,
            username: row.username,
            profilePicture: row.profilePicture,
          }
        : null,
    });
  });

  return messageMap;
};

const buildMemberCountMap = async (channelIds) => {
  if (!channelIds.length) return new Map();
  const counts = await ChannelMember.findAll({
    where: { channelId: channelIds },
    attributes: [
      'channelId',
      [Sequelize.fn('COUNT', Sequelize.col('id')), 'count'],
    ],
    group: ['channelId'],
    raw: true,
  });
  const countMap = new Map();
  counts.forEach((row) => {
    countMap.set(row.channelId, Number(row.count) || 0);
  });
  return countMap;
};

const buildMembershipMap = async (channelIds, userId) => {
  if (!channelIds.length) return new Map();
  const memberships = await ChannelMember.findAll({
    where: { channelId: channelIds, userId },
    attributes: ['channelId', 'role'],
    raw: true,
  });
  const membershipMap = new Map();
  memberships.forEach((row) => {
    membershipMap.set(row.channelId, row);
  });
  return membershipMap;
};

const buildAdminMap = async (channelIds) => {
  if (!channelIds.length) return new Map();
  const adminMembers = await ChannelMember.findAll({
    where: { channelId: channelIds, role: 'admin' },
    include: [
      {
        model: User,
        as: 'user',
        attributes: ['id', 'username'],
      },
    ],
  });

  const adminMap = new Map();
  adminMembers.forEach((member) => {
    const entry = adminMap.get(member.channelId) || { admins: [], adminUsers: [] };
    if (member.user?.id) {
      entry.admins.push(member.user.id);
      entry.adminUsers.push(member.user);
    }
    adminMap.set(member.channelId, entry);
  });

  return adminMap;
};

const enrichChannels = async (channels, userId) => {
  const channelIds = channels.map((channel) => channel.id);
  const [memberCountMap, membershipMap, adminMap, latestMessageMap] = await Promise.all([
    buildMemberCountMap(channelIds),
    buildMembershipMap(channelIds, userId),
    buildAdminMap(channelIds),
    buildLatestMessageMap(channelIds),
  ]);

  return channels.map((channel) => {
    const plainChannel = channel.get({ plain: true });
    const membership = membershipMap.get(channel.id);
    const adminsData = adminMap.get(channel.id) || { admins: [], adminUsers: [] };
    const basePayload = {
      ...plainChannel,
      memberCount: memberCountMap.get(channel.id) || 0,
      isMember: Boolean(membership),
      userRole: membership?.role || null,
      admins: adminsData.admins,
      adminUsers: adminsData.adminUsers,
      ownerId: channel.createdBy,
      owner: plainChannel.creator,
      latestMessage: latestMessageMap.get(channel.id) || null,
      hasUnread: false,
      notificationCount: 0,
      isMuted: false,
    };

    return channel.type === 'squad'
      ? { ...basePayload, entityType: 'squad' }
      : basePayload;
  });
};

const canJoinChannel = (channel) => {
  if (channel.suspendedAt) {
    return {
      allowed: false,
      status: 403,
      message: 'This squad is suspended and cannot be joined.',
      code: 'SQUAD_SUSPENDED',
    };
  }

  if (channel.type === 'direct') {
    return {
      allowed: false,
      status: 403,
      message: 'Direct channels cannot be joined directly.',
      code: 'FORBIDDEN_JOIN_POLICY',
    };
  }

  const visibility = resolveVisibility(channel);
  const joinPolicy = resolveJoinPolicy(channel);

  if (joinPolicy === 'request') {
    return {
      allowed: false,
      status: 501,
      message: 'Join requests are not implemented yet.',
      code: 'JOIN_REQUESTS_NOT_IMPLEMENTED',
    };
  }

  if (joinPolicy === 'invite' || visibility === 'private' || visibility === 'invite_only') {
    return {
      allowed: false,
      status: 403,
      message: 'You must be invited to join this squad.',
      code: 'FORBIDDEN_JOIN_POLICY',
    };
  }

  if (visibility === 'public' && joinPolicy === 'open') {
    return { allowed: true };
  }

  return {
    allowed: false,
    status: 403,
    message: 'You are not allowed to join this squad.',
    code: 'FORBIDDEN_JOIN_POLICY',
  };
};

const getUserChannels = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      type,
      isPrivate,
      search,
      visibility,
      joinPolicy,
      squadType,
      relatedGameId,
      region,
      primaryMode,
      isFeatured,
      isVerified,
      joined,
    } = req.query;

    const joinedFilter = joined === undefined ? 'true' : joined;
    const pageNumber = Math.max(parseInt(page, 10) || 1, 1);
    const limitNumber = Math.max(parseInt(limit, 10) || 20, 1);
    const offset = (pageNumber - 1) * limitNumber;

    const whereConditions = {};

    if (type) {
      if (!CHANNEL_TYPES.includes(type)) {
        return res.status(400).json(errorResponse('Invalid channel type', 'VALIDATION_ERROR'));
      }
      whereConditions.type = type;
    }

    if (visibility) {
      if (!VISIBILITY_VALUES.includes(visibility)) {
        return res.status(400).json(errorResponse('Invalid visibility', 'VALIDATION_ERROR'));
      }
      whereConditions.visibility = visibility;
    }

    if (joinPolicy) {
      if (!JOIN_POLICY_VALUES.includes(joinPolicy)) {
        return res.status(400).json(errorResponse('Invalid join policy', 'VALIDATION_ERROR'));
      }
      whereConditions.joinPolicy = joinPolicy;
    }

    if (squadType) {
      if (!SQUAD_TYPE_VALUES.includes(squadType)) {
        return res.status(400).json(errorResponse('Invalid squad type', 'VALIDATION_ERROR'));
      }
      whereConditions.squadType = squadType;
    }

    if (region) {
      whereConditions.region = region;
    }

    if (primaryMode) {
      whereConditions.primaryMode = primaryMode;
    }

    const relatedGameIdValue = parseInteger(relatedGameId);
    if (relatedGameIdValue !== undefined) {
      whereConditions.relatedGameId = relatedGameIdValue;
    }

    const featuredValue = parseBoolean(isFeatured);
    if (featuredValue !== undefined) {
      whereConditions.isFeatured = featuredValue;
    }

    const verifiedValue = parseBoolean(isVerified);
    if (verifiedValue !== undefined) {
      whereConditions.isVerified = verifiedValue;
    }

    if (visibility || joinPolicy) {
      // visibility/joinPolicy take precedence over isPrivate
    } else if (isPrivate !== undefined) {
      const privateValue = parseBoolean(isPrivate);
      if (privateValue !== undefined) {
        whereConditions.isPrivate = privateValue;
      }
    }

    if (joinedFilter === 'false') {
      if (whereConditions.type === 'direct') {
        return res.json(
          successResponse(
            {
              channels: [],
              pagination: {
                page: pageNumber,
                limit: limitNumber,
                total: 0,
                pages: 0,
              },
            },
            'Channels retrieved successfully'
          )
        );
      }

      if (visibility && visibility !== 'public') {
        return res.json(
          successResponse(
            {
              channels: [],
              pagination: {
                page: pageNumber,
                limit: limitNumber,
                total: 0,
                pages: 0,
              },
            },
            'Channels retrieved successfully'
          )
        );
      }

      if (!whereConditions.type) {
        whereConditions.type = { [Op.ne]: 'direct' };
      }

      const discoveryConditions = [
        { visibility: 'public' },
        { visibility: { [Op.is]: null }, isPrivate: false },
      ];

      if (search) {
        const searchConditions = [
          { name: { [Op.iLike]: `%${search}%` } },
          { description: { [Op.iLike]: `%${search}%` } },
          { shortDescription: { [Op.iLike]: `%${search}%` } },
          { squadTag: { [Op.iLike]: `%${search}%` } },
        ];
        whereConditions[Op.and] = [
          { [Op.or]: discoveryConditions },
          { [Op.or]: searchConditions },
        ];
      } else {
        whereConditions[Op.or] = discoveryConditions;
      }

      whereConditions.suspendedAt = { [Op.is]: null };
    } else if (search) {
      whereConditions[Op.or] = [
        { name: { [Op.iLike]: `%${search}%` } },
        { description: { [Op.iLike]: `%${search}%` } },
        { shortDescription: { [Op.iLike]: `%${search}%` } },
        { squadTag: { [Op.iLike]: `%${search}%` } },
      ];
    }

    const include = [
      {
        model: User,
        as: 'creator',
        attributes: ['id', 'username', 'profilePicture'],
      },
      {
        model: User,
        as: 'members',
        attributes: ['id', 'username', 'profilePicture', 'status'],
        through: { attributes: ['role'] },
        required: false,
      },
    ];

    if (joinedFilter === 'false') {
      include.push({
        model: ChannelMember,
        as: 'channelMemberships',
        where: { userId: req.user.id },
        attributes: ['role', 'joinedAt'],
        required: false,
      });
      whereConditions['$channelMemberships.userId$'] = { [Op.is]: null };
    } else {
      include.push({
        model: ChannelMember,
        as: 'channelMemberships',
        where: { userId: req.user.id },
        attributes: ['role', 'joinedAt'],
        required: true,
      });
    }

    const channels = await Channel.findAll({
      where: whereConditions,
      include,
      limit: limitNumber,
      offset,
      order: [['updatedAt', 'DESC']],
      distinct: true,
    });

    const channelsWithDetails = await enrichChannels(channels, req.user.id);

    let filteredChannels = channelsWithDetails;
    if (joinedFilter === 'false') {
      filteredChannels = channelsWithDetails;
    }

    const totalChannels = await Channel.count({
      where: whereConditions,
      include: include.map((entry) => ({
        ...entry,
        attributes: [],
      })),
      distinct: true,
    });

    res.json(
      successResponse(
        {
          channels: filteredChannels,
          pagination: {
            page: pageNumber,
            limit: limitNumber,
            total: totalChannels,
            pages: Math.ceil(totalChannels / limitNumber),
          },
        },
        'Channels retrieved successfully'
      )
    );
  } catch (error) {
    console.error('Get channels error:', error);
    res
      .status(500)
      .json(errorResponse('Failed to retrieve channels', 'CHANNELS_RETRIEVAL_ERROR'));
  }
};

const createChannel = async (req, res) => {
  try {
    const {
      name,
      description,
      type,
      isPrivate,
      participantIds = [],
      tags = [],
      relatedGameId,
      squadTag,
      squadType,
      visibility,
      joinPolicy,
      maxMembers,
      logoUrl,
      bannerUrl,
      accentColor,
      shortDescription,
      externalLink,
      primaryMode,
      region,
      isFeatured,
      isVerified,
    } = req.body;

    const channelType = type || 'direct';
    if (!CHANNEL_TYPES.includes(channelType)) {
      return res.status(400).json(errorResponse('Invalid channel type', 'VALIDATION_ERROR'));
    }

    if (channelType === 'direct' && participantIds.length !== 1) {
      return res.status(400).json(
        errorResponse('Direct messages must have exactly one participant', 'VALIDATION_ERROR')
      );
    }

    if (squadTag && squadTag.length > 10) {
      return res.status(400).json(errorResponse('Squad tag is too long', 'VALIDATION_ERROR'));
    }

    if (accentColor && !isValidHexColor(accentColor)) {
      return res
        .status(400)
        .json(errorResponse('Accent color must be a valid hex code', 'VALIDATION_ERROR'));
    }

    if (squadType && !SQUAD_TYPE_VALUES.includes(squadType)) {
      return res.status(400).json(errorResponse('Invalid squad type', 'VALIDATION_ERROR'));
    }

    if (visibility && !VISIBILITY_VALUES.includes(visibility)) {
      return res.status(400).json(errorResponse('Invalid visibility', 'VALIDATION_ERROR'));
    }

    if (joinPolicy && !JOIN_POLICY_VALUES.includes(joinPolicy)) {
      return res.status(400).json(errorResponse('Invalid join policy', 'VALIDATION_ERROR'));
    }

    const maxMembersValue = parseInteger(maxMembers);
    if (maxMembersValue !== undefined) {
      if (maxMembersValue < 2 || maxMembersValue > MAX_MEMBERS_CAP) {
        return res.status(400).json(
          errorResponse(
            `Max members must be between 2 and ${MAX_MEMBERS_CAP}`,
            'VALIDATION_ERROR'
          )
        );
      }
    }

    const relatedGameIdValue = parseInteger(relatedGameId);

    const channelData = {
      name,
      description,
      type: channelType,
      createdBy: req.user.id,
      tags: tags || [],
      relatedGameId: relatedGameIdValue,
      squadTag,
      squadType,
      visibility,
      joinPolicy,
      maxMembers: maxMembersValue,
      logoUrl,
      bannerUrl,
      accentColor,
      shortDescription,
      externalLink,
      primaryMode,
      region,
      isFeatured: parseBoolean(isFeatured),
      isVerified: parseBoolean(isVerified),
    };

    if (channelType === 'squad') {
      channelData.visibility = channelData.visibility || 'public';
      channelData.joinPolicy = channelData.joinPolicy || 'open';
    }

    if (channelType === 'direct') {
      channelData.isPrivate = true;
      channelData.visibility = 'private';
      channelData.joinPolicy = 'invite';
    } else if (channelData.visibility) {
      syncIsPrivateFromVisibility(channelData);
    } else if (isPrivate !== undefined) {
      channelData.isPrivate = parseBoolean(isPrivate);
    }

    const channel = await Channel.create(channelData);

    await ChannelMember.create({
      channelId: channel.id,
      userId: req.user.id,
      role: 'admin',
    });

    if (participantIds.length > 0) {
      const memberPromises = participantIds.map((userId) =>
        ChannelMember.create({
          channelId: channel.id,
          userId,
          role: 'member',
        })
      );
      await Promise.all(memberPromises);
    }

    const channelWithDetails = await Channel.findByPk(channel.id, {
      include: [
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'username', 'profilePicture', 'status'],
        },
        {
          model: User,
          as: 'members',
          attributes: ['id', 'username', 'profilePicture', 'status'],
          through: { attributes: ['role', 'joinedAt'] },
        },
      ],
    });

    const memberCount = await ChannelMember.count({ where: { channelId: channel.id } });

    const adminMembers = await ChannelMember.findAll({
      where: {
        channelId: channel.id,
        role: 'admin',
      },
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'username'],
        },
      ],
    });

    const enhancedChannel = {
      ...channelWithDetails.get({ plain: true }),
      memberCount,
      isMember: true,
      userRole: 'admin',
      admins: adminMembers.map((member) => member.user?.id),
      adminUsers: adminMembers.map((member) => member.user),
      ownerId: req.user.id,
      owner: channelWithDetails.creator,
      latestMessage: null,
      hasUnread: false,
      notificationCount: 0,
      isMuted: false,
    };

    res
      .status(201)
      .json(successResponse({ channel: enhancedChannel }, 'Channel created successfully'));
  } catch (error) {
    console.error('Create channel error:', error);
    res
      .status(500)
      .json(errorResponse('Failed to create channel', 'CHANNEL_CREATION_ERROR'));
  }
};

const getChannel = async (req, res) => {
  try {
    const { channelId } = req.params;

    const channel = await Channel.findByPk(channelId, {
      include: [
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'username', 'profilePicture', 'status'],
        },
        {
          model: User,
          as: 'members',
          attributes: ['id', 'username', 'profilePicture', 'status'],
          through: { attributes: ['role', 'joinedAt'] },
        },
      ],
    });

    if (!channel) {
      return res
        .status(404)
        .json(errorResponse('Channel not found', 'CHANNEL_NOT_FOUND'));
    }

    const membership = await ChannelMember.findOne({
      where: { channelId, userId: req.user.id },
    });

    if (channel.type === 'direct' && !membership) {
      return res
        .status(403)
        .json(errorResponse('You are not a member of this channel', 'FORBIDDEN'));
    }

    const visibility = resolveVisibility(channel);
    if ((visibility === 'private' || visibility === 'invite_only') && !membership) {
      return res
        .status(403)
        .json(errorResponse('You are not a member of this private channel', 'FORBIDDEN'));
    }

    const [memberCountMap, membershipMap, adminMap, latestMessageMap] = await Promise.all([
      buildMemberCountMap([channel.id]),
      buildMembershipMap([channel.id], req.user.id),
      buildAdminMap([channel.id]),
      buildLatestMessageMap([channel.id]),
    ]);

    const adminsData = adminMap.get(channel.id) || { admins: [], adminUsers: [] };
    const channelMembership = membershipMap.get(channel.id);

    const enhancedChannel = {
      ...channel.get({ plain: true }),
      memberCount: memberCountMap.get(channel.id) || 0,
      isMember: Boolean(channelMembership),
      userRole: channelMembership?.role || null,
      admins: adminsData.admins,
      adminUsers: adminsData.adminUsers,
      ownerId: channel.createdBy,
      owner: channel.creator,
      latestMessage: latestMessageMap.get(channel.id) || null,
      hasUnread: false,
      notificationCount: 0,
      isMuted: false,
      ...(channel.type === 'squad' ? { entityType: 'squad' } : {}),
    };

    res.json(successResponse({ channel: enhancedChannel }, 'Channel retrieved successfully'));
  } catch (error) {
    console.error('Get channel error:', error);
    res
      .status(500)
      .json(errorResponse('Failed to retrieve channel', 'CHANNEL_RETRIEVAL_ERROR'));
  }
};

const updateChannel = async (req, res) => {
  try {
    const { channelId } = req.params;
    const channel = await Channel.findByPk(channelId);

    if (!channel) {
      return res
        .status(404)
        .json(errorResponse('Channel not found', 'CHANNEL_NOT_FOUND'));
    }

    const membership = await ChannelMember.findOne({
      where: {
        channelId,
        userId: req.user.id,
        role: ['admin'],
      },
    });

    if (!membership) {
      return res.status(403).json(errorResponse('Only admins can update channels', 'FORBIDDEN'));
    }

    const {
      name,
      description,
      tags,
      isPrivate,
      maxMembers,
      relatedGameId,
      squadTag,
      squadType,
      visibility,
      joinPolicy,
      logoUrl,
      bannerUrl,
      accentColor,
      shortDescription,
      externalLink,
      primaryMode,
      region,
      isFeatured,
      isVerified,
      suspendedAt,
      wins,
      losses,
      draws,
      rating,
      lastActivityAt,
      lastMatchAt,
    } = req.body;

    if (squadTag && squadTag.length > 10) {
      return res.status(400).json(errorResponse('Squad tag is too long', 'VALIDATION_ERROR'));
    }

    if (accentColor && !isValidHexColor(accentColor)) {
      return res
        .status(400)
        .json(errorResponse('Accent color must be a valid hex code', 'VALIDATION_ERROR'));
    }

    if (squadType && !SQUAD_TYPE_VALUES.includes(squadType)) {
      return res.status(400).json(errorResponse('Invalid squad type', 'VALIDATION_ERROR'));
    }

    if (visibility && !VISIBILITY_VALUES.includes(visibility)) {
      return res.status(400).json(errorResponse('Invalid visibility', 'VALIDATION_ERROR'));
    }

    if (joinPolicy && !JOIN_POLICY_VALUES.includes(joinPolicy)) {
      return res.status(400).json(errorResponse('Invalid join policy', 'VALIDATION_ERROR'));
    }

    const maxMembersValue = parseInteger(maxMembers);
    if (maxMembersValue !== undefined) {
      if (maxMembersValue < 2 || maxMembersValue > MAX_MEMBERS_CAP) {
        return res.status(400).json(
          errorResponse(
            `Max members must be between 2 and ${MAX_MEMBERS_CAP}`,
            'VALIDATION_ERROR'
          )
        );
      }
    }

    if (
      (isFeatured !== undefined || isVerified !== undefined || suspendedAt !== undefined) &&
      channel.createdBy !== req.user.id
    ) {
      return res
        .status(403)
        .json(errorResponse('Only owners can update moderation fields', 'FORBIDDEN'));
    }

    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (tags !== undefined) updateData.tags = tags;
    if (maxMembersValue !== undefined) updateData.maxMembers = maxMembersValue;
    if (relatedGameId !== undefined) updateData.relatedGameId = parseInteger(relatedGameId);
    if (squadTag !== undefined) updateData.squadTag = squadTag;
    if (squadType !== undefined) updateData.squadType = squadType;
    if (visibility !== undefined) updateData.visibility = visibility;
    if (joinPolicy !== undefined) updateData.joinPolicy = joinPolicy;
    if (logoUrl !== undefined) updateData.logoUrl = logoUrl;
    if (bannerUrl !== undefined) updateData.bannerUrl = bannerUrl;
    if (accentColor !== undefined) updateData.accentColor = accentColor;
    if (shortDescription !== undefined) updateData.shortDescription = shortDescription;
    if (externalLink !== undefined) updateData.externalLink = externalLink;
    if (primaryMode !== undefined) updateData.primaryMode = primaryMode;
    if (region !== undefined) updateData.region = region;
    if (isFeatured !== undefined) updateData.isFeatured = parseBoolean(isFeatured);
    if (isVerified !== undefined) updateData.isVerified = parseBoolean(isVerified);
    if (suspendedAt !== undefined) updateData.suspendedAt = suspendedAt;
    if (wins !== undefined) updateData.wins = parseInteger(wins);
    if (losses !== undefined) updateData.losses = parseInteger(losses);
    if (draws !== undefined) updateData.draws = parseInteger(draws);
    if (rating !== undefined) updateData.rating = parseInteger(rating);
    if (lastActivityAt !== undefined) updateData.lastActivityAt = lastActivityAt;
    if (lastMatchAt !== undefined) updateData.lastMatchAt = lastMatchAt;

    if (updateData.visibility) {
      syncIsPrivateFromVisibility(updateData);
    } else if (isPrivate !== undefined) {
      updateData.isPrivate = parseBoolean(isPrivate);
    }

    await Channel.update(updateData, { where: { id: channelId } });

    const updatedChannel = await Channel.findByPk(channelId, {
      include: [
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'username', 'profilePicture', 'status'],
        },
        {
          model: User,
          as: 'members',
          attributes: ['id', 'username', 'profilePicture', 'status'],
          through: { attributes: ['role', 'joinedAt'] },
        },
      ],
    });

    const [memberCountMap, adminMap] = await Promise.all([
      buildMemberCountMap([channelId]),
      buildAdminMap([channelId]),
    ]);

    const adminsData = adminMap.get(channelId) || { admins: [], adminUsers: [] };

    const enhancedChannel = {
      ...updatedChannel.get({ plain: true }),
      memberCount: memberCountMap.get(channelId) || 0,
      isMember: true,
      userRole: membership.role,
      admins: adminsData.admins,
      adminUsers: adminsData.adminUsers,
      ownerId: updatedChannel.createdBy,
      owner: updatedChannel.creator,
      hasUnread: false,
      notificationCount: 0,
      isMuted: false,
    };

    res.json(successResponse({ channel: enhancedChannel }, 'Channel updated successfully'));
  } catch (error) {
    console.error('Update channel error:', error);
    res
      .status(500)
      .json(errorResponse('Failed to update channel', 'CHANNEL_UPDATE_ERROR'));
  }
};

const joinChannel = async (req, res) => {
  try {
    const { channelId } = req.params;

    const channel = await Channel.findByPk(channelId);
    if (!channel) {
      return res.status(404).json(errorResponse('Channel not found', 'CHANNEL_NOT_FOUND'));
    }

    if (channel.suspendedAt) {
      return res
        .status(403)
        .json(errorResponse('This squad is suspended', 'SQUAD_SUSPENDED'));
    }

    const existingMembership = await ChannelMember.findOne({
      where: { channelId, userId: req.user.id },
    });

    if (existingMembership) {
      return res
        .status(409)
        .json(errorResponse('Already a member of this channel', 'ALREADY_MEMBER'));
    }

    const joinCheck = canJoinChannel(channel);
    if (!joinCheck.allowed) {
      return res
        .status(joinCheck.status || 403)
        .json(errorResponse(joinCheck.message, joinCheck.code));
    }

    const memberCount = await ChannelMember.count({ where: { channelId } });
    if (channel.maxMembers && memberCount >= channel.maxMembers) {
      return res
        .status(400)
        .json(errorResponse('Squad has reached maximum member limit', 'MAX_MEMBERS_REACHED'));
    }

    await ChannelMember.create({
      channelId,
      userId: req.user.id,
      role: 'member',
    });

    const updatedChannel = await Channel.findByPk(channelId, {
      include: [
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'username', 'profilePicture'],
        },
      ],
    });

    const newMemberCount = await ChannelMember.count({ where: { channelId } });

    res.json(
      successResponse(
        {
          channel: {
            ...updatedChannel.get({ plain: true }),
            memberCount: newMemberCount,
            isMember: true,
          },
        },
        'Joined channel successfully'
      )
    );
  } catch (error) {
    console.error('Join channel error:', error);
    res.status(500).json(errorResponse('Failed to join channel', 'JOIN_CHANNEL_ERROR'));
  }
};

const leaveChannel = async (req, res) => {
  try {
    const { channelId } = req.params;

    const channel = await Channel.findByPk(channelId);
    if (channel.createdBy === req.user.id) {
      return res.status(400).json(
        errorResponse(
          'Channel owner cannot leave the channel. Transfer ownership or delete channel instead.',
          'OWNER_CANNOT_LEAVE'
        )
      );
    }

    await ChannelMember.destroy({
      where: { channelId, userId: req.user.id },
    });

    const memberCount = await ChannelMember.count({ where: { channelId } });

    res.json(
      successResponse(
        {
          memberCount,
          isMember: false,
        },
        'Left channel successfully'
      )
    );
  } catch (error) {
    console.error('Leave channel error:', error);
    res.status(500).json(errorResponse('Failed to leave channel', 'LEAVE_CHANNEL_ERROR'));
  }
};

const getChannelMembers = async (req, res) => {
  try {
    const { channelId } = req.params;
    const { role, search, page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;

    const channel = await Channel.findByPk(channelId);
    if (!channel) {
      return res.status(404).json(errorResponse('Channel not found', 'CHANNEL_NOT_FOUND'));
    }
    const userMembership = await ChannelMember.findOne({
      where: { channelId, userId: req.user.id },
    });

    const visibility = resolveVisibility(channel);
    if ((visibility === 'private' || visibility === 'invite_only') && !userMembership) {
      return res.status(403).json(errorResponse('You are not a member of this channel', 'FORBIDDEN'));
    }

    const memberWhere = { channelId };
    if (role) {
      memberWhere.role = role;
    }

    const userInclude = {
      model: User,
      as: 'user',
      attributes: ['id', 'username', 'profilePicture', 'status', 'lastSeen', 'createdAt'],
    };

    if (search) {
      userInclude.where = {
        [Op.or]: [
          { username: { [Op.iLike]: `%${search}%` } },
          { email: { [Op.iLike]: `%${search}%` } },
        ],
      };
    }

    const { count, rows: members } = await ChannelMember.findAndCountAll({
      where: memberWhere,
      include: [userInclude],
      order: [
        ['role', 'DESC'],
        ['joinedAt', 'ASC'],
      ],
      limit: parseInt(limit, 10),
      offset: parseInt(offset, 10),
    });

    const transformedMembers = members.map((member) => ({
      id: member.user.id,
      username: member.user.username,
      profilePicture: member.user.profilePicture,
      status: member.user.status,
      lastSeen: member.user.lastSeen,
      joinedAt: member.joinedAt,
      role: member.role,
      isOnline: member.user.status === 'online',
    }));

    const roleDistribution = await ChannelMember.findAll({
      where: { channelId },
      attributes: ['role', [Sequelize.fn('COUNT', Sequelize.col('role')), 'count']],
      group: ['role'],
      raw: true,
    });

    res.json(
      successResponse(
        {
          members: transformedMembers,
          pagination: {
            page: parseInt(page, 10),
            limit: parseInt(limit, 10),
            total: count,
            pages: Math.ceil(count / limit),
          },
          roleDistribution,
          canManage: userMembership?.role === 'admin' || channel.createdBy === req.user.id,
        },
        'Channel members retrieved successfully'
      )
    );
  } catch (error) {
    console.error('Get channel members error:', error);
    res
      .status(500)
      .json(errorResponse('Failed to retrieve channel members', 'MEMBERS_RETRIEVAL_ERROR'));
  }
};

const inviteUsers = async (req, res) => {
  try {
    const { channelId } = req.params;
    const { userIds } = req.body;

    const userMembership = await ChannelMember.findOne({
      where: {
        channelId,
        userId: req.user.id,
        role: ['admin'],
      },
    });

    const channel = await Channel.findByPk(channelId);
    if (!channel) {
      return res.status(404).json(errorResponse('Channel not found', 'CHANNEL_NOT_FOUND'));
    }

    if (channel.type === 'direct') {
      return res
        .status(400)
        .json(
          errorResponse(
            'Cannot invite users to a direct message',
            'DIRECT_CHANNEL_INVITES_FORBIDDEN'
          )
        );
    }

    if (!userMembership && channel.createdBy !== req.user.id) {
      return res
        .status(403)
        .json(errorResponse('Only admins can invite users to this channel', 'FORBIDDEN'));
    }

    if (channel.suspendedAt) {
      return res
        .status(403)
        .json(errorResponse('This squad is suspended', 'SQUAD_SUSPENDED'));
    }

    const existingMembers = await ChannelMember.findAll({
      where: {
        channelId,
        userId: userIds,
      },
      attributes: ['userId'],
    });

    const existingUserIds = existingMembers.map((m) => m.userId);
    const newUserIds = userIds.filter((id) => !existingUserIds.includes(id));

    if (newUserIds.length === 0) {
      return res
        .status(400)
        .json(errorResponse('All users are already members of this channel', 'ALREADY_MEMBERS'));
    }

    const currentMemberCount = await ChannelMember.count({ where: { channelId } });
    if (channel.maxMembers && currentMemberCount + newUserIds.length > channel.maxMembers) {
      return res
        .status(400)
        .json(errorResponse('Inviting these users would exceed the maximum member limit', 'MAX_MEMBERS_REACHED'));
    }

    const memberPromises = newUserIds.map((userId) =>
      ChannelMember.create({
        channelId,
        userId,
        role: 'member',
      })
    );

    await Promise.all(memberPromises);

    const invitedUsers = await User.findAll({
      where: { id: newUserIds },
      attributes: ['id', 'username', 'profilePicture'],
    });

    res.json(
      successResponse(
        {
          invitedUsers,
          invitedCount: newUserIds.length,
          totalMembers: currentMemberCount + newUserIds.length,
        },
        'Users invited successfully'
      )
    );
  } catch (error) {
    console.error('Invite users error:', error);
    res.status(500).json(errorResponse('Failed to invite users', 'INVITE_USERS_ERROR'));
  }
};

const deleteChannel = async (req, res) => {
  try {
    const { channelId } = req.params;

    const channel = await Channel.findByPk(channelId);
    if (!channel) {
      return res.status(404).json(errorResponse('Channel not found', 'CHANNEL_NOT_FOUND'));
    }

    const membership = await ChannelMember.findOne({
      where: {
        channelId,
        userId: req.user.id,
      },
    });

    const canDelete =
      channel.createdBy === req.user.id || membership?.role === 'admin';

    if (!canDelete) {
      return res
        .status(403)
        .json(errorResponse('Only admins can delete channels', 'FORBIDDEN'));
    }

    await Channel.destroy({ where: { id: channelId } });

    res.json(
      successResponse(
        { channelId, deleted: true },
        'Channel deleted successfully'
      )
    );
  } catch (error) {
    console.error('Delete channel error:', error);
    res.status(500).json(errorResponse('Failed to delete channel', 'CHANNEL_DELETE_ERROR'));
  }
};

const removeMember = async (req, res) => {
  try {
    const { channelId, userId } = req.params;

    const userMembership = await ChannelMember.findOne({
      where: {
        channelId,
        userId: req.user.id,
        role: ['admin'],
      },
    });

    const channel = await Channel.findByPk(channelId);

    if (!userMembership && channel.createdBy !== req.user.id) {
      return res
        .status(403)
        .json(errorResponse('Only admins can remove members', 'FORBIDDEN'));
    }

    if (userId === req.user.id) {
      return res
        .status(400)
        .json(errorResponse('Use the leave endpoint to remove yourself', 'CANNOT_REMOVE_SELF'));
    }

    if (userId === channel.createdBy) {
      return res
        .status(400)
        .json(errorResponse('Cannot remove channel owner', 'CANNOT_REMOVE_OWNER'));
    }

    const targetMembership = await ChannelMember.findOne({
      where: { channelId, userId },
    });

    if (targetMembership?.role === 'admin' && channel.createdBy !== req.user.id) {
      return res
        .status(403)
        .json(errorResponse('Only channel owner can remove admins', 'CANNOT_REMOVE_ADMIN'));
    }

    await ChannelMember.destroy({
      where: { channelId, userId },
    });

    const memberCount = await ChannelMember.count({ where: { channelId } });

    res.json(
      successResponse(
        {
          removedUserId: userId,
          memberCount,
        },
        'Member removed successfully'
      )
    );
  } catch (error) {
    console.error('Remove member error:', error);
    res.status(500).json(errorResponse('Failed to remove member', 'REMOVE_MEMBER_ERROR'));
  }
};

const updateMemberRole = async (req, res) => {
  try {
    const { channelId, userId } = req.params;
    const { role } = req.body;

    const userMembership = await ChannelMember.findOne({
      where: {
        channelId,
        userId: req.user.id,
        role: ['admin'],
      },
    });

    const channel = await Channel.findByPk(channelId);

    if (!userMembership && channel.createdBy !== req.user.id) {
      return res
        .status(403)
        .json(errorResponse('Only admins can update member roles', 'FORBIDDEN'));
    }

    if (userId === req.user.id && channel.createdBy !== req.user.id) {
      return res
        .status(400)
        .json(errorResponse('Cannot update your own role', 'CANNOT_UPDATE_SELF'));
    }

    if (userId === channel.createdBy) {
      return res
        .status(400)
        .json(errorResponse('Cannot change channel owner role', 'CANNOT_UPDATE_OWNER'));
    }

    await ChannelMember.update({ role }, { where: { channelId, userId } });

    res.json(
      successResponse(
        {
          userId,
          role,
          updatedBy: req.user.id,
        },
        'Member role updated successfully'
      )
    );
  } catch (error) {
    console.error('Update member role error:', error);
    res.status(500).json(errorResponse('Failed to update member role', 'UPDATE_ROLE_ERROR'));
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
  deleteChannel,
  removeMember,
  updateMemberRole,
};
