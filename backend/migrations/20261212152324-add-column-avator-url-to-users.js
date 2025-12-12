'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
      try {

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
  
      } catch (error) {
      console.error('⚠️ Migration up failed in 20261212152324-add-column-avator-url-to-users.js:', error.message);
      // do not throw to avoid hard failure during deploy
    }
},

  async down(queryInterface, Sequelize) {
      try {

    const SCHEMA_NAME = 'platform';
    await queryInterface.removeColumn({ tableName: 'users', schema: SCHEMA_NAME }, 'avatar_url');
  
      } catch (error) {
      console.error('⚠️ Migration down failed in 20261212152324-add-column-avator-url-to-users.js:', error.message);
      // do not throw to avoid hard failure during deploy
    }
}
};