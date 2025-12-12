const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Report extends Model {
    static associate(models) {
      Report.belongsTo(models.Message, { foreignKey: 'messageId', as: 'message' });
      Report.belongsTo(models.User, { foreignKey: 'reporterId', as: 'reporter' });
      Report.belongsTo(models.User, { foreignKey: 'reportedUserId', as: 'reportedUser' });
    }
  }

  Report.init({
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    messageId: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    reporterId: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    reportedUserId: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    reason: {
      type: DataTypes.ENUM(
        'spam',
        'harassment',
        'inappropriate_content',
        'hate_speech',
        'other'
      ),
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    status: {
      type: DataTypes.ENUM('pending', 'reviewed', 'resolved', 'dismissed'),
      defaultValue: 'pending',
    },
    moderatorNotes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    resolvedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    resolvedBy: {
      type: DataTypes.UUID,
      allowNull: true,
    },
  }, {
    sequelize,
    modelName: 'Report',
    tableName: 'Reports',
    indexes: [
      {
        fields: ['messageId', 'reporterId'],
        unique: true
      },
      {
        fields: ['status']
      },
      {
        fields: ['reportedUserId']
      }
    ]
  });

  return Report;
};