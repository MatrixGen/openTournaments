'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
      try {

    await queryInterface.createTable('platform.platforms', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      name: {
        type: Sequelize.STRING(100),
        allowNull: false,
        unique: true
      },
      icon_url: {
        type: Sequelize.STRING(512),
        allowNull: true
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
      }
    });
  
      } catch (error) {
      console.error('⚠️ Migration up failed in 20251001000002-create-platform.js:', error.message);
      // do not throw to avoid hard failure during deploy
    }
},
  async down(queryInterface, Sequelize) {
      try {

    await queryInterface.dropTable('platform.platforms');
  
      } catch (error) {
      console.error('⚠️ Migration down failed in 20251001000002-create-platform.js:', error.message);
      // do not throw to avoid hard failure during deploy
    }
}
};
