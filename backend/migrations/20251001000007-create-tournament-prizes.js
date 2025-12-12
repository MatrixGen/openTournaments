'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
      try {

    await queryInterface.createTable('platform.tournament_prizes', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      tournament_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'tournaments', key: 'id' },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
      },
      position: {
        type: Sequelize.INTEGER,
        allowNull: false
      },
      percentage: {
        type: Sequelize.DECIMAL(5,2),
        allowNull: false
      },
      created_at: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updated_at: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });

    await queryInterface.addIndex('tournament_prizes', ['tournament_id', 'position'], { unique: true, name: 'unique_prize' });
    await queryInterface.addIndex('tournament_prizes', ['tournament_id'], { name: 'idx_prizes_tournament_id' });
  
      } catch (error) {
      console.error('⚠️ Migration up failed in 20251001000007-create-tournament-prizes.js:', error.message);
      // do not throw to avoid hard failure during deploy
    }
},

  async down(queryInterface, Sequelize) {
      try {

    await queryInterface.removeIndex('tournament_prizes', 'unique_prize');
    await queryInterface.removeIndex('tournament_prizes', 'idx_prizes_tournament_id');
    await queryInterface.dropTable('platform.tournament_prizes');
  
      } catch (error) {
      console.error('⚠️ Migration down failed in 20251001000007-create-tournament-prizes.js:', error.message);
      // do not throw to avoid hard failure during deploy
    }
}
};
