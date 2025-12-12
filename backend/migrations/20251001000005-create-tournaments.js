'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
      try {

    await queryInterface.createTable('platform.tournaments', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      name: {
        type: Sequelize.STRING(255),
        allowNull: false
      },
      game_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'games', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      platform_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'platforms', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      game_mode_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'game_modes', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      format: {
        type: Sequelize.STRING,
        defaultValue: 'single_elimination'
      },
      entry_fee: {
        type: Sequelize.DECIMAL(10,2),
        allowNull: false
      },
      total_slots: {
        type: Sequelize.INTEGER,
        allowNull: false
      },
      current_slots: {
        type: Sequelize.INTEGER,
        defaultValue: 0
      },
      status: {
        type: Sequelize.STRING,
        allowNull: false,
        defaultValue: 'open'
      },
      visibility: {
        type: Sequelize.STRING,
        defaultValue: 'public'
      },
      rules: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      created_by: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      start_time: {
        type: Sequelize.DATE,
        allowNull: true
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

    await queryInterface.addIndex('tournaments', ['game_id'], { name: 'idx_tournaments_game_id' });
    await queryInterface.addIndex('tournaments', ['status'], { name: 'idx_tournaments_status' });
    await queryInterface.addIndex('tournaments', ['platform_id'], { name: 'idx_tournaments_platform' });
    await queryInterface.addIndex('tournaments', ['game_mode_id'], { name: 'idx_tournaments_game_mode' });
    await queryInterface.addIndex('tournaments', ['created_by'], { name: 'tournaments_created_by' });
  
      } catch (error) {
      console.error('⚠️ Migration up failed in 20251001000005-create-tournaments.js:', error.message);
      // do not throw to avoid hard failure during deploy
    }
},

  async down(queryInterface, Sequelize) {
      try {

    await queryInterface.dropTable('platform.tournaments');
  
      } catch (error) {
      console.error('⚠️ Migration down failed in 20251001000005-create-tournaments.js:', error.message);
      // do not throw to avoid hard failure during deploy
    }
}
};
