'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('support_tickets', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      ticket_number: {
        type: Sequelize.STRING(50),
        allowNull: false,
        unique: true
      },
      user_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      name: {
        type: Sequelize.STRING(200),
        allowNull: true
      },
      email: {
        type: Sequelize.STRING(200),
        allowNull: true
      },
      subject: {
        type: Sequelize.STRING(500),
        allowNull: false
      },
      category: {
        type: Sequelize.STRING(100),
        allowNull: false,
        defaultValue: 'general'
      },
      subcategory: {
        type: Sequelize.STRING(100),
        allowNull: true
      },
      priority: {
        type: Sequelize.ENUM('low', 'medium', 'high', 'urgent'),
        defaultValue: 'medium'
      },
      status: {
        type: Sequelize.ENUM('open', 'in_progress', 'waiting_customer', 'waiting_agent', 'resolved', 'closed'),
        defaultValue: 'open'
      },
      message: {
        type: Sequelize.TEXT,
        allowNull: false
      },
      source: {
        type: Sequelize.STRING(100),
        defaultValue: 'support_main_page'
      },
      ip_address: {
        type: Sequelize.STRING(45),
        allowNull: true
      },
      user_agent: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      assigned_to: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      estimated_response_time: {
        type: Sequelize.STRING(50),
        allowNull: true
      },
      actual_first_response_at: {
        type: Sequelize.DATE,
        allowNull: true
      },
      resolved_at: {
        type: Sequelize.DATE,
        allowNull: true
      },
      closed_at: {
        type: Sequelize.DATE,
        allowNull: true
      },
      satisfaction_rating: {
        type: Sequelize.INTEGER,
        allowNull: true
      },
      satisfaction_feedback: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      internal_notes: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      metadata: {
        type: Sequelize.JSON,
        defaultValue: {}
      },
      thread_id: {
        type: Sequelize.STRING(100),
        allowNull: true,
        unique: true
      },
      auto_reply_sent: {
        type: Sequelize.BOOLEAN,
        defaultValue: false
      },
      reference_links: {
        type: Sequelize.JSON,
        defaultValue: []
      },
      last_message_at: {
        type: Sequelize.DATE,
        allowNull: true
      },
      has_unread: {
        type: Sequelize.BOOLEAN,
        defaultValue: false
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

    await queryInterface.addIndex('support_tickets', ['ticket_number']);
    await queryInterface.addIndex('support_tickets', ['user_id']);
    await queryInterface.addIndex('support_tickets', ['email']);
    await queryInterface.addIndex('support_tickets', ['status']);
    await queryInterface.addIndex('support_tickets', ['priority']);
    await queryInterface.addIndex('support_tickets', ['category']);
    await queryInterface.addIndex('support_tickets', ['assigned_to']);
    await queryInterface.addIndex('support_tickets', ['created_at']);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('support_tickets');
  }
};