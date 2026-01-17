const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Channel extends Model {
    static associate(models) {
      // Channel belongs to a creator (User)
      Channel.belongsTo(models.User, { foreignKey: 'createdBy', as: 'creator' });
      
      // Channel has many members through ChannelMembers
      Channel.belongsToMany(models.User, {
        through: 'ChannelMembers',
        foreignKey: 'channelId',
        as: 'members'
      });
      
      // Channel has many messages
      Channel.hasMany(models.Message, { foreignKey: 'channelId', as: 'messages' });
      
      // Channel has many channel members
      Channel.hasMany(models.ChannelMember, { foreignKey: 'channelId', as: 'channelMemberships' });
    }
  }

  Channel.init({
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        len: [1, 100],
      },
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    type: {
      type: DataTypes.ENUM('direct', 'group', 'channel', 'squad'),
      defaultValue: 'direct',
    },
    isPrivate: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    relatedGameId: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    squadTag: {
      type: DataTypes.STRING(10),
      allowNull: true,
    },
    squadType: {
      type: DataTypes.ENUM('casual', 'competitive', 'tournament'),
      defaultValue: 'casual',
    },
    visibility: {
      type: DataTypes.ENUM('public', 'private', 'invite_only'),
      defaultValue: 'public',
    },
    joinPolicy: {
      type: DataTypes.ENUM('open', 'request', 'invite'),
      defaultValue: 'open',
    },
    maxMembers: {
      type: DataTypes.INTEGER,
      defaultValue: 50,
    },
    logoUrl: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    bannerUrl: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    accentColor: {
      type: DataTypes.STRING(7),
      allowNull: true,
    },
    shortDescription: {
      type: DataTypes.STRING(160),
      allowNull: true,
    },
    externalLink: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    primaryMode: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    region: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    currentMatchId: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    lastActivityAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    lastMatchAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    wins: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    losses: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    draws: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    rating: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    isVerified: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    isFeatured: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    reportCount: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    suspendedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    createdBy: {
      type: DataTypes.UUID,
      allowNull: false,
    },
  }, {
    sequelize,
    modelName: 'Channel',
    tableName: 'Channels',
  });

  return Channel;
};
