'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Transaction extends Model {
    static associate(models) {
      Transaction.belongsTo(models.User, {
        foreignKey: 'user_id',
        as: 'user'
      });
    }
  }

  Transaction.init({
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    type: {
      type: DataTypes.STRING,  // ENUM replaced with STRING
      allowNull: false
    },
    amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false
    },
    balance_before: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false
    },
    balance_after: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false
    },
    status: {
      type: DataTypes.STRING,  // ENUM replaced with STRING
      defaultValue: 'pending'
    },
    pesapal_transaction_id: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    transaction_reference: {
      type: DataTypes.STRING(255),
      allowNull: true,
      unique: true
    },
    currency: {
      type: DataTypes.STRING(10),
      defaultValue: 'TZS'
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    payment_reference: {
      type: DataTypes.STRING
    },
    gateway_type: {
      type: DataTypes.STRING,  // ENUM replaced with STRING
      defaultValue: 'internal'
    },
    gateway_status: {
      type: DataTypes.STRING(50)
    },
    metadata: {
      type: DataTypes.JSON
    }
  }, {
    sequelize,
    modelName: 'Transaction',
    tableName: 'transactions',
    underscored: true,
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  });

  return Transaction;
};
