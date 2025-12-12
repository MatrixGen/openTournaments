const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Message extends Model {
    static associate(models) {
      // Message belongs to a channel
      Message.belongsTo(models.Channel, { foreignKey: 'channelId', as: 'channel' });
      
      // Message belongs to a user (sender)
      Message.belongsTo(models.User, { foreignKey: 'userId', as: 'user' });
      
      // Message can be a reply to another message
      Message.belongsTo(models.Message, { foreignKey: 'replyTo', as: 'parentMessage' });
      
      // Message can have many read receipts
      Message.hasMany(models.ReadReceipt, { foreignKey: 'messageId', as: 'readReceipts' });
      
      // Message can have attachments
      Message.hasMany(models.Attachment, { foreignKey: 'messageId', as: 'attachments' });
    }
  }

  Message.init({
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    content: {
      type: DataTypes.TEXT,
      allowNull: false,
      validate: {
        notEmpty: true,
      },
    },
    type: {
      type: DataTypes.ENUM('text', 'image', 'file', 'system'),
      defaultValue: 'text',
    },
    channelId: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    replyTo: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    isEdited: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    editedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  }, {
    sequelize,
    modelName: 'Message',
    tableName: 'Messages',
    indexes: [
      {
        fields: ['channelId', 'createdAt']
      }
    ]
  });

  return Message;
};