const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class UserBlock extends Model {
    static associate(models) {
      UserBlock.belongsTo(models.User, { foreignKey: 'userId', as: 'user' });
      UserBlock.belongsTo(models.User, { foreignKey: 'moderatorId', as: 'moderator' });
    }
  }

  UserBlock.init({
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    moderatorId: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    reason: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    blockedUntil: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  }, {
    sequelize,
    modelName: 'UserBlock',
    tableName: 'UserBlocks',
    indexes: [
      {
        fields: ['userId', 'isActive']
      },
      {
        fields: ['blockedUntil']
      }
    ]
  });

  return UserBlock;
};