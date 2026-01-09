'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class GameRule extends Model {
    static associate(models) {
      // Each GameRule belongs to a Game
      GameRule.belongsTo(models.Game, {
        foreignKey: 'game_id',
        as: 'game'
      });
    }
  }

  GameRule.init({
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    game_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'games',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE'
    },
    title: {
      type: DataTypes.STRING(255),
      allowNull: false,
      validate: {
        notEmpty: true,
        len: [1, 255]
      }
    },
    content: {
      type: DataTypes.TEXT,
      allowNull: false,
      validate: {
        notEmpty: true
      }
    },
    type: {
      type: DataTypes.ENUM('general', 'tournament', 'gameplay', 'scoring', 'other'),
      allowNull: false,
      defaultValue: 'general'
    },
    version: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: '1.0.0'
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    },
    effective_from: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    },
    effective_to: {
      type: DataTypes.DATE,
      allowNull: true
    },
    priority: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      validate: {
        min: 0
      }
    }
  }, {
    sequelize,
    modelName: 'GameRule',
    tableName: 'game_rules',
    underscored: true,
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      {
        name: 'game_rules_game_id_index',
        fields: ['game_id']
      },
      {
        name: 'game_rules_type_index',
        fields: ['type']
      },
      {
        name: 'game_rules_is_active_index',
        fields: ['is_active']
      },
      {
        name: 'game_rules_effective_from_to_index',
        fields: ['effective_from', 'effective_to']
      }
    ]
  });

  return GameRule;
};