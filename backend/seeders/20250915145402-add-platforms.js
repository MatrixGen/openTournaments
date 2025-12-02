'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const platforms = [
      { name: 'Android', status: 'active' },
      { name: 'iOS', status: 'active' }
    ];

    for (const platform of platforms) {
      await queryInterface.sequelize.query(
        `INSERT INTO platforms (name, status, created_at, updated_at)
         VALUES (:name, :status, NOW(), NOW())
         ON CONFLICT (name) DO NOTHING`,
        {
          replacements: platform
        }
      );
    }
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('platforms', {
      name: ['Android', 'iOS']
    });
  }
};
