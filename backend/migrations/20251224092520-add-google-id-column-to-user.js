'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Add new columns for Google OAuth support
    await queryInterface.sequelize.transaction(async (transaction) => {
      // 1. Add google_id column
      await queryInterface.addColumn(
        'users',
        'google_id',
        {
          type: Sequelize.STRING(255),
          allowNull: true,
          unique: true,
          comment: 'Google OAuth ID for SSO',
        },
        { transaction }
      );

      // 2. Modify password_hash to allow NULL
      await queryInterface.changeColumn(
        'users',
        'password_hash',
        {
          type: Sequelize.STRING(255),
          allowNull: true,
        },
        { transaction }
      );

      // 3. Add oauth_provider enum column
      await queryInterface.addColumn(
        'users',
        'oauth_provider',
        {
          type: Sequelize.ENUM('google', 'facebook', 'apple', 'none'),
          defaultValue: 'none',
          allowNull: false,
        },
        { transaction }
      );

      // 4. Create partial index for google_id uniqueness (ignoring NULLs)
      await queryInterface.sequelize.query(
        `CREATE UNIQUE INDEX users_google_id_unique 
         ON users(google_id) 
         WHERE google_id IS NOT NULL`,
        { transaction }
      );

      // 5. Add check constraint for auth validation
      await queryInterface.sequelize.query(
        `ALTER TABLE users 
         ADD CONSTRAINT auth_method_check 
         CHECK (
           (password_hash IS NOT NULL) OR 
           (google_id IS NOT NULL) OR 
           (oauth_provider != 'none')
         )`,
        { transaction }
      );
    });
  },

  down: async (queryInterface, Sequelize) => {
    // Rollback changes
    await queryInterface.sequelize.transaction(async (transaction) => {
      // 1. Remove check constraint
      await queryInterface.sequelize.query(
        'ALTER TABLE users DROP CONSTRAINT IF EXISTS auth_method_check',
        { transaction }
      );

      // 2. Remove partial index
      await queryInterface.sequelize.query(
        'DROP INDEX IF EXISTS users_google_id_unique',
        { transaction }
      );

      // 3. Remove oauth_provider column
      await queryInterface.removeColumn('users', 'oauth_provider', { transaction });

      // 4. Change password_hash back to NOT NULL
      await queryInterface.changeColumn(
        'users',
        'password_hash',
        {
          type: Sequelize.STRING(255),
          allowNull: false,
        },
        { transaction }
      );

      // 5. Remove google_id column
      await queryInterface.removeColumn('users', 'google_id', { transaction });
    });
  }
};