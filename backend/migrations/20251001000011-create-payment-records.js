'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('payment_records', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      transaction_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'transactions',
          key: 'id'
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
      },
      clickpesa_payment_id: {
        type: Sequelize.STRING(255),
        allowNull: true,
        unique: true,
        defaultValue: null
      },
      checkout_id: {
        type: Sequelize.STRING(255),
        allowNull: true,
        defaultValue: null
      },
      amount: {
        type: Sequelize.DECIMAL(10,2),
        allowNull: false
      },
      currency: {
        type: Sequelize.STRING(3),
        allowNull: true,
        defaultValue: 'TZS'
      },
      payment_method: {
        type: Sequelize.STRING(50),
        allowNull: true,
        defaultValue: null
      },
      customer_email: {
        type: Sequelize.STRING(255),
        allowNull: true,
        defaultValue: null
      },
      customer_phone: {
        type: Sequelize.STRING(20),
        allowNull: true,
        defaultValue: null
      },
      status: {
        type: Sequelize.STRING(50),
        allowNull: false,
        defaultValue: 'pending'
      },
      gateway_response: {
        type: Sequelize.JSON,
        allowNull: true
      },
      webhook_data: {
        type: Sequelize.JSON,
        allowNull: true
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false
      }
    });

    // Add index
    await queryInterface.addIndex('payment_records', ['transaction_id'], { name: 'transaction_id' });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('payment_records');
  }
};
