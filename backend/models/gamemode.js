'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class GameMode extends Model {
    static associate(models) {
       GameMode.belongsTo(models.Game, { foreignKey: 'game_id', as: 'game' });
      // define association later (belongsTo Game)
    }
  }

  GameMode.init({
    game_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false
    },
    status: {
      type: DataTypes.ENUM('active', 'inactive'),
      defaultValue: 'active'
    }
  }, {
    sequelize,
    modelName: 'GameMode',
    tableName: 'game_modes',
    underscored: true,
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  });

  return GameMode;
};
