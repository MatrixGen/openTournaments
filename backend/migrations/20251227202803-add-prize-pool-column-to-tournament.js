'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('tournaments', 'prize_pool', {
      type: Sequelize.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0,
      comment: 'Calculated as entry_fee * total_slots'
    });

    // Update existing records with calculated prize_pool
    await queryInterface.sequelize.query(`
      UPDATE tournaments 
      SET prize_pool = entry_fee * total_slots
      WHERE prize_pool = 0 OR prize_pool IS NULL
    `);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('tournaments', 'prize_pool');
  }
};