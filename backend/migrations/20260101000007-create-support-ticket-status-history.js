'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('support_ticket_status_history', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      ticket_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'support_tickets',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      old_status: {
        type: Sequelize.ENUM('open', 'in_progress', 'waiting_customer', 'waiting_agent', 'resolved', 'closed'),
        allowNull: true
      },
      new_status: {
        type: Sequelize.ENUM('open', 'in_progress', 'waiting_customer', 'waiting_agent', 'resolved', 'closed'),
        allowNull: false
      },
      changed_by: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      changed_by_type: {
        type: Sequelize.ENUM('customer', 'agent', 'system'),
        defaultValue: 'system'
      },
      notes: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      metadata: {
        type: Sequelize.JSON,
        defaultValue: {}
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });

    await queryInterface.addIndex('support_ticket_status_history', ['ticket_id']);
    await queryInterface.addIndex('support_ticket_status_history', ['changed_by']);
    await queryInterface.addIndex('support_ticket_status_history', ['created_at']);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('support_ticket_status_history');
  }
};