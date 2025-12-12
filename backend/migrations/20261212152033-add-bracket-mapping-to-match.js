'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Add next_match_id
    await queryInterface.addColumn('matches', 'next_match_id', {
      type: Sequelize.INTEGER,
      allowNull: true,
      comment: 'ID of the match the winner advances to',
    });

    // Add next_match_slot
    await queryInterface.addColumn('matches', 'next_match_slot', {
      type: Sequelize.STRING(20),
      allowNull: true,
      comment: 'The slot (p1 or p2) the winner fills in the next match',
    });

    // Add loser_next_match_id
    await queryInterface.addColumn('matches', 'loser_next_match_id', {
      type: Sequelize.INTEGER,
      allowNull: true,
      comment: 'ID of the match the loser advances to (if in winners bracket)',
    });

    // Add loser_next_match_slot
    await queryInterface.addColumn('matches', 'loser_next_match_slot', {
      type: Sequelize.STRING(20),
      allowNull: true,
      comment: 'The slot (p1 or p2) the loser fills in the next match',
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('matches', 'next_match_id');
    await queryInterface.removeColumn('matches', 'next_match_slot');
    await queryInterface.removeColumn('matches', 'loser_next_match_id');
    await queryInterface.removeColumn('matches', 'loser_next_match_slot');
  }
};
