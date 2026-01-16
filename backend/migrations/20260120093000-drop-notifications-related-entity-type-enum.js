'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(`
      ALTER TABLE notifications
      ALTER COLUMN related_entity_type TYPE VARCHAR(255)
      USING related_entity_type::text;
    `);

    await queryInterface.sequelize.query(`
      DROP TYPE IF EXISTS enum_notifications_related_entity_type;
    `);
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(`
      CREATE TYPE enum_notifications_related_entity_type_new AS ENUM (
        'tournament',
        'match',
        'user',
        'transaction'
      );
    `);

    await queryInterface.sequelize.query(`
      ALTER TABLE notifications
      ALTER COLUMN related_entity_type TYPE enum_notifications_related_entity_type_new
      USING (
        CASE related_entity_type
          WHEN 'tournament' THEN 'tournament'::enum_notifications_related_entity_type_new
          WHEN 'match' THEN 'match'::enum_notifications_related_entity_type_new
          WHEN 'user' THEN 'user'::enum_notifications_related_entity_type_new
          WHEN 'transaction' THEN 'transaction'::enum_notifications_related_entity_type_new
          ELSE NULL
        END
      );
    `);

    await queryInterface.sequelize.query(`
      DROP TYPE IF EXISTS enum_notifications_related_entity_type;
    `);

    await queryInterface.sequelize.query(`
      ALTER TYPE enum_notifications_related_entity_type_new
      RENAME TO enum_notifications_related_entity_type;
    `);
  },
};
