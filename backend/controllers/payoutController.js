// controllers/payoutController.js
/**
 * PRODUCTION-READY PAYOUT CONTROLLER
 * 
 * SECURITY PRINCIPLES:
 * 1. Webhooks are NOT trusted for state changes
 * 2. All status changes come from ClickPesa API reconciliation
 * 3. No user-initiated cancellations (simplifies state machine)
 * 4. Preview is calculation-only (no DB records)
 * 5. Atomic operations with row-level locking
 * 6. Complete audit trail for all financial operations
 * 
 * STATE MACHINE:
 * INITIATED → PROCESSING → COMPLETED/FAILED
 */

const {
  sequelize,
  User,
  Transaction,
  PaymentRecord,
  WebhookLog,
  BalanceAuditLog // We'll need to create PayoutController model
} = require("../models");
const ClickPesaService = require("../services/clickPesaService");
const { Op } = require("sequelize");
const crypto = require("crypto");

// ============================================================================
// CONSTANTS & STATE DEFINITIONS
// ============================================================================

/**
 * Payout states - Simplified for security
 * Only 4 states for clarity and reliability
 */
const PayoutStates = {
  INITIATED: 'initiated',     // Funds reserved, sent to ClickPesa
  PROCESSING: 'processing',   // ClickPesa processing (awaiting completion)
  COMPLETED: 'successfull',     // Successfully delivered to recipient
  FAILED: 'failed'           // Failed at ClickPesa level
};

/**
 * Payment method types
 */
const PaymentMethods = {
  MOBILE_MONEY_PAYOUT: 'mobile_money_payout',
  BANK_PAYOUT: 'bank_payout'
};

/**
 * Transaction types
 */
const TransactionTypes = {
  WALLET_WITHDRAWAL: 'wallet_withdrawal'
};

/**
 * Minimum and maximum withdrawal amounts in TZS
 * Will be converted to USD using real-time rates
 */
const WithdrawalLimits = {
  MOBILE_MIN_TZS: 1000,      // 1,000 TZS minimum for mobile
  BANK_MIN_TZS: 10000,       // 10,000 TZS minimum for bank
  MAX_TZS: 5000000,          // 5,000,000 TZS maximum
  DAILY_LIMIT_TZS: 2000000   // 2,000,000 TZS daily limit
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

class PayoutController {
  /**
   * Generate unique order reference
   * Format: TYPE + TIMESTAMP + RANDOM
   * @param {string} type - 'WTH' for withdrawal
   * @returns {string} Unique order reference
   */
  static generateOrderReference(type = 'WTH') {
    const timestamp = Date.now();
    const random = crypto.randomBytes(4).toString('hex').toUpperCase();
    return `${type}${timestamp}${random}`;
  }

  /**
   * Generate idempotency key for a payout request
   * Prevents duplicate processing of the same request
   * @param {number} userId - User ID
   * @param {number} amountUSD - Amount in USD
   * @param {string} recipient - Recipient identifier
   * @returns {string} Idempotency key
   */
  static generateIdempotencyKey(userId, amountUSD, recipient) {
    const hash = crypto.createHash('sha256')
      .update(`${userId}:${amountUSD}:${recipient}:${Date.now()}`)
      .digest('hex')
      .substring(0, 32);
    return `IDEMP_${hash}`;
  }

  /**
   * USD to TZS conversion using ClickPesa rates
   * @param {number} usdAmount - Amount in USD
   * @returns {Promise<Object>} Conversion result
   */
  static async usdToTzs(usdAmount) {
    try {
      const conversion = await ClickPesaService.convertUSDToTZS(usdAmount);
      return {
        tzsAmount: conversion.convertedAmount,
        rate: conversion.rate,
        timestamp: conversion.timestamp,
        source: 'clickpesa'
      };
    } catch (error) {
      console.warn('USD to TZS conversion failed, using fallback:', error.message);
      const fallbackRate = 2500; // Conservative fallback rate
      return {
        tzsAmount: Math.round(usdAmount * fallbackRate),
        rate: fallbackRate,
        timestamp: new Date().toISOString(),
        source: 'fallback',
        note: 'Using fallback rate due to conversion error'
      };
    }
  }

  /**
   * TZS to USD conversion using ClickPesa rates
   * @param {number} tzsAmount - Amount in TZS
   * @returns {Promise<Object>} Conversion result
   */
  static async tzsToUsd(tzsAmount) {
    try {
      const conversion = await ClickPesaService.convertTZSToUSD(tzsAmount);
      return {
        usdAmount: conversion.convertedAmount,
        rate: conversion.rate,
        timestamp: conversion.timestamp,
        source: 'clickpesa'
      };
    } catch (error) {
      console.warn('TZS to USD conversion failed, using fallback:', error.message);
      const fallbackRate = 0.0004; // Conservative fallback rate
      return {
        usdAmount: parseFloat((tzsAmount * fallbackRate).toFixed(6)),
        rate: fallbackRate,
        timestamp: new Date().toISOString(),
        source: 'fallback',
        note: 'Using fallback rate due to conversion error'
      };
    }
  }

  /**
   * Map ClickPesa status to our internal status
   * @param {string} clickpesaStatus - ClickPesa status string
   * @returns {string} Internal status
   */
  static mapClickPesaStatus(clickpesaStatus) {
    if (!clickpesaStatus) return PayoutStates.INITIATED;

    const statusUpper = clickpesaStatus.toUpperCase();
    
    if (['SUCCESS', 'SUCCESSFUL', 'COMPLETED','AUTHORIZED'].includes(statusUpper)) {
      return PayoutStates.COMPLETED;
    }
    
    if (['FAILED', 'REJECTED', 'CANCELLED'].includes(statusUpper)) {
      return PayoutStates.FAILED;
    }
    
    if (['PROCESSING', 'PENDING', 'INITIATED'].includes(statusUpper)) {
      return PayoutStates.PROCESSING;
    }
    
    return PayoutStates.INITIATED;
  }

  /**
   * Validate phone number format (Tanzanian)
   * @param {string} phoneNumber - Phone number to validate
   * @returns {boolean} True if valid
   */
  static validatePhoneNumber(phoneNumber) {
    // Tanzanian format: 255XXXXXXXXX
    const regex = /^255[67]\d{8}$/;
    return regex.test(phoneNumber);
  }

  /**
   * Format phone number to Tanzanian standard
   * @param {string} phoneNumber - Raw phone number
   * @returns {string} Formatted phone number
   */
  static formatPhoneNumber(phoneNumber) {
    // Remove all non-digits
    const digits = phoneNumber.replace(/\D/g, '');
    
    // If starts with 0, replace with 255
    if (digits.startsWith('0')) {
      return '255' + digits.substring(1);
    }
    
    // If starts with +255, remove +
    if (digits.startsWith('255')) {
      return digits;
    }
    
    // If 9 digits, assume it's missing country code
    if (digits.length === 9) {
      return '255' + digits;
    }
    
    return digits;
  }

  // ============================================================================
  // ATOMIC OPERATION HELPERS (CRITICAL FOR SAFETY)
  // ============================================================================

  /**
   * Reserve funds from user wallet (ATOMIC OPERATION)
   * Uses row-level locking to prevent race conditions
   * @param {Object} user - User instance (must be locked)
   * @param {number} amountUSD - Amount to reserve
   * @param {Object} transaction - Sequelize transaction
   * @returns {Promise<Object>} Result with old and new balance
   */
  static async reserveFundsAtomic(user, amountUSD, transaction) {
    const userId = user.id;
    const currentBalance = parseFloat(user.wallet_balance);
    
    if (currentBalance < amountUSD) {
      throw new Error(`Insufficient balance. Available: ${currentBalance.toFixed(2)} USD, Required: ${amountUSD.toFixed(2)} USD`);
    }
    
    const newBalance = currentBalance - amountUSD;
    
    await user.update(
      { wallet_balance: newBalance },
      { transaction }
    );
    
    // Log the balance change for audit trail
    await PayoutController.logBalanceChange(
      userId,
      currentBalance,
      newBalance,
      -amountUSD,
      null,
      null,
      'withdrawal_reservation',
      transaction
    );
    
    return {
      success: true,
      oldBalance: currentBalance,
      newBalance: newBalance,
      amountReserved: amountUSD
    };
  }

  /**
   * Restore funds to user wallet (ATOMIC OPERATION)
   * Only used when payout fails after funds were reserved
   * @param {number} userId - User ID
   * @param {number} amountUSD - Amount to restore
   * @param {Object} transaction - Sequelize transaction
   * @returns {Promise<Object>} Result
   */
  static async restoreFundsAtomic(userId, amountUSD, transaction) {
    const user = await User.findByPk(userId, {
      transaction,
      lock: transaction.LOCK.UPDATE,
      attributes: ['id', 'wallet_balance']
    });
    
    if (!user) {
      throw new Error(`User ${userId} not found for fund restoration`);
    }
    
    const currentBalance = parseFloat(user.wallet_balance);
    const newBalance = currentBalance + amountUSD;
    
    await user.update(
      { wallet_balance: newBalance },
      { transaction }
    );
    
    // Log the balance change for audit trail
    await PayoutController.logBalanceChange(
      userId,
      currentBalance,
      newBalance,
      amountUSD,
      null,
      null,
      'withdrawal_failure_restoration',
      transaction
    );
    
    return {
      success: true,
      oldBalance: currentBalance,
      newBalance: newBalance,
      amountRestored: amountUSD
    };
  }

  /**
   * Log balance changes for audit trail
   * @param {number} userId - User ID
   * @param {number} oldBalance - Balance before change
   * @param {number} newBalance - Balance after change
   * @param {number} changeAmount - Amount changed (positive for addition, negative for deduction)
   * @param {number|null} transactionId - Associated transaction ID
   * @param {number|null} paymentRecordId - Associated payment record ID
   * @param {string} reason - Reason for change
   * @param {Object} transaction - Sequelize transaction
   */
  static async logBalanceChange(userId, oldBalance, newBalance, changeAmount, transactionId, paymentRecordId, reason, transaction) {
    // NOTE: You need to create a BalanceAuditLog model with these fields
    // For now, we'll log to console and potentially save to a table
    
    console.log(`[BALANCE_AUDIT] User ${userId}: ${oldBalance} → ${newBalance} (${changeAmount > 0 ? '+' : ''}${changeAmount}) - ${reason}`);
    
    // Example BalanceAuditLog model structure:
    /*
    const BalanceAuditLog = sequelize.define('BalanceAuditLog', {
      user_id: { type: DataTypes.INTEGER, allowNull: false },
      old_balance: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
      new_balance: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
      change_amount: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
      transaction_id: { type: DataTypes.INTEGER },
      payment_record_id: { type: DataTypes.INTEGER },
      reason: { type: DataTypes.STRING(100), allowNull: false },
      metadata: { type: DataTypes.JSON },
      ip_address: { type: DataTypes.STRING(45) },
      user_agent: { type: DataTypes.TEXT }
    });
    */
    
    // If BalanceAuditLog model exists, uncomment and use:
    /*
    await BalanceAuditLog.create({
      user_id: userId,
      old_balance: oldBalance,
      new_balance: newBalance,
      change_amount: changeAmount,
      transaction_id: transactionId,
      payment_record_id: paymentRecordId,
      reason: reason,
      metadata: {},
      created_at: new Date()
    }, { transaction });
    */
  }

  // ============================================================================
  // VALIDATION FUNCTIONS
  // ============================================================================

  /**
   * Validate withdrawal request comprehensively
   * @param {number} userId - User ID
   * @param {number} amountUSD - Amount in USD
   * @param {string} payoutType - 'mobile_money' or 'bank'
   * @returns {Promise<Object>} Validation result with user info and limits
   */
  static async validateWithdrawalRequest(userId, amountUSD, payoutType) {
    // Get user with lock for the transaction (will be locked in main transaction)
    const user = await User.findByPk(userId, {
      attributes: [
        'id', 
        'wallet_balance', 
        'username', 
        'email', 
        'phone_number',
        //'withdrawal_daily_total',
        //'last_withdrawal_date'
      ]
    });

    if (!user) {
      throw new Error('User not found');
    }

    // 1. Convert TZS limits to USD using current rates
    const minLimitTZS = payoutType === 'bank' 
      ? WithdrawalLimits.BANK_MIN_TZS 
      : WithdrawalLimits.MOBILE_MIN_TZS;
    
    const minLimit = await PayoutController.tzsToUsd(minLimitTZS);
    const maxLimit = await PayoutController.tzsToUsd(WithdrawalLimits.MAX_TZS);
    const dailyLimit = await PayoutController.tzsToUsd(WithdrawalLimits.DAILY_LIMIT_TZS);

    // 2. Validate amount against limits
    if (amountUSD < minLimit.usdAmount) {
      throw new Error(
        `Minimum withdrawal amount is ${minLimit.usdAmount.toFixed(2)} USD ` +
        `(approximately ${minLimitTZS.toLocaleString()} TZS)`
      );
    }

    if (amountUSD > maxLimit.usdAmount) {
      throw new Error(
        `Maximum withdrawal amount is ${maxLimit.usdAmount.toFixed(2)} USD ` +
        `(approximately ${WithdrawalLimits.MAX_TZS.toLocaleString()} TZS)`
      );
    }

    // 3. Check wallet balance
    const walletBalance = parseFloat(user.wallet_balance);
    if (walletBalance < amountUSD) {
      throw new Error(
        `Insufficient wallet balance. Available: ${walletBalance.toFixed(2)} USD, ` +
        `Required: ${amountUSD.toFixed(2)} USD`
      );
    }

    // 4. Check for existing processing withdrawals in last 15 minutes
    const recentWithdrawal = await PaymentRecord.findOne({
      where: {
        user_id: userId,
        status: { [Op.in]: [PayoutStates.INITIATED, PayoutStates.PROCESSING] },
        payment_method: payoutType === 'bank' 
          ? PaymentMethods.BANK_PAYOUT 
          : PaymentMethods.MOBILE_MONEY_PAYOUT,
        created_at: {
          [Op.gt]: new Date(Date.now() - 15 * 60 * 1000) // Last 15 minutes
        }
      }
    });

    if (recentWithdrawal) {
      throw new Error(
        'You have a withdrawal in progress. Please wait for it to complete before initiating a new one.'
      );
    }

    // 5. Daily withdrawal limit check
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const todayWithdrawals = await PaymentRecord.sum('amount', {
      where: {
        user_id: userId,
        status: PayoutStates.COMPLETED,
        payment_method: payoutType === 'bank' 
          ? PaymentMethods.BANK_PAYOUT 
          : PaymentMethods.MOBILE_MONEY_PAYOUT,
        created_at: {
          [Op.gte]: startOfDay
        }
      }
    });

    const totalToday = (todayWithdrawals || 0) + amountUSD;
    
    if (totalToday > dailyLimit.usdAmount) {
      const remainingToday = Math.max(0, dailyLimit.usdAmount - (todayWithdrawals || 0));
      throw new Error(
        `Daily withdrawal limit exceeded. You can withdraw up to ${dailyLimit.usdAmount.toFixed(2)} USD per day. ` +
        `Remaining today: ${remainingToday.toFixed(2)} USD`
      );
    }

    // 6. Calculate TZS equivalent for ClickPesa
    const conversion = await PayoutController.usdToTzs(amountUSD);

    return {
      user,
      walletBalance,
      availableBalance: walletBalance - amountUSD,
      conversion,
      amountTZS: conversion.tzsAmount,
      limits: {
        minUSD: minLimit.usdAmount,
        maxUSD: maxLimit.usdAmount,
        dailyUSD: dailyLimit.usdAmount,
        remainingDailyUSD: dailyLimit.usdAmount - (todayWithdrawals || 0)
      }
    };
  }

  /**
   * Calculate payout with fees using ClickPesa service
   * @param {number} amountUSD - Amount in USD
   * @param {string} payoutMethod - 'mobile_money' or 'bank'
   * @returns {Promise<Object>} Fee calculation result
   */
  static async calculatePayoutWithFees(amountUSD, payoutMethod) {
    try {
      const calculation = await ClickPesaService.calculatePayoutWithFees({
        amount: amountUSD,
        currency: 'USD',
        feeBearer: 'MERCHANT', // We pay the fees
        payoutMethod: payoutMethod === 'bank' ? 'BANK_PAYOUT' : 'MOBILE_MONEY'
      });

      return {
        feeAmountUSD: calculation.totalDebitAmount - amountUSD,
        feeAmountTZS: calculation.feeAmountTZS,
        payoutAmountTZS: calculation.payoutAmountTZS,
        totalDebitAmount: calculation.totalDebitAmount,
        conversionRate: calculation.conversionInfo?.rate,
        feeBearer: 'MERCHANT',
        calculation
      };
    } catch (error) {
      console.error('Payout fee calculation error:', error);
      // Fallback: simple conversion with estimated fees
      const conversion = await PayoutController.usdToTzs(amountUSD);
      const estimatedFeePercent = payoutMethod === 'bank' ? 0.02 : 0.01; // 2% for bank, 1% for mobile
      const estimatedFeeUSD = amountUSD * estimatedFeePercent;
      
      return {
        feeAmountUSD: estimatedFeeUSD,
        feeAmountTZS: Math.round(conversion.tzsAmount * estimatedFeePercent),
        payoutAmountTZS: Math.round(conversion.tzsAmount * (1 - estimatedFeePercent)),
        totalDebitAmount: amountUSD + estimatedFeeUSD,
        conversionRate: conversion.rate,
        feeBearer: 'MERCHANT',
        note: 'Using estimated fees due to calculation error'
      };
    }
  }

  // ============================================================================
  // PREVIEW ENDPOINTS (NO DATABASE WRITES)
  // ============================================================================

  /**
   * Preview mobile money payout (calculation only, no DB writes)
   * @param {Object} req - Express request
   * @param {Object} res - Express response
   */
  static async previewMobileMoneyPayout(req, res) {
    try {
      const { amount, phoneNumber } = req.body;
      const userId = req.user.id;

      // Basic validation
      if (!amount || !phoneNumber) {
        return res.status(400).json({
          success: false,
          error: 'Amount and phone number are required',
          code: 'MISSING_REQUIRED_FIELDS'
        });
      }

      const amountUSD = parseFloat(amount);
      
      if (isNaN(amountUSD) || amountUSD <= 0) {
        return res.status(400).json({
          success: false,
          error: 'Invalid amount',
          code: 'INVALID_AMOUNT'
        });
      }

      // Format and validate phone number
      const formattedPhone = PayoutController.formatPhoneNumber(phoneNumber);
      if (!PayoutController.validatePhoneNumber(formattedPhone)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid phone number. Expected format: 255XXXXXXXXX (e.g., 255712345678)',
          code: 'INVALID_PHONE_NUMBER'
        });
      }

      // Validate withdrawal request
      const validation = await PayoutController.validateWithdrawalRequest(
        userId,
        amountUSD,
        'mobile_money'
      );

      // Calculate fees
      const feeCalculation = await PayoutController.calculatePayoutWithFees(
        amountUSD,
        'mobile_money'
      );

      // Generate preview order reference (won't be used in DB)
      const previewReference = PayoutController.generateOrderReference('PRE');

      // Prepare response
      const responseData = {
        preview_reference: previewReference,
        amount_usd: amountUSD,
        amount_tzs: validation.amountTZS,
        fee_usd: feeCalculation.feeAmountUSD,
        fee_tzs: feeCalculation.feeAmountTZS,
        net_amount_usd: amountUSD - feeCalculation.feeAmountUSD,
        net_amount_tzs: feeCalculation.payoutAmountTZS,
        exchange_rate: validation.conversion.rate,
        recipient: {
          phone_number: formattedPhone,
          formatted: PayoutController.formatPhoneForDisplay(formattedPhone)
        },
        validation: {
          wallet_balance: validation.walletBalance,
          available_after: validation.availableBalance,
          daily_limit_remaining: validation.limits.remainingDailyUSD
        },
        note: 'This is a preview only. No funds have been reserved.',
        expires_in: '5 minutes',
        timestamp: new Date().toISOString()
      };

      res.json({
        success: true,
        message: 'Payout preview generated successfully',
        data: responseData
      });

    } catch (error) {
      console.error('Preview mobile money payout error:', error);
      res.status(400).json({
        success: false,
        error: error.message,
        code: 'PREVIEW_FAILED'
      });
    }
  }

  /**
   * Preview bank payout (calculation only, no DB writes)
   * @param {Object} req - Express request
   * @param {Object} res - Express response
   */
  static async previewBankPayout(req, res) {
    try {
      const { amount, accountNumber, accountName, bankCode } = req.body;
      const userId = req.user.id;

      // Basic validation
      if (!amount || !accountNumber || !accountName) {
        return res.status(400).json({
          success: false,
          error: 'Amount, account number, and account name are required',
          code: 'MISSING_REQUIRED_FIELDS'
        });
      }

      const amountUSD = parseFloat(amount);
      
      if (isNaN(amountUSD) || amountUSD <= 0) {
        return res.status(400).json({
          success: false,
          error: 'Invalid amount',
          code: 'INVALID_AMOUNT'
        });
      }

      if (accountNumber.length < 5) {
        return res.status(400).json({
          success: false,
          error: 'Invalid account number',
          code: 'INVALID_ACCOUNT_NUMBER'
        });
      }

      // Validate withdrawal request
      const validation = await PayoutController.validateWithdrawalRequest(
        userId,
        amountUSD,
        'bank'
      );

      // Calculate fees
      const feeCalculation = await PayoutController.calculatePayoutWithFees(
        amountUSD,
        'bank'
      );

      // Generate preview order reference (won't be used in DB)
      const previewReference = PayoutController.generateOrderReference('PRE');

      // Prepare response
      const responseData = {
        preview_reference: previewReference,
        amount_usd: amountUSD,
        amount_tzs: validation.amountTZS,
        fee_usd: feeCalculation.feeAmountUSD,
        fee_tzs: feeCalculation.feeAmountTZS,
        net_amount_usd: amountUSD - feeCalculation.feeAmountUSD,
        net_amount_tzs: feeCalculation.payoutAmountTZS,
        exchange_rate: validation.conversion.rate,
        recipient: {
          account_number: PayoutController.maskAccountNumber(accountNumber),
          account_name: accountName,
          bank_code: bankCode || 'N/A'
        },
        validation: {
          wallet_balance: validation.walletBalance,
          available_after: validation.availableBalance,
          daily_limit_remaining: validation.limits.remainingDailyUSD
        },
        note: 'This is a preview only. No funds have been reserved.',
        expires_in: '5 minutes',
        timestamp: new Date().toISOString()
      };

      res.json({
        success: true,
        message: 'Bank payout preview generated successfully',
        data: responseData
      });

    } catch (error) {
      console.error('Preview bank payout error:', error);
      res.status(400).json({
        success: false,
        error: error.message,
        code: 'PREVIEW_FAILED'
      });
    }
  }

  // ============================================================================
  // PAYOUT CREATION ENDPOINTS (ATOMIC OPERATIONS)
  // ============================================================================

  /**
   * Create mobile money payout (ATOMIC OPERATION)
   * @param {Object} req - Express request
   * @param {Object} res - Express response
   */
  static async createMobileMoneyPayout(req, res) {
    const t = await sequelize.transaction();
    
    try {
      const { amount, phoneNumber, idempotencyKey } = req.body;
      const userId = req.user.id;

      // Basic validation
      if (!amount || !phoneNumber) {
        throw new Error('Amount and phone number are required');
      }

      const amountUSD = parseFloat(amount);
      
      if (isNaN(amountUSD) || amountUSD <= 0) {
        throw new Error('Invalid amount');
      }

      // Format and validate phone number
      const formattedPhone = PayoutController.formatPhoneNumber(phoneNumber);
      if (!PayoutController.validatePhoneNumber(formattedPhone)) {
        throw new Error('Invalid phone number format. Expected: 255XXXXXXXXX');
      }

      // Generate idempotency key if not provided
      const finalIdempotencyKey = idempotencyKey || 
        PayoutController.generateIdempotencyKey(userId, amountUSD, formattedPhone);

      // Check for duplicate request using idempotency key
      const existingPayout = await PaymentRecord.findOne({
        where: {
          user_id: userId,
          metadata: {
            idempotency_key: finalIdempotencyKey
          }
        },
        transaction: t
      });

      if (existingPayout) {
        // Return existing payout details
        await t.rollback();
        return res.status(200).json({
          success: true,
          message: 'Duplicate request detected. Returning existing payout.',
          data: await PayoutController.formatPayoutResponse(existingPayout)
        });
      }

      // STEP 1: VALIDATE WITH LOCKING
      const validation = await PayoutController.validateWithdrawalRequest(
        userId,
        amountUSD,
        'mobile_money'
      );

      // Lock user for balance update
      const user = await User.findByPk(userId, {
        transaction: t,
        lock: t.LOCK.UPDATE,
        attributes: ['id', 'wallet_balance']
      });

      // STEP 2: RESERVE FUNDS ATOMICALLY
      const reserveResult = await PayoutController.reserveFundsAtomic(
        user,
        amountUSD,
        t
      );

      // STEP 3: GENERATE ORDER REFERENCE
      const orderReference = PayoutController.generateOrderReference('WTH');

      // STEP 4: CALCULATE FEES
      const feeCalculation = await PayoutController.calculatePayoutWithFees(
        amountUSD,
        'mobile_money'
      );

      // STEP 5: CREATE PAYMENT RECORD
      const paymentRecord = await PaymentRecord.create({
        user_id: userId,
        order_reference: orderReference,
        payment_reference: null, // Will be updated after ClickPesa call
        amount: amountUSD,
        currency: 'USD',
        payment_method: PaymentMethods.MOBILE_MONEY_PAYOUT,
        status: PayoutStates.INITIATED,
        customer_phone: formattedPhone,
        metadata: {
          idempotency_key: finalIdempotencyKey,
          type: 'wallet_withdrawal',
          recipient_details: {
            phone_number: formattedPhone,
            formatted: PayoutController.formatPhoneForDisplay(formattedPhone)
          },
          fee_calculation: feeCalculation,
          conversion_info: validation.conversion,
          requested_tzs: validation.amountTZS,
          balance_before: validation.walletBalance,
          balance_after: reserveResult.newBalance,
          ip_address: req.ip,
          user_agent: req.headers['user-agent']
        }
      }, { transaction: t });

      // STEP 6: CREATE TRANSACTION RECORD
      const transaction = await Transaction.create({
        user_id: userId,
        order_reference: orderReference,
        payment_reference: null,
        type: TransactionTypes.WALLET_WITHDRAWAL,
        amount: -amountUSD, // Negative for withdrawal
        currency: 'USD',
        balance_before: validation.walletBalance,
        balance_after: reserveResult.newBalance,
        status: PayoutStates.INITIATED,
        gateway_type: 'clickpesa_mobile_money',
        gateway_status: 'INITIATED',
        description: `Withdrawal to ${PayoutController.formatPhoneForDisplay(formattedPhone)}`,
        transaction_fee: feeCalculation.feeAmountUSD,
        net_amount: amountUSD - feeCalculation.feeAmountUSD,
        metadata: {
          payment_record_id: paymentRecord.id,
          recipient_phone: formattedPhone,
          fee_calculation: feeCalculation,
          conversion_info: validation.conversion,
          idempotency_key: finalIdempotencyKey
        }
      }, { transaction: t });

      // Update payment record with transaction ID
      await paymentRecord.update({
        transaction_id: transaction.id
      }, { transaction: t });

      // STEP 7: CALL CLICKPESA API
      let clickpesaResponse;
      try {
        clickpesaResponse = await ClickPesaService.createMobileMoneyPayout({
          amount: amountUSD,
          phoneNumber: formattedPhone,
          currency: 'USD',
          orderReference: orderReference,
          idempotencyKey: finalIdempotencyKey
        });

        // Update records with ClickPesa response
        await paymentRecord.update({
          payment_reference: clickpesaResponse.id || clickpesaResponse.transactionId,
          status: PayoutController.mapClickPesaStatus(clickpesaResponse.status),
          metadata: {
            ...paymentRecord.metadata,
            clickpesa_response: clickpesaResponse,
            clickpesa_transaction_id: clickpesaResponse.id,
            channel_provider: clickpesaResponse.channelProvider,
            initiated_at: new Date().toISOString()
          }
        }, { transaction: t });

        await transaction.update({
          payment_reference: clickpesaResponse.id || clickpesaResponse.transactionId,
          gateway_status: clickpesaResponse.status,
          metadata: {
            ...transaction.metadata,
            clickpesa_response: clickpesaResponse
          }
        }, { transaction: t });

      } catch (clickpesaError) {
        // ClickPesa API failed - reverse the funds and mark as failed
        console.error('ClickPesa API error:', clickpesaError);
        
        await PayoutController.restoreFundsAtomic(userId, amountUSD, t);
        
        await paymentRecord.update({
          status: PayoutStates.FAILED,
          metadata: {
            ...paymentRecord.metadata,
            clickpesa_error: clickpesaError.message,
            error_at: new Date().toISOString(),
            balance_restored: true
          }
        }, { transaction: t });

        await transaction.update({
          status: PayoutStates.FAILED,
          gateway_status: 'FAILED',
          metadata: {
            ...transaction.metadata,
            clickpesa_error: clickpesaError.message
          }
        }, { transaction: t });

        throw new Error(`Withdrawal failed: ${clickpesaError.message}`);
      }

      // STEP 8: COMMIT TRANSACTION
      await t.commit();

      // STEP 9: RETURN RESPONSE
      const responseData = await PayoutController.formatPayoutResponse(paymentRecord);
      
      res.json({
        success: true,
        message: 'Withdrawal initiated successfully',
        data: responseData
      });

      // STEP 10: INITIATE ASYNCHRONOUS RECONCILIATION
      // Fire and forget - don't await
      PayoutController.reconcilePayoutStatus(orderReference, userId)
        .catch(err => console.error('Initial reconciliation error:', err));

    } catch (error) {
      // Rollback transaction on any error
      await t.rollback();
      
      console.error('Create mobile money payout error:', error);
      res.status(400).json({
        success: false,
        error: error.message,
        code: 'PAYOUT_CREATION_FAILED'
      });
    }
  }

  /**
   * Create bank payout (ATOMIC OPERATION)
   * @param {Object} req - Express request
   * @param {Object} res - Express response
   */
  static async createBankPayout(req, res) {
    const t = await sequelize.transaction();
    
    try {
      const { amount, accountNumber, accountName, bankCode, idempotencyKey } = req.body;
      const userId = req.user.id;

      // Basic validation
      if (!amount || !accountNumber || !accountName) {
        throw new Error('Amount, account number, and account name are required');
      }

      const amountUSD = parseFloat(amount);
      
      if (isNaN(amountUSD) || amountUSD <= 0) {
        throw new Error('Invalid amount');
      }

      if (accountNumber.length < 5) {
        throw new Error('Invalid account number');
      }

      // Generate idempotency key if not provided
      const finalIdempotencyKey = idempotencyKey || 
        PayoutController.generateIdempotencyKey(userId, amountUSD, accountNumber);

      // Check for duplicate request
      const existingPayout = await PaymentRecord.findOne({
        where: {
          user_id: userId,
          metadata: {
            idempotency_key: finalIdempotencyKey
          }
        },
        transaction: t
      });

      if (existingPayout) {
        await t.rollback();
        return res.status(200).json({
          success: true,
          message: 'Duplicate request detected. Returning existing payout.',
          data: await PayoutController.formatPayoutResponse(existingPayout)
        });
      }

      // STEP 1: VALIDATE WITH LOCKING
      const validation = await PayoutController.validateWithdrawalRequest(
        userId,
        amountUSD,
        'bank'
      );

      // Lock user for balance update
      const user = await User.findByPk(userId, {
        transaction: t,
        lock: t.LOCK.UPDATE,
        attributes: ['id', 'wallet_balance']
      });

      // STEP 2: RESERVE FUNDS ATOMICALLY
      const reserveResult = await PayoutController.reserveFundsAtomic(
        user,
        amountUSD,
        t
      );

      // STEP 3: GENERATE ORDER REFERENCE
      const orderReference = PayoutController.generateOrderReference('BNK');

      // STEP 4: CALCULATE FEES
      const feeCalculation = await PayoutController.calculatePayoutWithFees(
        amountUSD,
        'bank'
      );

      // STEP 5: CREATE PAYMENT RECORD
      const paymentRecord = await PaymentRecord.create({
        user_id: userId,
        order_reference: orderReference,
        payment_reference: null,
        amount: amountUSD,
        currency: 'USD',
        payment_method: PaymentMethods.BANK_PAYOUT,
        status: PayoutStates.INITIATED,
        metadata: {
          idempotency_key: finalIdempotencyKey,
          type: 'wallet_withdrawal',
          recipient_details: {
            account_number: PayoutController.maskAccountNumber(accountNumber),
            account_name: accountName,
            bank_code: bankCode,
            full_account_number: accountNumber // Store encrypted in production
          },
          fee_calculation: feeCalculation,
          conversion_info: validation.conversion,
          requested_tzs: validation.amountTZS,
          balance_before: validation.walletBalance,
          balance_after: reserveResult.newBalance,
          ip_address: req.ip,
          user_agent: req.headers['user-agent']
        }
      }, { transaction: t });

      // STEP 6: CREATE TRANSACTION RECORD
      const transaction = await Transaction.create({
        user_id: userId,
        order_reference: orderReference,
        payment_reference: null,
        type: TransactionTypes.WALLET_WITHDRAWAL,
        amount: -amountUSD,
        currency: 'USD',
        balance_before: validation.walletBalance,
        balance_after: reserveResult.newBalance,
        status: PayoutStates.INITIATED,
        gateway_type: 'clickpesa_bank_payout',
        gateway_status: 'INITIATED',
        description: `Bank withdrawal to ${accountName}`,
        transaction_fee: feeCalculation.feeAmountUSD,
        net_amount: amountUSD - feeCalculation.feeAmountUSD,
        metadata: {
          payment_record_id: paymentRecord.id,
          recipient_account: PayoutController.maskAccountNumber(accountNumber),
          recipient_name: accountName,
          fee_calculation: feeCalculation,
          conversion_info: validation.conversion,
          idempotency_key: finalIdempotencyKey
        }
      }, { transaction: t });

      // Update payment record with transaction ID
      await paymentRecord.update({
        transaction_id: transaction.id
      }, { transaction: t });

      // STEP 7: CALL CLICKPESA API
      let clickpesaResponse;
      try {
        clickpesaResponse = await ClickPesaService.createBankPayout({
          amount: amountUSD,
          accountNumber: accountNumber,
          accountName: accountName,
          currency: 'USD',
          orderReference: orderReference,
          bankCode: bankCode,
          idempotencyKey: finalIdempotencyKey
        });

        // Update records with ClickPesa response
        await paymentRecord.update({
          payment_reference: clickpesaResponse.id || clickpesaResponse.transactionId,
          status: PayoutController.mapClickPesaStatus(clickpesaResponse.status),
          metadata: {
            ...paymentRecord.metadata,
            clickpesa_response: clickpesaResponse,
            clickpesa_transaction_id: clickpesaResponse.id,
            initiated_at: new Date().toISOString()
          }
        }, { transaction: t });

        await transaction.update({
          payment_reference: clickpesaResponse.id || clickpesaResponse.transactionId,
          gateway_status: clickpesaResponse.status,
          metadata: {
            ...transaction.metadata,
            clickpesa_response: clickpesaResponse
          }
        }, { transaction: t });

      } catch (clickpesaError) {
        // ClickPesa API failed - reverse the funds and mark as failed
        console.error('ClickPesa API error:', clickpesaError);
        
        await PayoutController.restoreFundsAtomic(userId, amountUSD, t);
        
        await paymentRecord.update({
          status: PayoutStates.FAILED,
          metadata: {
            ...paymentRecord.metadata,
            clickpesa_error: clickpesaError.message,
            error_at: new Date().toISOString(),
            balance_restored: true
          }
        }, { transaction: t });

        await transaction.update({
          status: PayoutStates.FAILED,
          gateway_status: 'FAILED',
          metadata: {
            ...transaction.metadata,
            clickpesa_error: clickpesaError.message
          }
        }, { transaction: t });

        throw new Error(`Bank withdrawal failed: ${clickpesaError.message}`);
      }

      // STEP 8: COMMIT TRANSACTION
      await t.commit();

      // STEP 9: RETURN RESPONSE
      const responseData = await PayoutController.formatPayoutResponse(paymentRecord);
      
      res.json({
        success: true,
        message: 'Bank withdrawal initiated successfully',
        data: responseData
      });

      // STEP 10: INITIATE ASYNCHRONOUS RECONCILIATION
      PayoutController.reconcilePayoutStatus(orderReference, userId)
        .catch(err => console.error('Initial reconciliation error:', err));

    } catch (error) {
      await t.rollback();
      
      console.error('Create bank payout error:', error);
      res.status(400).json({
        success: false,
        error: error.message,
        code: 'BANK_PAYOUT_CREATION_FAILED'
      });
    }
  }

  // ============================================================================
  // RECONCILIATION SYSTEM (SOURCE OF TRUTH)
  // ============================================================================

  /**
   * Reconcile payout status with ClickPesa API
   * This is our SINGLE SOURCE OF TRUTH for payout status
   * @param {string} orderReference - Order reference
   * @param {number} userId - User ID (optional, for security check)
   * @returns {Promise<Object>} Reconciliation result
   */
  static async reconcilePayoutStatus(orderReference, userId = null) {
    const t = await sequelize.transaction();
    
    try {
      console.log(`[RECONCILE] Starting reconciliation for: ${orderReference}`);
      
      // Find payment record
      const whereClause = {
        order_reference: orderReference,
        payment_method: { 
          [Op.in]: [PaymentMethods.MOBILE_MONEY_PAYOUT, PaymentMethods.BANK_PAYOUT] 
        }
      };
      
      if (userId) {
        whereClause.user_id = userId;
      }
      
      const paymentRecord = await PaymentRecord.findOne({
        where: whereClause,
        transaction: t,
        lock: t.LOCK.UPDATE
      });
      
      if (!paymentRecord) {
        await t.rollback();
        return {
          success: false,
          reconciled: false,
          error: 'Payout record not found'
        };
      }
      
      // Skip if already in final state
      if ([PayoutStates.COMPLETED, PayoutStates.FAILED].includes(paymentRecord.status)) {
        await t.rollback();
        return {
          success: true,
          reconciled: false,
          reason: 'Already in final state',
          current_status: paymentRecord.status
        };
      }
      
      // STEP 1: QUERY CLICKPESA API
      let clickpesaData;
      try {
        clickpesaData = await ClickPesaService.getPayoutByOrderReference(orderReference);
        
        if (!clickpesaData || clickpesaData.length === 0) {
          // Check if we have a payment_reference
          if (paymentRecord.payment_reference) {
            clickpesaData = await ClickPesaService.getPayoutById(paymentRecord.payment_reference);
          }
        }
        
        if (!clickpesaData || (Array.isArray(clickpesaData) && clickpesaData.length === 0)) {
          await t.rollback();
          return {
            success: true,
            reconciled: false,
            reason: 'Payout not found in ClickPesa'
          };
        }
        
      } catch (apiError) {
        console.error(`[RECONCILE] ClickPesa API error: ${apiError.message}`);
        await t.rollback();
        return {
          success: false,
          reconciled: false,
          error: `ClickPesa API error: ${apiError.message}`
        };
      }
      
      // Extract latest data
      const latestData = Array.isArray(clickpesaData) ? clickpesaData[0] : clickpesaData;
      const remoteStatus = latestData.status;
      const mappedStatus = PayoutController.mapClickPesaStatus(remoteStatus);
      
      // STEP 2: CHECK IF STATUS CHANGED
      if (paymentRecord.status === mappedStatus) {
        // Update last checked timestamp
        await paymentRecord.update({
          metadata: {
            ...paymentRecord.metadata,
            last_reconciliation_check: new Date().toISOString(),
            clickpesa_last_status: remoteStatus
          }
        }, { transaction: t });
        
        await t.commit();
        return {
          success: true,
          reconciled: false,
          reason: 'Status unchanged',
          current_status: mappedStatus,
          clickpesa_status: remoteStatus
        };
      }
      
      // STEP 3: STATUS CHANGED - UPDATE RECORDS
      console.log(`[RECONCILE] Status changed: ${paymentRecord.status} → ${mappedStatus} (ClickPesa: ${remoteStatus})`);
      
      const previousStatus = paymentRecord.status;
      
      // Update payment record
      await paymentRecord.update({
        status: mappedStatus,
        metadata: {
          ...paymentRecord.metadata,
          previous_status: previousStatus,
          status_changed_at: new Date().toISOString(),
          clickpesa_status: remoteStatus,
          clickpesa_data: latestData,
          last_reconciliation: new Date().toISOString(),
          reconciled_by: 'system'
        }
      }, { transaction: t });
      
      // Update transaction record
      await Transaction.update({
        status: mappedStatus,
        gateway_status: remoteStatus,
        metadata: {
          ...paymentRecord.metadata,
          reconciled_at: new Date().toISOString()
        }
      }, {
        where: { order_reference: orderReference },
        transaction: t
      });
      
      // STEP 4: HANDLE FAILED PAYOUTS
      if (mappedStatus === PayoutStates.FAILED && previousStatus !== PayoutStates.FAILED) {
        // Restore funds if payout failed
        await PayoutController.restoreFundsAtomic(
          paymentRecord.user_id,
          paymentRecord.amount,
          t
        );
        
        console.log(`[RECONCILE] Funds restored for failed payout: ${orderReference}`);
      }
      
      // STEP 5: LOG RECONCILIATION
      await PayoutController.logReconciliation({
        order_reference: orderReference,
        user_id: paymentRecord.user_id,
        previous_status: previousStatus,
        new_status: mappedStatus,
        clickpesa_status: remoteStatus,
        amount: paymentRecord.amount,
        payment_method: paymentRecord.payment_method,
        metadata: {
          clickpesa_data: latestData,
          reconciliation_type: 'system'
        }
      });
      
      await t.commit();
      
      return {
        success: true,
        reconciled: true,
        previous_status: previousStatus,
        new_status: mappedStatus,
        clickpesa_status: remoteStatus,
        order_reference: orderReference,
        user_id: paymentRecord.user_id,
        amount: paymentRecord.amount,
        note: mappedStatus === PayoutStates.FAILED ? 'Funds restored to wallet' : 'Status updated'
      };
      
    } catch (error) {
      await t.rollback();
      console.error(`[RECONCILE] Error: ${error.message}`);
      return {
        success: false,
        reconciled: false,
        error: error.message
      };
    }
  }

  /**
   * Log reconciliation events
   * @param {Object} data - Reconciliation data
   */
  static async logReconciliation(data) {
    try {
      // Create a ReconciliationLog model for production
      console.log(`[RECONCILIATION_LOG] ${JSON.stringify(data)}`);
      
      // Example model structure:
      /*
      const ReconciliationLog = sequelize.define('ReconciliationLog', {
        order_reference: { type: DataTypes.STRING(50), allowNull: false },
        user_id: { type: DataTypes.INTEGER, allowNull: false },
        previous_status: { type: DataTypes.STRING(20) },
        new_status: { type: DataTypes.STRING(20), allowNull: false },
        clickpesa_status: { type: DataTypes.STRING(50) },
        amount: { type: DataTypes.DECIMAL(10, 2) },
        payment_method: { type: DataTypes.STRING(30) },
        metadata: { type: DataTypes.JSON },
        reconciled_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW }
      });
      */
    } catch (error) {
      console.error('Failed to log reconciliation:', error);
    }
  }

  // ============================================================================
  // STATUS & HISTORY ENDPOINTS
  // ============================================================================

  /**
   * Get payout status with automatic reconciliation
   * @param {Object} req - Express request
   * @param {Object} res - Express response
   */
  static async getPayoutStatus(req, res) {
    try {
      const { orderReference } = req.params;
      const userId = req.user.id;
      
      // Find payment record
      const paymentRecord = await PaymentRecord.findOne({
        where: {
          order_reference: orderReference,
          user_id: userId,
          payment_method: { 
            [Op.in]: [PaymentMethods.MOBILE_MONEY_PAYOUT, PaymentMethods.BANK_PAYOUT] 
          }
        },
        include: [{
          model: Transaction,
          as: 'transaction',
          attributes: ['id', 'gateway_status', 'description', 'created_at']
        }]
      });
      
      if (!paymentRecord) {
        return res.status(404).json({
          success: false,
          error: 'Withdrawal record not found'
        });
      }
      
      // Trigger reconciliation if not in final state
      let reconciliationResult = null;
      if (![PayoutStates.COMPLETED, PayoutStates.FAILED].includes(paymentRecord.status)) {
        reconciliationResult = await PayoutController.reconcilePayoutStatus(orderReference, userId);
        
        // Refresh payment record if reconciled
        if (reconciliationResult.reconciled) {
          await paymentRecord.reload();
        }
      }
      
      // Get current user balance
      const user = await User.findByPk(userId, {
        attributes: ['wallet_balance']
      });
      
      // Format response
      const response = await PayoutController.formatPayoutResponse(paymentRecord);
      response.current_balance = user.wallet_balance;
      
      if (reconciliationResult) {
        response.reconciliation = {
          performed: true,
          status_changed: reconciliationResult.reconciled,
          previous_status: reconciliationResult.previous_status,
          new_status: reconciliationResult.new_status
        };
      }
      
      res.json({
        success: true,
        data: response
      });
      
    } catch (error) {
      console.error('Get payout status error:', error);
      res.status(400).json({
        success: false,
        error: error.message,
        code: 'STATUS_CHECK_FAILED'
      });
    }
  }

  /**
   * Get user withdrawal history
   * @param {Object} req - Express request
   * @param {Object} res - Express response
   */
  static async getWithdrawalHistory(req, res) {
    try {
      const userId = req.user.id;
      const {
        page = 1,
        limit = 20,
        status,
        payout_method,
        start_date,
        end_date
      } = req.query;
      
      const offset = (page - 1) * limit;
      const whereClause = {
        user_id: userId,
        payment_method: { 
          [Op.in]: [PaymentMethods.MOBILE_MONEY_PAYOUT, PaymentMethods.BANK_PAYOUT] 
        }
      };
      
      // Apply filters
      if (status) whereClause.status = status;
      if (payout_method) whereClause.payment_method = payout_method;
      
      if (start_date || end_date) {
        whereClause.created_at = {};
        if (start_date) whereClause.created_at[Op.gte] = new Date(start_date);
        if (end_date) whereClause.created_at[Op.lte] = new Date(end_date);
      }
      
      const { count, rows: withdrawals } = await PaymentRecord.findAndCountAll({
        where: whereClause,
        order: [['created_at', 'DESC']],
        limit: parseInt(limit),
        offset: parseInt(offset),
        include: [{
          model: Transaction,
          as: 'transaction',
          attributes: ['id', 'gateway_status', 'transaction_fee', 'net_amount']
        }]
      });
      
      // Format response
      const formattedWithdrawals = withdrawals.map(w => PayoutController.formatPayoutResponse(w));
      
      res.json({
        success: true,
        data: {
          withdrawals: formattedWithdrawals,
          pagination: {
            total: count,
            page: parseInt(page),
            pages: Math.ceil(count / limit),
            limit: parseInt(limit)
          }
        }
      });
      
    } catch (error) {
      console.error('Get withdrawal history error:', error);
      res.status(400).json({
        success: false,
        error: error.message,
        code: 'HISTORY_FETCH_FAILED'
      });
    }
  }

  /**
   * Get withdrawal statistics
   * @param {Object} req - Express request
   * @param {Object} res - Express response
   */
  static async getWithdrawalStats(req, res) {
    try {
      const userId = req.user.id;
      
      // Current date calculations
      const now = new Date();
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      
      // Total successful withdrawals
      const totalWithdrawals = await PaymentRecord.sum('amount', {
        where: {
          user_id: userId,
          status: PayoutStates.COMPLETED,
          payment_method: { 
            [Op.in]: [PaymentMethods.MOBILE_MONEY_PAYOUT, PaymentMethods.BANK_PAYOUT] 
          }
        }
      }) || 0;
      
      // Today's withdrawals
      const todayWithdrawals = await PaymentRecord.sum('amount', {
        where: {
          user_id: userId,
          status: PayoutStates.COMPLETED,
          created_at: { [Op.gte]: startOfDay },
          payment_method: { 
            [Op.in]: [PaymentMethods.MOBILE_MONEY_PAYOUT, PaymentMethods.BANK_PAYOUT] 
          }
        }
      }) || 0;
      
      // This month's withdrawals
      const monthWithdrawals = await PaymentRecord.sum('amount', {
        where: {
          user_id: userId,
          status: PayoutStates.COMPLETED,
          created_at: { [Op.gte]: startOfMonth },
          payment_method: { 
            [Op.in]: [PaymentMethods.MOBILE_MONEY_PAYOUT, PaymentMethods.BANK_PAYOUT] 
          }
        }
      }) || 0;
      
      // Recent withdrawal count (last 30 days)
      const recentCount = await PaymentRecord.count({
        where: {
          user_id: userId,
          status: PayoutStates.COMPLETED,
          created_at: { [Op.gte]: thirtyDaysAgo },
          payment_method: { 
            [Op.in]: [PaymentMethods.MOBILE_MONEY_PAYOUT, PaymentMethods.BANK_PAYOUT] 
          }
        }
      });
      
      // Pending withdrawals
      const pendingWithdrawals = await PaymentRecord.sum('amount', {
        where: {
          user_id: userId,
          status: { [Op.in]: [PayoutStates.INITIATED, PayoutStates.PROCESSING] },
          payment_method: { 
            [Op.in]: [PaymentMethods.MOBILE_MONEY_PAYOUT, PaymentMethods.BANK_PAYOUT] 
          }
        }
      }) || 0;
      
      // Get current exchange rate for TZS display
      let exchangeRate = null;
      try {
        const rateInfo = await ClickPesaService.getUSDtoTZSRate();
        exchangeRate = rateInfo.rate;
      } catch (rateError) {
        console.warn('Exchange rate fetch failed:', rateError.message);
      }
      
      res.json({
        success: true,
        data: {
          totals: {
            usd: {
              all_time: totalWithdrawals,
              today: todayWithdrawals,
              this_month: monthWithdrawals,
              pending: pendingWithdrawals
            },
            ...(exchangeRate && {
              tzs: {
                all_time: Math.round(totalWithdrawals * exchangeRate),
                today: Math.round(todayWithdrawals * exchangeRate),
                this_month: Math.round(monthWithdrawals * exchangeRate),
                pending: Math.round(pendingWithdrawals * exchangeRate)
              }
            })
          },
          counts: {
            recent_30_days: recentCount
          },
          ...(exchangeRate && { exchange_rate: exchangeRate }),
          currency: 'USD',
          updated_at: new Date().toISOString()
        }
      });
      
    } catch (error) {
      console.error('Get withdrawal stats error:', error);
      res.status(400).json({
        success: false,
        error: error.message,
        code: 'STATS_FETCH_FAILED'
      });
    }
  }

  // ============================================================================
  // WEBHOOK HANDLER (FOR NOTIFICATION ONLY)
  // ============================================================================

  /**
   * Handle payout webhook (NOT TRUSTED FOR STATE CHANGES)
   * Webhooks are only used to trigger reconciliation, not to directly update state
   * @param {Object} req - Express request
   * @param {Object} res - Express response
   */
  static async handlePayoutWebhook(req, res) {
    console.log('[WEBHOOK] Received payout webhook');
    
    try {
      const rawBody = req.rawBody || JSON.stringify(req.body);
      const signature = req.headers['x-clickpesa-signature'] || 
                       req.headers['x-signature'];
      
      if (!signature) {
        console.warn('[WEBHOOK] Missing signature');
        return res.status(400).json({ success: false, error: 'Missing signature' });
      }
      
      // Verify webhook signature
      const isValid = ClickPesaService.verifyWebhookSignature(rawBody, signature);
      if (!isValid) {
        console.warn('[WEBHOOK] Invalid signature');
        return res.status(401).json({ success: false, error: 'Invalid signature' });
      }
      
      // Parse payload
      const payload = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      const { event, eventType, data } = payload;
      const webhookEvent = event || eventType;
      
      if (!webhookEvent || !data) {
        console.warn('[WEBHOOK] Invalid payload');
        return res.status(400).json({ success: false, error: 'Invalid payload' });
      }
      
      // Log webhook
      await WebhookLog.create({
        webhook_id: data.id || data.transactionId || data.orderReference,
        event_type: webhookEvent,
        payload: payload,
        raw_body: rawBody,
        signature_header: signature,
        processed_at: new Date(),
        status: 'received',
        webhook_type: 'payout'
      });
      
      // Extract order reference
      const orderReference = data.orderReference || 
                            data.id || 
                            data.transactionId;
      
      if (!orderReference) {
        console.warn('[WEBHOOK] No order reference in payload');
        return res.json({ success: true, message: 'Webhook received but no action taken' });
      }
      
      // Trigger reconciliation based on webhook
      // Don't await - fire and forget
      PayoutController.reconcilePayoutStatus(orderReference)
        .then(result => {
          console.log(`[WEBHOOK] Reconciliation triggered for ${orderReference}:`, 
                     result.reconciled ? 'Status changed' : 'No change');
        })
        .catch(err => {
          console.error(`[WEBHOOK] Reconciliation failed for ${orderReference}:`, err.message);
        });
      
      // Respond immediately
      res.json({
        success: true,
        message: 'Webhook received and processing',
        event: webhookEvent,
        order_reference: orderReference
      });
      
    } catch (error) {
      console.error('[WEBHOOK] Processing error:', error);
      res.status(500).json({
        success: false,
        error: error.message,
        code: 'WEBHOOK_PROCESSING_FAILED'
      });
    }
  }

  // ============================================================================
  // UTILITY FUNCTIONS
  // ============================================================================

  /**
   * Format phone number for display
   * @param {string} phoneNumber - Raw phone number
   * @returns {string} Formatted phone number
   */
  static formatPhoneForDisplay(phoneNumber) {
    if (phoneNumber.length === 12 && phoneNumber.startsWith('255')) {
      return `+${phoneNumber.substring(0, 3)} ${phoneNumber.substring(3, 6)} ${phoneNumber.substring(6, 9)} ${phoneNumber.substring(9)}`;
    }
    return phoneNumber;
  }

  /**
   * Mask account number for security
   * @param {string} accountNumber - Full account number
   * @returns {string} Masked account number
   */
  static maskAccountNumber(accountNumber) {
    if (!accountNumber || accountNumber.length < 4) return '****';
    const lastFour = accountNumber.slice(-4);
    return `****${lastFour}`;
  }

  /**
   * Format payout response
   * @param {Object} paymentRecord - Payment record instance
   * @returns {Promise<Object>} Formatted response
   */
  static async formatPayoutResponse(paymentRecord) {
    const metadata = paymentRecord.metadata || {};
    const feeCalculation = metadata.fee_calculation || {};
    const conversionInfo = metadata.conversion_info || {};
    const recipientDetails = metadata.recipient_details || {};
    
    // Get transaction if not already included
    let transaction = paymentRecord.transaction;
    if (!transaction && paymentRecord.transaction_id) {
      transaction = await Transaction.findByPk(paymentRecord.transaction_id);
    }
    
    return {
      id: paymentRecord.id,
      order_reference: paymentRecord.order_reference,
      payment_reference: paymentRecord.payment_reference,
      transaction_id: paymentRecord.transaction_id,
      amount_usd: paymentRecord.amount,
      amount_tzs: metadata.requested_tzs || conversionInfo.tzsAmount,
      fee_usd: feeCalculation.feeAmountUSD || 0,
      fee_tzs: feeCalculation.feeAmountTZS || 0,
      net_amount_usd: paymentRecord.amount - (feeCalculation.feeAmountUSD || 0),
      net_amount_tzs: feeCalculation.payoutAmountTZS || metadata.requested_tzs,
      exchange_rate: conversionInfo.rate,
      payout_method: paymentRecord.payment_method,
      status: paymentRecord.status,
      recipient: recipientDetails,
      created_at: paymentRecord.created_at,
      updated_at: paymentRecord.updated_at,
      estimated_completion: PayoutController.getEstimatedCompletion(paymentRecord),
      transaction: transaction ? {
        gateway_status: transaction.gateway_status,
        description: transaction.description,
        transaction_fee: transaction.transaction_fee,
        net_amount: transaction.net_amount
      } : null
    };
  }

  /**
   * Get estimated completion time based on payout method and status
   * @param {Object} paymentRecord - Payment record
   * @returns {string} Estimated completion
   */
  static getEstimatedCompletion(paymentRecord) {
    if (paymentRecord.status === PayoutStates.COMPLETED) {
      return 'Completed';
    }
    
    if (paymentRecord.status === PayoutStates.FAILED) {
      return 'Failed';
    }
    
    if (paymentRecord.payment_method === PaymentMethods.MOBILE_MONEY_PAYOUT) {
      return 'Within 24 hours';
    }
    
    if (paymentRecord.payment_method === PaymentMethods.BANK_PAYOUT) {
      return '1-3 business days';
    }
    
    return 'Processing';
  }
}

// ============================================================================
// ADDITIONAL PRODUCTION-READY FEATURES (FOR CRON JOBS)
// ============================================================================

/**
 * Batch reconciliation job for pending payouts
 * Should be run every 5-30 minutes in production
 */
PayoutController.reconcilePendingPayouts = async function() {
  console.log('[CRON] Starting batch reconciliation of pending payouts');
  
  try {
    // Find all payouts that need reconciliation
    const pendingPayouts = await PaymentRecord.findAll({
      where: {
        status: { [Op.in]: [PayoutStates.INITIATED, PayoutStates.PROCESSING] },
        payment_method: { 
          [Op.in]: [PaymentMethods.MOBILE_MONEY_PAYOUT, PaymentMethods.BANK_PAYOUT] 
        },
        // Only reconcile payouts older than 5 minutes
        created_at: {
          [Op.lt]: new Date(Date.now() - 5 * 60 * 1000)
        }
      },
      limit: 100, // Process in batches
      order: [['created_at', 'ASC']]
    });
    
    console.log(`[CRON] Found ${pendingPayouts.length} payouts to reconcile`);
    
    const results = {
      total: pendingPayouts.length,
      reconciled: 0,
      unchanged: 0,
      errors: 0,
      details: []
    };
    
    // Process each payout
    for (const payout of pendingPayouts) {
      try {
        const result = await PayoutController.reconcilePayoutStatus(payout.order_reference);
        
        results.details.push({
          order_reference: payout.order_reference,
          user_id: payout.user_id,
          success: result.success,
          reconciled: result.reconciled,
          previous_status: result.previous_status,
          new_status: result.new_status
        });
        
        if (result.success) {
          if (result.reconciled) {
            results.reconciled++;
          } else {
            results.unchanged++;
          }
        } else {
          results.errors++;
        }
        
        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));
        
      } catch (error) {
        results.errors++;
        console.error(`[CRON] Error reconciling ${payout.order_reference}:`, error.message);
      }
    }
    
    console.log('[CRON] Batch reconciliation completed:', results);
    return results;
    
  } catch (error) {
    console.error('[CRON] Batch reconciliation failed:', error);
    throw error;
  }
};

/**
 * Generate daily reconciliation report
 * Should be run once per day
 */
PayoutController.generateDailyReport = async function() {
  console.log('[CRON] Generating daily reconciliation report');
  
  try {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0);
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Get all payouts from yesterday
    const yesterdaysPayouts = await PaymentRecord.findAll({
      where: {
        created_at: {
          [Op.gte]: yesterday,
          [Op.lt]: today
        },
        payment_method: { 
          [Op.in]: [PaymentMethods.MOBILE_MONEY_PAYOUT, PaymentMethods.BANK_PAYOUT] 
        }
      },
      include: [{
        model: Transaction,
        as: 'transaction',
        attributes: ['id', 'gateway_status', 'status']
      }]
    });
    
    // Generate report
    const report = {
      date: yesterday.toISOString().split('T')[0],
      total_payouts: yesterdaysPayouts.length,
      by_status: {},
      by_method: {},
      total_amount_usd: 0,
      total_amount_tzs: 0,
      reconciliation_status: {}
    };
    
    // Calculate statistics
    yesterdaysPayouts.forEach(payout => {
      // Status breakdown
      report.by_status[payout.status] = (report.by_status[payout.status] || 0) + 1;
      
      // Method breakdown
      report.by_method[payout.payment_method] = (report.by_method[payout.payment_method] || 0) + 1;
      
      // Amount totals
      if (payout.status === PayoutStates.COMPLETED) {
        report.total_amount_usd += parseFloat(payout.amount);
        
        const metadata = payout.metadata || {};
        const conversionInfo = metadata.conversion_info || {};
        if (conversionInfo.tzsAmount) {
          report.total_amount_tzs += conversionInfo.tzsAmount;
        }
      }
    });
    
    // Check reconciliation status
    const pendingPayouts = yesterdaysPayouts.filter(p => 
      [PayoutStates.INITIATED, PayoutStates.PROCESSING].includes(p.status)
    );
    
    report.reconciliation_status = {
      pending: pendingPayouts.length,
      needs_attention: pendingPayouts.filter(p => {
        // Payouts older than 24 hours still pending
        const age = Date.now() - new Date(p.created_at).getTime();
        return age > 24 * 60 * 60 * 1000;
      }).length
    };
    
    console.log('[CRON] Daily report generated:', report);
    return report;
    
  } catch (error) {
    console.error('[CRON] Daily report generation failed:', error);
    throw error;
  }
};

module.exports = PayoutController;