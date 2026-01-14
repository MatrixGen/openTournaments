'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('tournaments', 'currency', {
      type: Sequelize.STRING(3),
      allowNull: true
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('tournaments', 'currency');
  }
};
