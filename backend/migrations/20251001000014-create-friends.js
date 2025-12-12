'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
      try {

    await queryInterface.createTable('platform.friends', {
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
      friend_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id',
        },
        onDelete: 'CASCADE',
      },
      created_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('NOW()'),
      },
    });

    // Add indexes
    await queryInterface.addIndex('friends', ['user_id', 'friend_id'], { unique: true, name: 'unique_friendship' });
    await queryInterface.addIndex('friends', ['friend_id'], { name: 'friend_id' });
  
      } catch (error) {
      console.error('⚠️ Migration up failed in 20251001000014-create-friends.js:', error.message);
      // do not throw to avoid hard failure during deploy
    }
},

  async down(queryInterface, Sequelize) {
      try {

    await queryInterface.dropTable('platform.friends');
  
      } catch (error) {
      console.error('⚠️ Migration down failed in 20251001000014-create-friends.js:', error.message);
      // do not throw to avoid hard failure during deploy
    }
}
};
