'use strict';

module.exports = {
  async up (queryInterface, Sequelize) {
    const platforms = [
      { name: 'Android', status: 'active' },
      { name: 'iOS', status: 'active' }
    ];

    for (const platform of platforms) {
      await queryInterface.bulkInsert('platforms', [{
        ...platform,
        createdAt: new Date(),
        updatedAt: new Date()
      }], {
        ignoreDuplicates: true  
      });
    }
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.bulkDelete('platforms', {
      name: ['Android', 'iOS']
    });
  }
};
