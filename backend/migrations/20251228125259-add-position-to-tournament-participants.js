// migrations/YYYYMMDDHHMMSS-add-position-to-tournament-participants.js
'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Check if column exists first
    const tableInfo = await queryInterface.describeTable('tournament_participants');
    
    if (!tableInfo.position) {
      await queryInterface.addColumn('tournament_participants', 'position', {
        type: Sequelize.INTEGER,
        allowNull: true,
        comment: 'Final position in the tournament',
      });
    }

    // Add index for faster queries on position
    await queryInterface.addIndex('tournament_participants', ['position']);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('tournament_participants', 'position');
    await queryInterface.removeIndex('tournament_participants', ['position']);
  },
};