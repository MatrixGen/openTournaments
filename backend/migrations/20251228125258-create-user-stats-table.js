// migrations/YYYYMMDDHHMMSS-create-user-stats-table.js
'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('user_stats', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      user_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        unique: true,
        references: {
          model: 'users',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      // Overall stats
      matches_played: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      matches_won: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      matches_lost: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      win_rate: {
        type: Sequelize.DECIMAL(5, 2),
        allowNull: false,
        defaultValue: 0,
      },
      // Tournament stats
      tournaments_joined: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      tournaments_won: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      average_position: {
        type: Sequelize.DECIMAL(5, 2),
        allowNull: false,
        defaultValue: 0,
      },
      best_position: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      // Streaks
      current_win_streak: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      best_win_streak: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      activity_streak_days: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      // Rankings
      global_rank: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      regional_rank: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      rank_percentile: {
        type: Sequelize.DECIMAL(5, 2),
        allowNull: true,
      },
      rating: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 1000,
      },
      // Platform leveling
      level: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 1,
      },
      experience_points: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      next_level_xp: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 1000,
      },
      // JSON fields for dynamic data
      game_stats: {
        type: Sequelize.JSONB,
        allowNull: false,
        defaultValue: {},
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
    });

    // Add indexes
    await queryInterface.addIndex('user_stats', ['user_id']);
    await queryInterface.addIndex('user_stats', ['win_rate']);
    await queryInterface.addIndex('user_stats', ['rating']);
    await queryInterface.addIndex('user_stats', ['level']);
    await queryInterface.addIndex('user_stats', ['global_rank']);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('user_stats');
  },
};