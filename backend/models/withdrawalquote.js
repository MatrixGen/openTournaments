'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class WithdrawalQuote extends Model {
    static associate(models) {
      WithdrawalQuote.belongsTo(models.User, {
        foreignKey: 'user_id',
        as: 'user',
        onDelete: 'CASCADE'
      });
    }
  }

  WithdrawalQuote.init({
    preview_reference: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'users', key: 'id' }
    },
    request_amount: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false
    },
    request_currency: {
      type: DataTypes.STRING(3),
      allowNull: false
    },
    send_amount_tzs: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false
    },
    clickpesa_fee_tzs: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0
    },
    platform_fee_tzs: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0
    },
    total_fee_tzs: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0
    },
    gross_tzs: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false
    },
    total_debit_amount: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false
    },
    total_debit_currency: {
      type: DataTypes.STRING(3),
      allowNull: false
    },
    exchange_rate: {
      type: DataTypes.DECIMAL(18, 8),
      allowNull: true
    },
    exchange_rate_date: {
      type: DataTypes.DATE,
      allowNull: true
    },
    recipient_phone: {
      type: DataTypes.STRING(20),
      allowNull: true
    },
    status: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: 'active',
      validate: {
        isIn: [['active', 'used', 'expired']]
      }
    },
    expires_at: {
      type: DataTypes.DATE,
      allowNull: false
    },
    order_reference: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    metadata: {
      type: DataTypes.JSON,
      allowNull: true
    }
  }, {
    sequelize,
    modelName: 'WithdrawalQuote',
    tableName: 'withdrawal_quotes',
    underscored: true,
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      { fields: ['preview_reference'], unique: true },
      { fields: ['user_id'] },
      { fields: ['status'] },
      { fields: ['expires_at'] }
    ]
  });

  return WithdrawalQuote;
};
