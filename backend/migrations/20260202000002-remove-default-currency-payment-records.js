'use strict';

module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(
      'ALTER TABLE payment_records ALTER COLUMN currency DROP DEFAULT;'
    );
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(
      "ALTER TABLE payment_records ALTER COLUMN currency SET DEFAULT 'TZS';"
    );
  }
};
