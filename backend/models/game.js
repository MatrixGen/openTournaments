'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Game extends Model {
    static associate(models) {
      Game.hasMany(models.Tournament, {
        foreignKey: 'game_id',
        as: 'tournaments'
      });
      
      Game.hasMany(models.GameMode, {
        foreignKey: 'game_id',
        as: 'game_modes'
      });
      
      // New association for GameRule
      Game.hasMany(models.GameRule, {
        foreignKey: 'game_id',
        as: 'game_rules'
      });
    }
  }

  Game.init({
    name: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: true,
      validate: {
        notEmpty: true,
        len: [1, 255]
      }
    },
    logo_url: {
      type: DataTypes.STRING(512),
      allowNull: true,
      validate: {
        isUrl: true
      }
    },
    status: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: 'active',
      validate: {
        isIn: [['active', 'inactive', 'maintenance']]
      }
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    }
  }, {
    sequelize,
    modelName: 'Game',
    tableName: 'games',
    underscored: true,
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  });

  return Game;
};