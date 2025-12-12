const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class ChannelMember extends Model {
    static associate(models) {
      ChannelMember.belongsTo(models.Channel, { foreignKey: 'channelId', as: 'channel' });
      ChannelMember.belongsTo(models.User, { foreignKey: 'userId', as: 'user' });
    }
  }

  ChannelMember.init({
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    channelId: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    role: {
      type: DataTypes.ENUM('admin', 'moderator', 'member'),
      defaultValue: 'member',
    },
    joinedAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
    lastReadAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  }, {
    sequelize,
    modelName: 'ChannelMember',
    tableName: 'ChannelMembers',
    indexes: [
      {
        unique: true,
        fields: ['channelId', 'userId'], // enforce uniqueness
      }
    ]
  });

  return ChannelMember;
};
