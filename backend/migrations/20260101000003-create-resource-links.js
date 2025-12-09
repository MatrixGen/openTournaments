'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('resource_links', {
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
      href: {
        type: Sequelize.STRING(500),
        allowNull: false
      },
      category: {
        type: Sequelize.STRING(100),
        allowNull: false
      },
      icon: {
        type: Sequelize.STRING(50),
        defaultValue: 'document-text'
      },
      is_external: {
        type: Sequelize.BOOLEAN,
        defaultValue: false
      },
      popularity: {
        type: Sequelize.INTEGER,
        defaultValue: 0
      },
      order: {
        type: Sequelize.INTEGER,
        defaultValue: 0
      },
      tags: {
        type: Sequelize.JSON,
        defaultValue: []
      },
      target: {
        type: Sequelize.STRING(20),
        defaultValue: '_self'
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        defaultValue: true
      },
      click_count: {
        type: Sequelize.INTEGER,
        defaultValue: 0
      },
      last_clicked_at: {
        type: Sequelize.DATE,
        allowNull: true
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

    await queryInterface.addIndex('resource_links', ['category']);
    await queryInterface.addIndex('resource_links', ['is_active']);
    await queryInterface.addIndex('resource_links', ['order']);
    await queryInterface.addIndex('resource_links', ['popularity']);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('resource_links');
  }
};