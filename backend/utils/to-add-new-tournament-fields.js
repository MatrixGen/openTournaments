'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await Promise.all([
      queryInterface.addColumn('tournaments', 'description', {
        type: Sequelize.TEXT,
        allowNull: true
      }),
      queryInterface.addColumn('tournaments', 'banner_url', {
        type: Sequelize.STRING(500),
        allowNull: true
      }),
      queryInterface.addColumn('tournaments', 'registration_ends_at', {
        type: Sequelize.DATE,
        allowNull: true
      }),
      queryInterface.addColumn('tournaments', 'checkin_starts_at', {
        type: Sequelize.DATE,
        allowNull: true
      }),
      queryInterface.addColumn('tournaments', 'checkin_ends_at', {
        type: Sequelize.DATE,
        allowNull: true
      }),
      queryInterface.addColumn('tournaments', 'end_time', {
        type: Sequelize.DATE,
        allowNull: true
      }),
      queryInterface.addColumn('tournaments', 'stream_url', {
        type: Sequelize.STRING(500),
        allowNull: true
      }),
      queryInterface.addColumn('tournaments', 'discord_url', {
        type: Sequelize.STRING(500),
        allowNull: true
      }),
      queryInterface.addColumn('tournaments', 'is_featured', {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false
      }),
      queryInterface.addColumn('tournaments', 'min_skill_level', {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 1
      }),
      queryInterface.addColumn('tournaments', 'max_skill_level', {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 10
      }),
      queryInterface.addColumn('tournaments', 'requires_verification', {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false
      })
    ]);
  },

  async down(queryInterface, Sequelize) {
    await Promise.all([
      queryInterface.removeColumn('tournaments', 'description'),
      queryInterface.removeColumn('tournaments', 'banner_url'),
      queryInterface.removeColumn('tournaments', 'registration_ends_at'),
      queryInterface.removeColumn('tournaments', 'checkin_starts_at'),
      queryInterface.removeColumn('tournaments', 'checkin_ends_at'),
      queryInterface.removeColumn('tournaments', 'end_time'),
      queryInterface.removeColumn('tournaments', 'stream_url'),
      queryInterface.removeColumn('tournaments', 'discord_url'),
      queryInterface.removeColumn('tournaments', 'is_featured'),
      queryInterface.removeColumn('tournaments', 'min_skill_level'),
      queryInterface.removeColumn('tournaments', 'max_skill_level'),
      queryInterface.removeColumn('tournaments', 'requires_verification')
    ]);
  }
};
