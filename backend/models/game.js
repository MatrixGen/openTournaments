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
    game_intent: {
      type: DataTypes.STRING(255),
      allowNull: true,
      unique: true,
      validate: {
        len: [1, 255]
      }
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    banner_url: {
      type: DataTypes.STRING(512),
      allowNull: true,
      validate: {
        isUrl: true
      }
    },
    cover_url: {
      type: DataTypes.STRING(512),
      allowNull: true,
      validate: {
        isUrl: true
      }
    },
    promo_video_url: {
      type: DataTypes.STRING(512),
      allowNull: true,
      validate: {
        isUrl: true
      }
    },
    is_featured: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    sort_order: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    slug: {
      type: DataTypes.STRING(120),
      allowNull: true,
      unique: true
    },
    theme_color: {
      type: DataTypes.STRING(16),
      allowNull: true
    },
    metadata: {
      type: DataTypes.JSONB,
      allowNull: true
    },
    android_store_url: {
      type: DataTypes.STRING(512),
      allowNull: true,
      validate: {
        isUrl: true
      }
    },
    ios_store_url: {
      type: DataTypes.STRING(512),
      allowNull: true,
      validate: {
        isUrl: true
      }
    },
    supports_android: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    },
    supports_ios: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
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
