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
      type: DataTypes.ENUM('direct', 'group', 'channel'),
      defaultValue: 'direct',
    },
    isPrivate: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
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