module.exports = (sequelize, DataTypes) => {
  const Message = sequelize.define('Message', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    content: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    type: {
      type: DataTypes.ENUM('text', 'image', 'video', 'file', 'audio', 'system'),
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
    mediaUrl: {
      type: DataTypes.STRING(500),
      allowNull: true,
    },
    mediaMetadata: {
      type: DataTypes.JSON,
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
    isDeleted: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    deletedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    deletedBy: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    isModerated: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    moderationFlags: {
      type: DataTypes.JSON,
      allowNull: true,
    },
  }, {
    tableName: 'Messages',
    indexes: [
      {
        fields: ['channelId', 'createdAt']
      },
      {
        fields: ['userId']
      },
      {
        fields: ['isDeleted']
      }
    ],
    hooks: {
      beforeUpdate: (message) => {
        if (message.changed('content')) {
          message.isEdited = true;
          message.editedAt = new Date();
        }
      }
    }
  });

  Message.associate = (models) => {
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
    
    // Message can have reactions
    Message.hasMany(models.Reaction, { foreignKey: 'messageId', as: 'reactions' });
    
    // Message can have reports
    Message.hasMany(models.Report, { foreignKey: 'messageId', as: 'reports' });
    
    // Message can be deleted by a user
    Message.belongsTo(models.User, { foreignKey: 'deletedBy', as: 'deleter' });
  };

  return Message;
};