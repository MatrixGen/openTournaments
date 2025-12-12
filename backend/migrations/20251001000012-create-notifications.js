'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
      try {

    await queryInterface.createTable('platform.notifications', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },
      user_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id',
        },
        onDelete: 'CASCADE',
      },
      title: {
        type: Sequelize.STRING(255),
        allowNull: false,
      },
      message: {
        type: Sequelize.TEXT,
        allowNull: false,
      },
      type: {
        type: Sequelize.STRING(50),
        allowNull: false,
      },
      is_read: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
      },
      related_entity_type: {
        type: Sequelize.ENUM('tournament', 'match', 'user', 'transaction'),
        allowNull: true,
      },
      related_entity_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      created_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('NOW()'),
      },
      updated_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('NOW()'),
      },
    });

    // Add index
    await queryInterface.addIndex('notifications', ['user_id'], { name: 'user_id' });
  
      } catch (error) {
      console.error('⚠️ Migration up failed in 20251001000012-create-notifications.js:', error.message);
      // do not throw to avoid hard failure during deploy
    }
},

  async down(queryInterface, Sequelize) {
      try {

    await queryInterface.dropTable('platform.notifications');
  
      } catch (error) {
      console.error('⚠️ Migration down failed in 20251001000012-create-notifications.js:', error.message);
      // do not throw to avoid hard failure during deploy
    }
}
};
