const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class UserViolation extends Model {
    static associate(models) {
      UserViolation.belongsTo(models.User, { foreignKey: 'userId', as: 'user' });
    }
  }

  UserViolation.init({
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    type: {
      type: DataTypes.ENUM(
        'profanity',
        'spam',
        'harassment',
        'suspicious_content',
        'excessive_caps'
      ),
      allowNull: false,
    },
    severity: {
      type: DataTypes.ENUM('low', 'medium', 'high'),
      defaultValue: 'low',
    },
    messageContent: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    automated: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    resolved: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
  }, {
    sequelize,
    modelName: 'UserViolation',
    tableName: 'UserViolations',
    indexes: [
      {
        fields: ['userId', 'createdAt']
      },
      {
        fields: ['type']
      }
    ]
  });

  return UserViolation;
};