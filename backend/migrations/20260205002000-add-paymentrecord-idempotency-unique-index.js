'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const dialect = queryInterface.sequelize.getDialect();
    if (dialect !== 'postgres') {
      return;
    }

    await queryInterface.addIndex('payment_records', [
      'user_id',
      Sequelize.literal("(metadata->>'idempotency_key')")
    ], {
      unique: true,
      name: 'payment_records_user_id_idempotency_key_uq'
    });
  },

  async down(queryInterface, Sequelize) {
    const dialect = queryInterface.sequelize.getDialect();
    if (dialect !== 'postgres') {
      return;
    }

    await queryInterface.removeIndex(
      'payment_records',
      'payment_records_user_id_idempotency_key_uq'
    );
  }
};
