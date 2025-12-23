'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class PaymentRecord extends Model {
    static associate(models) {
      // Associate with User
      PaymentRecord.belongsTo(models.User, {
        foreignKey: 'user_id',
        as: 'user',
        onDelete: 'CASCADE'
      });
      
      // Associate with Tournament (optional, for tournament payments)
      PaymentRecord.belongsTo(models.Tournament, {
        foreignKey: 'tournament_id',
        as: 'tournament',
        onDelete: 'CASCADE'
      });
      
      // Associate with Transaction (one-to-one relationship)
      PaymentRecord.belongsTo(models.Transaction, {
        foreignKey: 'transaction_id',
        as: 'transaction',
        onDelete: 'CASCADE'
      });
    }
  }

  PaymentRecord.init({
    // Main identifiers
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'users', key: 'id' }
    },
    tournament_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: 'tournaments', key: 'id' }
    },
    transaction_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: 'transactions', key: 'id' }
    },
    
    // Payment reference IDs
    order_reference: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true
    },
    payment_reference: {
      type: DataTypes.STRING(255),
      allowNull: true,
      comment: 'ClickPesa transaction ID'
    },
    
    // Payment details
    amount: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      validate: {
        min: 0
      }
    },
    currency: {
      type: DataTypes.STRING(3),
      allowNull: false,
      defaultValue: 'TZS'
    },
    payment_method: {
      type: DataTypes.STRING(50),
      allowNull: false,
      defaultValue: 'mobile_money_deposit',
      validate: {
        isIn: [['mobile_money_deposit', 'bank_payout', 'mobile_money_entry','mobile_money_payout']]
      }
    },
    
    // Customer information
    customer_phone: {
      type: DataTypes.STRING(20),
      allowNull: true,
      comment: 'Formatted phone number (255XXXXXXXXX)'
    },
    customer_email: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    
    // Payment status
    status: {
      type: DataTypes.STRING(50),
      allowNull: false,
      defaultValue: 'initiated',
      validate: {
        isIn: [['initiated', 'pending', 'processing', 'successful', 'failed','completed']]
      }
    },
    
    // Fee information
    transaction_fee: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      defaultValue: 0
    },
    net_amount: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: true,
      comment: 'Amount after fees (amount - transaction_fee)'
    },
    
    // ClickPesa specific fields
    clickpesa_payment_id: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    checkout_id: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    
    // Channel and provider information
    channel: {
      type: DataTypes.STRING(50),
      allowNull: true,
      comment: 'Payment channel (e.g., TIGO-PESA, AIRTEL-MONEY)'
    },
    channel_provider: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    
    // Response data
    gateway_response: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'Initial gateway response'
    },
    webhook_data: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'Webhook payload from payment provider'
    },
    
    // Extended metadata
    metadata: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'Additional payment information (preview, sender details, etc.)'
    },
    
    // Timestamps for tracking
    initiated_at: {
      type: DataTypes.DATE,
      allowNull: true
    },
    completed_at: {
      type: DataTypes.DATE,
      allowNull: true
    },
    cancelled_at: {
      type: DataTypes.DATE,
      allowNull: true
    },
    failed_at: {
      type: DataTypes.DATE,
      allowNull: true
    },
    
    // Webhook processing
    webhook_processed: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    webhook_processed_at: {
      type: DataTypes.DATE,
      allowNull: true
    },
    
    // Audit fields
    created_by_ip: {
      type: DataTypes.STRING(45),
      allowNull: true
    },
    updated_by_ip: {
      type: DataTypes.STRING(45),
      allowNull: true
    }
  }, {
    sequelize,
    modelName: 'PaymentRecord',
    tableName: 'payment_records',
    underscored: true,
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      {
        fields: ['order_reference'],
        unique: true
      },
      {
        fields: ['user_id']
      },
      {
        fields: ['status']
      },
      {
        fields: ['payment_method']
      },
      {
        fields: ['created_at']
      },
      {
        fields: ['user_id', 'status']
      },
      {
        fields: ['payment_reference']
      },
      {
        fields: ['customer_phone']
      }
    ],
    hooks: {
      beforeCreate: (paymentRecord, options) => {
        // Set initiated_at if not set
        if (!paymentRecord.initiated_at) {
          paymentRecord.initiated_at = new Date();
        }
        
        // Calculate net amount if not set
        if (paymentRecord.amount && paymentRecord.transaction_fee !== undefined) {
          paymentRecord.net_amount = parseFloat(paymentRecord.amount) - parseFloat(paymentRecord.transaction_fee || 0);
        }
      },
      beforeUpdate: (paymentRecord, options) => {
        // Update timestamps based on status changes
        if (paymentRecord.changed('status')) {
          const now = new Date();
          switch (paymentRecord.status) {
            case 'successful':
              paymentRecord.completed_at = now;
              paymentRecord.webhook_processed = true;
              paymentRecord.webhook_processed_at = now;
              break;
            case 'failed':
              paymentRecord.failed_at = now;
              break;
            case 'cancelled':
              paymentRecord.cancelled_at = now;
              break;
          }
        }
        
        // Recalculate net amount if amount or fee changes
        if (paymentRecord.changed('amount') || paymentRecord.changed('transaction_fee')) {
          paymentRecord.net_amount = parseFloat(paymentRecord.amount) - parseFloat(paymentRecord.transaction_fee || 0);
        }
      }
    }
  });

  return PaymentRecord;
};