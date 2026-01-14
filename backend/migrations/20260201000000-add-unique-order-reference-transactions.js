'use strict';

module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(
      'CREATE UNIQUE INDEX IF NOT EXISTS transactions_order_reference_unique ON transactions (order_reference) WHERE order_reference IS NOT NULL;'
    );
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(
      'DROP INDEX IF EXISTS transactions_order_reference_unique;'
    );
  }
};
