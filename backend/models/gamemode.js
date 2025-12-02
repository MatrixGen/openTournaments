'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class GameMode extends Model {
    static associate(models) {
      GameMode.belongsTo(models.Game, { foreignKey: 'game_id', as: 'game' });
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
      type: DataTypes.STRING,  // ENUM removed for PostgreSQL
      allowNull: false,
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
