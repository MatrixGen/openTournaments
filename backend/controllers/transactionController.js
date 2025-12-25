const { sequelize, Transaction, PaymentRecord, User } = require("../models");
const ClickPesaService = require("../services/clickPesaThirdPartyService");
const { Op } = require("sequelize");
const { Parser } = require('json2csv');

class TransactionController {
  /**
   * Get all transactions with filters
   */
  static async getTransactions(req, res) {
    try {
      const userId = req.user.id;
      const {
        page = 1,
        limit = 20,
        type,
        status,
        startDate,
        endDate,
        minAmount,
        maxAmount,
        search,
        period = 'month'
      } = req.query;

      const offset = (page - 1) * limit;
      const whereClause = { user_id: userId };

      // Type filter
      if (type && type !== 'all') {
        whereClause.type = type;
      }

      // Status filter - adjust to match model enum
      if (status && status !== 'all') {
        // Map controller status to model status
        const statusMap = {
          'completed': 'successful', // Map 'completed' to 'successful'
          'successful': 'successful',
          'failed': 'failed',
          'pending': 'pending',
          'processing': 'processing',
          'initiated': 'initiated',
          'cancelled': 'cancelled',
          'refunded': 'refunded',
          'reversed': 'reversed',
          'expired': 'expired'
        };
        whereClause.status = statusMap[status] || status;
      }

      // Date filters
      if (startDate || endDate || period) {
        whereClause.created_at = {};
        
        if (startDate) {
          whereClause.created_at[Op.gte] = new Date(startDate);
        }
        
        if (endDate) {
          whereClause.created_at[Op.lte] = new Date(endDate);
        }
        
        if (period && period !== 'all') {
          const date = new Date();
          switch (period) {
            case 'today':
              whereClause.created_at[Op.gte] = new Date(date.setHours(0, 0, 0, 0));
              break;
            case 'yesterday':
              date.setDate(date.getDate() - 1);
              whereClause.created_at[Op.between] = [
                new Date(date.setHours(0, 0, 0, 0)),
                new Date(date.setHours(23, 59, 59, 999))
              ];
              break;
            case 'week':
              const firstDayOfWeek = new Date(date.setDate(date.getDate() - date.getDay()));
              whereClause.created_at[Op.gte] = new Date(firstDayOfWeek.setHours(0, 0, 0, 0));
              break;
            case 'month':
              whereClause.created_at[Op.gte] = new Date(date.getFullYear(), date.getMonth(), 1);
              break;
            case 'quarter':
              const quarter = Math.floor(date.getMonth() / 3);
              whereClause.created_at[Op.gte] = new Date(date.getFullYear(), quarter * 3, 1);
              break;
            case 'year':
              whereClause.created_at[Op.gte] = new Date(date.getFullYear(), 0, 1);
              break;
          }
        }
      }

      // Amount filters
      if (minAmount || maxAmount) {
        whereClause.amount = {};
        if (minAmount) whereClause.amount[Op.gte] = parseFloat(minAmount);
        if (maxAmount) whereClause.amount[Op.lte] = parseFloat(maxAmount);
      }

      // Search filter
      if (search) {
        whereClause[Op.or] = [
          { order_reference: { [Op.like]: `%${search}%` } },
          { payment_reference: { [Op.like]: `%${search}%` } },
          { gateway_type: { [Op.like]: `%${search}%` } }
        ];
      }

      const { count, rows: transactions } = await Transaction.findAndCountAll({
        where: whereClause,
        order: [["created_at", "DESC"]],
        limit: parseInt(limit),
        offset: parseInt(offset),
        include: [
          {
            model: User,
            as: 'user', // Fixed: Added 'as' parameter
            attributes: ['id', 'username', 'email', 'phone_number'],
          }
        ],
      });

      res.json({
        success: true,
        data: {
          transactions,
          total: count,
          page: parseInt(page),
          pages: Math.ceil(count / limit),
          limit: parseInt(limit),
        },
      });
    } catch (err) {
      console.error("Get transactions error:", err);
      res.status(500).json({
        success: false,
        error: err.message,
        code: "TRANSACTIONS_FETCH_FAILED",
      });
    }
  }

  /**
   * Get transaction by ID
   */
  static async getTransactionById(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.id;
      
      console.log('body is:',);
      
      

      const transaction = await Transaction.findOne({
        where: { id, user_id: userId },
        include: [
          {
            model: User,
            as: 'user', // Fixed: Added 'as' parameter
            attributes: ['id', 'username', 'email', 'phone_number', 'wallet_balance'],
          }
        ],
      });

      if (!transaction) {
        return res.status(404).json({
          success: false,
          error: "Transaction not found",
        });
      }

      res.json({
        success: true,
        data: transaction,
      });
    } catch (err) {
      console.error("Get transaction by ID error:", err);
      res.status(500).json({
        success: false,
        error: err.message,
        code: "TRANSACTION_FETCH_FAILED",
      });
    }
  }

  /**
   * Check if transaction is in final state
   */
  static isFinalStatus(status) {
    return ["successful", "failed", "cancelled", "expired", "refunded", "reversed","completed"].includes(status);
  }

  /**
   * Check if transaction is pending
   */
  static isPendingStatus(status) {
    return ["pending", "processing", "initiated"].includes(status);
  }

  /**
   * Reconcile transaction
   */
  static async reconcileTransaction(req, res) {
    const t = await sequelize.transaction();
    try {
      const { id } = req.params;
      const userId = req.user.id;

      const transaction = await Transaction.findOne({
        where: { id, user_id: userId },
        transaction: t,
        lock: t.LOCK.UPDATE,
      });

      if (!transaction) {
        await t.rollback();
        return res.status(404).json({
          success: false,
          error: "Transaction not found",
        });
      }

      // Only reconcile deposit transactions with ClickPesa
      if (transaction.type !== 'wallet_deposit') {
        await t.rollback();
        return res.json({
          success: true,
          reconciled: false,
          message: "This transaction type does not require reconciliation",
        });
      }

      // Check if transaction is already finalized
      if (TransactionController.isFinalStatus(transaction.status)) {
        await t.rollback();
        return res.json({
          success: true,
          reconciled: false,
          message: "Transaction is already finalized",
        });
      }

      // Query ClickPesa for latest status
      let clickpesaData = null;
      try {
        clickpesaData = await ClickPesaService.queryPaymentStatus(
          transaction.order_reference
        );
        
      } catch (error) {
        console.error("ClickPesa API error:", error.message);
        
        // If payment is older than 10 minutes and we can't reach ClickPesa,
        // mark as expired if still pending
        const paymentAge = Date.now() - new Date(transaction.created_at).getTime();
        if (paymentAge > 10 * 60 * 1000 && TransactionController.isPendingStatus(transaction.status)) {
          await transaction.update(
            {
              status: "expired",
              gateway_status: "EXPIRED",
              metadata: {
                ...transaction.metadata,
                last_status_check: new Date().toISOString(),
                reconciliation_note: "Marked as expired after failed status check",
                clickpesa_unreachable: true,
              },
            },
            { transaction: t }
          );

          await t.commit();
          return res.json({
            success: true,
            reconciled: true,
            new_status: "expired",
            reason: "Payment expired after failed status check",
          });
        }
        
        await t.rollback();
        return res.status(500).json({
          success: false,
          error: "Failed to query ClickPesa API",
        });
      }

      // Check if we got valid data
      if (!clickpesaData || clickpesaData.length === 0) {
        // No data from ClickPesa - payment might not exist there
        const paymentAge = Date.now() - new Date(transaction.created_at).getTime();
        if (paymentAge > 5 * 60 * 1000 && TransactionController.isPendingStatus(transaction.status)) {
          await transaction.update(
            {
              status: "failed",
              gateway_status: "NOT_FOUND",
              metadata: {
                ...transaction.metadata,
                last_status_check: new Date().toISOString(),
                reconciliation_note: "Payment not found in ClickPesa after timeout",
              },
            },
            { transaction: t }
          );

          await t.commit();
          return res.json({
            success: true,
            reconciled: true,
            new_status: "failed",
            reason: "Payment not found in ClickPesa after timeout",
          });
        }

        await t.rollback();
        return res.json({
          success: true,
          reconciled: false,
          reason: "Payment still within timeout period",
        });
      }

      const latestTransaction = clickpesaData[0];
      const remoteStatus = latestTransaction.status;
      const mappedStatus = TransactionController.mapClickPesaStatus(remoteStatus);

      // If status hasn't changed, do nothing
      if (transaction.status === mappedStatus) {
        await transaction.update(
          {
            metadata: {
              ...transaction.metadata,
              last_status_check: new Date().toISOString(),
            },
          },
          { transaction: t }
        );

        await t.commit();
        return res.json({
          success: true,
          reconciled: false,
          current_status: mappedStatus,
          reason: "Status unchanged",
        });
      }

      // Update transaction based on ClickPesa status
      const updates = {
        status: mappedStatus,
        gateway_status: remoteStatus,
        metadata: {
          ...transaction.metadata,
          last_status_check: new Date().toISOString(),
          clickpesa_status: remoteStatus,
          clickpesa_data: latestTransaction,
          reconciled_at: new Date().toISOString(),
        },
        reconciled: true,
        reconciled_at: new Date(),
      };

      // If successful, update wallet balance
      if (mappedStatus === "successful") {
        const user = await User.findByPk(userId, {
          transaction: t,
          lock: t.LOCK.UPDATE,
        });

        if (user) {
          const transactionAmount = parseFloat(transaction.amount);
          const currentBalance = parseFloat(user.wallet_balance);
          const newBalance = currentBalance + transactionAmount;

          await user.update(
            { wallet_balance: newBalance },
            { transaction: t }
          );

          updates.balance_after = newBalance;
          
          // Update any associated payment record
          await PaymentRecord.update(
            { status: "successful" },
            {
              where: { order_reference: transaction.order_reference },
              transaction: t,
            }
          );
        }
      }

      await transaction.update(updates, { transaction: t });
      await t.commit();

      res.json({
        success: true,
        reconciled: true,
        previous_status: transaction._previousDataValues.status,
        new_status: mappedStatus,
        clickpesa_status: remoteStatus,
        transaction_id: id,
      });
    } catch (err) {
      await t.rollback();
      console.error("Reconcile transaction error:", err);
      res.status(500).json({
        success: false,
        error: err.message,
        code: "TRANSACTION_RECONCILE_FAILED",
      });
    }
  }

  /**
   * Batch reconcile transactions
   */
  static async batchReconcileTransactions(req, res) {
    const t = await sequelize.transaction();
    try {
      const { transactionIds } = req.body;
      const userId = req.user.id;

      if (!Array.isArray(transactionIds) || transactionIds.length === 0) {
        await t.rollback();
        return res.status(400).json({
          success: false,
          error: "No transaction IDs provided",
        });
      }

      const results = [];
      const reconciled = [];

      for (const transactionId of transactionIds) {
        try {
          const transaction = await Transaction.findOne({
            where: { id: transactionId, user_id: userId },
            transaction: t,
          });

          if (!transaction) {
            results.push({
              transactionId,
              success: false,
              error: "Transaction not found",
            });
            continue;
          }

          // Skip if already finalized
          if (TransactionController.isFinalStatus(transaction.status)) {
            results.push({
              transactionId,
              success: true,
              reconciled: false,
              reason: "Already finalized",
            });
            continue;
          }

          // Only reconcile deposit transactions
          if (transaction.type !== 'wallet_deposit') {
            results.push({
              transactionId,
              success: true,
              reconciled: false,
              reason: "Not a deposit transaction",
            });
            continue;
          }

          // Query ClickPesa
          let clickpesaData = null;
          try {
            clickpesaData = await ClickPesaService.queryPaymentStatus(
              transaction.order_reference
            );
            
          } catch (error) {
            results.push({
              transactionId,
              success: false,
              error: "ClickPesa API error",
            });
            continue;
          }

          if (!clickpesaData || clickpesaData.length === 0) {
            const paymentAge = Date.now() - new Date(transaction.created_at).getTime();
            if (paymentAge > 5 * 60 * 1000 && TransactionController.isPendingStatus(transaction.status)) {
              await transaction.update(
                {
                  status: "failed",
                  gateway_status: "NOT_FOUND",
                  metadata: {
                    ...transaction.metadata,
                    last_status_check: new Date().toISOString(),
                    reconciliation_note: "Payment not found in ClickPesa after timeout",
                  },
                },
                { transaction: t }
              );
              
              reconciled.push(transactionId);
              results.push({
                transactionId,
                success: true,
                reconciled: true,
                new_status: "failed",
              });
            } else {
              results.push({
                transactionId,
                success: true,
                reconciled: false,
                reason: "Still within timeout period",
              });
            }
            continue;
          }

          const latestTransaction = clickpesaData[0];
          const remoteStatus = latestTransaction.status;
          const mappedStatus = TransactionController.mapClickPesaStatus(remoteStatus);

          if (transaction.status !== mappedStatus) {
            const updates = {
              status: mappedStatus,
              gateway_status: remoteStatus,
              metadata: {
                ...transaction.metadata,
                last_status_check: new Date().toISOString(),
                clickpesa_status: remoteStatus,
                clickpesa_data: latestTransaction,
                reconciled_at: new Date().toISOString(),
              },
              reconciled: true,
              reconciled_at: new Date(),
            };

            if (mappedStatus === "successful") {
              const user = await User.findByPk(userId, {
                transaction: t,
                lock: t.LOCK.UPDATE,
              });

              if (user) {
                const transactionAmount = parseFloat(transaction.amount);
                const currentBalance = parseFloat(user.wallet_balance);
                const newBalance = currentBalance + transactionAmount;

                await user.update(
                  { wallet_balance: newBalance },
                  { transaction: t }
                );

                updates.balance_after = newBalance;
                
                await PaymentRecord.update(
                  { status: "successful" },
                  {
                    where: { order_reference: transaction.order_reference },
                    transaction: t,
                  }
                );
              }
            }

            await transaction.update(updates, { transaction: t });
            reconciled.push(transactionId);
            
            results.push({
              transactionId,
              success: true,
              reconciled: true,
              previous_status: transaction._previousDataValues.status,
              new_status: mappedStatus,
            });
          } else {
            results.push({
              transactionId,
              success: true,
              reconciled: false,
              reason: "Status unchanged",
            });
          }
        } catch (err) {
          results.push({
            transactionId,
            success: false,
            error: err.message,
          });
        }

        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      await t.commit();

      res.json({
        success: true,
        reconciled: reconciled.length,
        total: transactionIds.length,
        details: results,
      });
    } catch (err) {
      await t.rollback();
      console.error("Batch reconcile error:", err);
      res.status(500).json({
        success: false,
        error: err.message,
        code: "BATCH_RECONCILE_FAILED",
      });
    }
  }

  /**
   * Get transaction statistics
   */
  static async getTransactionStats(req, res) {
    try {
      const userId = req.user.id;
      const { period = 'month' } = req.query;

      // Calculate date range based on period
      const date = new Date();
      let startDate = new Date();
      
      switch (period) {
        case 'today':
          startDate.setHours(0, 0, 0, 0);
          break;
        case 'week':
          startDate.setDate(date.getDate() - 7);
          break;
        case 'month':
          startDate.setMonth(date.getMonth() - 1);
          break;
        case 'quarter':
          startDate.setMonth(date.getMonth() - 3);
          break;
        case 'year':
          startDate.setFullYear(date.getFullYear() - 1);
          break;
        default:
          startDate = new Date(0); // All time
      }

      // Get current period stats
      const currentStats = await Transaction.findAll({
        where: {
          user_id: userId,
          created_at: { [Op.gte]: startDate },
        },
        attributes: [
          [sequelize.fn('COUNT', sequelize.col('id')), 'total_transactions'],
          [sequelize.fn('SUM', sequelize.col('amount')), 'total_volume'],
          [sequelize.fn('AVG', sequelize.col('amount')), 'average_transaction'],
        ],
        raw: true,
      });

      // Get previous period stats for comparison
      const previousStartDate = new Date(startDate);
      let previousEndDate = new Date(startDate);
      
      switch (period) {
        case 'today':
          previousStartDate.setDate(previousStartDate.getDate() - 1);
          previousEndDate = new Date(startDate);
          break;
        case 'week':
          previousStartDate.setDate(previousStartDate.getDate() - 7);
          previousEndDate = new Date(startDate);
          break;
        case 'month':
          previousStartDate.setMonth(previousStartDate.getMonth() - 1);
          previousEndDate = new Date(startDate);
          break;
        default:
          previousStartDate = new Date(0);
          previousEndDate = new Date(0);
      }

      const previousStats = await Transaction.findAll({
        where: {
          user_id: userId,
          created_at: { [Op.between]: [previousStartDate, previousEndDate] },
        },
        attributes: [
          [sequelize.fn('COUNT', sequelize.col('id')), 'total_transactions'],
          [sequelize.fn('SUM', sequelize.col('amount')), 'total_volume'],
          [sequelize.fn('AVG', sequelize.col('amount')), 'average_transaction'],
        ],
        raw: true,
      });

      // Get status counts - use model's status values
      const statusCounts = await Transaction.findAll({
        where: {
          user_id: userId,
          created_at: { [Op.gte]: startDate },
        },
        attributes: [
          'status',
          [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
        ],
        group: ['status'],
        raw: true,
      });

      // Get success rate
      const successfulCount = statusCounts.find(s => s.status === 'successful')?.count || 0;
      const totalCount = currentStats[0]?.total_transactions || 0;
      const successRate = totalCount > 0 ? Math.round((successfulCount / totalCount) * 100) : 0;

      // Get pending transactions count - use model's pending statuses
      const pendingCount = statusCounts
        .filter(s => ['pending', 'processing', 'initiated'].includes(s.status))
        .reduce((sum, s) => sum + parseInt(s.count), 0);

      // Calculate changes
      const currentTotal = parseInt(currentStats[0]?.total_transactions) || 0;
      const previousTotal = parseInt(previousStats[0]?.total_transactions) || 0;
      const transactionsChange = previousTotal > 0 
        ? Math.round(((currentTotal - previousTotal) / previousTotal) * 100)
        : 0;

      const currentVolume = parseFloat(currentStats[0]?.total_volume) || 0;
      const previousVolume = parseFloat(previousStats[0]?.total_volume) || 0;
      const volumeChange = previousVolume > 0
        ? Math.round(((currentVolume - previousVolume) / previousVolume) * 100)
        : 0;

      res.json({
        success: true,
        data: {
          total_transactions: currentTotal,
          total_volume: currentVolume,
          average_transaction: Math.round(currentStats[0]?.average_transaction) || 0,
          pending_transactions: pendingCount,
          success_rate: successRate,
          transactions_change: transactionsChange,
          volume_change: volumeChange,
          success_rate_change: 0, // You can add previous success rate calculation if needed
          average_change: 0, // You can add previous average calculation if needed
        },
      });
    } catch (err) {
      console.error("Get transaction stats error:", err);
      res.status(500).json({
        success: false,
        error: err.message,
        code: "STATS_FETCH_FAILED",
      });
    }
  }

  /**
   * Get pending transactions
   */
  static async getPendingTransactions(req, res) {
    try {
      const userId = req.user.id;
      const { limit = 50, hours = 24 } = req.query;

      const cutoffDate = new Date(Date.now() - hours * 60 * 60 * 1000);
      
      const pendingTransactions = await Transaction.findAll({
        where: {
          user_id: userId,
          status: { [Op.in]: ["pending", "processing", "initiated"] },
          created_at: {
            [Op.lt]: new Date(Date.now() - 5 * 60 * 1000), // Older than 5 minutes
            [Op.gt]: cutoffDate,
          },
        },
        limit: parseInt(limit),
        order: [["created_at", "ASC"]],
        include: [
          {
            model: User,
            as: 'user',
            attributes: ['id', 'username', 'email', 'phone'],
          }
        ],
      });

      res.json({
        success: true,
        data: pendingTransactions,
      });
    } catch (err) {
      console.error("Get pending transactions error:", err);
      res.status(500).json({
        success: false,
        error: err.message,
        code: "PENDING_TRANSACTIONS_FETCH_FAILED",
      });
    }
  }

  /**
   * Export transactions to CSV
   */
  static async exportTransactions(req, res) {
    try {
      const userId = req.user.id;
      const filters = req.query;

      const whereClause = { user_id: userId };

      // Apply filters similar to getTransactions
      if (filters.type && filters.type !== 'all') {
        whereClause.type = filters.type;
      }

      if (filters.status && filters.status !== 'all') {
        // Map controller status to model status
        const statusMap = {
          'completed': 'successful',
          'successful': 'successful',
          'failed': 'failed',
          'pending': 'pending',
          'processing': 'processing',
          'initiated': 'initiated',
          'cancelled': 'cancelled',
          'refunded': 'refunded',
          'reversed': 'reversed',
          'expired': 'expired'
        };
        whereClause.status = statusMap[filters.status] || filters.status;
      }

      if (filters.startDate || filters.endDate) {
        whereClause.created_at = {};
        if (filters.startDate) whereClause.created_at[Op.gte] = new Date(filters.startDate);
        if (filters.endDate) whereClause.created_at[Op.lte] = new Date(filters.endDate);
      }

      const transactions = await Transaction.findAll({
        where: whereClause,
        order: [["created_at", "DESC"]],
      });

      // Prepare data for CSV
      const data = transactions.map(t => ({
        ID: t.id,
        'Order Reference': t.order_reference,
        Type: t.type,
        Amount: t.amount,
        Currency: t.currency || 'TZS',
        Status: t.status,
        'Gateway Status': t.gateway_status || 'N/A',
        'Balance Before': t.balance_before || 0,
        'Balance After': t.balance_after || 0,
        'Created At': t.created_at,
        'Updated At': t.updated_at,
        'Gateway Type': t.gateway_type || 'N/A',
        'Payment Reference': t.payment_reference || 'N/A',
        'Transaction Fee': t.transaction_fee || 0,
        'Net Amount': t.net_amount || t.amount,
        'Description': t.description || '',
      }));

      const fields = [
        'ID',
        'Order Reference',
        'Type',
        'Amount',
        'Currency',
        'Status',
        'Gateway Status',
        'Balance Before',
        'Balance After',
        'Created At',
        'Updated At',
        'Gateway Type',
        'Payment Reference',
        'Transaction Fee',
        'Net Amount',
        'Description',
      ];

      const json2csvParser = new Parser({ fields });
      const csv = json2csvParser.parse(data);

      res.header('Content-Type', 'text/csv');
      res.attachment(`transactions-${new Date().toISOString().split('T')[0]}.csv`);
      res.send(csv);
    } catch (err) {
      console.error("Export transactions error:", err);
      res.status(500).json({
        success: false,
        error: err.message,
        code: "EXPORT_FAILED",
      });
    }
  }

  /**
   * Get transaction summary by period
   */
  static async getTransactionSummary(req, res) {
    try {
      const userId = req.user.id;
      const { period = 'month' } = req.query;

      let groupBy;
      let dateFormat;

      switch (period) {
        case 'day':
          groupBy = 'DATE(created_at)';
          dateFormat = '%Y-%m-%d';
          break;
        case 'week':
          groupBy = 'YEARWEEK(created_at)';
          dateFormat = '%Y-%U';
          break;
        case 'month':
          groupBy = 'DATE_FORMAT(created_at, "%Y-%m")';
          dateFormat = '%Y-%m';
          break;
        default:
          groupBy = 'DATE_FORMAT(created_at, "%Y-%m")';
          dateFormat = '%Y-%m';
      }

      const summary = await sequelize.query(`
        SELECT 
          DATE_FORMAT(created_at, :dateFormat) as period,
          COUNT(*) as transaction_count,
          SUM(amount) as total_amount,
          SUM(CASE WHEN status = 'successful' THEN amount ELSE 0 END) as successful_amount,
          SUM(CASE WHEN status = 'failed' THEN amount ELSE 0 END) as failed_amount,
          COUNT(CASE WHEN status = 'successful' THEN 1 END) as successful_count,
          COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_count,
          COUNT(CASE WHEN status IN ('pending', 'processing', 'initiated') THEN 1 END) as pending_count
        FROM transactions
        WHERE user_id = :userId
        GROUP BY ${groupBy}
        ORDER BY period DESC
        LIMIT 12
      `, {
        replacements: { userId, dateFormat },
        type: sequelize.QueryTypes.SELECT,
      });

      res.json({
        success: true,
        data: summary,
      });
    } catch (err) {
      console.error("Get transaction summary error:", err);
      res.status(500).json({
        success: false,
        error: err.message,
        code: "SUMMARY_FETCH_FAILED",
      });
    }
  }

  /**
   * Map ClickPesa status to internal status
   */
  static mapClickPesaStatus(status) {
    if (!status) return "pending";

    const statusMap = {
      PROCESSING: "processing",
      PENDING: "pending",
      SUCCESS: "completed",
      SETTLED: "completed",
      FAILED: "failed",
      EXPIRED: "expired",
      CANCELLED: "cancelled",
      REFUNDED: "refunded",
      REVERSED: "reversed",
      AUTHORIZED: "authorized",
      INITIATED: "initiated",
    };
    
    // Map to model's status values
    const mappedStatus = statusMap[status.toUpperCase()] || "pending";
    
    // If 'authorized' is returned, treat as 'pending' since we don't have 'authorized' status
    if (mappedStatus === "authorized") {
      return "pending";
    }
    
    return mappedStatus;
  }
}

module.exports = TransactionController;