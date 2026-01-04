'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('Attachments', 'storagePath', {
      type: Sequelize.STRING,
      allowNull: true,
      comment: 'Absolute file path on server for cleanup purposes'
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('Attachments', 'storagePath');
  }
};