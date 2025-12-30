module.exports = (sequelize, DataTypes) => {
  const Reaction = sequelize.define('Reaction', {
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
    emoji: {
      type: DataTypes.STRING(50),
      allowNull: false,
    },
  }, {
    tableName: 'Reactions',
    indexes: [
      {
        fields: ['messageId']
      },
      {
        fields: ['userId']
      },
      {
        fields: ['emoji']
      }
    ]
  });

  Reaction.associate = (models) => {
    Reaction.belongsTo(models.Message, { foreignKey: 'messageId', as: 'message' });
    Reaction.belongsTo(models.User, { foreignKey: 'userId', as: 'user' });
  };

  return Reaction;
};