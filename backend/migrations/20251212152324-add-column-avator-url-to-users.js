'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const SCHEMA_NAME = 'platform'; // Define the schema name

    // Step 1: Add column as NULL allowed
    await queryInterface.addColumn({ tableName: 'users', schema: SCHEMA_NAME }, 'avatar_url', {
      type: Sequelize.STRING(500),
      allowNull: true,
      defaultValue: null
    });

    // Step 2: Update existing rows (Needs raw SQL with explicit schema)
    // NOTE: Raw queries MUST use quotes around schema and table names in PostgreSQL
    await queryInterface.sequelize.query(`
      UPDATE "${SCHEMA_NAME}".users SET avatar_url = '' WHERE avatar_url IS NULL;
    `);

    // Step 3: Change to NOT NULL
    await queryInterface.changeColumn({ tableName: 'users', schema: SCHEMA_NAME }, 'avatar_url', {
      type: Sequelize.STRING(500),
      allowNull: false,
      defaultValue: null
    });
  },

  async down(queryInterface, Sequelize) {
    const SCHEMA_NAME = 'platform';
    await queryInterface.removeColumn({ tableName: 'users', schema: SCHEMA_NAME }, 'avatar_url');
  }
};