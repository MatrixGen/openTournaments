'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('transactions', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      user_id: {
        type: Sequelize.INTEGER,
        allowNull: false
      },
      type: {
        type: Sequelize.ENUM('deposit','withdrawal','tournament_entry','prize_won','refund'),
        allowNull: false
      },
      amount: {
        type: Sequelize.DECIMAL(10,2),
        allowNull: false
      },
      balance_before: {
        type: Sequelize.DECIMAL(10,2),
        allowNull: false
      },
      balance_after: {
        type: Sequelize.DECIMAL(10,2),
        allowNull: false
      },
      status: {
        type: Sequelize.ENUM('pending','completed','failed'),
        allowNull: true,
        defaultValue: 'pending'
      },
      pesapal_transaction_id: {
        type: Sequelize.STRING(255),
        allowNull: true
      },
      transaction_reference: {
        type: Sequelize.STRING(255),
        allowNull: true,
        unique: true
      },
      currency: {
        type: Sequelize.STRING(10),
        allowNull: true,
        defaultValue: 'TZS'
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      payment_reference: {
        type: Sequelize.STRING(255),
        allowNull: true
      },
      gateway_type: {
        type: Sequelize.ENUM('clickpesa','internal'),
        allowNull: true,
        defaultValue: 'internal'
      },
      gateway_status: {
        type: Sequelize.STRING(50),
        allowNull: true
      },
      metadata: {
        type: Sequelize.JSON,
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
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP')
      }
    });

    await queryInterface.addConstraint('transactions', {
      fields: ['user_id'],
      type: 'foreign key',
      name: 'transactions_ibfk_1',
      references: {
        table: 'users',
        field: 'id'
      }
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('transactions');
  }
};
