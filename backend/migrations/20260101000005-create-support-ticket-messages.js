'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
      try {

    await queryInterface.createTable('platform.support_ticket_messages', {
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
      sender_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      sender_type: {
        type: Sequelize.ENUM('customer', 'agent', 'system'),
        defaultValue: 'customer'
      },
      sender_name: {
        type: Sequelize.STRING(200),
        allowNull: true
      },
      sender_email: {
        type: Sequelize.STRING(200),
        allowNull: true
      },
      message: {
        type: Sequelize.TEXT,
        allowNull: false
      },
      is_internal: {
        type: Sequelize.BOOLEAN,
        defaultValue: false
      },
      is_read: {
        type: Sequelize.BOOLEAN,
        defaultValue: false
      },
      read_at: {
        type: Sequelize.DATE,
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
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });

    await queryInterface.addIndex('support_ticket_messages', ['ticket_id']);
    await queryInterface.addIndex('support_ticket_messages', ['sender_id']);
    await queryInterface.addIndex('support_ticket_messages', ['sender_type']);
    await queryInterface.addIndex('support_ticket_messages', ['created_at']);
    await queryInterface.addIndex('support_ticket_messages', ['is_read']);
  
      } catch (error) {
      console.error('⚠️ Migration up failed in 20260101000005-create-support-ticket-messages.js:', error.message);
      // do not throw to avoid hard failure during deploy
    }
},

  async down(queryInterface, Sequelize) {
      try {

    await queryInterface.dropTable('platform.support_ticket_messages');
  
      } catch (error) {
      console.error('⚠️ Migration down failed in 20260101000005-create-support-ticket-messages.js:', error.message);
      // do not throw to avoid hard failure during deploy
    }
}
};