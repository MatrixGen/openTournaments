'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('webhook_logs', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },
      webhook_id: {
        type: Sequelize.STRING(255),
        allowNull: false,
        unique: true,
      },
      received_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      raw_payload: {
        type: Sequelize.JSON,
        allowNull: true,
      },
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('webhook_logs');
  }
};
