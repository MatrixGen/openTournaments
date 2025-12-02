'use strict';
const { Model } = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class PaymentMethod extends Model {
    static associate(models) {
      // Associations can be defined here
    }
  }
  PaymentMethod.init({
    name: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    description: DataTypes.TEXT,
    logo_url: DataTypes.STRING(512),
    fee_structure: DataTypes.STRING(100),
    is_active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    requires_redirect: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    }
  }, {
    sequelize,
    modelName: 'PaymentMethod',
    tableName: 'payment_methods',
    underscored: true,
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  });
  return PaymentMethod;
};