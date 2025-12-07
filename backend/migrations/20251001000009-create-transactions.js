'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('transactions', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },
      
      // Foreign keys
      user_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id',
        },
        onDelete: 'CASCADE',
      },
      tournament_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'tournaments',
          key: 'id',
        },
        onDelete: 'CASCADE',
      },
      reconciled_by: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'users',
          key: 'id',
        },
      },
      approved_by: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'users',
          key: 'id',
        },
      },
      
      // Transaction identifiers
      order_reference: {
        type: Sequelize.STRING(100),
        allowNull: false,
        unique: true,
        comment: 'Unique system-generated reference',
      },
      payment_reference: {
        type: Sequelize.STRING(255),
        allowNull: true,
        comment: 'External payment provider reference',
      },
      
      // Transaction type
      type: {
        type: Sequelize.ENUM(
          'wallet_deposit',
          'wallet_withdrawal',
          'tournament_entry',
          'prize_disbursement',
          'tournament_refund',
          'bonus_credit',
          'system_adjustment',
          'fee_charge',
          'prize_won'
        ),
        allowNull: false,
        defaultValue: 'wallet_deposit',
      },
      
      // Amount information
      amount: {
        type: Sequelize.DECIMAL(12, 2),
        allowNull: false,
        validate: {
          min: 0,
        },
      },
      currency: {
        type: Sequelize.STRING(3),
        allowNull: false,
        defaultValue: 'TZS',
      },
      
      // Balance tracking
      balance_before: {
        type: Sequelize.DECIMAL(12, 2),
        allowNull: false,
        defaultValue: 0,
      },
      balance_after: {
        type: Sequelize.DECIMAL(12, 2),
        allowNull: false,
        defaultValue: 0,
      },
      
      // Status
      status: {
        type: Sequelize.ENUM(
          'initiated',
          'pending',
          'processing',
          'completed',
          'failed',
          'cancelled',
          'refunded',
          'reversed'
        ),
        allowNull: false,
        defaultValue: 'initiated',
      },
      
      // Gateway information
      gateway_type: {
        type: Sequelize.ENUM(
          'clickpesa_mobile_money',
          'clickpesa_bank_payout',
          'internal_system',
          'manual_admin'
        ),
        allowNull: false,
        defaultValue: 'internal_system',
      },
      gateway_status: {
        type: Sequelize.STRING(100),
        allowNull: true,
        comment: 'Status from external gateway',
      },
      
      // Transaction details
      description: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'Human-readable description',
      },
      notes: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'Admin/internal notes',
      },
      
      // Metadata
      metadata: {
        type: Sequelize.JSON,
        allowNull: true,
        comment: 'Additional transaction data',
      },
      
      // Fee information
      transaction_fee: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true,
        defaultValue: 0,
      },
      net_amount: {
        type: Sequelize.DECIMAL(12, 2),
        allowNull: true,
        comment: 'Amount after fees',
      },
      
      // Timestamps for different statuses
      initiated_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      processed_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      completed_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      failed_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      cancelled_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      approved_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      
      // Reconciliation
      reconciled: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
      },
      reconciled_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      
      // Audit fields
      created_by_ip: {
        type: Sequelize.STRING(45),
        allowNull: true,
      },
      updated_by_ip: {
        type: Sequelize.STRING(45),
        allowNull: true,
      },
      
      // System timestamps
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('NOW()'),
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('NOW()'),
      },
    });

    // Create indexes
    await queryInterface.addIndex('transactions', ['order_reference'], {
      name: 'idx_transactions_order_ref',
      unique: true,
    });
    
    await queryInterface.addIndex('transactions', ['user_id'], {
      name: 'idx_transactions_user',
    });
    
    await queryInterface.addIndex('transactions', ['status'], {
      name: 'idx_transactions_status',
    });
    
    await queryInterface.addIndex('transactions', ['type'], {
      name: 'idx_transactions_type',
    });
    
    await queryInterface.addIndex('transactions', ['created_at'], {
      name: 'idx_transactions_created',
    });
    
    await queryInterface.addIndex('transactions', ['payment_reference'], {
      name: 'idx_transactions_payment_ref',
    });
    
    await queryInterface.addIndex('transactions', ['user_id', 'status'], {
      name: 'idx_transactions_user_status',
    });
    
    await queryInterface.addIndex('transactions', ['user_id', 'type'], {
      name: 'idx_transactions_user_type',
    });
    
    await queryInterface.addIndex('transactions', ['tournament_id'], {
      name: 'idx_transactions_tournament',
    });
    
    await queryInterface.addIndex('transactions', ['reconciled'], {
      name: 'idx_transactions_reconciled',
    });
  },

  async down(queryInterface, Sequelize) {
    // Remove indexes first
    const indexes = [
      'idx_transactions_order_ref',
      'idx_transactions_user',
      'idx_transactions_status',
      'idx_transactions_type',
      'idx_transactions_created',
      'idx_transactions_payment_ref',
      'idx_transactions_user_status',
      'idx_transactions_user_type',
      'idx_transactions_tournament',
      'idx_transactions_reconciled'
    ];
    
    for (const index of indexes) {
      try {
        await queryInterface.removeIndex('transactions', index);
      } catch (error) {
        console.log(`Index ${index} may not exist, skipping...`);
      }
    }
    
    // Drop table
    await queryInterface.dropTable('transactions');
  },
};