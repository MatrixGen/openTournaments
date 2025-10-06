'use strict';

const TABLES = [
  'users',
  'platforms',
  'games',
  'game_modes',
  'matches',
  'tournaments',
  'tournament_participants',
  'tournament_prizes',
  'transactions',
  'payment_methods',
  'payment_records',
  'notifications',
  'friend_requests',
  'friends',
  'disputes',
  'webhook_logs'
];

module.exports = {
  async up(queryInterface, Sequelize) {
    for (const table of TABLES) {
      const columns = await queryInterface.describeTable(table);

      if (!columns.createdAt) {
        await queryInterface.addColumn(table, 'createdAt', {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
        });
      }

      if (!columns.updatedAt) {
        await queryInterface.addColumn(table, 'updatedAt', {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
          onUpdate: Sequelize.literal('CURRENT_TIMESTAMP')
        });
      }
    }
  },

  async down(queryInterface, Sequelize) {
    for (const table of TABLES) {
      const columns = await queryInterface.describeTable(table);

      if (columns.createdAt) {
        await queryInterface.removeColumn(table, 'createdAt');
      }

      if (columns.updatedAt) {
        await queryInterface.removeColumn(table, 'updatedAt');
      }
    }
  }
};
