'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('withdrawal_quotes', {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false
      },
      preview_reference: {
        type: Sequelize.STRING(100),
        allowNull: false,
        unique: true
      },
      user_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onDelete: 'CASCADE'
      },
      request_amount: {
        type: Sequelize.DECIMAL(12, 2),
        allowNull: false
      },
      request_currency: {
        type: Sequelize.STRING(3),
        allowNull: false
      },
      send_amount_tzs: {
        type: Sequelize.DECIMAL(12, 2),
        allowNull: false
      },
      clickpesa_fee_tzs: {
        type: Sequelize.DECIMAL(12, 2),
        allowNull: false,
        defaultValue: 0
      },
      platform_fee_tzs: {
        type: Sequelize.DECIMAL(12, 2),
        allowNull: false,
        defaultValue: 0
      },
      total_fee_tzs: {
        type: Sequelize.DECIMAL(12, 2),
        allowNull: false,
        defaultValue: 0
      },
      gross_tzs: {
        type: Sequelize.DECIMAL(12, 2),
        allowNull: false
      },
      total_debit_amount: {
        type: Sequelize.DECIMAL(12, 2),
        allowNull: false
      },
      total_debit_currency: {
        type: Sequelize.STRING(3),
        allowNull: false
      },
      exchange_rate: {
        type: Sequelize.DECIMAL(18, 8),
        allowNull: true
      },
      exchange_rate_date: {
        type: Sequelize.DATE,
        allowNull: true
      },
      recipient_phone: {
        type: Sequelize.STRING(20),
        allowNull: true
      },
      status: {
        type: Sequelize.STRING(20),
        allowNull: false,
        defaultValue: 'active'
      },
      expires_at: {
        type: Sequelize.DATE,
        allowNull: false
      },
      order_reference: {
        type: Sequelize.STRING(100),
        allowNull: true
      },
      metadata: {
        type: Sequelize.JSON,
        allowNull: true
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn('NOW')
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn('NOW')
      }
    });

    await queryInterface.addIndex('withdrawal_quotes', ['preview_reference'], {
      unique: true,
      name: 'withdrawal_quotes_preview_reference_uq'
    });
    await queryInterface.addIndex('withdrawal_quotes', ['user_id']);
    await queryInterface.addIndex('withdrawal_quotes', ['status']);
    await queryInterface.addIndex('withdrawal_quotes', ['expires_at']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('withdrawal_quotes');
  }
};
