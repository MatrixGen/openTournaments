const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class ReadReceipt extends Model {
    static associate(models) {
      ReadReceipt.belongsTo(models.Message, { foreignKey: 'messageId', as: 'message' });
      ReadReceipt.belongsTo(models.User, { foreignKey: 'userId', as: 'user' });
    }
  }

  ReadReceipt.init({
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
      defaultValue: DataTypes.NOW,
    },
  }, {
    sequelize,
    modelName: 'ReadReceipt',
    tableName: 'ReadReceipts',
    indexes: [
      {
        unique: true,
        fields: ['messageId', 'userId']
      }
    ]
  });

  return ReadReceipt;
};