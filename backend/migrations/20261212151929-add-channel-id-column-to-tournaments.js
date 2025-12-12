'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    try {
      // Use platform.tournaments with schema prefix
      const tableInfo = await queryInterface.describeTable('platform.tournaments');

      // Only add column if it doesn't already exist
      if (!tableInfo.chat_channel_id) {
        await queryInterface.addColumn('platform.tournaments', 'chat_channel_id', {
          type: Sequelize.STRING(100),
          allowNull: true,
          comment: 'External chat system channel ID'
        });
        console.log('✅ Column chat_channel_id added successfully to platform.tournaments.');
      } else {
        console.log('⚠️ Column chat_channel_id already exists in platform.tournaments, skipping.');
      }
    } catch (error) {
      console.error('⚠️ Failed to add chat_channel_id column to platform.tournaments:', error.message);
      // Do not throw to prevent crash during deploy
    }
  },

  async down(queryInterface, Sequelize) {
    try {
      // Use platform.tournaments with schema prefix
      const tableInfo = await queryInterface.describeTable('platform.tournaments');
      if (tableInfo.chat_channel_id) {
        await queryInterface.removeColumn('platform.tournaments', 'chat_channel_id');
        console.log('🗑️ Column chat_channel_id removed from platform.tournaments.');
      }
    } catch (error) {
      console.error('⚠️ Failed to remove chat_channel_id column from platform.tournaments:', error.message);
    }
  }
};

