'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const gameModes = [
      // eFootball Modes
      { game_id: 1, name: 'Quick Match', status: 'active' },
      { game_id: 1, name: 'Online Quick Match', status: 'active' },
      // DLS Modes
      { game_id: 2, name: 'Online Match', status: 'active' },
      // FC Mobile Modes
      { game_id: 3, name: 'Head-to-Head', status: 'active' },
      { game_id: 3, name: 'VS Attack', status: 'active' },
    ];

    for (const mode of gameModes) {
      await queryInterface.sequelize.query(
        `INSERT INTO game_modes (game_id, name, status, created_at, updated_at)
         VALUES (:game_id, :name, :status, NOW(), NOW())
         ON CONFLICT (game_id, name) DO NOTHING`,
        { replacements: mode }
      );
    }
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('game_modes', null, {});
  }
};
