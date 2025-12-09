'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('support_ticket_attachments', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      ticket_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'support_tickets',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      message_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'support_ticket_messages',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      filename: {
        type: Sequelize.STRING(500),
        allowNull: false
      },
      original_name: {
        type: Sequelize.STRING(500),
        allowNull: false
      },
      file_path: {
        type: Sequelize.STRING(1000),
        allowNull: false
      },
      mime_type: {
        type: Sequelize.STRING(100),
        allowNull: true
      },
      size: {
        type: Sequelize.INTEGER,
        allowNull: true
      },
      is_public: {
        type: Sequelize.BOOLEAN,
        defaultValue: true
      },
      upload_token: {
        type: Sequelize.STRING(100),
        allowNull: true,
        unique: true
      },
      expires_at: {
        type: Sequelize.DATE,
        allowNull: true
      },
      uploaded_by: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
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

    await queryInterface.addIndex('support_ticket_attachments', ['ticket_id']);
    await queryInterface.addIndex('support_ticket_attachments', ['message_id']);
    await queryInterface.addIndex('support_ticket_attachments', ['upload_token']);
    await queryInterface.addIndex('support_ticket_attachments', ['expires_at']);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('support_ticket_attachments');
  }
};