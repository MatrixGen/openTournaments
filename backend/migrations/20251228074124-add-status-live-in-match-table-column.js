'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Step 1: First, remove the default constraint
    await queryInterface.sequelize.query(`
      ALTER TABLE matches 
      ALTER COLUMN status DROP DEFAULT;
    `);

    // Step 2: Create a new enum type with 'live'
    await queryInterface.sequelize.query(`
      CREATE TYPE enum_matches_status_new AS ENUM (
        'scheduled', 
        'live', 
        'completed', 
        'disputed', 
        'awaiting_confirmation'
      );
    `);

    // Step 3: Convert the column to text first, then to new enum
    await queryInterface.sequelize.query(`
      ALTER TABLE matches 
      ALTER COLUMN status TYPE VARCHAR(255);
    `);

    await queryInterface.sequelize.query(`
      ALTER TABLE matches 
      ALTER COLUMN status TYPE enum_matches_status_new 
      USING status::enum_matches_status_new;
    `);

    // Step 4: Drop the old enum and rename the new one
    await queryInterface.sequelize.query(`
      DROP TYPE IF EXISTS enum_matches_status;
    `);

    await queryInterface.sequelize.query(`
      ALTER TYPE enum_matches_status_new 
      RENAME TO enum_matches_status;
    `);

    // Step 5: Restore the default constraint
    await queryInterface.sequelize.query(`
      ALTER TABLE matches 
      ALTER COLUMN status SET DEFAULT 'scheduled';
    `);
  },

  async down(queryInterface, Sequelize) {
    // Step 1: Remove default constraint
    await queryInterface.sequelize.query(`
      ALTER TABLE matches 
      ALTER COLUMN status DROP DEFAULT;
    `);

    // Step 2: Create old enum type without 'live'
    await queryInterface.sequelize.query(`
      CREATE TYPE enum_matches_status_old AS ENUM (
        'scheduled', 
        'completed', 
        'disputed', 
        'awaiting_confirmation'
      );
    `);

    // Step 3: Convert column to text, then to old enum
    await queryInterface.sequelize.query(`
      ALTER TABLE matches 
      ALTER COLUMN status TYPE VARCHAR(255);
    `);

    await queryInterface.sequelize.query(`
      ALTER TABLE matches 
      ALTER COLUMN status TYPE enum_matches_status_old 
      USING (
        CASE status::text
          WHEN 'live' THEN 'scheduled'::enum_matches_status_old
          ELSE status::text::enum_matches_status_old
        END
      );
    `);

    // Step 4: Drop current enum and rename old one
    await queryInterface.sequelize.query(`
      DROP TYPE IF EXISTS enum_matches_status;
    `);

    await queryInterface.sequelize.query(`
      ALTER TYPE enum_matches_status_old 
      RENAME TO enum_matches_status;
    `);

    // Step 5: Restore default constraint
    await queryInterface.sequelize.query(`
      ALTER TABLE matches 
      ALTER COLUMN status SET DEFAULT 'scheduled';
    `);
  }
};