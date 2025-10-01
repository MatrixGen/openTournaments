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
    clickpesa_payment_id: { type: DataTypes.STRING, unique: true },
    checkout_id: { type: DataTypes.STRING },
    amount: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
    currency: { type: DataTypes.STRING(3), defaultValue: 'TZS' },
    payment_method: { type: DataTypes.STRING(50) },
    customer_email: { type: DataTypes.STRING(255) },
    customer_phone: { type: DataTypes.STRING(20) },
    status: { type: DataTypes.STRING(50), allowNull: false, defaultValue: 'pending' },
    gateway_response: { type: DataTypes.JSON },
    webhook_data: { type: DataTypes.JSON }
  }, {
    sequelize,
    modelName: 'PaymentRecord',
    tableName: 'payment_records',
    underscored: true,
    timestamps: true
  });

  return PaymentRecord;
};
