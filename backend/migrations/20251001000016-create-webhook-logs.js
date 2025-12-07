'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('webhook_logs', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false
      },
      webhook_id: {
        type: Sequelize.STRING,
        allowNull: true
      },
      event_type: {
        type: Sequelize.STRING,
        allowNull: false
      },
      order_reference: {
        type: Sequelize.STRING,
        allowNull: true
      },
      payload: {
        type: Sequelize.JSONB,
        defaultValue: {}
      },
      raw_body: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      signature_header: {
        type: Sequelize.STRING,
        allowNull: true
      },
      status: {
        type: Sequelize.ENUM('processing', 'completed', 'failed'),
        defaultValue: 'processing'
      },
      result: {
        type: Sequelize.JSONB,
        defaultValue: {}
      },
      error_message: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      processed_at: {
        type: Sequelize.DATE,
        allowNull: false
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('NOW()')
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('NOW()')
      }
    });

    // Add indexes
    await queryInterface.addIndex('webhook_logs', ['webhook_id', 'event_type'], { unique: true });
    await queryInterface.addIndex('webhook_logs', ['order_reference']);
    await queryInterface.addIndex('webhook_logs', ['event_type']);
    await queryInterface.addIndex('webhook_logs', ['status']);
    await queryInterface.addIndex('webhook_logs', ['processed_at']);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('webhook_logs');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_webhook_logs_status";'); // clean up ENUM type
  }
};
