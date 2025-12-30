// models/userstat.js
'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class UserStat extends Model {
    static associate(models) {
      UserStat.belongsTo(models.User, {
        foreignKey: 'user_id',
        as: 'user'
      });
    }
  }

  UserStat.init({
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      unique: true,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    matches_played: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    matches_won: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    matches_lost: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    win_rate: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: false,
      defaultValue: 0
    },
    tournaments_joined: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    tournaments_won: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    average_position: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: false,
      defaultValue: 0
    },
    best_position: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    current_win_streak: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    best_win_streak: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    activity_streak_days: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    global_rank: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    regional_rank: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    rank_percentile: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: true
    },
    rating: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1000
    },
    level: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1
    },
    experience_points: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    next_level_xp: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1000
    },
    game_stats: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: {}
    }
  }, {
    sequelize,
    modelName: 'UserStat',
    tableName: 'user_stats',
    underscored: true,
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  });

  return UserStat;
};