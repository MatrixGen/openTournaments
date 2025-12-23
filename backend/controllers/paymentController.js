// controllers/paymentController.js
/**
 * PRODUCTION-READY DEPOSIT CONTROLLER
 * 
 * SECURITY PRINCIPLES:
 * 1. Webhooks are NOT trusted for state changes
 * 2. All status changes come from ClickPesa API reconciliation
 * 3. No user-initiated cancellations (simplifies state machine)
 * 4. Preview is calculation-only (no DB records)
 * 5. Automatic reconciliation on status checks
 * 6. Cron job for abandoned transactions
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
} = require("../models");
const ClickPesaThirdPartyService = require("../services/clickPesaThirdPartyService");
const { Op } = require("sequelize");
const crypto = require("crypto");

// ============================================================================
// CONSTANTS & STATE DEFINITIONS
// ============================================================================

/**
 * Deposit states - Simplified for security
 */
const DepositStates = {
  INITIATED: 'initiated',      // Payment record created, sent to ClickPesa
  PROCESSING: 'processing',    // ClickPesa processing (waiting user action)
  COMPLETED: 'completed',      // Successfully collected by ClickPesa
  FAILED: 'failed'            // Failed at ClickPesa level
};

/**
 * Payment method types
 */
const PaymentMethods = {
  MOBILE_MONEY_DEPOSIT: 'mobile_money_deposit'
};

/**
 * Transaction types
 */
const TransactionTypes = {
  WALLET_DEPOSIT: 'wallet_deposit'
};

/**
 * Deposit limits in TZS (converted to USD in real-time)
 */
const DepositLimits = {
  MIN_TZS: 1000,              // 1,000 TZS minimum
  MAX_TZS: 1000000,           // 1,000,000 TZS maximum
  DAILY_LIMIT_TZS: 5000000    // 5,000,000 TZS daily limit
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

class PaymentController {
  /**
   * Generate unique order reference
   * @param {string} type - 'DEPO' for deposit
   * @returns {string} Unique order reference
   */
  static generateOrderReference(type = 'DEPO') {
    const timestamp = Date.now();
    const random = crypto.randomBytes(4).toString('hex').toUpperCase();
    return `${type}${timestamp}${random}`;
  }

  /**
   * Generate idempotency key for deposit request
   * @param {number} userId - User ID
   * @param {number} amountUSD - Amount in USD
   * @param {string} phoneNumber - Recipient phone number
   * @returns {string} Idempotency key
   */
  static generateIdempotencyKey(userId, amountUSD, phoneNumber) {
    const hash = crypto.createHash('sha256')
      .update(`${userId}:${amountUSD}:${phoneNumber}:${Date.now()}`)
      .digest('hex')
      .substring(0, 32);
    return `DEPO_${hash}`;
  }

  /**
   * USD to TZS conversion using ClickPesa rates
   * @param {number} usdAmount - Amount in USD
   * @returns {Promise<Object>} Conversion result
   */
static async usdToTzs(usdAmount) {
  try {
    // Convert to number if it's a string
    const numericAmount = typeof usdAmount === 'string' 
      ? parseFloat(usdAmount.replace(/[^\d.-]/g, ''))
      : usdAmount;
    
    // Check if valid number
    if (isNaN(numericAmount) || numericAmount <= 0) {
      throw new Error(`Invalid USD amount: ${usdAmount}`);
    }
    
    const conversion = await ClickPesaThirdPartyService.convertUSDToTZS(numericAmount);
    return {
      tzsAmount: conversion.convertedAmount,
      rate: conversion.rate,
      timestamp: conversion.timestamp,
      source: 'clickpesa'
    };
  } catch (error) {
    console.warn('USD to TZS conversion failed, using fallback:', error.message);
    const fallbackRate = 2500;
    
    // Try to convert usdAmount to number for fallback
    let numericAmount = usdAmount;
    if (typeof usdAmount === 'string') {
      numericAmount = parseFloat(usdAmount.replace(/[^\d.-]/g, '')) || 0;
    }
    
    return {
      tzsAmount: Math.round(numericAmount * fallbackRate),
      rate: fallbackRate,
      timestamp: new Date().toISOString(),
      source: 'fallback',
      note: `Using fallback rate due to conversion error: ${error.message}`
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
    // Convert to number if it's a string
    const numericAmount = typeof tzsAmount === 'string' 
      ? parseFloat(tzsAmount.replace(/[^\d.-]/g, ''))
      : tzsAmount;
    
    // Check if valid number
    if (isNaN(numericAmount) || numericAmount <= 0) {
      throw new Error(`Invalid TZS amount: ${tzsAmount}`);
    }
    
    const conversion = await ClickPesaThirdPartyService.convertTZSToUSD(numericAmount);
    return {
      usdAmount: conversion.convertedAmount,
      rate: conversion.rate,
      timestamp: conversion.timestamp,
      source: 'clickpesa'
    };
  } catch (error) {
    console.warn('TZS to USD conversion failed, using fallback:', error.message);
    const fallbackRate = 0.0004;
    
    // Try to convert tzsAmount to number for fallback
    let numericAmount = tzsAmount;
    if (typeof tzsAmount === 'string') {
      numericAmount = parseFloat(tzsAmount.replace(/[^\d.-]/g, '')) || 0;
    }
    
    return {
      usdAmount: parseFloat((numericAmount * fallbackRate).toFixed(6)),
      rate: fallbackRate,
      timestamp: new Date().toISOString(),
      source: 'fallback',
      note: `Using fallback rate due to conversion error: ${error.message}`
    };
  }
}

  /**
   * Map ClickPesa status to our internal status
   * @param {string} clickpesaStatus - ClickPesa status string
   * @returns {string} Internal status
   */
  static mapClickPesaStatus(clickpesaStatus) {
    if (!clickpesaStatus) return DepositStates.INITIATED;

    const statusUpper = clickpesaStatus.toUpperCase();
    
    if (['SUCCESS', 'SUCCESSFUL', 'COMPLETED','SETTLED'].includes(statusUpper)) {
      return DepositStates.COMPLETED;
    }
    
    if (['FAILED', 'REJECTED', 'CANCELLED', 'EXPIRED'].includes(statusUpper)) {
      return DepositStates.FAILED;
    }
    
    if (['PROCESSING', 'PENDING', 'INITIATED', 'AUTHORIZED'].includes(statusUpper)) {
      return DepositStates.PROCESSING;
    }
    
    return DepositStates.INITIATED;
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

  /**
   * Validate deposit request comprehensively
   * @param {number} userId - User ID
   * @param {number} amountUSD - Amount in USD
   * @returns {Promise<Object>} Validation result with user info and limits
   */
/**
 * Validate deposit request with auto-reconciliation for recent deposits
 */
static async validateDepositRequest(userId, amountUSD, options = {}) {
  const { skipRecentDepositCheck = false, context = 'create' } = options;

  // Get user
  const user = await User.findByPk(userId, {
    attributes: [
      'id', 
      'wallet_balance', 
      'username', 
      'email', 
      'phone_number'
    ]
  });

  if (!user) {
    throw new Error('User not found');
  }

  // Convert amount to number if it's a string
  const numericAmountUSD = typeof amountUSD === 'string' 
    ? parseFloat(amountUSD.replace(/[^\d.-]/g, ''))
    : amountUSD;
  
  if (isNaN(numericAmountUSD) || numericAmountUSD <= 0) {
    throw new Error(`Invalid deposit amount: ${amountUSD}`);
  }

  // 1. Convert TZS limits to USD using current rates
  const minLimit = await this.tzsToUsd(DepositLimits.MIN_TZS);
  const maxLimit = await this.tzsToUsd(DepositLimits.MAX_TZS);
  const dailyLimit = await this.tzsToUsd(DepositLimits.DAILY_LIMIT_TZS);

  // 2. Validate amount against limits
  if (numericAmountUSD < minLimit.usdAmount) {
    throw new Error(
      `Minimum deposit amount is ${minLimit.usdAmount.toFixed(2)} USD ` +
      `(approximately ${DepositLimits.MIN_TZS.toLocaleString()} TZS)`
    );
  }

  if (numericAmountUSD > maxLimit.usdAmount) {
    throw new Error(
      `Maximum deposit amount is ${maxLimit.usdAmount.toFixed(2)} USD ` +
      `(approximately ${DepositLimits.MAX_TZS.toLocaleString()} TZS)`
    );
  }

  // 3. Daily deposit limit check
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const todayDeposits = await PaymentRecord.sum('amount', {
    where: {
      user_id: userId,
      status: DepositStates.COMPLETED,
      payment_method: PaymentMethods.MOBILE_MONEY_DEPOSIT,
      created_at: {
        [Op.gte]: startOfDay
      }
    }
  });

  const totalToday = (todayDeposits || 0) + numericAmountUSD;
  
  if (totalToday > dailyLimit.usdAmount) {
    const remainingToday = Math.max(0, dailyLimit.usdAmount - (todayDeposits || 0));
    throw new Error(
      `Daily deposit limit exceeded. You can deposit up to ${dailyLimit.usdAmount.toFixed(2)} USD per day. ` +
      `Remaining today: ${remainingToday.toFixed(2)} USD`
    );
  }

  // 4. Check for existing processing deposits with auto-reconciliation
  if (!skipRecentDepositCheck) {
    const recentDeposit = await PaymentRecord.findOne({
      where: {
        user_id: userId,
        status: { [Op.in]: [DepositStates.INITIATED, DepositStates.PROCESSING] },
        payment_method: PaymentMethods.MOBILE_MONEY_DEPOSIT,
        created_at: {
          [Op.gt]: new Date(Date.now() - 15 * 60 * 1000) // Last 15 minutes
        }
      }
    });

    if (recentDeposit) {
      console.log(`[DEPOSIT_VALIDATION] Found recent deposit ${recentDeposit.order_reference} with status: ${recentDeposit.status}`);
      
      // Auto-reconcile before blocking
      if (context === 'create') {
        console.log(`[DEPOSIT_VALIDATION] Auto-reconciling ${recentDeposit.order_reference} before validation`);
        
        try {
          const reconciliationResult = await this.reconcileDepositStatus(
            recentDeposit.order_reference, 
            userId
          );
          
          // Reload the deposit to get updated status
          await recentDeposit.reload();
          
          console.log(`[DEPOSIT_VALIDATION] Reconciliation result:`, {
            success: reconciliationResult.success,
            reconciled: reconciliationResult.reconciled,
            new_status: reconciliationResult.new_status
          });
          
          // Check again after reconciliation
          if ([DepositStates.INITIATED, DepositStates.PROCESSING].includes(recentDeposit.status)) {
            const ageMinutes = Math.round(
              (Date.now() - new Date(recentDeposit.created_at).getTime()) / (60 * 1000)
            );
            
            // If deposit is very old (10+ minutes) and still processing, allow new deposit
            if (ageMinutes >= 10) {
              console.log(`[DEPOSIT_VALIDATION] Old deposit (${ageMinutes} minutes) still processing, allowing new deposit`);
            } else {
              throw new Error(
                'You have a deposit in progress. Please wait for it to complete before starting a new one.' +
                (ageMinutes < 5 ? ' (Check your phone for USSD prompt)' : '')
              );
            }
          } else {
            console.log(`[DEPOSIT_VALIDATION] Recent deposit now in final state: ${recentDeposit.status}`);
          }
        } catch (reconcileError) {
          console.error(`[DEPOSIT_VALIDATION] Auto-reconciliation failed:`, reconcileError.message);
          // Don't block user if reconciliation fails - log but continue
        }
      } else {
        // For preview context, just warn but don't block
        console.log(`[DEPOSIT_VALIDATION] Preview context - recent deposit found but not reconciled`);
      }
    }
  }

  // 5. Calculate TZS equivalent for ClickPesa
  const conversion = await this.usdToTzs(numericAmountUSD);

  return {
    user,
    walletBalance: parseFloat(user.wallet_balance),
    conversion,
    amountTZS: conversion.tzsAmount,
    limits: {
      minUSD: minLimit.usdAmount,
      maxUSD: maxLimit.usdAmount,
      dailyUSD: dailyLimit.usdAmount,
      remainingDailyUSD: dailyLimit.usdAmount - (todayDeposits || 0)
    }
  };
}

  // ============================================================================
  // PREVIEW ENDPOINTS (NO DATABASE WRITES)
  // ============================================================================

  /**
   * Preview mobile money deposit (calculation only, no DB writes)
   * @param {Object} req - Express request
   * @param {Object} res - Express response
   */
  static async previewMobileMoneyDeposit(req, res) {
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
      const formattedPhone = PaymentController.formatPhoneNumber(phoneNumber);
      if (!PaymentController.validatePhoneNumber(formattedPhone)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid phone number. Expected format: 255XXXXXXXXX (e.g., 255712345678)',
          code: 'INVALID_PHONE_NUMBER'
        });
      }

      // Validate deposit request
      const validation = await PaymentController.validateDepositRequest(
        userId,
        amountUSD
      );

      // Generate preview order reference (won't be used in DB)
      const previewReference = PaymentController.generateOrderReference('PRE');

      // Check available payment methods via ClickPesa (optional)
      let availableMethods = [];
      let senderDetails = null;
      
      try {
        const previewResult = await ClickPesaThirdPartyService.previewUssdPushPayment({
          amount: amountUSD,
          currency: 'USD',
          orderReference: previewReference,
          phoneNumber: formattedPhone,
          fetchSenderDetails: true
        });
        
        availableMethods = previewResult.activeMethods || [];
        senderDetails = previewResult.sender || null;
      } catch (previewError) {
        console.warn('Preview failed, continuing without method check:', previewError.message);
        // Continue without available methods - initiation will fail if truly unavailable
      }

      // Prepare response
      const responseData = {
        preview_reference: previewReference,
        amount_usd: amountUSD,
        amount_tzs: validation.amountTZS,
        exchange_rate: validation.conversion.rate,
        recipient: {
          phone_number: formattedPhone,
          formatted: PaymentController.formatPhoneForDisplay(formattedPhone)
        },
        available_methods: availableMethods,
        sender_details: senderDetails,
        validation: {
          wallet_balance: validation.walletBalance,
          daily_limit_remaining: validation.limits.remainingDailyUSD
        },
        note: 'This is a preview only. No transaction has been initiated.',
        expires_in: '5 minutes',
        timestamp: new Date().toISOString()
      };

      res.json({
        success: true,
        message: 'Deposit preview generated successfully',
        data: responseData
      });

    } catch (error) {
      console.error('Preview mobile money deposit error:', error);
      res.status(400).json({
        success: false,
        error: error.message,
        code: 'PREVIEW_FAILED'
      });
    }
  }

  // ============================================================================
  // DEPOSIT CREATION ENDPOINTS (ATOMIC OPERATIONS)
  // ============================================================================

  /**
   * Create mobile money deposit (ATOMIC OPERATION)
   * @param {Object} req - Express request
   * @param {Object} res - Express response
   */
  static async createMobileMoneyDeposit(req, res) {
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
      const formattedPhone = PaymentController.formatPhoneNumber(phoneNumber);
      if (!PaymentController.validatePhoneNumber(formattedPhone)) {
        throw new Error('Invalid phone number format. Expected: 255XXXXXXXXX');
      }

      // Generate idempotency key if not provided
      const finalIdempotencyKey = idempotencyKey || 
        PaymentController.generateIdempotencyKey(userId, amountUSD, formattedPhone);

      // Check for duplicate request using idempotency key
      const existingDeposit = await PaymentRecord.findOne({
        where: {
          user_id: userId,
          metadata: {
            idempotency_key: finalIdempotencyKey
          }
        },
        transaction: t
      });

      if (existingDeposit) {
        // Return existing deposit details
        await t.rollback();
        return res.status(200).json({
          success: true,
          message: 'Duplicate request detected. Returning existing deposit.',
          data: await PaymentController.formatDepositResponse(existingDeposit)
        });
      }

      // STEP 1: VALIDATE WITH LOCKING
      const validation = await PaymentController.validateDepositRequest(
        userId,
        amountUSD
      );

      // Lock user (though we don't update balance yet)
      const user = await User.findByPk(userId, {
        transaction: t,
        lock: t.LOCK.UPDATE,
        attributes: ['id', 'wallet_balance']
      });

      // STEP 2: GENERATE ORDER REFERENCE
      const orderReference = PaymentController.generateOrderReference('DEPO');

      // STEP 3: CREATE PAYMENT RECORD
      const paymentRecord = await PaymentRecord.create({
        user_id: userId,
        order_reference: orderReference,
        payment_reference: null, // Will be updated after ClickPesa call
        amount: amountUSD,
        currency: 'USD',
        payment_method: PaymentMethods.MOBILE_MONEY_DEPOSIT,
        status: DepositStates.INITIATED,
        phone_number: formattedPhone,
        metadata: {
          idempotency_key: finalIdempotencyKey,
          type: 'wallet_deposit',
          recipient_details: {
            phone_number: formattedPhone,
            formatted: PaymentController.formatPhoneForDisplay(formattedPhone)
          },
          conversion_info: validation.conversion,
          requested_tzs: validation.amountTZS,
          wallet_balance_before: validation.walletBalance,
          ip_address: req.ip,
          user_agent: req.headers['user-agent']
        }
      }, { transaction: t });

      // STEP 4: CREATE TRANSACTION RECORD
      const transaction = await Transaction.create({
        user_id: userId,
        order_reference: orderReference,
        payment_reference: null,
        type: TransactionTypes.WALLET_DEPOSIT,
        amount: amountUSD,
        currency: 'USD',
        balance_before: validation.walletBalance,
        balance_after: validation.walletBalance, // Will update on completion
        status: DepositStates.INITIATED,
        gateway_type: 'clickpesa_mobile_money',
        gateway_status: 'INITIATED',
        description: `Deposit from ${PaymentController.formatPhoneForDisplay(formattedPhone)}`,
        transaction_fee: 0, // Deposits typically have no fees
        net_amount: amountUSD,
        metadata: {
          payment_record_id: paymentRecord.id,
          recipient_phone: formattedPhone,
          conversion_info: validation.conversion,
          idempotency_key: finalIdempotencyKey
        }
      }, { transaction: t });

      // Update payment record with transaction ID
      await paymentRecord.update({
        transaction_id: transaction.id
      }, { transaction: t });

      // STEP 5: CALL CLICKPESA API
      let clickpesaResponse;
      try {
        clickpesaResponse = await ClickPesaThirdPartyService.initiateUssdPushPayment({
          amount: amountUSD,
          currency: 'USD',
          orderReference: orderReference,
          phoneNumber: formattedPhone,
          enableChecksum: process.env.CLICKPESA_CHECKSUM_KEY ? true : false
        });

        if (!clickpesaResponse.id) {
          throw new Error('No transaction ID received from ClickPesa');
        }

        // Update records with ClickPesa response
        await paymentRecord.update({
          payment_reference: clickpesaResponse.id,
          status: PaymentController.mapClickPesaStatus(clickpesaResponse.status),
          metadata: {
            ...paymentRecord.metadata,
            clickpesa_response: clickpesaResponse,
            clickpesa_transaction_id: clickpesaResponse.id,
            channel: clickpesaResponse.channel,
            initiated_at: new Date().toISOString()
          }
        }, { transaction: t });

        await transaction.update({
          payment_reference: clickpesaResponse.id,
          gateway_status: clickpesaResponse.status,
          metadata: {
            ...transaction.metadata,
            clickpesa_response: clickpesaResponse,
            channel: clickpesaResponse.channel
          }
        }, { transaction: t });

      } catch (clickpesaError) {
        // ClickPesa API failed - mark as failed
        console.error('ClickPesa API error:', clickpesaError);
        
        await paymentRecord.update({
          status: DepositStates.FAILED,
          metadata: {
            ...paymentRecord.metadata,
            clickpesa_error: clickpesaError.message,
            error_at: new Date().toISOString()
          }
        }, { transaction: t });

        await transaction.update({
          status: DepositStates.FAILED,
          gateway_status: 'FAILED',
          metadata: {
            ...transaction.metadata,
            clickpesa_error: clickpesaError.message
          }
        }, { transaction: t });

        throw new Error(`Deposit initiation failed: ${clickpesaError.message}`);
      }

      // STEP 6: COMMIT TRANSACTION
      await t.commit();

      // STEP 7: RETURN RESPONSE
      const responseData = await PaymentController.formatDepositResponse(paymentRecord);
      
      res.json({
        success: true,
        message: 'Deposit initiated successfully',
        data: responseData
      });

      // STEP 8: INITIATE ASYNCHRONOUS INITIAL STATUS CHECK
      // Check after 30 seconds to see if user completed the USSD prompt
      setTimeout(() => {
        PaymentController.reconcileDepositStatus(orderReference, userId)
          .catch(err => console.error('Initial status check error:', err));
      }, 30000); // 30 seconds

    } catch (error) {
      // Rollback transaction on any error
      await t.rollback();
      
      console.error('Create mobile money deposit error:', error);
      res.status(400).json({
        success: false,
        error: error.message,
        code: 'DEPOSIT_CREATION_FAILED'
      });
    }
  }

  // ============================================================================
  // RECONCILIATION SYSTEM (SOURCE OF TRUTH)
  // ============================================================================

  /**
   * Reconcile deposit status with ClickPesa API
   * This is our SINGLE SOURCE OF TRUTH for deposit status
   * @param {string} orderReference - Order reference
   * @param {number} userId - User ID (optional, for security check)
   * @returns {Promise<Object>} Reconciliation result
   */
/**
 * Reconcile deposit status with ClickPesa API - FIXED VERSION
 */
static async reconcileDepositStatus(orderReference, userId = null) {
  // Rate limiting: Skip if reconciled in last 30 seconds


  const t = await sequelize.transaction();
  
  try {
    console.log(`[DEPOSIT_RECONCILE] Starting reconciliation for: ${orderReference}`);
    
    // Build where clause
    const whereClause = {
      order_reference: orderReference,
      payment_method: PaymentMethods.MOBILE_MONEY_DEPOSIT
    };
    
    if (userId) {
      whereClause.user_id = userId;
    }
    
    // STEP 1: Find payment record WITHOUT INCLUDE (to avoid join locking issues)
    const paymentRecord = await PaymentRecord.findOne({
      where: whereClause,
      transaction: t,
      lock: t.LOCK.UPDATE  // Now this works because no JOIN
    });
    
    if (!paymentRecord) {
      await t.rollback();
      return {
        success: false,
        reconciled: false,
        error: 'Deposit record not found'
      };
    }
    
    // STEP 2: Lock user separately
    const user = await User.findByPk(paymentRecord.user_id, {
      transaction: t,
      lock: t.LOCK.UPDATE,
      attributes: ['id', 'wallet_balance']
    });
    
    if (!user) {
      await t.rollback();
      return {
        success: false,
        reconciled: false,
        error: 'User not found for deposit'
      };
    }
    
    // Skip if already in final state
    if ([DepositStates.COMPLETED, DepositStates.FAILED].includes(paymentRecord.status)) {
      await t.rollback();
      return {
        success: true,
        reconciled: false,
        reason: 'Already in final state',
        current_status: paymentRecord.status
      };
    }
    
    // STEP 3: QUERY CLICKPESA API
    let clickpesaData;
    try {
      clickpesaData = await ClickPesaThirdPartyService.queryPaymentStatus(orderReference);
      
      if (!clickpesaData || clickpesaData.length === 0) {
        // Check if we have a payment_reference
        if (paymentRecord.payment_reference) {
          clickpesaData = await ClickPesaThirdPartyService.getPaymentById(paymentRecord.payment_reference);
        }
      }
      
      if (!clickpesaData || (Array.isArray(clickpesaData) && clickpesaData.length === 0)) {
        // Check if payment is older than 10 minutes, mark as failed
        const paymentAge = Date.now() - new Date(paymentRecord.created_at).getTime();
        if (paymentAge > 10 * 60 * 1000) { // 10 minutes
          await paymentRecord.update({
            status: DepositStates.FAILED,
            metadata: {
              ...paymentRecord.metadata,
              reconciliation_note: 'Payment not found in ClickPesa after 10 minutes',
              last_reconciliation_check: new Date().toISOString()
            }
          }, { transaction: t });
          
          await Transaction.update({
            status: DepositStates.FAILED,
            gateway_status: 'NOT_FOUND'
          }, {
            where: { order_reference: orderReference },
            transaction: t
          });
          
          await t.commit();
          return {
            success: true,
            reconciled: true,
            previous_status: paymentRecord.status,
            new_status: DepositStates.FAILED,
            reason: 'Payment not found in ClickPesa after timeout'
          };
        }
        
        await t.rollback();
        return {
          success: true,
          reconciled: false,
          reason: 'Payment not found in ClickPesa (still within timeout)'
        };
      }
      
    } catch (apiError) {
      console.error(`[DEPOSIT_RECONCILE] ClickPesa API error: ${apiError.message}`);
      
      // If payment is older than 10 minutes and API fails, mark as failed
      const paymentAge = Date.now() - new Date(paymentRecord.created_at).getTime();
      if (paymentAge > 10 * 60 * 1000) {
        await paymentRecord.update({
          status: DepositStates.FAILED,
          metadata: {
            ...paymentRecord.metadata,
            reconciliation_note: 'ClickPesa API unreachable after 10 minutes',
            clickpesa_unreachable: true,
            last_reconciliation_check: new Date().toISOString()
          }
        }, { transaction: t });
        
        await Transaction.update({
          status: DepositStates.FAILED,
          gateway_status: 'API_ERROR'
        }, {
          where: { order_reference: orderReference },
          transaction: t
        });
        
        await t.commit();
        return {
          success: true,
          reconciled: true,
          previous_status: paymentRecord.status,
          new_status: DepositStates.FAILED,
          reason: 'ClickPesa API unreachable after timeout'
        };
      }
      
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
    const mappedStatus = this.mapClickPesaStatus(remoteStatus);
    
    // STEP 4: CHECK IF STATUS CHANGED
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
    
    // STEP 5: STATUS CHANGED - UPDATE RECORDS
    console.log(`[DEPOSIT_RECONCILE] Status changed: ${paymentRecord.status} → ${mappedStatus} (ClickPesa: ${remoteStatus})`);
    
    const previousStatus = paymentRecord.status;
    
    // Update payment record
    const updatedMetadata = {
      ...paymentRecord.metadata,
      previous_status: previousStatus,
      status_changed_at: new Date().toISOString(),
      clickpesa_status: remoteStatus,
      clickpesa_data: latestData,
      last_reconciliation: new Date().toISOString(),
      reconciled_by: 'system'
    };
    
    // Add collected amount info if available
    if (latestData.collectedAmount && latestData.collectedCurrency === 'TZS') {
      try {
        const conversion = await PaymentController.tzsToUsd(latestData.collectedAmount);
        updatedMetadata.collected_amount_tzs = latestData.collectedAmount;
        updatedMetadata.collected_amount_usd = conversion.usdAmount;
        updatedMetadata.final_exchange_rate = conversion.rate;
        updatedMetadata.collected_currency = latestData.collectedCurrency;
      } catch (conversionError) {
        console.warn('Could not convert collected amount:', conversionError);
      }
    }
    
    await paymentRecord.update({
      status: mappedStatus,
      metadata: updatedMetadata
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
    
    // STEP 6: HANDLE COMPLETED DEPOSITS
    if (mappedStatus === DepositStates.COMPLETED && previousStatus !== DepositStates.COMPLETED) {
      // Update user wallet balance
      const depositAmountUSD = parseFloat(paymentRecord.amount);
      const currentBalance = parseFloat(user.wallet_balance);
      const newBalance = currentBalance + depositAmountUSD;
      
      await user.update({ wallet_balance: newBalance }, { transaction: t });
      
      // Update transaction with balance info
      await Transaction.update({
        balance_before: currentBalance,
        balance_after: newBalance,
        amount: depositAmountUSD
      }, {
        where: { order_reference: orderReference },
        transaction: t
      });
      
      console.log(`[DEPOSIT_RECONCILE] User ${user.id} wallet updated. ` +
                 `Added ${depositAmountUSD.toFixed(2)} USD. ` +
                 `New balance: ${newBalance.toFixed(2)} USD`);
    }
    
    // STEP 7: LOG RECONCILIATION
    await this.logDepositReconciliation({
      order_reference: orderReference,
      user_id: paymentRecord.user_id,
      previous_status: previousStatus,
      new_status: mappedStatus,
      clickpesa_status: remoteStatus,
      amount: paymentRecord.amount,
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
      note: mappedStatus === DepositStates.COMPLETED ? 'Funds added to wallet' : 'Status updated'
    };
    
  } catch (error) {
    await t.rollback();
    console.error(`[DEPOSIT_RECONCILE] Error: ${error.message}`);
    return {
      success: false,
      reconciled: false,
      error: error.message
    };
  }
}

  /**
   * Log deposit reconciliation events
   * @param {Object} data - Reconciliation data
   */
  static async logDepositReconciliation(data) {
    try {
      console.log(`[DEPOSIT_RECONCILIATION_LOG] ${JSON.stringify(data)}`);
      
      // Create a DepositReconciliationLog model for production if needed
      /*
      const DepositReconciliationLog = sequelize.define('DepositReconciliationLog', {
        order_reference: { type: DataTypes.STRING(50), allowNull: false },
        user_id: { type: DataTypes.INTEGER, allowNull: false },
        previous_status: { type: DataTypes.STRING(20) },
        new_status: { type: DataTypes.STRING(20), allowNull: false },
        clickpesa_status: { type: DataTypes.STRING(50) },
        amount: { type: DataTypes.DECIMAL(10, 2) },
        metadata: { type: DataTypes.JSON },
        reconciled_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW }
      });
      */
    } catch (error) {
      console.error('Failed to log deposit reconciliation:', error);
    }
  }

  // ============================================================================
  // STATUS & HISTORY ENDPOINTS (WITH AUTO-RECONCILIATION)
  // ============================================================================

  /**
   * Get deposit status with automatic reconciliation
   * @param {Object} req - Express request
   * @param {Object} res - Express response
   */
/**
 * Get deposit status with automatic reconciliation - FIXED VERSION
 */
static async getDepositStatus(req, res) {
  try {
    const { orderReference } = req.params;
    const userId = req.user.id;
    
    // Find payment record WITHOUT INCLUDE during initial fetch
    const paymentRecord = await PaymentRecord.findOne({
      where: {
        order_reference: orderReference,
        user_id: userId,
        payment_method: PaymentMethods.MOBILE_MONEY_DEPOSIT
      }
    });
    
    if (!paymentRecord) {
      return res.status(404).json({
        success: false,
        error: 'Deposit record not found'
      });
    }
    
    // STEP: AUTO-RECONCILE IF NOT FINAL STATE
    let reconciliationResult = null;
    if (![DepositStates.COMPLETED, DepositStates.FAILED].includes(paymentRecord.status)) {
      reconciliationResult = await PaymentController.reconcileDepositStatus(orderReference, userId);
      
      // Refresh payment record if reconciled
      if (reconciliationResult.reconciled) {
        await paymentRecord.reload();
      }
    }
    
    // Get transaction details separately (no join in same query)
    const transaction = await Transaction.findOne({
      where: { order_reference: orderReference }
    });
    
    // Get current user balance
    const user = await User.findByPk(userId, {
      attributes: ['wallet_balance']
    });
    
    // Format response
    const response = await PaymentController.formatDepositResponse(paymentRecord);
    response.current_balance = user.wallet_balance;
    response.transaction = transaction ? {
      gateway_status: transaction.gateway_status,
      description: transaction.description,
      balance_before: transaction.balance_before,
      balance_after: transaction.balance_after
    } : null;
    
    // Add reconciliation info if performed
    if (reconciliationResult) {
      response.reconciliation = {
        performed: true,
        status_changed: reconciliationResult.reconciled,
        previous_status: reconciliationResult.previous_status,
        new_status: reconciliationResult.new_status
      };
      
      // If status changed, add note
      if (reconciliationResult.reconciled) {
        response.note = 'Status updated during this check';
      }
    }
    
    // Add instructional info if still processing
    if (paymentRecord.status === DepositStates.PROCESSING) {
      response.instructions = {
        ussd_prompt: 'Check your phone for a USSD prompt to complete the payment',
        timeout: 'Payment will expire in 5 minutes',
        support: 'Contact support if you did not receive the prompt'
      };
    }
    
    res.json({
      success: true,
      data: response
    });
    
  } catch (error) {
    console.error('Get deposit status error:', error);
    res.status(400).json({
      success: false,
      error: error.message,
      code: 'STATUS_CHECK_FAILED'
    });
  }
}

  /**
   * Get user deposit history
   * @param {Object} req - Express request
   * @param {Object} res - Express response
   */
  static async getDepositHistory(req, res) {
    try {
      const userId = req.user.id;
      const {
        page = 1,
        limit = 20,
        status,
        start_date,
        end_date
      } = req.query;
      
      const offset = (page - 1) * limit;
      const whereClause = {
        user_id: userId,
        payment_method: PaymentMethods.MOBILE_MONEY_DEPOSIT
      };
      
      // Apply filters
      if (status) whereClause.status = status;
      
      if (start_date || end_date) {
        whereClause.created_at = {};
        if (start_date) whereClause.created_at[Op.gte] = new Date(start_date);
        if (end_date) whereClause.created_at[Op.lte] = new Date(end_date);
      }
      
      const { count, rows: deposits } = await PaymentRecord.findAndCountAll({
        where: whereClause,
        order: [['created_at', 'DESC']],
        limit: parseInt(limit),
        offset: parseInt(offset),
        include: [{
          model: Transaction,
          as: 'transaction',
          attributes: ['id', 'gateway_status', 'balance_after']
        }]
      });
      
      // Format response
      const formattedDeposits = deposits.map(d => PaymentController.formatDepositResponse(d));
      
      res.json({
        success: true,
        data: {
          deposits: formattedDeposits,
          pagination: {
            total: count,
            page: parseInt(page),
            pages: Math.ceil(count / limit),
            limit: parseInt(limit)
          }
        }
      });
      
    } catch (error) {
      console.error('Get deposit history error:', error);
      res.status(400).json({
        success: false,
        error: error.message,
        code: 'HISTORY_FETCH_FAILED'
      });
    }
  }

  /**
   * Get user wallet balance
   * @param {Object} req - Express request
   * @param {Object} res - Express response
   */
  static async getWalletBalance(req, res) {
    try {
      const userId = req.user.id;
      const user = await User.findByPk(userId, {
        attributes: ['id', 'wallet_balance', 'username', 'email', 'phone_number']
      });

      if (!user) {
        return res.status(404).json({
          success: false,
          error: 'User not found'
        });
      }

      // Get recent successful deposits count
      const recentDeposits = await PaymentRecord.count({
        where: {
          user_id: userId,
          status: DepositStates.COMPLETED,
          created_at: {
            [Op.gte]: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // Last 7 days
          }
        }
      });

      // Get current exchange rate for display
      let exchangeRate = null;
      try {
        const rateInfo = await ClickPesaThirdPartyService.getUSDtoTZSRate();
        exchangeRate = rateInfo.rate;
      } catch (rateError) {
        console.warn('Could not fetch exchange rate:', rateError.message);
      }

      // Get pending deposits total
      const pendingDeposits = await PaymentRecord.sum('amount', {
        where: {
          user_id: userId,
          status: { [Op.in]: [DepositStates.INITIATED, DepositStates.PROCESSING] },
          payment_method: PaymentMethods.MOBILE_MONEY_DEPOSIT
        }
      }) || 0;

      // Prepare response
      const response = {
        success: true,
        data: {
          balance_usd: user.wallet_balance,
          ...(exchangeRate && {
            approximate_balance_tzs: Math.round(user.wallet_balance * exchangeRate),
            current_exchange_rate: exchangeRate,
            rate_note: `1 USD ≈ ${exchangeRate.toLocaleString()} TZS`
          }),
          currency: 'USD',
          user_id: user.id,
          username: user.username,
          email: user.email,
          phone_number: user.phone_number,
          statistics: {
            recent_deposits_count: recentDeposits,
            pending_deposits_usd: pendingDeposits,
            ...(exchangeRate && {
              pending_deposits_tzs: Math.round(pendingDeposits * exchangeRate)
            })
          }
        }
      };

      res.json(response);
    } catch (error) {
      console.error('Get wallet balance error:', error);
      res.status(400).json({
        success: false,
        error: error.message,
        code: 'WALLET_BALANCE_FAILED'
      });
    }
  }

  /**
   * Get deposit statistics
   * @param {Object} req - Express request
   * @param {Object} res - Express response
   */
  static async getDepositStats(req, res) {
    try {
      const userId = req.user.id;
      
      // Current date calculations
      const now = new Date();
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      
      // Total successful deposits
      const totalDeposits = await PaymentRecord.sum('amount', {
        where: {
          user_id: userId,
          status: DepositStates.COMPLETED,
          payment_method: PaymentMethods.MOBILE_MONEY_DEPOSIT
        }
      }) || 0;
      
      // Today's deposits
      const todayDeposits = await PaymentRecord.sum('amount', {
        where: {
          user_id: userId,
          status: DepositStates.COMPLETED,
          created_at: { [Op.gte]: startOfDay },
          payment_method: PaymentMethods.MOBILE_MONEY_DEPOSIT
        }
      }) || 0;
      
      // This month's deposits
      const monthDeposits = await PaymentRecord.sum('amount', {
        where: {
          user_id: userId,
          status: DepositStates.COMPLETED,
          created_at: { [Op.gte]: startOfMonth },
          payment_method: PaymentMethods.MOBILE_MONEY_DEPOSIT
        }
      }) || 0;
      
      // Recent deposit count (last 30 days)
      const recentCount = await PaymentRecord.count({
        where: {
          user_id: userId,
          status: DepositStates.COMPLETED,
          created_at: { [Op.gte]: thirtyDaysAgo },
          payment_method: PaymentMethods.MOBILE_MONEY_DEPOSIT
        }
      });
      
      // Deposit count for average calculation
      const depositCount = await PaymentRecord.count({
        where: {
          user_id: userId,
          status: DepositStates.COMPLETED,
          payment_method: PaymentMethods.MOBILE_MONEY_DEPOSIT
        }
      });
      
      const averageDeposit = depositCount > 0 ? totalDeposits / depositCount : 0;
      
      // Pending deposits
      const pendingDeposits = await PaymentRecord.sum('amount', {
        where: {
          user_id: userId,
          status: { [Op.in]: [DepositStates.INITIATED, DepositStates.PROCESSING] },
          payment_method: PaymentMethods.MOBILE_MONEY_DEPOSIT
        }
      }) || 0;
      
      // Get current exchange rate for TZS display
      let exchangeRate = null;
      try {
        const rateInfo = await ClickPesaThirdPartyService.getUSDtoTZSRate();
        exchangeRate = rateInfo.rate;
      } catch (rateError) {
        console.warn('Exchange rate fetch failed:', rateError.message);
      }
      
      res.json({
        success: true,
        data: {
          totals: {
            usd: {
              all_time: totalDeposits,
              today: todayDeposits,
              this_month: monthDeposits,
              pending: pendingDeposits
            },
            ...(exchangeRate && {
              tzs: {
                all_time: Math.round(totalDeposits * exchangeRate),
                today: Math.round(todayDeposits * exchangeRate),
                this_month: Math.round(monthDeposits * exchangeRate),
                pending: Math.round(pendingDeposits * exchangeRate)
              }
            })
          },
          counts: {
            all_time: depositCount,
            recent_30_days: recentCount
          },
          averages: {
            average_deposit_usd: parseFloat(averageDeposit.toFixed(2)),
            ...(exchangeRate && {
              average_deposit_tzs: Math.round(averageDeposit * exchangeRate)
            })
          },
          ...(exchangeRate && { exchange_rate: exchangeRate }),
          currency: 'USD',
          updated_at: new Date().toISOString()
        }
      });
      
    } catch (error) {
      console.error('Get deposit stats error:', error);
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
   * Handle payment webhook (NOT TRUSTED FOR STATE CHANGES)
   * Webhooks only trigger reconciliation, not direct state updates
   * @param {Object} req - Express request
   * @param {Object} res - Express response
   */
  static async handlePaymentWebhook(req, res) {
    console.log('[DEPOSIT_WEBHOOK] Received payment webhook');
    
    try {
      const rawBody = req.rawBody || JSON.stringify(req.body);
      const signature = req.headers['x-clickpesa-signature'] || 
                       req.headers['x-signature'];
      
      if (!signature) {
        console.warn('[DEPOSIT_WEBHOOK] Missing signature');
        return res.status(400).json({ success: false, error: 'Missing signature' });
      }
      
      // Verify webhook signature
      const isValid = ClickPesaThirdPartyService.verifyWebhookSignature(rawBody, signature);
      if (!isValid) {
        console.warn('[DEPOSIT_WEBHOOK] Invalid signature');
        return res.status(401).json({ success: false, error: 'Invalid signature' });
      }
      
      // Parse payload
      const payload = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      const { event, eventType, data } = payload;
      const webhookEvent = event || eventType;
      
      if (!webhookEvent || !data) {
        console.warn('[DEPOSIT_WEBHOOK] Invalid payload');
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
        webhook_type: 'deposit'
      });
      
      // Extract order reference
      const orderReference = data.orderReference || 
                            data.id || 
                            data.transactionId;
      
      if (!orderReference) {
        console.warn('[DEPOSIT_WEBHOOK] No order reference in payload');
        return res.json({ success: true, message: 'Webhook received but no action taken' });
      }
      
      // Trigger reconciliation based on webhook
      // Don't await - fire and forget
      PaymentController.reconcileDepositStatus(orderReference)
        .then(result => {
          console.log(`[DEPOSIT_WEBHOOK] Reconciliation triggered for ${orderReference}:`, 
                     result.reconciled ? 'Status changed' : 'No change');
        })
        .catch(err => {
          console.error(`[DEPOSIT_WEBHOOK] Reconciliation failed for ${orderReference}:`, err.message);
        });
      
      // Respond immediately
      res.json({
        success: true,
        message: 'Webhook received and processing',
        event: webhookEvent,
        order_reference: orderReference
      });
      
    } catch (error) {
      console.error('[DEPOSIT_WEBHOOK] Processing error:', error);
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
   * Format deposit response
   * @param {Object} paymentRecord - Payment record instance
   * @returns {Object} Formatted response
   */
  static formatDepositResponse(paymentRecord) {
    const metadata = paymentRecord.metadata || {};
    const conversionInfo = metadata.conversion_info || {};
    const recipientDetails = metadata.recipient_details || {};
    const clickpesaData = metadata.clickpesa_data || {};
    
    // Get transaction if available
    const transaction = paymentRecord.transaction;
    
    return {
      id: paymentRecord.id,
      order_reference: paymentRecord.order_reference,
      payment_reference: paymentRecord.payment_reference,
      transaction_id: paymentRecord.transaction_id,
      amount_usd: paymentRecord.amount,
      amount_tzs: metadata.requested_tzs || conversionInfo.tzsAmount,
      exchange_rate: conversionInfo.rate,
      payout_method: paymentRecord.payment_method,
      status: paymentRecord.status,
      recipient: recipientDetails,
      phone_number: paymentRecord.phone_number,
      created_at: paymentRecord.created_at,
      updated_at: paymentRecord.updated_at,
      metadata: {
        channel: metadata.channel,
        clickpesa_transaction_id: metadata.clickpesa_transaction_id,
        collected_amount_tzs: metadata.collected_amount_tzs,
        collected_amount_usd: metadata.collected_amount_usd,
        final_exchange_rate: metadata.final_exchange_rate
      },
      transaction: transaction ? {
        gateway_status: transaction.gateway_status,
        description: transaction.description,
        balance_before: transaction.balance_before,
        balance_after: transaction.balance_after
      } : null
    };
  }

  /**
   * Validate phone number endpoint (for frontend validation)
   * @param {Object} req - Express request
   * @param {Object} res - Express response
   */
  static async validatePhoneNumberEndpoint(req, res) {
    try {
      const { phoneNumber } = req.body;

      if (!phoneNumber) {
        return res.status(400).json({
          success: false,
          error: 'Phone number is required'
        });
      }

      const formattedPhone = PaymentController.formatPhoneNumber(phoneNumber);
      const isValid = PaymentController.validatePhoneNumber(formattedPhone);

      if (!isValid) {
        return res.json({
          success: true,
          data: {
            valid: false,
            formatted: formattedPhone,
            available_methods: [],
            sender_details: null,
            message: 'Invalid phone number format. Expected: 255XXXXXXXXX'
          }
        });
      }

      // Test with ClickPesa preview using minimal amount
      try {
        const reference = PaymentController.generateOrderReference('TEST');
        const testAmountTZS = 2000;
        const conversion = await PaymentController.tzsToUsd(testAmountTZS);
        const testAmountUSD = conversion.usdAmount;

        const preview = await ClickPesaThirdPartyService.previewUssdPushPayment({
          amount: testAmountUSD,
          currency: 'USD',
          orderReference: reference,
          phoneNumber: formattedPhone,
          fetchSenderDetails: true
        });

        return res.json({
          success: true,
          data: {
            valid: true,
            formatted: formattedPhone,
            available_methods: preview.activeMethods || [],
            sender_details: preview.sender || null,
            test_amount_usd: testAmountUSD,
            test_amount_tzs: testAmountTZS,
            exchange_rate: conversion.rate,
            message: 'Phone number is valid and has available payment methods'
          }
        });
      } catch (previewError) {
        return res.json({
          success: true,
          data: {
            valid: true,
            formatted: formattedPhone,
            available_methods: [],
            sender_details: null,
            message: 'Phone number is valid but may not have active payment methods'
          }
        });
      }
    } catch (error) {
      console.error('Validate phone number error:', error);
      res.status(400).json({
        success: false,
        error: error.message,
        code: 'PHONE_VALIDATION_FAILED'
      });
    }
  }
}

// ============================================================================
// CRON JOBS FOR DEPOSIT RECONCILIATION
// ============================================================================

/**
 * Batch reconciliation job for pending deposits
 * Should be run every 5-10 minutes in production
 */
PaymentController.reconcilePendingDeposits = async function() {
  console.log('[DEPOSIT_CRON] Starting batch reconciliation of pending deposits');
  
  try {
    // Find all deposits that need reconciliation (older than 2 minutes)
    const pendingDeposits = await PaymentRecord.findAll({
      where: {
        status: { [Op.in]: [DepositStates.INITIATED, DepositStates.PROCESSING] },
        payment_method: PaymentMethods.MOBILE_MONEY_DEPOSIT,
        created_at: {
          [Op.lt]: new Date(Date.now() - 2 * 60 * 1000), // Older than 2 minutes
          [Op.gt]: new Date(Date.now() - 24 * 60 * 60 * 1000) // Within 24 hours
        }
      },
      limit: 50, // Process in batches
      order: [['created_at', 'ASC']]
    });
    
    console.log(`[DEPOSIT_CRON] Found ${pendingDeposits.length} deposits to reconcile`);
    
    const results = {
      total: pendingDeposits.length,
      reconciled: 0,
      unchanged: 0,
      errors: 0,
      details: []
    };
    
    // Process each deposit
    for (const deposit of pendingDeposits) {
      try {
        const result = await PaymentController.reconcileDepositStatus(deposit.order_reference);
        
        results.details.push({
          order_reference: deposit.order_reference,
          user_id: deposit.user_id,
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
        console.error(`[DEPOSIT_CRON] Error reconciling ${deposit.order_reference}:`, error.message);
      }
    }
    
    console.log('[DEPOSIT_CRON] Batch reconciliation completed:', results);
    return results;
    
  } catch (error) {
    console.error('[DEPOSIT_CRON] Batch reconciliation failed:', error);
    throw error;
  }
};

/**
 * Cleanup job for expired/failed deposits
 * Should be run once per hour
 */
PaymentController.cleanupOldDeposits = async function() {
  console.log('[DEPOSIT_CLEANUP] Starting cleanup of old deposits');
  
  try {
    const cutoffDate = new Date(Date.now() - 24 * 60 * 60 * 1000); // 24 hours ago
    
    // Find deposits that are still in non-final state after 24 hours
    const oldDeposits = await PaymentRecord.findAll({
      where: {
        status: { [Op.in]: [DepositStates.INITIATED, DepositStates.PROCESSING] },
        payment_method: PaymentMethods.MOBILE_MONEY_DEPOSIT,
        created_at: {
          [Op.lt]: cutoffDate
        }
      },
      limit: 100
    });
    
    console.log(`[DEPOSIT_CLEANUP] Found ${oldDeposits.length} old deposits to cleanup`);
    
    const results = {
      total: oldDeposits.length,
      marked_failed: 0,
      errors: 0
    };
    
    // Mark them as failed
    for (const deposit of oldDeposits) {
      try {
        await deposit.update({
          status: DepositStates.FAILED,
          metadata: {
            ...deposit.metadata,
            cleanup_note: 'Automatically marked as failed after 24 hours',
            cleanup_at: new Date().toISOString()
          }
        });
        
        await Transaction.update({
          status: DepositStates.FAILED,
          gateway_status: 'EXPIRED'
        }, {
          where: { order_reference: deposit.order_reference }
        });
        
        results.marked_failed++;
        
      } catch (error) {
        results.errors++;
        console.error(`[DEPOSIT_CLEANUP] Error cleaning up ${deposit.order_reference}:`, error.message);
      }
    }
    
    console.log('[DEPOSIT_CLEANUP] Cleanup completed:', results);
    return results;
    
  } catch (error) {
    console.error('[DEPOSIT_CLEANUP] Cleanup failed:', error);
    throw error;
  }
};

/**
 * Generate daily deposit report
 * Should be run once per day
 */
PaymentController.generateDailyDepositReport = async function() {
  console.log('[DEPOSIT_REPORT] Generating daily deposit report');
  
  try {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0);
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Get all deposits from yesterday
    const yesterdaysDeposits = await PaymentRecord.findAll({
      where: {
        created_at: {
          [Op.gte]: yesterday,
          [Op.lt]: today
        },
        payment_method: PaymentMethods.MOBILE_MONEY_DEPOSIT
      },
      include: [{
        model: User,
        as: 'user',
        attributes: ['id', 'username']
      }]
    });
    
    // Generate report
    const report = {
      date: yesterday.toISOString().split('T')[0],
      total_deposits: yesterdaysDeposits.length,
      by_status: {},
      total_amount_usd: 0,
      total_amount_tzs: 0,
      success_rate: 0,
      average_amount_usd: 0,
      top_users: []
    };
    
    // Calculate statistics
    const successfulDeposits = yesterdaysDeposits.filter(d => d.status === DepositStates.COMPLETED);
    
    yesterdaysDeposits.forEach(deposit => {
      // Status breakdown
      report.by_status[deposit.status] = (report.by_status[deposit.status] || 0) + 1;
      
      // Amount totals for successful deposits
      if (deposit.status === DepositStates.COMPLETED) {
        report.total_amount_usd += parseFloat(deposit.amount);
        
        const metadata = deposit.metadata || {};
        const conversionInfo = metadata.conversion_info || {};
        if (conversionInfo.tzsAmount) {
          report.total_amount_tzs += conversionInfo.tzsAmount;
        }
      }
    });
    
    // Calculate success rate
    if (yesterdaysDeposits.length > 0) {
      report.success_rate = (successfulDeposits.length / yesterdaysDeposits.length) * 100;
    }
    
    // Calculate average amount
    if (successfulDeposits.length > 0) {
      report.average_amount_usd = report.total_amount_usd / successfulDeposits.length;
    }
    
    // Find top depositing users
    const userTotals = {};
    successfulDeposits.forEach(deposit => {
      const userId = deposit.user_id;
      userTotals[userId] = (userTotals[userId] || 0) + parseFloat(deposit.amount);
    });
    
    // Convert to array and sort
    const userTotalsArray = Object.entries(userTotals).map(([userId, total]) => ({
      user_id: parseInt(userId),
      username: deposit.user?.username || 'Unknown',
      total_amount_usd: total
    }));
    
    userTotalsArray.sort((a, b) => b.total_amount_usd - a.total_amount_usd);
    report.top_users = userTotalsArray.slice(0, 10); // Top 10 users
    
    console.log('[DEPOSIT_REPORT] Daily report generated:', report);
    return report;
    
  } catch (error) {
    console.error('[DEPOSIT_REPORT] Daily report generation failed:', error);
    throw error;
  }
};

module.exports = PaymentController;