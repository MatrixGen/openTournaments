'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // Step 1: Add column as NULL allowed (to avoid breaking existing rows)
    await queryInterface.addColumn('users', 'avatar_url', {
      type: Sequelize.STRING(500),
      allowNull: true,
      defaultValue: null
    });

    // Step 2: Update existing rows to have empty string or a default avatar
    await queryInterface.sequelize.query(`
      UPDATE users SET avatar_url = '' WHERE avatar_url IS NULL;
    `);

    // Step 3: Change to NOT NULL
    await queryInterface.changeColumn('users', 'avatar_url', {
      type: Sequelize.STRING(500),
      allowNull: true,
      defaultValue: null
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('users', 'avatar_url');
  }
};
