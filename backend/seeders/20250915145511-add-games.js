'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.bulkInsert('games', [
      { 
        name: 'eFootball 2024',
        logo_url: 'https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/1665460/8ab1221163d79fb5cc64ce59cf96fa39f7af0d35/capsule_616x353.jpg?t=1761192425',
        status: 'active',
        created_at: new Date(),
        updated_at: new Date()
      },
      { 
        name: 'Dream League Soccer 2024',
        logo_url: 'https://kitdls.net/wp-content/uploads/2024/12/LOGO-DLS-25.png',
        status: 'active',
        created_at: new Date(),
        updated_at: new Date()
      },
      { 
        name: 'EA Sports FC Mobile',
        logo_url: 'https://upload.wikimedia.org/wikipedia/commons/6/6f/EA_Sports_monochrome_logo.svg',
        status: 'active',
        created_at: new Date(),
        updated_at: new Date()
      },
    ], {});
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.bulkDelete('games', null, {});
  }
};
