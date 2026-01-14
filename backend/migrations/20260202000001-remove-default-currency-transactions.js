'use strict';

module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(
      'ALTER TABLE transactions ALTER COLUMN currency DROP DEFAULT;'
    );
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(
      "ALTER TABLE transactions ALTER COLUMN currency SET DEFAULT 'TZS';"
    );
  }
};
