'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.bulkInsert('games', [
      { name: 'eFootball 2024', status: 'active', created_at: new Date(), updated_at: new Date() },
      { name: 'Dream League Soccer 2024', status: 'active', created_at: new Date(), updated_at: new Date() },
      { name: 'EA Sports FC Mobile', status: 'active', created_at: new Date(), updated_at: new Date() },
    ], {});
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.bulkDelete('games', null, {});
  }
};