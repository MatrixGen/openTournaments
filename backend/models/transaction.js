'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Transaction extends Model {
    static associate(models) {
      // Associate with User
      Transaction.belongsTo(models.User, {
        foreignKey: 'user_id',
        as: 'user',
        onDelete: 'CASCADE'
      });
      
      // Associate with Tournament (for tournament-related transactions)
      Transaction.belongsTo(models.Tournament, {
        foreignKey: 'tournament_id',
        as: 'tournament',
        onDelete: 'CASCADE'
      });
      
      // Associate with PaymentRecord (one-to-one)
      Transaction.hasOne(models.PaymentRecord, {
        foreignKey: 'transaction_id',
        as: 'payment_record',
        onDelete: 'CASCADE'
      });
    }
  }

  Transaction.init({
    // Basic identifiers
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
    
    // Transaction identification
    order_reference: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true,
      comment: 'Unique system-generated reference for tracking'
    },
    payment_reference: {
      type: DataTypes.STRING(255),
      allowNull: true,
      comment: 'External payment provider reference (ClickPesa transaction ID)'
    },
    
    // Transaction type
    type: {
      type: DataTypes.ENUM(
        'wallet_deposit',      // Adding funds to wallet via mobile money
        'wallet_withdrawal',   // Withdrawing funds from wallet
        'tournament_entry',    // Paying for tournament entry (deducts from wallet)
        'prize_disbursement',  // Admin disbursing prize to winner
        'tournament_refund',   // Refund for tournament cancellation
        'bonus_credit',        // Admin bonus/credit
        'system_adjustment',   // System adjustment (admin)
        'fee_charge',          // Service/transaction fee
        'prize_won'            // Prize won from tournament
      ),
      allowNull: false,
      defaultValue: 'wallet_deposit'
    },
    
    // Amount information
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
    
    // Balance tracking
    balance_before: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0
    },
    balance_after: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0
    },
    
    // Status
    status: {
      type: DataTypes.ENUM(
        'initiated',   // Transaction created
        'pending',     // Waiting for confirmation
        'processing',  // Being processed
        'completed',   // Successfully completed
        'failed',      // Failed
        'cancelled',   // User/admin cancelled
        'refunded',    // Refunded to user
        'reversed'     // Reversed transaction
      ),
      allowNull: false,
      defaultValue: 'initiated'
    },
    
    // Gateway information
    gateway_type: {
      type: DataTypes.ENUM(
        'clickpesa_mobile_money',
        'clickpesa_bank_payout', 
        'internal_system',
        'manual_admin'
      ),
      allowNull: false,
      defaultValue: 'internal_system'
    },
    gateway_status: {
      type: DataTypes.STRING(100),
      allowNull: true,
      comment: 'Status from external gateway (ClickPesa)'
    },
    
    // Transaction details
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Human-readable transaction description'
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Admin/internal notes'
    },
    
    // Metadata and additional data
    metadata: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'Additional transaction data (payment details, user info, etc.)'
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
    
    // Timestamps for different statuses
    initiated_at: {
      type: DataTypes.DATE,
      allowNull: true
    },
    processed_at: {
      type: DataTypes.DATE,
      allowNull: true
    },
    completed_at: {
      type: DataTypes.DATE,
      allowNull: true
    },
    failed_at: {
      type: DataTypes.DATE,
      allowNull: true
    },
    cancelled_at: {
      type: DataTypes.DATE,
      allowNull: true
    },
    
    // Reconciliation fields
    reconciled: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    reconciled_at: {
      type: DataTypes.DATE,
      allowNull: true
    },
    reconciled_by: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: 'users', key: 'id' }
    },
    
    // Audit fields
    created_by_ip: {
      type: DataTypes.STRING(45),
      allowNull: true
    },
    updated_by_ip: {
      type: DataTypes.STRING(45),
      allowNull: true
    },
    approved_by: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: 'users', key: 'id' }
    },
    approved_at: {
      type: DataTypes.DATE,
      allowNull: true
    }
  }, {
    sequelize,
    modelName: 'Transaction',
    tableName: 'transactions',
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
        fields: ['type']
      },
      {
        fields: ['created_at']
      },
      {
        fields: ['payment_reference']
      },
      {
        fields: ['user_id', 'status']
      },
      {
        fields: ['user_id', 'type']
      },
      {
        fields: ['tournament_id']
      },
      {
        fields: ['reconciled']
      }
    ],
    hooks: {
      beforeCreate: (transaction, options) => {
        // Set initiated_at if not set
        if (!transaction.initiated_at) {
          transaction.initiated_at = new Date();
        }
        
        // Generate order_reference if not provided
        if (!transaction.order_reference) {
          const prefix = transaction.type === 'wallet_deposit' ? 'DEPO' : 
                        transaction.type === 'tournament_entry' ? 'TOUR' :
                        transaction.type === 'prize_disbursement' ? 'PAYOUT' : 'TX';
          transaction.order_reference = `${prefix}-${Date.now()}-${Math.random().toString(36).substring(2, 10).toUpperCase()}`;
        }
        
        // Calculate net amount if not set
        if (transaction.amount && transaction.transaction_fee !== undefined) {
          transaction.net_amount = parseFloat(transaction.amount) - parseFloat(transaction.transaction_fee || 0);
        }
      },
      beforeUpdate: (transaction, options) => {
        // Update timestamps based on status changes
        if (transaction.changed('status')) {
          const now = new Date();
          switch (transaction.status) {
            case 'processing':
              transaction.processed_at = now;
              break;
            case 'completed':
              transaction.completed_at = now;
              break;
            case 'failed':
              transaction.failed_at = now;
              break;
            case 'cancelled':
              transaction.cancelled_at = now;
              break;
          }
        }
        
        // Recalculate net amount if amount or fee changes
        if (transaction.changed('amount') || transaction.changed('transaction_fee')) {
          transaction.net_amount = parseFloat(transaction.amount) - parseFloat(transaction.transaction_fee || 0);
        }
      }
    }
  });

  return Transaction;
};