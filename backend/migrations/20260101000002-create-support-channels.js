'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('support_channels', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      title: {
        type: Sequelize.STRING(200),
        allowNull: false
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      action: {
        type: Sequelize.STRING(100),
        allowNull: false
      },
      action_type: {
        type: Sequelize.STRING(50),
        allowNull: false
      },
      variant: {
        type: Sequelize.STRING(50),
        defaultValue: 'primary'
      },
      is_available: {
        type: Sequelize.BOOLEAN,
        defaultValue: true
      },
      availability_hours: {
        type: Sequelize.STRING(100),
        defaultValue: '24/7'
      },
      response_time: {
        type: Sequelize.STRING(50),
        defaultValue: '2 minutes'
      },
      icon: {
        type: Sequelize.STRING(50),
        defaultValue: 'help'
      },
      order: {
        type: Sequelize.INTEGER,
        defaultValue: 0
      },
      color: {
        type: Sequelize.STRING(20),
        allowNull: true
      },
      url: {
        type: Sequelize.STRING(500),
        allowNull: true
      },
      requires_auth: {
        type: Sequelize.BOOLEAN,
        defaultValue: false
      },
      is_featured: {
        type: Sequelize.BOOLEAN,
        defaultValue: false
      },
      metadata: {
        type: Sequelize.JSON,
        defaultValue: {}
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });

    await queryInterface.addIndex('support_channels', ['action_type']);
    await queryInterface.addIndex('support_channels', ['is_available']);
    await queryInterface.addIndex('support_channels', ['order']);
    await queryInterface.addIndex('support_channels', ['is_featured']);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('support_channels');
  }
};