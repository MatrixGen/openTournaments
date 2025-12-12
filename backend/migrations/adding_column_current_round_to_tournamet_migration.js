'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // 1. Add column as NULL allowed (to avoid breaking existing rows)
    await queryInterface.addColumn('tournaments', 'current_round', {
      type: Sequelize.INTEGER,
      allowNull: true,
      defaultValue: 1,
      after: 'chat_channel_id' // Optional: position the column if desired
    });

    // 2. Update existing rows to ensure no NULL values are present
    // This is crucial before setting the column to NOT NULL
    await queryInterface.sequelize.query(`
      UPDATE tournaments SET current_round = 1 WHERE current_round IS NULL;
    `);

    // 3. Change to NOT NULL
    await queryInterface.changeColumn('tournaments', 'current_round', {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 1
    });
  },

  async down(queryInterface, Sequelize) {
    // Simply remove the column in the down migration
    await queryInterface.removeColumn('tournaments', 'current_round');
  }
};