'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(`
      ALTER TABLE matches
      ALTER COLUMN status DROP DEFAULT;
    `);

    await queryInterface.sequelize.query(`
      CREATE TYPE enum_matches_status_new AS ENUM (
        'scheduled',
        'live',
        'completed',
        'disputed',
        'awaiting_confirmation',
        'forfeited',
        'no_contest',
        'expired'
      );
    `);

    await queryInterface.sequelize.query(`
      ALTER TABLE matches
      ALTER COLUMN status TYPE VARCHAR(255);
    `);

    await queryInterface.sequelize.query(`
      ALTER TABLE matches
      ALTER COLUMN status TYPE enum_matches_status_new
      USING status::enum_matches_status_new;
    `);

    await queryInterface.sequelize.query(`
      DROP TYPE IF EXISTS enum_matches_status;
    `);

    await queryInterface.sequelize.query(`
      ALTER TYPE enum_matches_status_new
      RENAME TO enum_matches_status;
    `);

    await queryInterface.sequelize.query(`
      ALTER TABLE matches
      ALTER COLUMN status SET DEFAULT 'scheduled';
    `);
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(`
      ALTER TABLE matches
      ALTER COLUMN status DROP DEFAULT;
    `);

    await queryInterface.sequelize.query(`
      CREATE TYPE enum_matches_status_old AS ENUM (
        'scheduled',
        'live',
        'completed',
        'disputed',
        'awaiting_confirmation'
      );
    `);

    await queryInterface.sequelize.query(`
      ALTER TABLE matches
      ALTER COLUMN status TYPE VARCHAR(255);
    `);

    await queryInterface.sequelize.query(`
      ALTER TABLE matches
      ALTER COLUMN status TYPE enum_matches_status_old
      USING (
        CASE status::text
          WHEN 'forfeited' THEN 'completed'::enum_matches_status_old
          WHEN 'no_contest' THEN 'completed'::enum_matches_status_old
          WHEN 'expired' THEN 'completed'::enum_matches_status_old
          ELSE status::text::enum_matches_status_old
        END
      );
    `);

    await queryInterface.sequelize.query(`
      DROP TYPE IF EXISTS enum_matches_status;
    `);

    await queryInterface.sequelize.query(`
      ALTER TYPE enum_matches_status_old
      RENAME TO enum_matches_status;
    `);

    await queryInterface.sequelize.query(`
      ALTER TABLE matches
      ALTER COLUMN status SET DEFAULT 'scheduled';
    `);
  },
};
