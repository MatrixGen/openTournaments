'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
      try {

    await queryInterface.createTable('platform.game_modes', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      game_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'games', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      name: {
        type: Sequelize.STRING(255),
        allowNull: false
      },
      status: {
        type: Sequelize.STRING, // ENUM replaced with STRING
        allowNull: false,
        defaultValue: 'active'
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
      },
    });

    await queryInterface.addConstraint('game_modes', {
      fields: ['game_id', 'name'],
      type: 'unique',
      name: 'unique_game_mode_per_game'
    });
  
      } catch (error) {
      console.error('⚠️ Migration up failed in 20251001000004-create-game-mode.js:', error.message);
      // do not throw to avoid hard failure during deploy
    }
},
  async down(queryInterface, Sequelize) {
      try {

    await queryInterface.dropTable('platform.game_modes');
  
      } catch (error) {
      console.error('⚠️ Migration down failed in 20251001000004-create-game-mode.js:', error.message);
      // do not throw to avoid hard failure during deploy
    }
}
};
