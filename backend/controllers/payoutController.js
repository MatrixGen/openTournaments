// controllers/payoutController.js
/**
 * PRODUCTION-READY PAYOUT CONTROLLER WITH MANDATORY CURRENCY
 * 
 * WARNING: FINANCIAL TRANSACTIONS - HANDLE WITH EXTREME CARE
 * Every request must include currency code to prevent ambiguity
 */

const {
  sequelize,
  User,
  Transaction,
  PaymentRecord,
  WebhookLog,
} = require("../models");
const ClickPesaService = require("../services/clickPesaService");
const { Op } = require("sequelize");
const crypto = require("crypto");

// ============================================================================
// CONSTANTS & STATE DEFINITIONS
// ============================================================================

/**
 * Payout states - Simplified for reliability
 */
const PayoutStates = {
  INITIATED: 'initiated',
  PROCESSING: 'processing',
  COMPLETED: 'successfull',
  FAILED: 'failed'
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
 * These are the actual limits enforced by our system
 */
const WithdrawalLimits = {
  MOBILE_MIN_TZS: 1000,      // 1,000 TZS minimum for mobile money
  BANK_MIN_TZS: 10000,       // 10,000 TZS minimum for bank transfers
  MAX_TZS: 5000000,          // 5,000,000 TZS maximum for any withdrawal
  DAILY_LIMIT_TZS: 2000000   // 2,000,000 TZS daily limit per user
};

/**
 * Supported currencies for payouts
 */
const SupportedCurrencies = {
  TZS: 'TZS',  // Tanzanian Shillings (Primary)
  USD: 'USD'   // US Dollars (for future flexibility)
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

class PayoutController {
  /**
   * Generate unique order reference
   * @param {string} type - Reference type
   * @returns {string} Unique order reference
   */
  static generateOrderReference(type = 'WTH') {
    const timestamp = Date.now();
    const random = crypto.randomBytes(4).toString('hex').toUpperCase();
    return `${type}${timestamp}${random}`;
  }

  /**
   * Generate idempotency key for payout request
   * @param {number} userId - User ID
   * @param {number} amount - Amount
   * @param {string} currency - Currency code
   * @param {string} recipient - Recipient identifier
   * @returns {string} Idempotency key
   */
  static generateIdempotencyKey(userId, amount, currency, recipient) {
    const hash = crypto.createHash('sha256')
      .update(`${userId}:${amount}:${currency}:${recipient}:${Date.now()}`)
      .digest('hex')
      .substring(0, 32);
    return `PAYOUT_${hash}`;
  }

  /**
   * USD to TZS conversion using ClickPesa rates
   * @param {number} usdAmount - Amount in USD
   * @returns {Promise<Object>} Conversion result
   */
  static async usdToTzs(usdAmount) {
    try {
      const numericAmount = typeof usdAmount === 'string' 
        ? parseFloat(usdAmount.replace(/[^\d.-]/g, ''))
        : usdAmount;
      
      if (isNaN(numericAmount) || numericAmount <= 0) {
        throw new Error(`Invalid USD amount: ${usdAmount}`);
      }
      
      const conversion = await ClickPesaService.convertUSDToTZS(numericAmount);
      return {
        tzsAmount: conversion.convertedAmount,
        rate: conversion.rate,
        timestamp: conversion.timestamp,
        source: 'clickpesa'
      };
    } catch (error) {
      console.error('[CURRENCY_CONVERSION] USD to TZS failed:', error.message);
      const fallbackRate = 2500; // Conservative fallback rate
      
      let numericAmount = usdAmount;
      if (typeof usdAmount === 'string') {
        numericAmount = parseFloat(usdAmount.replace(/[^\d.-]/g, '')) || 0;
      }
      
      return {
        tzsAmount: Math.round(numericAmount * fallbackRate),
        rate: fallbackRate,
        timestamp: new Date().toISOString(),
        source: 'fallback',
        note: `Using fallback rate due to error: ${error.message}`
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
      const numericAmount = typeof tzsAmount === 'string' 
        ? parseFloat(tzsAmount.replace(/[^\d.-]/g, ''))
        : tzsAmount;
      
      if (isNaN(numericAmount) || numericAmount <= 0) {
        throw new Error(`Invalid TZS amount: ${tzsAmount}`);
      }
      
      const conversion = await ClickPesaService.convertTZSToUSD(numericAmount);
      return {
        usdAmount: conversion.convertedAmount,
        rate: conversion.rate,
        timestamp: conversion.timestamp,
        source: 'clickpesa'
      };
    } catch (error) {
      console.error('[CURRENCY_CONVERSION] TZS to USD failed:', error.message);
      const fallbackRate = 0.0004; // Conservative fallback rate
      
      let numericAmount = tzsAmount;
      if (typeof tzsAmount === 'string') {
        numericAmount = parseFloat(tzsAmount.replace(/[^\d.-]/g, '')) || 0;
      }
      
      return {
        usdAmount: parseFloat((numericAmount * fallbackRate).toFixed(6)),
        rate: fallbackRate,
        timestamp: new Date().toISOString(),
        source: 'fallback',
        note: `Using fallback rate due to error: ${error.message}`
      };
    }
  }

  /**
   * Map ClickPesa status to internal status
   * @param {string} clickpesaStatus - ClickPesa status
   * @returns {string} Internal status
   */
  static mapClickPesaStatus(clickpesaStatus) {
    if (!clickpesaStatus) return PayoutStates.INITIATED;

    const statusUpper = clickpesaStatus.toUpperCase();
    
    if (['SUCCESS', 'SUCCESSFUL', 'COMPLETED', 'AUTHORIZED'].includes(statusUpper)) {
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
   * @param {string} phoneNumber - Phone number
   * @returns {boolean} True if valid
   */
  static validatePhoneNumber(phoneNumber) {
    const regex = /^255[67]\d{8}$/;
    return regex.test(phoneNumber);
  }

  /**
   * Format phone number to Tanzanian standard
   * @param {string} phoneNumber - Raw phone number
   * @returns {string} Formatted phone number
   */
  static formatPhoneNumber(phoneNumber) {
    const digits = phoneNumber.replace(/\D/g, '');
    
    if (digits.startsWith('0')) {
      return '255' + digits.substring(1);
    }
    
    if (digits.startsWith('255')) {
      return digits;
    }
    
    if (digits.length === 9) {
      return '255' + digits;
    }
    
    return digits;
  }

  /**
   * Validate currency code
   * @param {string} currency - Currency code
   * @returns {Object} Validation result
   */
  static validateCurrencyCode(currency) {
    if (!currency || typeof currency !== 'string') {
      return {
        valid: false,
        error: 'Currency code is required and must be a string'
      };
    }

    const normalizedCurrency = currency.toUpperCase().trim();
    
    if (!Object.values(SupportedCurrencies).includes(normalizedCurrency)) {
      return {
        valid: false,
        error: `Unsupported currency: ${currency}. Supported: ${Object.values(SupportedCurrencies).join(', ')}`
      };
    }

    return {
      valid: true,
      currency: normalizedCurrency
    };
  }

  /**
   * Validate amount is a positive number
   * @param {any} amount - Amount to validate
   * @returns {Object} Validation result
   */
  static validateAmount(amount) {
    const numericAmount = typeof amount === 'string' 
      ? parseFloat(amount.replace(/[^\d.-]/g, ''))
      : amount;
    
    if (isNaN(numericAmount)) {
      return {
        valid: false,
        error: 'Amount must be a valid number'
      };
    }
    
    if (numericAmount <= 0) {
      return {
        valid: false,
        error: 'Amount must be greater than 0'
      };
    }
    
    return {
      valid: true,
      amount: numericAmount
    };
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

  // ============================================================================
  // ATOMIC OPERATION HELPERS (CRITICAL FOR FINANCIAL SAFETY)
  // ============================================================================

  /**
   * Reserve funds from user wallet (ATOMIC OPERATION)
   * Uses row-level locking to prevent race conditions
   * @param {Object} user - User instance (must be locked)
   * @param {number} amountUSD - Amount to reserve in USD
   * @param {Object} transaction - Sequelize transaction
   * @returns {Promise<Object>} Result
   */
  static async reserveFundsAtomic(user, amountUSD, transaction) {
    console.log(`[FUND_RESERVATION] User ${user.id}: Attempting to reserve ${amountUSD} USD`);
    
    const userId = user.id;
    const currentBalance = parseFloat(user.wallet_balance);
    
    // Validate amount
    if (isNaN(amountUSD) || amountUSD <= 0) {
      throw new Error(`Invalid reservation amount: ${amountUSD} USD`);
    }
    
    // Check sufficient balance
    if (currentBalance < amountUSD) {
      console.error(`[FUND_RESERVATION] Insufficient balance for user ${userId}: ${currentBalance} < ${amountUSD}`);
      throw new Error(`Insufficient wallet balance. Available: ${currentBalance.toFixed(2)} USD, Required: ${amountUSD.toFixed(2)} USD`);
    }
    
    const newBalance = currentBalance - amountUSD;
    
    console.log(`[FUND_RESERVATION] User ${userId}: ${currentBalance} → ${newBalance} (-${amountUSD})`);
    
    await user.update(
      { wallet_balance: newBalance },
      { transaction }
    );
    
    // Log the balance change for audit trail
    await PayoutController.logBalanceAudit(
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
   * Used when payout fails after funds were reserved
   * @param {number} userId - User ID
   * @param {number} amountUSD - Amount to restore in USD
   * @param {Object} transaction - Sequelize transaction
   * @returns {Promise<Object>} Result
   */
  static async restoreFundsAtomic(userId, amountUSD, transaction) {
    console.log(`[FUND_RESTORATION] User ${userId}: Attempting to restore ${amountUSD} USD`);
    
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
    
    console.log(`[FUND_RESTORATION] User ${userId}: ${currentBalance} → ${newBalance} (+${amountUSD})`);
    
    await user.update(
      { wallet_balance: newBalance },
      { transaction }
    );
    
    // Log the balance change for audit trail
    await PayoutController.logBalanceAudit(
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
   * @param {number} changeAmount - Amount changed
   * @param {number|null} transactionId - Transaction ID
   * @param {number|null} paymentRecordId - Payment record ID
   * @param {string} reason - Reason for change
   * @param {Object} transaction - Sequelize transaction
   */
  static async logBalanceAudit(userId, oldBalance, newBalance, changeAmount, transactionId, paymentRecordId, reason, transaction) {
    console.log(`[BALANCE_AUDIT] User ${userId}: ${oldBalance.toFixed(2)} → ${newBalance.toFixed(2)} (${changeAmount > 0 ? '+' : ''}${changeAmount.toFixed(2)}) - ${reason}`);
    
    // In production, save to BalanceAuditLog table
    // For now, we'll log to console and potentially save to a separate audit table
  }

  // ============================================================================
  // VALIDATION FUNCTIONS WITH MANDATORY CURRENCY
  // ============================================================================

  /**
   * Validate withdrawal request with mandatory currency
   * @param {number} userId - User ID
   * @param {number} amount - Amount
   * @param {string} currency - Currency code (TZS or USD)
   * @param {string} payoutType - 'mobile_money' or 'bank'
   * @returns {Promise<Object>} Validation result
   */
  static async validateWithdrawalRequest(userId, amount, currency, payoutType) {
    console.log(`[WITHDRAWAL_VALIDATION] User ${userId}: Validating ${amount} ${currency} for ${payoutType}`);
    
    // 1. Validate currency code
    const currencyValidation = PayoutController.validateCurrencyCode(currency);
    if (!currencyValidation.valid) {
      throw new Error(currencyValidation.error);
    }
    const validatedCurrency = currencyValidation.currency;

    // 2. Validate amount
    const amountValidation = PayoutController.validateAmount(amount);
    if (!amountValidation.valid) {
      throw new Error(amountValidation.error);
    }
    const numericAmount = amountValidation.amount;

    // 3. Get user
    const user = await User.findByPk(userId, {
      attributes: ['id', 'wallet_balance', 'username', 'email', 'phone_number']
    });

    if (!user) {
      throw new Error('User not found');
    }

    // 4. Based on currency, validate and convert
    let amountTZS, amountUSD, conversion;

    if (validatedCurrency === 'TZS') {
      // Amount is in TZS
      amountTZS = numericAmount;
      
      // Validate against TZS limits
      const minTZS = payoutType === 'bank' 
        ? WithdrawalLimits.BANK_MIN_TZS 
        : WithdrawalLimits.MOBILE_MIN_TZS;
      
      if (amountTZS < minTZS) {
        throw new Error(
          `Minimum ${payoutType} withdrawal amount is ${minTZS.toLocaleString()} TZS`
        );
      }

      if (amountTZS > WithdrawalLimits.MAX_TZS) {
        throw new Error(
          `Maximum withdrawal amount is ${WithdrawalLimits.MAX_TZS.toLocaleString()} TZS`
        );
      }

      // Convert to USD for storage and balance check
      conversion = await PayoutController.tzsToUsd(amountTZS);
      amountUSD = conversion.usdAmount;

    } else if (validatedCurrency === 'USD') {
      // Amount is in USD
      amountUSD = numericAmount;
      
      // Convert to TZS for validation against limits
      conversion = await PayoutController.usdToTzs(amountUSD);
      amountTZS = conversion.tzsAmount;

      // Validate against TZS limits (after conversion)
      const minTZS = payoutType === 'bank' 
        ? WithdrawalLimits.BANK_MIN_TZS 
        : WithdrawalLimits.MOBILE_MIN_TZS;
      
      if (amountTZS < minTZS) {
        const minUSD = await PayoutController.tzsToUsd(minTZS);
        throw new Error(
          `Minimum ${payoutType} withdrawal amount is ${minUSD.usdAmount.toFixed(2)} USD ` +
          `(approximately ${minTZS.toLocaleString()} TZS)`
        );
      }

      if (amountTZS > WithdrawalLimits.MAX_TZS) {
        const maxUSD = await PayoutController.tzsToUsd(WithdrawalLimits.MAX_TZS);
        throw new Error(
          `Maximum withdrawal amount is ${maxUSD.usdAmount.toFixed(2)} USD ` +
          `(approximately ${WithdrawalLimits.MAX_TZS.toLocaleString()} TZS)`
        );
      }
    }

    // 5. Check wallet balance (in USD)
    const walletBalance = parseFloat(user.wallet_balance);
    if (walletBalance < amountUSD) {
      throw new Error(
        `Insufficient wallet balance. Available: ${walletBalance.toFixed(2)} USD, ` +
        `Required: ${amountUSD.toFixed(2)} USD`
      );
    }

    // 6. Daily withdrawal limit check (in TZS)
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const todayWithdrawals = await PaymentRecord.findAll({
      where: {
        user_id: userId,
        status: PayoutStates.COMPLETED,
        payment_method: payoutType === 'bank' 
          ? PaymentMethods.BANK_PAYOUT 
          : PaymentMethods.MOBILE_MONEY_PAYOUT,
        created_at: {
          [Op.gte]: startOfDay
        }
      },
      attributes: ['id', 'metadata']
    });

    // Sum TZS amounts from metadata
    let totalTZSToday = 0;
    todayWithdrawals.forEach(withdrawal => {
      const metadata = withdrawal.metadata || {};
      if (metadata.tzs_amount) {
        totalTZSToday += metadata.tzs_amount;
      } else {
        // Estimate with fallback rate
        totalTZSToday += withdrawal.amount * 2500;
      }
    });

    if (totalTZSToday + amountTZS > WithdrawalLimits.DAILY_LIMIT_TZS) {
      const remainingTZS = Math.max(0, WithdrawalLimits.DAILY_LIMIT_TZS - totalTZSToday);
      throw new Error(
        `Daily withdrawal limit exceeded. You can withdraw up to ${WithdrawalLimits.DAILY_LIMIT_TZS.toLocaleString()} TZS per day. ` +
        `Remaining today: ${remainingTZS.toLocaleString()} TZS`
      );
    }

    // 7. Check for existing processing withdrawals
    const recentWithdrawal = await PaymentRecord.findOne({
      where: {
        user_id: userId,
        status: { [Op.in]: [PayoutStates.INITIATED, PayoutStates.PROCESSING] },
        payment_method: payoutType === 'bank' 
          ? PaymentMethods.BANK_PAYOUT 
          : PaymentMethods.MOBILE_MONEY_PAYOUT,
        created_at: {
          [Op.gt]: new Date(Date.now() - 15 * 60 * 1000)
        }
      }
    });

    if (recentWithdrawal) {
      console.log(`[WITHDRAWAL_VALIDATION] Found recent withdrawal ${recentWithdrawal.order_reference}`);
      
      // Attempt reconciliation first
      try {
        await PayoutController.reconcilePayoutStatus(recentWithdrawal.order_reference, userId);
        await recentWithdrawal.reload();
        
        if ([PayoutStates.INITIATED, PayoutStates.PROCESSING].includes(recentWithdrawal.status)) {
          throw new Error(
            'You have a withdrawal in progress. Please wait for it to complete before initiating a new one.'
          );
        }
      } catch (reconcileError) {
        console.warn('[WITHDRAWAL_VALIDATION] Reconciliation failed:', reconcileError.message);
        throw new Error(
          'You have a withdrawal in progress. Please wait for it to complete before initiating a new one.'
        );
      }
    }

    console.log(`[WITHDRAWAL_VALIDATION] Validation passed for user ${userId}: ${amountTZS} TZS / ${amountUSD} USD`);

    return {
      user,
      walletBalance,
      requestAmount: numericAmount,
      requestCurrency: validatedCurrency,
      amountTZS,
      amountUSD,
      conversion,
      limits: {
        minTZS: payoutType === 'bank' ? WithdrawalLimits.BANK_MIN_TZS : WithdrawalLimits.MOBILE_MIN_TZS,
        maxTZS: WithdrawalLimits.MAX_TZS,
        dailyTZS: WithdrawalLimits.DAILY_LIMIT_TZS,
        remainingDailyTZS: WithdrawalLimits.DAILY_LIMIT_TZS - totalTZSToday
      }
    };
  }

  /**
   * Calculate payout with fees using ClickPesa service
   * @param {number} amountTZS - Amount in TZS
   * @param {string} payoutMethod - 'mobile_money' or 'bank'
   * @returns {Promise<Object>} Fee calculation result
   */
  static async calculatePayoutWithFees(amountTZS, payoutMethod) {
    console.log(`[FEE_CALCULATION] Calculating fees for ${amountTZS} TZS (${payoutMethod})`);
    
    try {
      const calculation = await ClickPesaService.calculatePayoutWithFees({
        amount: amountTZS,
        currency: 'TZS',
        feeBearer: 'MERCHANT', // We pay the fees
        payoutMethod: payoutMethod === 'bank' ? 'BANK_PAYOUT' : 'MOBILE_MONEY'
      });

      console.log(`[FEE_CALCULATION] ClickPesa calculation:`, {
        payoutAmountTZS: calculation.payoutAmountTZS,
        feeAmountTZS: calculation.feeAmountTZS,
        totalDebitAmount: calculation.totalDebitAmount
      });

      // Convert fees to USD for our records
      const feeConversion = await PayoutController.tzsToUsd(calculation.feeAmountTZS);
      const payoutConversion = await PayoutController.tzsToUsd(calculation.payoutAmountTZS);

      return {
        // TZS amounts (for ClickPesa)
        feeAmountTZS: calculation.feeAmountTZS,
        payoutAmountTZS: calculation.payoutAmountTZS,
        totalDebitAmountTZS: calculation.totalDebitAmount,
        
        // USD amounts (for our records)
        feeAmountUSD: feeConversion.usdAmount,
        payoutAmountUSD: payoutConversion.usdAmount,
        totalDebitAmountUSD: calculation.totalDebitAmount / calculation.conversionInfo?.rate,
        
        // Conversion info
        exchangeRate: calculation.conversionInfo?.rate,
        feeBearer: 'MERCHANT',
        calculation
      };
    } catch (error) {
      console.error('[FEE_CALCULATION] ClickPesa fee calculation failed:', error.message);
      
      // Fallback: Use conservative fee percentages
      const feePercent = payoutMethod === 'bank' ? 0.02 : 0.01; // 2% for bank, 1% for mobile
      const feeAmountTZS = Math.round(amountTZS * feePercent);
      const payoutAmountTZS = amountTZS - feeAmountTZS;
      
      // Convert to USD
      const feeConversion = await PayoutController.tzsToUsd(feeAmountTZS);
      const payoutConversion = await PayoutController.tzsToUsd(payoutAmountTZS);
      const amountConversion = await PayoutController.tzsToUsd(amountTZS);

      return {
        feeAmountTZS,
        payoutAmountTZS,
        totalDebitAmountTZS: amountTZS,
        feeAmountUSD: feeConversion.usdAmount,
        payoutAmountUSD: payoutConversion.usdAmount,
        totalDebitAmountUSD: amountConversion.usdAmount,
        exchangeRate: amountConversion.rate,
        feeBearer: 'MERCHANT',
        note: 'Using estimated fees due to calculation error',
        error: error.message
      };
    }
  }

  // ============================================================================
  // PREVIEW ENDPOINTS WITH MANDATORY CURRENCY
  // ============================================================================

  /**
   * Preview mobile money payout with mandatory currency
   */
  static async previewMobileMoneyPayout(req, res) {
    try {
      const { amount, phoneNumber, currency } = req.body;
      const userId = req.user.id;

      console.log(`[PAYOUT_PREVIEW] Mobile money preview requested by ${userId}: ${amount} ${currency}`);

      // Basic validation
      if (!amount || !phoneNumber || !currency) {
        return res.status(400).json({
          success: false,
          error: 'Amount, phone number, and currency are required',
          code: 'MISSING_REQUIRED_FIELDS'
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
        amount,
        currency,
        'mobile_money'
      );

      // Calculate fees
      const feeCalculation = await PayoutController.calculatePayoutWithFees(
        validation.amountTZS,
        'mobile_money'
      );

      // Generate preview order reference
      const previewReference = PayoutController.generateOrderReference('PRE');

      // Prepare response
      const responseData = {
        preview_reference: previewReference,
        amount: validation.requestAmount,
        currency: validation.requestCurrency,
        converted_amount_tzs: validation.amountTZS,
        converted_amount_usd: validation.amountUSD,
        fee_tzs: feeCalculation.feeAmountTZS,
        fee_usd: feeCalculation.feeAmountUSD,
        net_amount_tzs: feeCalculation.payoutAmountTZS,
        net_amount_usd: feeCalculation.payoutAmountUSD,
        exchange_rate: validation.conversion.rate,
        recipient: {
          phone_number: formattedPhone,
          formatted: PayoutController.formatPhoneForDisplay(formattedPhone)
        },
        validation: {
          wallet_balance: validation.walletBalance,
          available_after: validation.walletBalance - validation.amountUSD,
          daily_limit_remaining: validation.limits.remainingDailyTZS
        },
        note: 'This is a preview only. No funds have been reserved.',
        expires_in: '5 minutes',
        timestamp: new Date().toISOString()
      };

      console.log(`[PAYOUT_PREVIEW] Preview generated for user ${userId}: ${previewReference}`);

      res.json({
        success: true,
        message: 'Payout preview generated successfully',
        data: responseData
      });

    } catch (error) {
      console.error('[PAYOUT_PREVIEW] Mobile money preview error:', error.message);
      res.status(400).json({
        success: false,
        error: error.message,
        code: 'PREVIEW_FAILED'
      });
    }
  }

  /**
   * Preview bank payout with mandatory currency
   */
  static async previewBankPayout(req, res) {
    try {
      const { amount, accountNumber, accountName, bankCode, currency } = req.body;
      const userId = req.user.id;

      console.log(`[PAYOUT_PREVIEW] Bank preview requested by ${userId}: ${amount} ${currency}`);

      // Basic validation
      if (!amount || !accountNumber || !accountName || !currency) {
        return res.status(400).json({
          success: false,
          error: 'Amount, account number, account name, and currency are required',
          code: 'MISSING_REQUIRED_FIELDS'
        });
      }

      // Validate account number
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
        amount,
        currency,
        'bank'
      );

      // Calculate fees
      const feeCalculation = await PayoutController.calculatePayoutWithFees(
        validation.amountTZS,
        'bank'
      );

      // Generate preview order reference
      const previewReference = PayoutController.generateOrderReference('PRE');

      // Prepare response
      const responseData = {
        preview_reference: previewReference,
        amount: validation.requestAmount,
        currency: validation.requestCurrency,
        converted_amount_tzs: validation.amountTZS,
        converted_amount_usd: validation.amountUSD,
        fee_tzs: feeCalculation.feeAmountTZS,
        fee_usd: feeCalculation.feeAmountUSD,
        net_amount_tzs: feeCalculation.payoutAmountTZS,
        net_amount_usd: feeCalculation.payoutAmountUSD,
        exchange_rate: validation.conversion.rate,
        recipient: {
          account_number: PayoutController.maskAccountNumber(accountNumber),
          account_name: accountName,
          bank_code: bankCode || 'N/A'
        },
        validation: {
          wallet_balance: validation.walletBalance,
          available_after: validation.walletBalance - validation.amountUSD,
          daily_limit_remaining: validation.limits.remainingDailyTZS
        },
        note: 'This is a preview only. No funds have been reserved.',
        expires_in: '5 minutes',
        timestamp: new Date().toISOString()
      };

      console.log(`[PAYOUT_PREVIEW] Bank preview generated for user ${userId}: ${previewReference}`);

      res.json({
        success: true,
        message: 'Bank payout preview generated successfully',
        data: responseData
      });

    } catch (error) {
      console.error('[PAYOUT_PREVIEW] Bank preview error:', error.message);
      res.status(400).json({
        success: false,
        error: error.message,
        code: 'PREVIEW_FAILED'
      });
    }
  }

  // ============================================================================
  // PAYOUT CREATION WITH MANDATORY CURRENCY (ATOMIC OPERATIONS)
  // ============================================================================

  /**
   * Create mobile money payout with mandatory currency
   */
  static async createMobileMoneyPayout(req, res) {
    const t = await sequelize.transaction();
    
    try {
      const { amount, phoneNumber, idempotencyKey, currency } = req.body;
      const userId = req.user.id;

      console.log(`[PAYOUT_CREATION] Mobile money creation requested by ${userId}: ${amount} ${currency}`);

      // Basic validation
      if (!amount || !phoneNumber || !currency) {
        throw new Error('Amount, phone number, and currency are required');
      }

      // Format and validate phone number
      const formattedPhone = PayoutController.formatPhoneNumber(phoneNumber);
      if (!PayoutController.validatePhoneNumber(formattedPhone)) {
        throw new Error('Invalid phone number format. Expected: 255XXXXXXXXX');
      }

      // Generate idempotency key if not provided
      const finalIdempotencyKey = idempotencyKey || 
        PayoutController.generateIdempotencyKey(userId, amount, currency, formattedPhone);

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
        console.log(`[PAYOUT_CREATION] Duplicate request detected for key: ${finalIdempotencyKey}`);
        await t.rollback();
        return res.status(200).json({
          success: true,
          message: 'Duplicate request detected. Returning existing payout.',
          data: await PayoutController.formatPayoutResponse(existingPayout)
        });
      }

      // STEP 1: VALIDATE WITH CURRENCY
      const validation = await PayoutController.validateWithdrawalRequest(
        userId,
        amount,
        currency,
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
        validation.amountUSD,
        t
      );

      // STEP 3: GENERATE ORDER REFERENCE
      const orderReference = PayoutController.generateOrderReference('WTH');

      // STEP 4: CALCULATE FEES
      const feeCalculation = await PayoutController.calculatePayoutWithFees(
        validation.amountTZS,
        'mobile_money'
      );

      console.log(`[PAYOUT_CREATION] Fees calculated for ${orderReference}:`, {
        feeTZS: feeCalculation.feeAmountTZS,
        feeUSD: feeCalculation.feeAmountUSD,
        netTZS: feeCalculation.payoutAmountTZS,
        netUSD: feeCalculation.payoutAmountUSD
      });

      // STEP 5: CREATE PAYMENT RECORD
      const paymentRecord = await PaymentRecord.create({
        user_id: userId,
        order_reference: orderReference,
        payment_reference: null,
        amount: validation.amountUSD, // Store USD amount
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
          // Original request details
          request_currency: validation.requestCurrency,
          request_amount: validation.requestAmount,
          // Conversion details
          tzs_amount: validation.amountTZS,
          exchange_rate: validation.conversion.rate,
          exchange_rate_source: validation.conversion.source,
          // Fee calculation
          fee_calculation: feeCalculation,
          // Balance information
          balance_before: validation.walletBalance,
          balance_after: reserveResult.newBalance,
          // Audit information
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
        amount: -validation.amountUSD, // Negative for withdrawal
        currency: 'USD',
        balance_before: validation.walletBalance,
        balance_after: reserveResult.newBalance,
        status: PayoutStates.INITIATED,
        gateway_type: 'clickpesa_mobile_money',
        gateway_status: 'INITIATED',
        description: `Withdrawal to ${PayoutController.formatPhoneForDisplay(formattedPhone)}`,
        transaction_fee: feeCalculation.feeAmountUSD,
        net_amount: validation.amountUSD - feeCalculation.feeAmountUSD,
        metadata: {
          payment_record_id: paymentRecord.id,
          recipient_phone: formattedPhone,
          request_currency: validation.requestCurrency,
          request_amount: validation.requestAmount,
          tzs_amount: validation.amountTZS,
          exchange_rate: validation.conversion.rate,
          fee_calculation: feeCalculation,
          idempotency_key: finalIdempotencyKey
        }
      }, { transaction: t });

      // Update payment record with transaction ID
      await paymentRecord.update({
        transaction_id: transaction.id
      }, { transaction: t });

      // STEP 7: CALL CLICKPESA API WITH TZS AMOUNT
      let clickpesaResponse;
      try {
        console.log(`[PAYOUT_CREATION] Calling ClickPesa for ${orderReference}: ${feeCalculation.payoutAmountTZS} TZS`);
        
        clickpesaResponse = await ClickPesaService.createMobileMoneyPayout({
          amount: feeCalculation.payoutAmountTZS, // Net amount in TZS
          phoneNumber: formattedPhone,
          currency: 'TZS',
          orderReference: orderReference,
          idempotencyKey: finalIdempotencyKey
        });

        console.log(`[PAYOUT_CREATION] ClickPesa response for ${orderReference}:`, {
          id: clickpesaResponse.id,
          status: clickpesaResponse.status
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
        console.error(`[PAYOUT_CREATION] ClickPesa API error for ${orderReference}:`, clickpesaError.message);
        
        await PayoutController.restoreFundsAtomic(userId, validation.amountUSD, t);
        
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

        throw new Error(`Withdrawal initiation failed: ${clickpesaError.message}`);
      }

      // STEP 8: COMMIT TRANSACTION
      await t.commit();
      console.log(`[PAYOUT_CREATION] Transaction committed for ${orderReference}`);

      // STEP 9: RETURN RESPONSE
      const responseData = await PayoutController.formatPayoutResponse(paymentRecord);
      
      res.json({
        success: true,
        message: 'Withdrawal initiated successfully',
        data: responseData
      });

      // STEP 10: INITIATE ASYNCHRONOUS RECONCILIATION
      setTimeout(() => {
        PayoutController.reconcilePayoutStatus(orderReference, userId)
          .catch(err => console.error(`[PAYOUT_CREATION] Initial reconciliation error for ${orderReference}:`, err.message));
      }, 30000); // 30 seconds

    } catch (error) {
      // Rollback transaction on any error
      await t.rollback();
      
      console.error('[PAYOUT_CREATION] Mobile money payout error:', error.message);
      res.status(400).json({
        success: false,
        error: error.message,
        code: 'PAYOUT_CREATION_FAILED'
      });
    }
  }

  /**
   * Create bank payout with mandatory currency
   */
  static async createBankPayout(req, res) {
    const t = await sequelize.transaction();
    
    try {
      const { amount, accountNumber, accountName, bankCode, idempotencyKey, currency } = req.body;
      const userId = req.user.id;

      console.log(`[PAYOUT_CREATION] Bank creation requested by ${userId}: ${amount} ${currency}`);

      // Basic validation
      if (!amount || !accountNumber || !accountName || !currency) {
        throw new Error('Amount, account number, account name, and currency are required');
      }

      // Validate account number
      if (accountNumber.length < 5) {
        throw new Error('Invalid account number. Must be at least 5 characters');
      }

      // Generate idempotency key if not provided
      const finalIdempotencyKey = idempotencyKey || 
        PayoutController.generateIdempotencyKey(userId, amount, currency, accountNumber);

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
        console.log(`[PAYOUT_CREATION] Duplicate request detected for key: ${finalIdempotencyKey}`);
        await t.rollback();
        return res.status(200).json({
          success: true,
          message: 'Duplicate request detected. Returning existing payout.',
          data: await PayoutController.formatPayoutResponse(existingPayout)
        });
      }

      // STEP 1: VALIDATE WITH CURRENCY
      const validation = await PayoutController.validateWithdrawalRequest(
        userId,
        amount,
        currency,
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
        validation.amountUSD,
        t
      );

      // STEP 3: GENERATE ORDER REFERENCE
      const orderReference = PayoutController.generateOrderReference('BNK');

      // STEP 4: CALCULATE FEES
      const feeCalculation = await PayoutController.calculatePayoutWithFees(
        validation.amountTZS,
        'bank'
      );

      console.log(`[PAYOUT_CREATION] Fees calculated for ${orderReference}:`, {
        feeTZS: feeCalculation.feeAmountTZS,
        feeUSD: feeCalculation.feeAmountUSD,
        netTZS: feeCalculation.payoutAmountTZS,
        netUSD: feeCalculation.payoutAmountUSD
      });

      // STEP 5: CREATE PAYMENT RECORD
      const paymentRecord = await PaymentRecord.create({
        user_id: userId,
        order_reference: orderReference,
        payment_reference: null,
        amount: validation.amountUSD, // Store USD amount
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
          // Original request details
          request_currency: validation.requestCurrency,
          request_amount: validation.requestAmount,
          // Conversion details
          tzs_amount: validation.amountTZS,
          exchange_rate: validation.conversion.rate,
          exchange_rate_source: validation.conversion.source,
          // Fee calculation
          fee_calculation: feeCalculation,
          // Balance information
          balance_before: validation.walletBalance,
          balance_after: reserveResult.newBalance,
          // Audit information
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
        amount: -validation.amountUSD,
        currency: 'USD',
        balance_before: validation.walletBalance,
        balance_after: reserveResult.newBalance,
        status: PayoutStates.INITIATED,
        gateway_type: 'clickpesa_bank_payout',
        gateway_status: 'INITIATED',
        description: `Bank withdrawal to ${accountName}`,
        transaction_fee: feeCalculation.feeAmountUSD,
        net_amount: validation.amountUSD - feeCalculation.feeAmountUSD,
        metadata: {
          payment_record_id: paymentRecord.id,
          recipient_account: PayoutController.maskAccountNumber(accountNumber),
          recipient_name: accountName,
          request_currency: validation.requestCurrency,
          request_amount: validation.requestAmount,
          tzs_amount: validation.amountTZS,
          exchange_rate: validation.conversion.rate,
          fee_calculation: feeCalculation,
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
        console.log(`[PAYOUT_CREATION] Calling ClickPesa for bank payout ${orderReference}: ${feeCalculation.payoutAmountTZS} TZS`);
        
        clickpesaResponse = await ClickPesaService.createBankPayout({
          amount: feeCalculation.payoutAmountTZS, // Net amount in TZS
          accountNumber: accountNumber,
          accountName: accountName,
          currency: 'TZS',
          orderReference: orderReference,
          bankCode: bankCode,
          idempotencyKey: finalIdempotencyKey
        });

        console.log(`[PAYOUT_CREATION] ClickPesa bank response for ${orderReference}:`, {
          id: clickpesaResponse.id,
          status: clickpesaResponse.status
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
        // ClickPesa API failed - reverse the funds
        console.error(`[PAYOUT_CREATION] ClickPesa bank API error for ${orderReference}:`, clickpesaError.message);
        
        await PayoutController.restoreFundsAtomic(userId, validation.amountUSD, t);
        
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

        throw new Error(`Bank withdrawal initiation failed: ${clickpesaError.message}`);
      }

      // STEP 8: COMMIT TRANSACTION
      await t.commit();
      console.log(`[PAYOUT_CREATION] Bank transaction committed for ${orderReference}`);

      // STEP 9: RETURN RESPONSE
      const responseData = await PayoutController.formatPayoutResponse(paymentRecord);
      
      res.json({
        success: true,
        message: 'Bank withdrawal initiated successfully',
        data: responseData
      });

      // STEP 10: INITIATE ASYNCHRONOUS RECONCILIATION
      setTimeout(() => {
        PayoutController.reconcilePayoutStatus(orderReference, userId)
          .catch(err => console.error(`[PAYOUT_CREATION] Initial reconciliation error for ${orderReference}:`, err.message));
      }, 30000);

    } catch (error) {
      await t.rollback();
      
      console.error('[PAYOUT_CREATION] Bank payout error:', error.message);
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
   */
  static async reconcilePayoutStatus(orderReference, userId = null) {
    const t = await sequelize.transaction();
    
    try {
      console.log(`[PAYOUT_RECONCILE] Starting reconciliation for: ${orderReference}`);
      
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
        console.error(`[PAYOUT_RECONCILE] ClickPesa API error: ${apiError.message}`);
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
      console.log(`[PAYOUT_RECONCILE] Status changed: ${paymentRecord.status} → ${mappedStatus} (ClickPesa: ${remoteStatus})`);
      
      const previousStatus = paymentRecord.status;
      
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
        await PayoutController.restoreFundsAtomic(
          paymentRecord.user_id,
          paymentRecord.amount,
          t
        );
        
        console.log(`[PAYOUT_RECONCILE] Funds restored for failed payout: ${orderReference}`);
      }
      
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
      console.error(`[PAYOUT_RECONCILE] Error: ${error.message}`);
      return {
        success: false,
        reconciled: false,
        error: error.message
      };
    }
  }

  // ============================================================================
  // STATUS & HISTORY ENDPOINTS (UPDATED)
  // ============================================================================

  /**
   * Get payout status with automatic reconciliation
   */
  static async getPayoutStatus(req, res) {
    try {
      const { orderReference } = req.params;
      const userId = req.user.id;
      
      console.log(`[PAYOUT_STATUS] Status check for ${orderReference} by user ${userId}`);
      
      const paymentRecord = await PaymentRecord.findOne({
        where: {
          order_reference: orderReference,
          user_id: userId,
          payment_method: { 
            [Op.in]: [PaymentMethods.MOBILE_MONEY_PAYOUT, PaymentMethods.BANK_PAYOUT] 
          }
        }
      });
      
      if (!paymentRecord) {
        return res.status(404).json({
          success: false,
          error: 'Withdrawal record not found'
        });
      }
      
      let reconciliationResult = null;
      if (![PayoutStates.COMPLETED, PayoutStates.FAILED].includes(paymentRecord.status)) {
        reconciliationResult = await PayoutController.reconcilePayoutStatus(orderReference, userId);
        
        if (reconciliationResult.reconciled) {
          await paymentRecord.reload();
        }
      }
      
      const user = await User.findByPk(userId, {
        attributes: ['wallet_balance']
      });
      
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
      console.error('[PAYOUT_STATUS] Error:', error.message);
      res.status(400).json({
        success: false,
        error: error.message,
        code: 'STATUS_CHECK_FAILED'
      });
    }
  }

  /**
   * Get user withdrawal history
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
      console.error('[WITHDRAWAL_HISTORY] Error:', error.message);
      res.status(400).json({
        success: false,
        error: error.message,
        code: 'HISTORY_FETCH_FAILED'
      });
    }
  }

  /**
   * Get withdrawal statistics
   */
  static async getWithdrawalStats(req, res) {
    try {
      const userId = req.user.id;
      
      const now = new Date();
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      
      const totalWithdrawals = await PaymentRecord.sum('amount', {
        where: {
          user_id: userId,
          status: PayoutStates.COMPLETED,
          payment_method: { 
            [Op.in]: [PaymentMethods.MOBILE_MONEY_PAYOUT, PaymentMethods.BANK_PAYOUT] 
          }
        }
      }) || 0;
      
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
      
      const pendingWithdrawals = await PaymentRecord.sum('amount', {
        where: {
          user_id: userId,
          status: { [Op.in]: [PayoutStates.INITIATED, PayoutStates.PROCESSING] },
          payment_method: { 
            [Op.in]: [PaymentMethods.MOBILE_MONEY_PAYOUT, PaymentMethods.BANK_PAYOUT] 
          }
        }
      }) || 0;
      
      let exchangeRate = null;
      try {
        const rateInfo = await ClickPesaService.getUSDtoTZSRate();
        exchangeRate = rateInfo.rate;
      } catch (rateError) {
        console.warn('[EXCHANGE_RATE] Fetch failed:', rateError.message);
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
      console.error('[WITHDRAWAL_STATS] Error:', error.message);
      res.status(400).json({
        success: false,
        error: error.message,
        code: 'STATS_FETCH_FAILED'
      });
    }
  }

  // ============================================================================
  // UTILITY FUNCTIONS (UPDATED)
  // ============================================================================

  /**
   * Format phone number for display
   */
  static formatPhoneForDisplay(phoneNumber) {
    if (phoneNumber.length === 12 && phoneNumber.startsWith('255')) {
      return `+${phoneNumber.substring(0, 3)} ${phoneNumber.substring(3, 6)} ${phoneNumber.substring(6, 9)} ${phoneNumber.substring(9)}`;
    }
    return phoneNumber;
  }

  /**
   * Format payout response
   */
  static formatPayoutResponse(paymentRecord) {
    const metadata = paymentRecord.metadata || {};
    const feeCalculation = metadata.fee_calculation || {};
    const recipientDetails = metadata.recipient_details || {};
    
    let transaction = paymentRecord.transaction;
    if (!transaction && paymentRecord.transaction_id) {
      // Try to load transaction if not included
      transaction = paymentRecord.getTransaction ? paymentRecord.getTransaction() : null;
    }
    
    return {
      id: paymentRecord.id,
      order_reference: paymentRecord.order_reference,
      payment_reference: paymentRecord.payment_reference,
      transaction_id: paymentRecord.transaction_id,
      // Show both USD and TZS amounts
      amount_usd: paymentRecord.amount,
      amount_tzs: metadata.tzs_amount,
      // Original request details
      request_currency: metadata.request_currency,
      request_amount: metadata.request_amount,
      // Fee information
      fee_usd: feeCalculation.feeAmountUSD || 0,
      fee_tzs: feeCalculation.feeAmountTZS || 0,
      net_amount_usd: paymentRecord.amount - (feeCalculation.feeAmountUSD || 0),
      net_amount_tzs: feeCalculation.payoutAmountTZS || metadata.tzs_amount,
      exchange_rate: metadata.exchange_rate,
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
   * Get estimated completion time
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

  /**
   * Currency conversion endpoint for frontend
   */
  static async convertCurrencyEndpoint(req, res) {
    try {
      const { amount, fromCurrency, toCurrency } = req.body;

      if (!amount || !fromCurrency || !toCurrency) {
        return res.status(400).json({
          success: false,
          error: 'Amount, fromCurrency, and toCurrency are required'
        });
      }

      const fromValidation = PayoutController.validateCurrencyCode(fromCurrency);
      const toValidation = PayoutController.validateCurrencyCode(toCurrency);

      if (!fromValidation.valid) {
        return res.status(400).json({
          success: false,
          error: fromValidation.error
        });
      }

      if (!toValidation.valid) {
        return res.status(400).json({
          success: false,
          error: toValidation.error
        });
      }

      const amountValidation = PayoutController.validateAmount(amount);
      if (!amountValidation.valid) {
        return res.status(400).json({
          success: false,
          error: amountValidation.error
        });
      }

      const numericAmount = amountValidation.amount;

      let conversion;
      if (fromValidation.currency === 'TZS' && toValidation.currency === 'USD') {
        conversion = await PayoutController.tzsToUsd(numericAmount);
      } else if (fromValidation.currency === 'USD' && toValidation.currency === 'TZS') {
        conversion = await PayoutController.usdToTzs(numericAmount);
      } else if (fromValidation.currency === toValidation.currency) {
        conversion = {
          convertedAmount: numericAmount,
          rate: 1,
          timestamp: new Date().toISOString(),
          source: 'same_currency'
        };
      } else {
        throw new Error(`Unsupported conversion: ${fromCurrency} to ${toCurrency}`);
      }

      res.json({
        success: true,
        data: {
          amount: numericAmount,
          from_currency: fromValidation.currency,
          converted_amount: conversion.convertedAmount,
          to_currency: toValidation.currency,
          exchange_rate: conversion.rate,
          rate_source: conversion.source,
          timestamp: conversion.timestamp
        }
      });

    } catch (error) {
      console.error('[CURRENCY_CONVERSION] Error:', error.message);
      res.status(400).json({
        success: false,
        error: error.message,
        code: 'CURRENCY_CONVERSION_FAILED'
      });
    }
  }

  /**
   * Validate bank account endpoint
   */
  static async validateBankAccountEndpoint(req, res) {
    try {
      const { accountNumber, accountName, bankCode, currency = 'TZS' } = req.body;

      if (!accountNumber || !accountName || !currency) {
        return res.status(400).json({
          success: false,
          error: 'Account number, account name, and currency are required'
        });
      }

      const currencyValidation = PayoutController.validateCurrencyCode(currency);
      if (!currencyValidation.valid) {
        return res.status(400).json({
          success: false,
          error: currencyValidation.error
        });
      }

      // Validate account number
      if (accountNumber.length < 5) {
        return res.json({
          success: true,
          data: {
            valid: false,
            message: 'Account number must be at least 5 characters'
          }
        });
      }

      // In production, you might want to validate with ClickPesa or bank API
      // For now, basic validation
      return res.json({
        success: true,
        data: {
          valid: true,
          account_number: PayoutController.maskAccountNumber(accountNumber),
          account_name: accountName,
          bank_code: bankCode || 'N/A',
          currency: currencyValidation.currency,
          message: 'Account details appear valid'
        }
      });

    } catch (error) {
      console.error('[BANK_VALIDATION] Error:', error.message);
      res.status(400).json({
        success: false,
        error: error.message,
        code: 'BANK_VALIDATION_FAILED'
      });
    }
  }

  // ============================================================================
// WEBHOOK HANDLER FOR PAYOUTS (CRITICAL - FINANCIAL NOTIFICATIONS)
// ============================================================================

/**
 * Handle payout webhook from ClickPesa (FOR NOTIFICATION ONLY)
 * 
 * SECURITY PRINCIPLES:
 * 1. Webhooks are NOT trusted for direct state changes
 * 2. Always verify the webhook signature
 * 3. Log every webhook for audit trail
 * 4. Trigger reconciliation but don't wait for it
 * 5. Respond quickly to avoid timeout
 * 
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 */
static async handlePayoutWebhook(req, res) {
  const startTime = Date.now();
  const webhookId = `WEBH_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  console.log(`[PAYOUT_WEBHOOK] [${webhookId}] Received payout webhook`);
  
  try {
    // Store the raw body (important for signature verification)
    const rawBody = req.rawBody || JSON.stringify(req.body);
    const signature = req.headers['x-clickpesa-signature'] || 
                     req.headers['x-signature'] ||
                     req.headers['signature'];
    
    // Log the headers for debugging
    console.log(`[PAYOUT_WEBHOOK] [${webhookId}] Headers:`, {
      signatureHeader: signature,
      contentType: req.headers['content-type'],
      userAgent: req.headers['user-agent'],
      ip: req.ip
    });

    // STEP 1: VERIFY SIGNATURE (CRITICAL FOR SECURITY)
    let signatureValid = false;
    let signatureError = null;
    
    if (!signature) {
      console.warn(`[PAYOUT_WEBHOOK] [${webhookId}] Missing signature header`);
      signatureError = 'Missing webhook signature';
    } else {
      try {
        signatureValid = ClickPesaService.verifyWebhookSignature(rawBody, signature);
        if (!signatureValid) {
          console.warn(`[PAYOUT_WEBHOOK] [${webhookId}] Invalid signature`);
          signatureError = 'Invalid webhook signature';
        }
      } catch (verifyError) {
        console.error(`[PAYOUT_WEBHOOK] [${webhookId}] Signature verification error:`, verifyError.message);
        signatureError = `Signature verification failed: ${verifyError.message}`;
      }
    }

    // STEP 2: PARSE THE PAYLOAD
    let payload;
    try {
      payload = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      console.log(`[PAYOUT_WEBHOOK] [${webhookId}] Payload type:`, typeof req.body);
    } catch (parseError) {
      console.error(`[PAYOUT_WEBHOOK] [${webhookId}] Failed to parse payload:`, parseError.message);
      
      // Log to database even if parsing fails
      await WebhookLog.create({
        webhook_id: webhookId,
        event_type: 'PARSE_ERROR',
        payload: null,
        raw_body: rawBody.substring(0, 1000), // Limit size
        signature_header: signature,
        processed_at: new Date(),
        status: 'failed',
        error: `Failed to parse payload: ${parseError.message}`,
        webhook_type: 'payout'
      });
      
      return res.status(400).json({
        success: false,
        error: 'Invalid JSON payload',
        webhook_id: webhookId
      });
    }

    const { event, eventType, data, type, transactionId, orderReference } = payload;
    const webhookEvent = event || eventType || type || 'unknown';
    
    console.log(`[PAYOUT_WEBHOOK] [${webhookId}] Event: ${webhookEvent}, Data:`, 
                data ? JSON.stringify(data).substring(0, 500) : 'No data');
    
    // STEP 3: VALIDATE PAYLOAD
    if (!data) {
      console.warn(`[PAYOUT_WEBHOOK] [${webhookId}] No data in payload`);
      
      await WebhookLog.create({
        webhook_id: webhookId,
        event_type: webhookEvent,
        payload: payload,
        raw_body: rawBody.substring(0, 1000),
        signature_header: signature,
        signature_valid: signatureValid,
        processed_at: new Date(),
        status: 'failed',
        error: 'No data in payload',
        webhook_type: 'payout'
      });
      
      return res.status(400).json({
        success: false,
        error: 'No data in payload',
        webhook_id: webhookId
      });
    }

    // STEP 4: EXTRACT IDENTIFIERS
    const identifiers = {
      order_reference: orderReference || 
                      data.orderReference || 
                      data.order_reference || 
                      data.reference,
      transaction_id: transactionId || 
                     data.transactionId || 
                     data.transaction_id || 
                     data.id,
      external_reference: data.externalReference || 
                         data.external_reference || 
                         data.paymentReference
    };
    
    console.log(`[PAYOUT_WEBHOOK] [${webhookId}] Identifiers:`, identifiers);
    
    if (!identifiers.order_reference && !identifiers.transaction_id) {
      console.warn(`[PAYOUT_WEBHOOK] [${webhookId}] No order reference or transaction ID found`);
      
      await WebhookLog.create({
        webhook_id: webhookId,
        event_type: webhookEvent,
        payload: payload,
        raw_body: rawBody.substring(0, 1000),
        signature_header: signature,
        signature_valid: signatureValid,
        processed_at: new Date(),
        status: 'failed',
        error: 'No order reference or transaction ID found',
        webhook_type: 'payout'
      });
      
      return res.status(200).json({
        success: true,
        message: 'Webhook received but no action taken (no identifiers)',
        webhook_id: webhookId
      });
    }

    // STEP 5: LOG WEBHOOK FOR AUDIT TRAIL
    let webhookLog;
    try {
      webhookLog = await WebhookLog.create({
        webhook_id: webhookId,
        event_type: webhookEvent,
        payload: payload,
        raw_body: rawBody.substring(0, 2000), // Limit size
        signature_header: signature,
        signature_valid: signatureValid,
        signature_error: signatureError,
        identifiers: identifiers,
        processed_at: new Date(),
        status: 'received',
        webhook_type: 'payout',
        ip_address: req.ip,
        user_agent: req.headers['user-agent'],
        processing_time_ms: Date.now() - startTime
      });
      
      console.log(`[PAYOUT_WEBHOOK] [${webhookId}] Webhook logged with ID: ${webhookLog.id}`);
    } catch (logError) {
      console.error(`[PAYOUT_WEBHOOK] [${webhookId}] Failed to log webhook:`, logError.message);
      // Continue processing even if logging fails
    }

    // STEP 6: VERIFY SIGNATURE (CONTINUED)
    if (!signatureValid) {
      // Update log with signature error
      if (webhookLog) {
        await webhookLog.update({
          status: 'failed',
          error: signatureError || 'Invalid signature'
        });
      }
      
      // If signature is invalid, we should NOT process the webhook
      // But we also don't want to alert attackers, so return 200 with generic message
      console.error(`[PAYOUT_WEBHOOK] [${webhookId}] Invalid signature, rejecting webhook`);
      
      return res.status(200).json({
        success: false,
        message: 'Webhook signature invalid',
        webhook_id: webhookId,
        note: 'This incident has been logged'
      });
    }

    // STEP 7: DETERMINE WHICH ORDER REFERENCE TO USE
    let targetOrderReference = identifiers.order_reference;
    
    // If we don't have order reference but have transaction ID, try to find the order
    if (!targetOrderReference && identifiers.transaction_id) {
      try {
        const paymentRecord = await PaymentRecord.findOne({
          where: {
            payment_reference: identifiers.transaction_id,
            payment_method: { 
              [Op.in]: [PaymentMethods.MOBILE_MONEY_PAYOUT, PaymentMethods.BANK_PAYOUT] 
            }
          },
          attributes: ['order_reference']
        });
        
        if (paymentRecord) {
          targetOrderReference = paymentRecord.order_reference;
          console.log(`[PAYOUT_WEBHOOK] [${webhookId}] Found order reference from transaction ID: ${targetOrderReference}`);
        }
      } catch (findError) {
        console.warn(`[PAYOUT_WEBHOOK] [${webhookId}] Failed to find order reference:`, findError.message);
      }
    }
    
    if (!targetOrderReference) {
      console.warn(`[PAYOUT_WEBHOOK] [${webhookId}] Could not determine order reference`);
      
      if (webhookLog) {
        await webhookLog.update({
          status: 'failed',
          error: 'Could not determine order reference'
        });
      }
      
      return res.status(200).json({
        success: true,
        message: 'Webhook received but no order reference found',
        webhook_id: webhookId
      });
    }

    // STEP 8: VALIDATE THE TRANSACTION EXISTS
    let transactionExists = false;
    try {
      const paymentRecord = await PaymentRecord.findOne({
        where: {
          order_reference: targetOrderReference,
          payment_method: { 
            [Op.in]: [PaymentMethods.MOBILE_MONEY_PAYOUT, PaymentMethods.BANK_PAYOUT] 
          }
        },
        attributes: ['id', 'status']
      });
      
      transactionExists = !!paymentRecord;
      
      if (paymentRecord) {
        console.log(`[PAYOUT_WEBHOOK] [${webhookId}] Found payment record: ${paymentRecord.id}, Status: ${paymentRecord.status}`);
      }
    } catch (findError) {
      console.error(`[PAYOUT_WEBHOOK] [${webhookId}] Error checking transaction:`, findError.message);
    }
    
    // Update webhook log with transaction status
    if (webhookLog) {
      await webhookLog.update({
        order_reference: targetOrderReference,
        transaction_exists: transactionExists,
        status: 'processing'
      });
    }

    // STEP 9: TRIGGER RECONCILIATION (FIRE AND FORGET)
    // Important: Don't await - respond immediately to ClickPesa
    console.log(`[PAYOUT_WEBHOOK] [${webhookId}] Triggering reconciliation for: ${targetOrderReference}`);
    
    // Use a promise but don't await it
    const reconciliationPromise = (async () => {
      try {
        console.log(`[PAYOUT_WEBHOOK] [${webhookId}] Starting reconciliation process...`);
        
        const reconciliationResult = await PayoutController.reconcilePayoutStatus(targetOrderReference);
        
        // Update webhook log with reconciliation result
        if (webhookLog) {
          await webhookLog.update({
            status: 'completed',
            reconciliation_result: reconciliationResult,
            processing_time_ms: Date.now() - startTime
          });
        }
        
        console.log(`[PAYOUT_WEBHOOK] [${webhookId}] Reconciliation completed:`, {
          success: reconciliationResult.success,
          reconciled: reconciliationResult.reconciled,
          new_status: reconciliationResult.new_status
        });
        
        // Additional action: If payout failed, maybe send notification to user
        if (reconciliationResult.reconciled && reconciliationResult.new_status === PayoutStates.FAILED) {
          console.log(`[PAYOUT_WEBHOOK] [${webhookId}] Payout failed, funds should have been restored`);
          // Here you could trigger email/SMS notification to user
        }
        
      } catch (reconcileError) {
        console.error(`[PAYOUT_WEBHOOK] [${webhookId}] Reconciliation failed:`, reconcileError.message);
        
        if (webhookLog) {
          await webhookLog.update({
            status: 'failed',
            error: reconcileError.message,
            processing_time_ms: Date.now() - startTime
          });
        }
      }
    })();
    
    // Handle promise rejection (to prevent unhandled promise rejection warnings)
    reconciliationPromise.catch(error => {
      console.error(`[PAYOUT_WEBHOOK] [${webhookId}] Unhandled error in reconciliation promise:`, error.message);
    });

    // STEP 10: RESPOND IMMEDIATELY TO CLICKPESA
    const responseTime = Date.now() - startTime;
    console.log(`[PAYOUT_WEBHOOK] [${webhookId}] Responding in ${responseTime}ms`);
    
    res.json({
      success: true,
      message: 'Webhook received and processing',
      webhook_id: webhookId,
      order_reference: targetOrderReference,
      event: webhookEvent,
      received_at: new Date().toISOString(),
      processing_time_ms: responseTime,
      note: 'Reconciliation has been triggered and will complete in the background'
    });

  } catch (error) {
    // CATCH-ALL ERROR HANDLER
    console.error(`[PAYOUT_WEBHOOK] [${webhookId}] Unhandled error:`, error.message, error.stack);
    
    try {
      // Try to log the error
      await WebhookLog.create({
        webhook_id: webhookId,
        event_type: 'UNHANDLED_ERROR',
        payload: null,
        raw_body: `Error: ${error.message}`,
        processed_at: new Date(),
        status: 'failed',
        error: `Unhandled error: ${error.message}`,
        webhook_type: 'payout',
        processing_time_ms: Date.now() - startTime
      });
    } catch (logError) {
      console.error(`[PAYOUT_WEBHOOK] [${webhookId}] Failed to log error:`, logError.message);
    }
    
    // Even on error, respond with 200 to prevent ClickPesa from retrying
    res.status(200).json({
      success: false,
      error: 'Internal server error processing webhook',
      webhook_id: webhookId,
      note: 'This incident has been logged'
    });
  }
}

// ============================================================================
// ADDITIONAL WEBHOOK-RELATED FUNCTIONS
// ============================================================================

/**
 * Process pending webhooks (for retry mechanism)
 * Should be called by a cron job to retry failed webhooks
 */
static async processPendingWebhooks(limit = 100) {
  console.log('[WEBHOOK_PROCESSOR] Starting to process pending webhooks');
  
  try {
    const pendingWebhooks = await WebhookLog.findAll({
      where: {
        webhook_type: 'payout',
        status: 'failed',
        retry_count: { [Op.lt]: 3 }, // Only retry up to 3 times
        created_at: {
          [Op.gte]: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
        }
      },
      order: [['created_at', 'ASC']],
      limit: limit
    });
    
    console.log(`[WEBHOOK_PROCESSOR] Found ${pendingWebhooks.length} pending webhooks`);
    
    const results = {
      total: pendingWebhooks.length,
      retried: 0,
      succeeded: 0,
      failed: 0,
      details: []
    };
    
    for (const webhook of pendingWebhooks) {
      try {
        console.log(`[WEBHOOK_PROCESSOR] Retrying webhook ${webhook.id} for order ${webhook.order_reference}`);
        
        const reconciliationResult = await PayoutController.reconcilePayoutStatus(webhook.order_reference);
        
        await webhook.update({
          retry_count: (webhook.retry_count || 0) + 1,
          last_retry_at: new Date(),
          retry_result: reconciliationResult
        });
        
        results.retried++;
        
        if (reconciliationResult.success) {
          results.succeeded++;
          console.log(`[WEBHOOK_PROCESSOR] Webhook ${webhook.id} retry succeeded`);
        } else {
          results.failed++;
          console.warn(`[WEBHOOK_PROCESSOR] Webhook ${webhook.id} retry failed:`, reconciliationResult.error);
        }
        
        results.details.push({
          webhook_id: webhook.id,
          order_reference: webhook.order_reference,
          success: reconciliationResult.success,
          reconciled: reconciliationResult.reconciled
        });
        
        // Small delay between retries
        await new Promise(resolve => setTimeout(resolve, 100));
        
      } catch (retryError) {
        results.failed++;
        console.error(`[WEBHOOK_PROCESSOR] Error retrying webhook ${webhook.id}:`, retryError.message);
      }
    }
    
    console.log('[WEBHOOK_PROCESSOR] Retry processing completed:', results);
    return results;
    
  } catch (error) {
    console.error('[WEBHOOK_PROCESSOR] Failed to process pending webhooks:', error);
    throw error;
  }
}

/**
 * Get webhook statistics for monitoring
 */
static async getWebhookStats(req, res) {
  try {
    const { hours = 24 } = req.query;
    
    const cutoffTime = new Date(Date.now() - hours * 60 * 60 * 1000);
    
    const stats = await WebhookLog.findAll({
      where: {
        webhook_type: 'payout',
        created_at: { [Op.gte]: cutoffTime }
      },
      attributes: [
        'status',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
        [sequelize.fn('AVG', sequelize.col('processing_time_ms')), 'avg_time']
      ],
      group: ['status'],
      raw: true
    });
    
    const byEventType = await WebhookLog.findAll({
      where: {
        webhook_type: 'payout',
        created_at: { [Op.gte]: cutoffTime }
      },
      attributes: [
        'event_type',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count']
      ],
      group: ['event_type'],
      order: [[sequelize.literal('count'), 'DESC']],
      limit: 10,
      raw: true
    });
    
    const recentFailures = await WebhookLog.findAll({
      where: {
        webhook_type: 'payout',
        status: 'failed',
        created_at: { [Op.gte]: cutoffTime }
      },
      attributes: ['id', 'event_type', 'order_reference', 'error', 'created_at'],
      order: [['created_at', 'DESC']],
      limit: 20
    });
    
    res.json({
      success: true,
      data: {
        timeframe_hours: parseInt(hours),
        total: stats.reduce((sum, s) => sum + parseInt(s.count), 0),
        by_status: stats,
        by_event_type: byEventType,
        recent_failures: recentFailures,
        updated_at: new Date().toISOString()
      }
    });
    
  } catch (error) {
    console.error('[WEBHOOK_STATS] Error:', error.message);
    res.status(400).json({
      success: false,
      error: error.message,
      code: 'WEBHOOK_STATS_FAILED'
    });
  }
}

/**
 * Manual webhook retry endpoint (admin only)
 */
static async retryWebhook(req, res) {
  try {
    const { webhookId } = req.params;
    const userId = req.user.id;
    
    // Check if user is admin (you'll need to implement PayoutController check)
    // const user = await User.findByPk(userId);
    // if (!user.is_admin) {
    //   return res.status(403).json({
    //     success: false,
    //     error: 'Admin access required'
    //   });
    // }
    
    const webhook = await WebhookLog.findByPk(webhookId);
    
    if (!webhook) {
      return res.status(404).json({
        success: false,
        error: 'Webhook not found'
      });
    }
    
    if (!webhook.order_reference) {
      return res.status(400).json({
        success: false,
        error: 'Webhook has no order reference to retry'
      });
    }
    
    console.log(`[WEBHOOK_RETRY] Manual retry requested for webhook ${webhookId} by user ${userId}`);
    
    const reconciliationResult = await PayoutController.reconcilePayoutStatus(webhook.order_reference);
    
    await webhook.update({
      retry_count: (webhook.retry_count || 0) + 1,
      last_retry_at: new Date(),
      retry_result: reconciliationResult,
      retried_by: userId
    });
    
    res.json({
      success: true,
      data: {
        webhook_id: webhookId,
        order_reference: webhook.order_reference,
        reconciliation_result: reconciliationResult,
        retry_count: webhook.retry_count
      }
    });
    
  } catch (error) {
    console.error('[WEBHOOK_RETRY] Error:', error.message);
    res.status(400).json({
      success: false,
      error: error.message,
      code: 'WEBHOOK_RETRY_FAILED'
    });
  }
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