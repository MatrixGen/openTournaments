'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    try {
      const tableInfo = await queryInterface.describeTable('tournaments');

      // Only add column if it doesn't already exist
      if (!tableInfo.chat_channel_id) {
        await queryInterface.addColumn('tournaments', 'chat_channel_id', {
          type: Sequelize.STRING(100),
          allowNull: true,
          comment: 'External chat system channel ID'
        });
        console.log('✅ Column chat_channel_id added successfully.');
      } else {
        console.log('⚠️ Column chat_channel_id already exists, skipping.');
      }
    } catch (error) {
      console.error('⚠️ Failed to add chat_channel_id column:', error.message);
      // Do not throw to prevent crash during deploy
    }
  },

  async down(queryInterface, Sequelize) {
    try {
      const tableInfo = await queryInterface.describeTable('tournaments');
      if (tableInfo.chat_channel_id) {
        await queryInterface.removeColumn('tournaments', 'chat_channel_id');
        console.log('🗑️ Column chat_channel_id removed.');
      }
    } catch (error) {
      console.error('⚠️ Failed to remove chat_channel_id column:', error.message);
    }
  }
};
