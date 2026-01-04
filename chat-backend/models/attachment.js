module.exports = (sequelize, DataTypes) => {
  const Attachment = sequelize.define('Attachment', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    messageId: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    url: {
      type: DataTypes.STRING(500),
      allowNull: false,
    },
    thumbnailUrl: {
      type: DataTypes.STRING(500),
      allowNull: true,
    },
    type: {
      type: DataTypes.ENUM('image', 'video', 'audio', 'file'),
      allowNull: false,
    },
    fileName: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    fileSize: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    mimeType: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    storagePath: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Absolute server path for file cleanup'
    },
    metadata: {
      type: DataTypes.JSON,
      allowNull: true,
    },
  }, {
    tableName: 'Attachments',
    indexes: [
      {
        fields: ['messageId']
      },
      {
        fields: ['type']
      }
    ]
  });

  Attachment.associate = (models) => {
    Attachment.belongsTo(models.Message, { foreignKey: 'messageId', as: 'message' });
  };

  return Attachment;
};