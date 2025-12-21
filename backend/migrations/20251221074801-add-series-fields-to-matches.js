'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Add series_id foreign key
    await queryInterface.addColumn('matches', 'series_id', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: {
        model: 'series',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    });

    // Add series_match_number
    await queryInterface.addColumn('matches', 'series_match_number', {
      type: Sequelize.INTEGER,
      allowNull: true,
      comment: '1, 2, or 3 for Best of Three matches'
    });

    // Add indexes
    await queryInterface.addIndex('matches', ['series_id']);
    await queryInterface.addIndex('matches', ['series_match_number']);
  },

  async down(queryInterface, Sequelize) {
    // Remove columns
    await queryInterface.removeColumn('matches', 'series_id');
    await queryInterface.removeColumn('matches', 'series_match_number');
  }
};