'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class PaymentRecord extends Model {
    static associate(models) {
      PaymentRecord.belongsTo(models.Transaction, {
        foreignKey: 'transaction_id',
        as: 'transaction',
        onDelete: 'CASCADE'
      });
    }
  }

  PaymentRecord.init({
    transaction_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'transactions', key: 'id' }
    },
    clickpesa_payment_id: {
      type: DataTypes.STRING(255),
      allowNull: true,
      unique: true
    },
    checkout_id: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false
    },
    currency: {
      type: DataTypes.STRING(3),
      allowNull: true,
      defaultValue: 'TZS'
    },
    payment_method: {
      type: DataTypes.STRING(50),
      allowNull: true
    },
    customer_email: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    customer_phone: {
      type: DataTypes.STRING(20),
      allowNull: true
    },
    status: {
      type: DataTypes.STRING(50),
      allowNull: false,
      defaultValue: 'pending'
    },
    gateway_response: {
      type: DataTypes.JSON,
      allowNull: true
    },
    webhook_data: {
      type: DataTypes.JSON,
      allowNull: true
    }
  }, {
    sequelize,
    modelName: 'PaymentRecord',
    tableName: 'payment_records',
    underscored: true,
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  });

  return PaymentRecord;
};
