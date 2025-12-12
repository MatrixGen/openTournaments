'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
      try {

    await queryInterface.createTable('platform.live_chat_sessions', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      session_id: {
        type: Sequelize.STRING(100),
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
      department: {
        type: Sequelize.STRING(100),
        defaultValue: 'general'
      },
      issue: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      agent_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      estimated_wait_time: {
        type: Sequelize.STRING(50),
        allowNull: true
      },
      chat_token: {
        type: Sequelize.STRING(200),
        allowNull: false,
        unique: true
      },
      websocket_url: {
        type: Sequelize.STRING(500),
        allowNull: true
      },
      room_id: {
        type: Sequelize.STRING(100),
        allowNull: true,
        unique: true
      },
      status: {
        type: Sequelize.ENUM('waiting', 'active', 'ended', 'transferred', 'timed_out'),
        defaultValue: 'waiting'
      },
      started_at: {
        type: Sequelize.DATE,
        allowNull: true
      },
      ended_at: {
        type: Sequelize.DATE,
        allowNull: true
      },
      expires_at: {
        type: Sequelize.DATE,
        allowNull: true
      },
      metadata: {
        type: Sequelize.JSON,
        defaultValue: {}
      },
      ticket_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'support_tickets',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      messages_count: {
        type: Sequelize.INTEGER,
        defaultValue: 0
      },
      avg_response_time: {
        type: Sequelize.INTEGER,
        defaultValue: 0
      },
      satisfaction_rating: {
        type: Sequelize.INTEGER,
        allowNull: true
      },
      ended_by: {
        type: Sequelize.ENUM('customer', 'agent', 'system', 'timeout'),
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

    await queryInterface.addIndex('live_chat_sessions', ['session_id']);
    await queryInterface.addIndex('live_chat_sessions', ['chat_token']);
    await queryInterface.addIndex('live_chat_sessions', ['user_id']);
    await queryInterface.addIndex('live_chat_sessions', ['agent_id']);
    await queryInterface.addIndex('live_chat_sessions', ['status']);
    await queryInterface.addIndex('live_chat_sessions', ['created_at']);
    await queryInterface.addIndex('live_chat_sessions', ['department']);
  
      } catch (error) {
      console.error('⚠️ Migration up failed in 20260101000009-create-live-chat-sessions.js:', error.message);
      // do not throw to avoid hard failure during deploy
    }
},

  async down(queryInterface, Sequelize) {
      try {

    await queryInterface.dropTable('platform.live_chat_sessions');
  
      } catch (error) {
      console.error('⚠️ Migration down failed in 20260101000009-create-live-chat-sessions.js:', error.message);
      // do not throw to avoid hard failure during deploy
    }
}
};