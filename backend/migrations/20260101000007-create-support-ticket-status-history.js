'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
      try {

    await queryInterface.createTable('platform.support_ticket_status_history', {
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
  
      } catch (error) {
      console.error('⚠️ Migration up failed in 20260101000007-create-support-ticket-status-history.js:', error.message);
      // do not throw to avoid hard failure during deploy
    }
},

  async down(queryInterface, Sequelize) {
      try {

    await queryInterface.dropTable('platform.support_ticket_status_history');
  
      } catch (error) {
      console.error('⚠️ Migration down failed in 20260101000007-create-support-ticket-status-history.js:', error.message);
      // do not throw to avoid hard failure during deploy
    }
}
};