'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Tournament extends Model {
    static associate(models) {
      Tournament.belongsTo(models.Game, { foreignKey: 'game_id', as: 'game' });
      Tournament.belongsTo(models.Platform, { foreignKey: 'platform_id', as: 'platform' });
      Tournament.belongsTo(models.GameMode, { foreignKey: 'game_mode_id', as: 'game_mode' });
      Tournament.belongsTo(models.User, { foreignKey: 'created_by', as: 'creator' });
      Tournament.hasMany(models.TournamentPrize, { foreignKey: 'tournament_id', as: 'prizes' });
      Tournament.hasMany(models.TournamentParticipant, { foreignKey: 'tournament_id', as: 'participants' });
      Tournament.hasMany(models.Match, { foreignKey: 'tournament_id', as: 'matches' });
    }
  }

  Tournament.init({
    name: {
      type: DataTypes.STRING(255),
      allowNull: false,
      validate: { notEmpty: true, len: [1, 255] }
    },
    game_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'games', key: 'id' }
    },
    platform_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'platforms', key: 'id' }
    },
    game_mode_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'game_modes', key: 'id' }
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    banner_url: {
      type: DataTypes.STRING(500),
      allowNull: true
    },
    registration_ends_at: {
      type: DataTypes.DATE,
      allowNull: true
    },
    checkin_starts_at: {
      type: DataTypes.DATE,
      allowNull: true
    },
    checkin_ends_at: {
      type: DataTypes.DATE,
      allowNull: true
    },
    end_time: {
      type: DataTypes.DATE,
      allowNull: true
    },
    stream_url: {
      type: DataTypes.STRING(500),
      allowNull: true
    },
    discord_url: {
      type: DataTypes.STRING(500),
      allowNull: true
    },
    is_featured: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    min_skill_level: {
      type: DataTypes.INTEGER,
      defaultValue: 1,
      validate: { min: 1, max: 10 }
    },
    max_skill_level: {
      type: DataTypes.INTEGER,
      defaultValue: 10,
      validate: { min: 1, max: 10 }
    },
    requires_verification: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    format: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: 'single_elimination'
    },
    entry_fee: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      validate: { min: 0 }
    },
    currency: {
      type: DataTypes.STRING(3),
      allowNull: true
    },
    total_slots: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: { min: 2 }
    },
    current_slots: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      validate: { min: 0 }
    },
    status: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: 'open'
    },
    visibility: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: 'public'
    },
    rules: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    created_by: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'users', key: 'id' }
    },
    start_time: {
      type: DataTypes.DATE,
      allowNull: true
    },
    chat_channel_id: {
      type: DataTypes.STRING(100),
      allowNull: true,
      defaultValue: null,
      comment: 'External chat channel ID (from Chat API)'
    },
    current_round: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
      validate: { min: 1 }
    },
    // In the model, replace the VIRTUAL field with:
    prize_pool: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0,
      validate: { min: 0 }
    }
  }, {
    sequelize,
    modelName: 'Tournament',
    tableName: 'tournaments',
    underscored: true,
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    hooks: {
      beforeCreate: (tournament) => {
        if (!tournament.prize_pool && tournament.entry_fee && tournament.total_slots) {
          tournament.prize_pool = tournament.entry_fee * tournament.total_slots;
        }
      },
      beforeUpdate: (tournament) => {
        if (tournament.changed('entry_fee') || tournament.changed('total_slots')) {
          tournament.prize_pool = tournament.entry_fee * tournament.total_slots;
        }
      }
    },
    indexes: [
      { fields: ['game_id'] },
      { fields: ['platform_id'] },
      { fields: ['game_mode_id'] },
      { fields: ['status'] },
      { fields: ['created_by'] }
    ]
  });

  return Tournament;
};
