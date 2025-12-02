'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('tournament_prizes', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      tournament_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'tournaments',
          key: 'id'
        },
        onDelete: 'CASCADE'
      },
      position: {
        type: Sequelize.INTEGER,
        allowNull: false
      },
      percentage: {
        type: Sequelize.DECIMAL(5,2),
        allowNull: false
      }
    });

    // Add indexes
    await queryInterface.addIndex('tournament_prizes', ['tournament_id', 'position'], { unique: true, name: 'unique_prize' });
    await queryInterface.addIndex('tournament_prizes', ['tournament_id'], { name: 'idx_prizes_tournament_id' });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeIndex('tournament_prizes', 'unique_prize');
    await queryInterface.removeIndex('tournament_prizes', 'idx_prizes_tournament_id');
    await queryInterface.dropTable('tournament_prizes');
  }
};
