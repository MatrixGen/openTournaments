'use strict';
const { Model } = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Tournament extends Model {
    static associate(models) {
      // Define associations here
      Tournament.belongsTo(models.Game, { 
        foreignKey: 'game_id',
        as: 'game'
      });
      
      Tournament.belongsTo(models.Platform, { 
        foreignKey: 'platform_id',
        as: 'platform'
      });
      
      Tournament.belongsTo(models.GameMode, { 
        foreignKey: 'game_mode_id',
        as: 'game_mode'
      });
      
      Tournament.belongsTo(models.User, { 
        foreignKey: 'created_by',
        as: 'creator'
      });
      
      // Association with TournamentPrizes
      Tournament.hasMany(models.TournamentPrize, {
        foreignKey: 'tournament_id',
        as: 'prizes'
      });
      
      // Association with TournamentParticipants
      Tournament.hasMany(models.TournamentParticipant, {
        foreignKey: 'tournament_id',
        as: 'participants'
      });
      
      // Association with Matches
      Tournament.hasMany(models.Match, {
        foreignKey: 'tournament_id',
        as: 'matches'
      });
    }
  }
  Tournament.init({
    name: {
      type: DataTypes.STRING(255),
      allowNull: false,
      validate: {
        notEmpty: true,
        len: [1, 255]
      }
    },
    game_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'games',
        key: 'id'
      }
    },
    platform_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'platforms',
        key: 'id'
      }
    },
    game_mode_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'game_modes',
        key: 'id'
      }
    },
    format: {
      type: DataTypes.ENUM('single_elimination', 'double_elimination', 'round_robin'),
      defaultValue: 'single_elimination'
    },
    entry_fee: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      validate: {
        min: 0
      }
    },
    total_slots: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        min: 2
      }
    },
    current_slots: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      validate: {
        min: 0
      }
    },
    status: {
      type: DataTypes.ENUM('open', 'locked', 'live', 'completed', 'cancelled'),
      defaultValue: 'open'
    },
    visibility: {
      type: DataTypes.ENUM('public', 'private'),
      defaultValue: 'public'
    },
    rules: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    created_by: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    start_time: {
      type: DataTypes.DATE,
      allowNull: true
    }
  }, {
    sequelize,
    modelName: 'Tournament',
    tableName: 'tournaments',
    underscored: true,
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      {
        fields: ['game_id']
      },
      {
        fields: ['platform_id']
      },
      {
        fields: ['game_mode_id']
      },
      {
        fields: ['status']
      },
      {
        fields: ['created_by']
      }
    ]
  });
  return Tournament;
};