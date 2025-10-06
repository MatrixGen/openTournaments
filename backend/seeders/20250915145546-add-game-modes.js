'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    // Assuming eFootball gets ID 1, DLS gets 2, FC Mobile gets 3
    await queryInterface.bulkInsert('game_modes', [
      // eFootball Modes
      { game_id: 1, name: 'Quick Match', status: 'active', createdAt: new Date(), updatedAt: new Date() },
      { game_id: 1, name: 'Online Quick Match', status: 'active', createdAt: new Date(), updatedAt: new Date() },
      // DLS Modes
      { game_id: 2, name: 'Online Match', status: 'active', createdAt: new Date(), updatedAt: new Date() },
      // FC Mobile Modes
      { game_id: 3, name: 'Head-to-Head', status: 'active', createdAt: new Date(), updatedAt: new Date() },
      { game_id: 3, name: 'VS Attack', status: 'active', createdAt: new Date(), updatedAt: new Date() },
    ], {});
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.bulkDelete('game_modes', null, {});
  }
};