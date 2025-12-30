module.exports = (sequelize, DataTypes) => {
  const ReadReceipt = sequelize.define('ReadReceipt', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    messageId: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    readAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  }, {
    tableName: 'ReadReceipts',
    indexes: [
      {
        fields: ['messageId']
      },
      {
        fields: ['userId']
      }
    ]
  });

  ReadReceipt.associate = (models) => {
    ReadReceipt.belongsTo(models.Message, { foreignKey: 'messageId', as: 'message' });
    ReadReceipt.belongsTo(models.User, { foreignKey: 'userId', as: 'user' });
  };

  return ReadReceipt;
};