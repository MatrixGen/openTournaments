// migrations/YYYYMMDDHHMMSS-add-profile-fields-to-users.js
'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Add new columns for profile privacy and settings
    await queryInterface.addColumn('users', 'profile_privacy', {
      type: Sequelize.STRING,
      allowNull: true,
      defaultValue: 'public',
    });

    await queryInterface.addColumn('users', 'bio', {
      type: Sequelize.TEXT,
      allowNull: true,
    });

    await queryInterface.addColumn('users', 'country', {
      type: Sequelize.STRING(100),
      allowNull: true,
    });

    await queryInterface.addColumn('users', 'language', {
      type: Sequelize.STRING(10),
      allowNull: true,
      defaultValue: 'en',
    });

    await queryInterface.addColumn('users', 'display_name', {
      type: Sequelize.STRING(255),
      allowNull: true,
    });

    await queryInterface.addColumn('users', 'is_pro_player', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    });

    await queryInterface.addColumn('users', 'social_links', {
      type: Sequelize.JSONB,
      allowNull: true,
      defaultValue: {},
    });

    await queryInterface.addColumn('users', 'favorite_games', {
      type: Sequelize.JSONB,
      allowNull: true,
      defaultValue: [],
    });

    await queryInterface.addColumn('users', 'last_active_at', {
      type: Sequelize.DATE,
      allowNull: true,
    });

    await queryInterface.addColumn('users', 'current_status', {
      type: Sequelize.STRING,
      allowNull: true,
      defaultValue: 'offline',
    });

    // Add an index for last_active_at for online users queries
    await queryInterface.addIndex('users', ['last_active_at']);
    
    // Add an index for country for location-based queries
    await queryInterface.addIndex('users', ['country']);
  },

  down: async (queryInterface, Sequelize) => {
    // Remove the added columns
    await queryInterface.removeColumn('users', 'profile_privacy');
    await queryInterface.removeColumn('users', 'bio');
    await queryInterface.removeColumn('users', 'country');
    await queryInterface.removeColumn('users', 'language');
    await queryInterface.removeColumn('users', 'display_name');
    await queryInterface.removeColumn('users', 'is_pro_player');
    await queryInterface.removeColumn('users', 'social_links');
    await queryInterface.removeColumn('users', 'favorite_games');
    await queryInterface.removeColumn('users', 'last_active_at');
    await queryInterface.removeColumn('users', 'current_status');
    
    // Remove indexes
    await queryInterface.removeIndex('users', ['last_active_at']);
    await queryInterface.removeIndex('users', ['country']);
  },
};