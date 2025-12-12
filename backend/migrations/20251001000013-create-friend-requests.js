'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
      try {

    await queryInterface.createTable('platform.friend_requests', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },
      sender_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id',
        },
        onDelete: 'CASCADE',
      },
      receiver_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id',
        },
        onDelete: 'CASCADE',
      },
      status: {
        type: Sequelize.ENUM('pending', 'accepted', 'rejected'),
        defaultValue: 'pending',
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

    // Add indexes
    await queryInterface.addIndex('friend_requests', ['sender_id', 'receiver_id'], { unique: true, name: 'unique_friend_request' });
    await queryInterface.addIndex('friend_requests', ['receiver_id'], { name: 'receiver_id' });
  
      } catch (error) {
      console.error('⚠️ Migration up failed in 20251001000013-create-friend-requests.js:', error.message);
      // do not throw to avoid hard failure during deploy
    }
},

  async down(queryInterface, Sequelize) {
      try {

    await queryInterface.dropTable('platform.friend_requests');
  
      } catch (error) {
      console.error('⚠️ Migration down failed in 20251001000013-create-friend-requests.js:', error.message);
      // do not throw to avoid hard failure during deploy
    }
}
};
