// controllers/paymentController.js
/**
 * PRODUCTION-READY DEPOSIT CONTROLLER WITH MANDATORY CURRENCY
 */

const {
  sequelize,
  User,
  Transaction,
  PaymentRecord,
  WebhookLog,
} = require("../models");
const ClickPesaThirdPartyService = require("../services/clickPesaThirdPartyService");
const { Op, UniqueConstraintError } = require("sequelize");
const crypto = require("crypto");
const NotificationService = require("../services/notificationService");
const WalletService = require("../services/walletService");
const { resolveRequestCurrency } = require("../utils/requestCurrency");
const { WalletError } = require("../errors/WalletError");
const CurrencyUtils = require("../utils/currencyUtils");

// ============================================================================
// CONSTANTS & STATE DEFINITIONS
// ============================================================================

const DepositStates = {
  INITIATED: 'initiated',
  PROCESSING: 'processing',
  COMPLETED: 'completed',
  FAILED: 'failed'
};

const PaymentMethods = {
  MOBILE_MONEY_DEPOSIT: 'mobile_money_deposit'
};

const TransactionTypes = {
  WALLET_DEPOSIT: 'wallet_deposit'
};

const DepositLimits = {
  MIN_TZS: 1000,
  MAX_TZS: 1000000,
  DAILY_LIMIT_TZS: 5000000
};

// Supported currencies for deposits
const SupportedCurrencies = {
  TZS: 'TZS',  // Tanzanian Shillings
  USD: 'USD'   // US Dollars (if needed)
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

class PaymentController {
  static isValidDepositStatus(status) {
    return ['initiated', 'processing', 'completed', 'failed'].includes(status);
  }

  static isValidTransactionStatus(status) {
    return [
      'initiated',
      'pending',
      'processing',
      'completed',
      'failed',
      'cancelled',
      'refunded',
      'reversed'
    ].includes(status);
  }
  /**
   * Generate unique order reference
   */
  static generateOrderReference(type = 'DEPO') {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = crypto.randomBytes(2).toString('hex').toUpperCase();
    const maxPrefixLength = 20 - timestamp.length - random.length;
    const prefix = String(type).toUpperCase().slice(0, Math.max(1, maxPrefixLength));
    return `${prefix}${timestamp}${random}`;
  }

  /**
   * Generate idempotency key
   */
  static generateIdempotencyKey(userId, amount, currency, phoneNumber) {
    const hash = crypto.createHash('sha256')
      .update(`${userId}:${amount}:${currency}:${phoneNumber}:${Date.now()}`)
      .digest('hex')
      .substring(0, 32);
    return `DEPO_${hash}`;
  }

  /**
   * USD to TZS conversion
   */
  static async usdToTzs(usdAmount) {
    try {
      const numericAmount = typeof usdAmount === 'string' 
        ? parseFloat(usdAmount.replace(/[^\d.-]/g, ''))
        : usdAmount;
      
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
      console.warn('USD to TZS conversion failed:', error.message);
      const fallbackRate = 2500;
      
      let numericAmount = usdAmount;
      if (typeof usdAmount === 'string') {
        numericAmount = parseFloat(usdAmount.replace(/[^\d.-]/g, '')) || 0;
      }
      
      return {
        tzsAmount: Math.round(numericAmount * fallbackRate),
        rate: fallbackRate,
        timestamp: new Date().toISOString(),
        source: 'fallback',
        note: `Using fallback rate: ${error.message}`
      };
    }
  }

  /**
   * TZS to USD conversion
   */
  static async tzsToUsd(tzsAmount) {
    try {
      const numericAmount = typeof tzsAmount === 'string' 
        ? parseFloat(tzsAmount.replace(/[^\d.-]/g, ''))
        : tzsAmount;
      
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
      console.warn('TZS to USD conversion failed:', error.message);
      const fallbackRate = 0.0004;
      
      let numericAmount = tzsAmount;
      if (typeof tzsAmount === 'string') {
        numericAmount = parseFloat(tzsAmount.replace(/[^\d.-]/g, '')) || 0;
      }
      
      return {
        usdAmount: parseFloat((numericAmount * fallbackRate).toFixed(6)),
        rate: fallbackRate,
        timestamp: new Date().toISOString(),
        source: 'fallback',
        note: `Using fallback rate: ${error.message}`
      };
    }
  }

  /**
   * Map ClickPesa status to internal status
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
   */
  static validatePhoneNumber(phoneNumber) {
    const regex = /^255[67]\d{8}$/;
    return regex.test(phoneNumber);
  }

  /**
   * Format phone number to Tanzanian standard
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
   * @param {string} currency - Currency code to validate
   * @returns {Object} Validation result
   */
  static validateCurrencyCode(currency) {
    if (!currency) {
      return {
        valid: false,
        error: 'Currency code is required. Supported currencies: TZS, USD'
      };
    }

    const normalizedCurrency = currency.toUpperCase();
    
    if (!Object.values(SupportedCurrencies).includes(normalizedCurrency)) {
      return {
        valid: false,
        error: `Unsupported currency: ${currency}. Supported currencies: ${Object.values(SupportedCurrencies).join(', ')}`
      };
    }

    return {
      valid: true,
      currency: normalizedCurrency
    };
  }

  /**
   * Validate deposit request with mandatory currency
   */
  static async validateDepositRequest(userId, amount, currency, options = {}) {
    const { skipRecentDepositCheck = false, context = 'create' } = options;

    // 1. Validate currency code
    const currencyValidation = PaymentController.validateCurrencyCode(currency);
    if (!currencyValidation.valid) {
      throw new WalletError('INVALID_CURRENCY', currencyValidation.error);
    }

    const validatedCurrency = currencyValidation.currency;

    // 2. Get user
    const user = await User.findByPk(userId, {
      attributes: ['id', 'wallet_balance', 'username', 'email', 'phone_number']
    });

    if (!user) {
      throw new WalletError('USER_NOT_FOUND', 'User not found');
    }

    // 3. Convert amount to number
    const numericAmount = typeof amount === 'string' 
      ? parseFloat(amount.replace(/[^\d.-]/g, ''))
      : amount;
    
    if (isNaN(numericAmount) || numericAmount <= 0) {
      throw new WalletError('INVALID_AMOUNT', `Invalid deposit amount: ${amount} ${validatedCurrency}`);
    }

    // 4. Based on currency, validate and convert
    let amountTZS, amountUSD, conversion, exchangeRatePair;

    if (validatedCurrency === 'TZS') {
      // Amount is in TZS
      amountTZS = numericAmount;
      
      // Validate against TZS limits
      if (amountTZS < DepositLimits.MIN_TZS) {
        throw new WalletError(
          'LIMIT_EXCEEDED',
          `Minimum deposit amount is ${DepositLimits.MIN_TZS.toLocaleString()} TZS`
        );
      }

      if (amountTZS > DepositLimits.MAX_TZS) {
        throw new WalletError(
          'LIMIT_EXCEEDED',
          `Maximum deposit amount is ${DepositLimits.MAX_TZS.toLocaleString()} TZS`
        );
      }

      // Convert for reference/display (we store the deposit in request currency, but also keep the equivalent)
      conversion = await PaymentController.tzsToUsd(amountTZS);
      amountUSD = conversion.usdAmount;
      exchangeRatePair = 'TZS/USD';

    } else if (validatedCurrency === 'USD') {
      // Amount is in USD
      amountUSD = numericAmount;
      
      // Convert to TZS for validation against limits
      conversion = await PaymentController.usdToTzs(amountUSD);
      amountTZS = conversion.tzsAmount;
      exchangeRatePair = 'USD/TZS';

      // Validate against TZS limits (after conversion)
      if (amountTZS < DepositLimits.MIN_TZS) {
        const minUSD = await PaymentController.tzsToUsd(DepositLimits.MIN_TZS);
        throw new WalletError(
          'LIMIT_EXCEEDED',
          `Minimum deposit amount is ${minUSD.usdAmount.toFixed(2)} USD ` +
          `(approximately ${DepositLimits.MIN_TZS.toLocaleString()} TZS)`
        );
      }

      if (amountTZS > DepositLimits.MAX_TZS) {
        const maxUSD = await PaymentController.tzsToUsd(DepositLimits.MAX_TZS);
        throw new WalletError(
          'LIMIT_EXCEEDED',
          `Maximum deposit amount is ${maxUSD.usdAmount.toFixed(2)} USD ` +
          `(approximately ${DepositLimits.MAX_TZS.toLocaleString()} TZS)`
        );
      }
    }

    // 5. Daily deposit limit check (in TZS)
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const todayDeposits = await PaymentRecord.findAll({
      where: {
        user_id: userId,
        status: DepositStates.COMPLETED,
        payment_method: PaymentMethods.MOBILE_MONEY_DEPOSIT,
        created_at: {
          [Op.gte]: startOfDay
        }
      },
      attributes: ['id', 'metadata', 'amount', 'currency']
    });

    // Sum TZS amounts from metadata
    let totalTZSToday = 0;
    todayDeposits.forEach((deposit) => {
      const metadata = deposit.metadata || {};
      const tzsFromMetadata = Number(metadata.tzs_amount);
      if (Number.isFinite(tzsFromMetadata) && tzsFromMetadata > 0) {
        totalTZSToday += tzsFromMetadata;
        return;
      }
      const exchangeRate = Number(metadata.exchange_rate);
      const exchangeRatePair = metadata.exchange_rate_pair;
      const depositAmount = Number(deposit.amount);
      if (deposit.currency === 'TZS' && Number.isFinite(depositAmount)) {
        totalTZSToday += depositAmount;
        return;
      }
      if (
        deposit.currency === 'USD' &&
        Number.isFinite(depositAmount) &&
        Number.isFinite(exchangeRate) &&
        exchangeRate > 0
      ) {
        if (exchangeRatePair === 'USD/TZS') {
          totalTZSToday += depositAmount * exchangeRate;
        } else if (exchangeRatePair === 'TZS/USD') {
          totalTZSToday += depositAmount / exchangeRate;
        } else {
          totalTZSToday += depositAmount * exchangeRate;
        }
        return;
      }
      // Estimate with fallback rate if currency is missing/unknown
      if (Number.isFinite(depositAmount)) {
        totalTZSToday += depositAmount * 2500;
      }
    });

    if (totalTZSToday + amountTZS > DepositLimits.DAILY_LIMIT_TZS) {
      const remainingTZS = Math.max(0, DepositLimits.DAILY_LIMIT_TZS - totalTZSToday);
      throw new WalletError(
        'LIMIT_EXCEEDED',
        `Daily deposit limit exceeded. You can deposit up to ${DepositLimits.DAILY_LIMIT_TZS.toLocaleString()} TZS per day. ` +
        `Remaining today: ${remainingTZS.toLocaleString()} TZS`
      );
    }

    // 6. Check for existing processing deposits with auto-reconciliation
    if (!skipRecentDepositCheck) {
      const recentDeposit = await PaymentRecord.findOne({
        where: {
          user_id: userId,
          status: { [Op.in]: [DepositStates.INITIATED, DepositStates.PROCESSING] },
          payment_method: PaymentMethods.MOBILE_MONEY_DEPOSIT,
          created_at: {
            [Op.gt]: new Date(Date.now() - 15 * 60 * 1000)
          }
        }
      });

      if (recentDeposit) {
        console.log(`[DEPOSIT_VALIDATION] Found recent deposit ${recentDeposit.order_reference} with status: ${recentDeposit.status}`);
        
        if (context === 'create') {
          try {
            const reconciliationResult = await PaymentController.reconcileDepositStatus(
              recentDeposit.order_reference, 
              userId
            );
            
            await recentDeposit.reload();
            
            if ([DepositStates.INITIATED, DepositStates.PROCESSING].includes(recentDeposit.status)) {
              const ageMinutes = Math.round(
                (Date.now() - new Date(recentDeposit.created_at).getTime()) / (60 * 1000)
              );
              
              if (ageMinutes >= 10) {
                console.log(`[DEPOSIT_VALIDATION] Old deposit (${ageMinutes} minutes) still processing, allowing new deposit`);
              } else {
                throw new WalletError(
                  'DEPOSIT_IN_PROGRESS',
                  'You have a deposit in progress. Please wait for it to complete before starting a new one.' +
                  (ageMinutes < 5 ? ' (Check your phone for USSD prompt)' : '')
                );
              }
            }
          } catch (reconcileError) {
            console.error(`[DEPOSIT_VALIDATION] Auto-reconciliation failed:`, reconcileError.message);
          }
        }
      }
    }

    return {
      user,
      walletBalance: parseFloat(user.wallet_balance),
      amountTZS,
      amountUSD,
      conversion,
      exchangeRatePair,
      requestCurrency: validatedCurrency,
      requestAmount: numericAmount,
      limits: {
        minTZS: DepositLimits.MIN_TZS,
        maxTZS: DepositLimits.MAX_TZS,
        dailyTZS: DepositLimits.DAILY_LIMIT_TZS,
        remainingDailyTZS: DepositLimits.DAILY_LIMIT_TZS - totalTZSToday
      }
    };
  }

  // ============================================================================
  // PREVIEW ENDPOINT WITH MANDATORY CURRENCY
  // ============================================================================

  /**
   * Preview mobile money deposit with mandatory currency
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

      let requestCurrency;
      try {
        requestCurrency = resolveRequestCurrency(req);
      } catch (currencyError) {
        return res.status(400).json({
          success: false,
          error: currencyError.message,
          code: currencyError.code
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

      // Validate deposit request with currency
      const validation = await PaymentController.validateDepositRequest(
        userId,
        amount,
        requestCurrency,
        { context: 'preview' }
      );

      // Generate preview order reference
      const previewReference = PaymentController.generateOrderReference('PRE');

      // Check available payment methods via ClickPesa
      let availableMethods = [];
      let senderDetails = null;
      
      try {
        const previewResult = await ClickPesaThirdPartyService.previewUssdPushPayment({
          amount: validation.requestAmount,
          currency: validation.requestCurrency,
          orderReference: previewReference,
          phoneNumber: formattedPhone,
          fetchSenderDetails: true
        });
        
        availableMethods = previewResult.activeMethods || [];
        senderDetails = previewResult.sender || null;
      } catch (previewError) {
        console.warn('Preview failed:', previewError.message);
      }

      // Prepare response
      const responseData = {
        preview_reference: previewReference,
        amount: validation.requestAmount,
        currency: validation.requestCurrency,
        converted_amount_tzs: validation.amountTZS,
        converted_amount_usd: validation.amountUSD,
        exchange_rate: validation.conversion.rate,
        recipient: {
          phone_number: formattedPhone,
          formatted: PaymentController.formatPhoneForDisplay(formattedPhone)
        },
        available_methods: availableMethods,
        sender_details: senderDetails,
        validation: {
          wallet_balance: validation.walletBalance,
          daily_limit_remaining: validation.limits.remainingDailyTZS,
          min_deposit_tzs: DepositLimits.MIN_TZS,
          max_deposit_tzs: DepositLimits.MAX_TZS
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
  // DEPOSIT CREATION WITH MANDATORY CURRENCY
  // ============================================================================

  /**
   * Create mobile money deposit with mandatory currency
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

      let requestCurrency;
      try {
        requestCurrency = resolveRequestCurrency(req);
      } catch (currencyError) {
        await t.rollback();
        return res.status(400).json({
          success: false,
          error: currencyError.message,
          code: currencyError.code
        });
      }

      // Format and validate phone number
      const formattedPhone = PaymentController.formatPhoneNumber(phoneNumber);
      if (!PaymentController.validatePhoneNumber(formattedPhone)) {
        throw new Error('Invalid phone number format. Expected: 255XXXXXXXXX');
      }

      const trimmedKey = typeof idempotencyKey === 'string' ? idempotencyKey.trim() : '';
      if (!trimmedKey || trimmedKey.length < 12) {
        await t.rollback();
        return res.status(400).json({
          success: false,
          error: 'Invalid idempotency key',
          code: 'INVALID_IDEMPOTENCY_KEY'
        });
      }
      const normalizedKey = trimmedKey.toUpperCase();
      if (['TZS', 'USD'].includes(normalizedKey)) {
        await t.rollback();
        return res.status(400).json({
          success: false,
          error: 'Idempotency key cannot be a currency code',
          code: 'INVALID_IDEMPOTENCY_KEY'
        });
      }
      const finalIdempotencyKey = trimmedKey;

      // Check for duplicate request using idempotency key
      const existingDeposit = await PaymentRecord.findOne({
        where: {
          user_id: userId,
          [Op.and]: [
            sequelize.where(
              sequelize.json('metadata.idempotency_key'),
              finalIdempotencyKey
            ),
          ],
        },
        transaction: t,
      });
      // Recommended: add a DB-level unique index on (user_id, (metadata->>'idempotency_key')).

      if (existingDeposit) {
        await t.rollback();
        return res.status(200).json({
          success: true,
          message: 'Duplicate request detected. Returning existing deposit.',
          data: await PaymentController.formatDepositResponse(existingDeposit)
        });
      }

      // STEP 1: VALIDATE WITH CURRENCY
      const validation = await PaymentController.validateDepositRequest(
        userId,
        amount,
        requestCurrency
      );

      // Lock user
      await User.findByPk(userId, {
        transaction: t,
        lock: t.LOCK.UPDATE,
        attributes: ['id', 'wallet_balance']
      });

      // STEP 2: GENERATE ORDER REFERENCE
      const orderReference = PaymentController.generateOrderReference('DEPO');

      // STEP 3: CREATE PAYMENT RECORD
      let paymentRecord;
      try {
        paymentRecord = await PaymentRecord.create({
        user_id: userId,
        order_reference: orderReference,
        payment_reference: null,
        amount: validation.requestAmount,
        currency: validation.requestCurrency,
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
          // Store original request details
          request_currency: validation.requestCurrency,
          request_amount: validation.requestAmount,
          // Store conversion details
          tzs_amount: validation.amountTZS,
          usd_amount: validation.amountUSD,
          exchange_rate: validation.conversion.rate,
          exchange_rate_pair: validation.exchangeRatePair,
          exchange_rate_source: validation.conversion.source,
          wallet_balance_before: validation.walletBalance,
          ip_address: req.ip,
          user_agent: req.headers['user-agent']
        }
        }, { transaction: t });
      } catch (error) {
        if (error instanceof UniqueConstraintError) {
          const existingDeposit = await PaymentRecord.findOne({
            where: {
              user_id: userId,
              [Op.and]: [
                sequelize.where(
                  sequelize.json('metadata.idempotency_key'),
                  finalIdempotencyKey
                ),
              ],
            },
            transaction: t,
          });

          await t.rollback();
          if (existingDeposit) {
            return res.status(200).json({
              success: true,
              message: 'Duplicate request detected. Returning existing deposit.',
              data: await PaymentController.formatDepositResponse(existingDeposit)
            });
          }
        }
        throw error;
      }

      // STEP 4: CREATE TRANSACTION RECORD
      const transaction = await Transaction.create({
        user_id: userId,
        order_reference: orderReference,
        payment_reference: null,
        type: TransactionTypes.WALLET_DEPOSIT,
        amount: validation.requestAmount,
        currency: validation.requestCurrency,
        balance_before: validation.walletBalance,
        balance_after: validation.walletBalance,
        status: DepositStates.INITIATED,
        gateway_type: 'clickpesa_mobile_money',
        gateway_status: 'INITIATED',
        description: `Deposit from ${PaymentController.formatPhoneForDisplay(formattedPhone)}`,
        transaction_fee: 0,
        net_amount: validation.requestAmount,
        metadata: {
          payment_record_id: paymentRecord.id,
          recipient_phone: formattedPhone,
          request_currency: validation.requestCurrency,
          request_amount: validation.requestAmount,
          tzs_amount: validation.amountTZS,
          usd_amount: validation.amountUSD,
          exchange_rate: validation.conversion.rate,
          exchange_rate_pair: validation.exchangeRatePair,
          idempotency_key: finalIdempotencyKey
        }
      }, { transaction: t });

      // Update payment record with transaction ID
      await paymentRecord.update({
        transaction_id: transaction.id
      }, { transaction: t });

      // STEP 5: CALL CLICKPESA API WITH TZS AMOUNT
      let clickpesaResponse;
      try {
        clickpesaResponse = await ClickPesaThirdPartyService.initiateUssdPushPayment({
          amount: validation.requestAmount,
          currency: validation.requestCurrency,
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

      const displayAmount = `${validation.requestAmount} ${validation.requestCurrency}`;
      await NotificationService.createNotification(
        userId,
        'Deposit Initiated',
        `Your deposit of ${displayAmount} was initiated. Complete the mobile money prompt to finish.`,
        'wallet_update',
        'wallet',
        null
      ).catch((err) =>
        console.error('Failed to send deposit initiation notification:', err.message)
      );

      // STEP 7: RETURN RESPONSE
      const responseData = await PaymentController.formatDepositResponse(paymentRecord);
      
      res.json({
        success: true,
        message: 'Deposit initiated successfully',
        data: responseData
      });

      // STEP 8: INITIATE ASYNCHRONOUS INITIAL STATUS CHECK
      setTimeout(() => {
        PaymentController.reconcileDepositStatus(orderReference, userId)
          .catch(err => console.error('Initial status check error:', err));
      }, 30000);

    } catch (error) {
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
  // RECONCILIATION SYSTEM (UPDATED)
  // ============================================================================

  /**
   * Reconcile deposit status
   */
  static async reconcileDepositStatus(orderReference, userId = null) {
    const t = await sequelize.transaction();
    
    try {
      console.log(`[DEPOSIT_RECONCILE] Starting reconciliation for: ${orderReference}`);
      
      const whereClause = {
        order_reference: orderReference,
        payment_method: PaymentMethods.MOBILE_MONEY_DEPOSIT
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
          error: 'Deposit record not found'
        };
      }
      
      const user = await User.findByPk(paymentRecord.user_id, {
        transaction: t,
        lock: t.LOCK.UPDATE,
        attributes: ['id', 'wallet_balance', 'wallet_currency']
      });
      
      if (!user) {
        await t.rollback();
        return {
          success: false,
          reconciled: false,
          error: 'User not found for deposit'
        };
      }
      
      const creditStatus = paymentRecord.metadata?.credit_status;
      const shouldRetryCredit =
        paymentRecord.status === DepositStates.COMPLETED && creditStatus === 'pending';
      if (paymentRecord.status === DepositStates.FAILED || (
        paymentRecord.status === DepositStates.COMPLETED && !shouldRetryCredit
      )) {
        await t.rollback();
        return {
          success: true,
          reconciled: false,
          reason: 'Already in final state',
          current_status: paymentRecord.status
        };
      }
      
      let clickpesaData;
      try {
        clickpesaData = await ClickPesaThirdPartyService.queryPaymentStatus(orderReference);
        
        if (!clickpesaData || clickpesaData.length === 0) {
          if (paymentRecord.payment_reference) {
            clickpesaData = await ClickPesaThirdPartyService.getPaymentById(paymentRecord.payment_reference);
          }
        }
        
        if (!clickpesaData || (Array.isArray(clickpesaData) && clickpesaData.length === 0)) {
          const paymentAge = Date.now() - new Date(paymentRecord.created_at).getTime();
          if (paymentAge > 10 * 60 * 1000) {
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

          const amount = paymentRecord.metadata?.request_amount;
          const currency = paymentRecord.metadata?.request_currency;
          const displayAmount = amount && currency
            ? `${amount} ${currency}`
            : `${paymentRecord.amount} ${paymentRecord.currency || ''}`.trim();
          await NotificationService.createNotification(
            paymentRecord.user_id,
            'Deposit Failed',
            `Your deposit of ${displayAmount} failed or expired. Please try again.`,
            'wallet_update',
            'wallet',
            null
          ).catch((err) =>
            console.error('Failed to send deposit failure notification:', err.message)
          );

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

          const amount = paymentRecord.metadata?.request_amount;
          const currency = paymentRecord.metadata?.request_currency;
          const displayAmount = amount && currency
            ? `${amount} ${currency}`
            : `${paymentRecord.amount} ${paymentRecord.currency || ''}`.trim();
          await NotificationService.createNotification(
            paymentRecord.user_id,
            'Deposit Failed',
            `Your deposit of ${displayAmount} failed or expired. Please try again.`,
            'wallet_update',
            'wallet',
            null
          ).catch((err) =>
            console.error('Failed to send deposit failure notification:', err.message)
          );

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
      
      const latestData = Array.isArray(clickpesaData) ? clickpesaData[0] : clickpesaData;
      const remoteStatus = latestData.status;
      const mappedStatus = PaymentController.mapClickPesaStatus(remoteStatus);
      if (!PaymentController.isValidDepositStatus(mappedStatus)) {
        console.error('[DEPOSIT_RECONCILE] Invalid PaymentRecord status:', {
          model: 'PaymentRecord',
          attemptedStatus: mappedStatus,
          orderReference
        });
        await t.rollback();
        return {
          success: false,
          reconciled: false,
          error: `Invalid mapped deposit status: ${mappedStatus}`
        };
      }
      
      if (paymentRecord.status === mappedStatus && !shouldRetryCredit) {
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
      
      if (paymentRecord.status !== mappedStatus) {
        console.log(`[DEPOSIT_RECONCILE] Status changed: ${paymentRecord.status} → ${mappedStatus} (ClickPesa: ${remoteStatus})`);
      } else if (shouldRetryCredit) {
        console.log(`[DEPOSIT_RECONCILE] Status unchanged (retrying credit): ${mappedStatus} (ClickPesa: ${remoteStatus})`);
      }
      
      const previousStatus = paymentRecord.status;
      
      const updatedMetadata = {
        ...paymentRecord.metadata,
        previous_status: previousStatus,
        status_changed_at: new Date().toISOString(),
        clickpesa_status: remoteStatus,
        clickpesa_data: latestData,
        last_reconciliation: new Date().toISOString(),
        reconciled_by: 'system'
      };
      
      if (latestData.collectedAmount != null && latestData.collectedCurrency) {
        if (latestData.collectedCurrency === 'TZS') {
          updatedMetadata.collected_amount_tzs = latestData.collectedAmount;
        }
        if (latestData.collectedCurrency === 'USD') {
          updatedMetadata.collected_amount_usd = latestData.collectedAmount;
        }
        updatedMetadata.collected_currency = latestData.collectedCurrency;

        if (latestData.collectedCurrency === 'TZS' && user.wallet_currency === 'USD') {
          try {
            const conversion = await PaymentController.tzsToUsd(latestData.collectedAmount);
            updatedMetadata.collected_amount_usd = conversion.usdAmount;
            updatedMetadata.final_exchange_rate = conversion.rate;
          } catch (conversionError) {
            console.warn('Could not convert collected amount:', conversionError);
          }
        }
      }
      
      if (paymentRecord.status !== mappedStatus || shouldRetryCredit) {
        await paymentRecord.update({
          status: mappedStatus,
          metadata: updatedMetadata
        }, { transaction: t });
      }
      
      const computeCredit = ({
        collectedAmount,
        collectedCurrency,
        walletCurrency,
        metadata,
      }) => {
        if (!collectedCurrency || collectedAmount === undefined || collectedAmount === null) {
          return null;
        }
        const normalizedCollectedCurrency = String(collectedCurrency).toUpperCase();
        const normalizedWalletCurrency = String(walletCurrency || '').toUpperCase();
        if (!normalizedWalletCurrency) {
          return null;
        }
        const numericCollectedAmount = Number(collectedAmount);
        if (!Number.isFinite(numericCollectedAmount) || numericCollectedAmount <= 0) {
          return null;
        }

        if (normalizedCollectedCurrency === normalizedWalletCurrency) {
          return {
            creditAmount: numericCollectedAmount,
            creditCurrency: normalizedWalletCurrency,
            creditExchangeRate: null,
            creditSource: 'collected',
          };
        }

        const exchangeRate = Number(metadata.exchange_rate);
        if (!Number.isFinite(exchangeRate) || exchangeRate <= 0) {
          return null;
        }

        let exchangeRatePair = metadata.exchange_rate_pair;
        if (!exchangeRatePair) {
          if (metadata.request_currency === 'TZS') {
            exchangeRatePair = 'TZS/USD';
          } else if (metadata.request_currency === 'USD') {
            exchangeRatePair = 'USD/TZS';
          }
        }

        if (!exchangeRatePair) {
          return null;
        }

        let creditAmount;
        if (normalizedWalletCurrency === 'USD' && normalizedCollectedCurrency === 'TZS') {
          if (exchangeRatePair === 'TZS/USD') {
            creditAmount = numericCollectedAmount * exchangeRate;
          } else if (exchangeRatePair === 'USD/TZS') {
            creditAmount = numericCollectedAmount / exchangeRate;
          }
        } else if (normalizedWalletCurrency === 'TZS' && normalizedCollectedCurrency === 'USD') {
          if (exchangeRatePair === 'USD/TZS') {
            creditAmount = numericCollectedAmount * exchangeRate;
          } else if (exchangeRatePair === 'TZS/USD') {
            creditAmount = numericCollectedAmount / exchangeRate;
          }
        }

        if (!Number.isFinite(creditAmount) || creditAmount <= 0) {
          return null;
        }

        return {
          creditAmount,
          creditCurrency: normalizedWalletCurrency,
          creditExchangeRate: exchangeRate,
          creditSource: 'collected',
        };
      };

      const metadata = updatedMetadata || {};

      if (mappedStatus === DepositStates.COMPLETED && (previousStatus !== DepositStates.COMPLETED || shouldRetryCredit)) {
        const recordCurrency = paymentRecord.currency?.trim().toUpperCase();
        const userCurrency = user.wallet_currency?.trim().toUpperCase() || recordCurrency;
        if (!recordCurrency) {
          throw new WalletError('MISSING_CURRENCY', 'Deposit currency is missing');
        }
        if (!CurrencyUtils.isValidCurrency(recordCurrency)) {
          throw new WalletError('INVALID_CURRENCY', `Unsupported currency: ${recordCurrency}`);
        }

        const collectedCurrency =
          latestData.collectedCurrency ??
          metadata.collected_currency ??
          recordCurrency;
        const collectedAmount = collectedCurrency === 'TZS'
          ? (latestData.collectedAmount ?? metadata.collected_amount_tzs)
          : (latestData.collectedAmount ?? metadata.collected_amount_usd);

        const creditDecision = computeCredit({
          collectedAmount,
          collectedCurrency,
          walletCurrency: userCurrency || recordCurrency,
          metadata,
        });

        if (!creditDecision) {
          await paymentRecord.update({
            metadata: {
              ...metadata,
              credit_status: 'pending',
              credit_source: 'collected',
              credit_error_reason: 'missing_or_invalid_credit_data',
              last_credit_attempt_at: new Date().toISOString(),
            },
          }, { transaction: t });
          console.log(`[DEPOSIT_RECONCILE] Credit pending for ${paymentRecord.user_id} (${orderReference}).`);
        } else {
          if (!CurrencyUtils.isValidCurrency(creditDecision.creditCurrency)) {
            throw new WalletError('INVALID_CURRENCY', `Unsupported currency: ${creditDecision.creditCurrency}`);
          }

          const walletResult = await WalletService.credit({
            userId: paymentRecord.user_id,
            amount: creditDecision.creditAmount,
            currency: creditDecision.creditCurrency,
            type: TransactionTypes.WALLET_DEPOSIT,
            reference: orderReference,
            description: metadata.description || `Deposit ${orderReference}`,
            transaction: t,
          });

          await paymentRecord.update({
            metadata: {
              ...metadata,
              credited_amount: creditDecision.creditAmount,
              credited_currency: creditDecision.creditCurrency,
              credited_exchange_rate: creditDecision.creditExchangeRate,
              credit_source: creditDecision.creditSource,
              credit_status: 'completed',
              credited_at: new Date().toISOString(),
            },
          }, { transaction: t });

          console.log(`[DEPOSIT_RECONCILE] User ${paymentRecord.user_id} wallet updated. Added ${creditDecision.creditAmount} ${creditDecision.creditCurrency}. New balance: ${walletResult.balanceAfter} ${creditDecision.creditCurrency}`);
        }
      }

      if (!PaymentController.isValidTransactionStatus(mappedStatus)) {
        console.error('[DEPOSIT_RECONCILE] Invalid Transaction status:', {
          model: 'Transaction',
          attemptedStatus: mappedStatus,
          orderReference
        });
      } else {
        await Transaction.update({
          status: mappedStatus,
          gateway_status: remoteStatus,
          metadata: {
            ...updatedMetadata,
            reconciled_at: new Date().toISOString()
          }
        }, {
          where: { order_reference: orderReference },
          transaction: t
        });
      }
      
      await t.commit();

      if (mappedStatus === DepositStates.COMPLETED || mappedStatus === DepositStates.FAILED) {
        const amount = paymentRecord.metadata?.request_amount;
        const currency = paymentRecord.metadata?.request_currency;
        const displayAmount = amount && currency
          ? `${amount} ${currency}`
          : `${paymentRecord.amount} ${paymentRecord.currency || ''}`.trim();
        const title =
          mappedStatus === DepositStates.COMPLETED ? 'Deposit Successful' : 'Deposit Failed';
        const message =
          mappedStatus === DepositStates.COMPLETED
            ? `Your deposit of ${displayAmount} was successful. Funds have been added to your wallet.`
            : `Your deposit of ${displayAmount} failed or expired. Please try again.`;

        await NotificationService.createNotification(
          paymentRecord.user_id,
          title,
          message,
          'wallet_update',
          'wallet',
          null
        ).catch((err) =>
          console.error('Failed to send deposit status notification:', err.message)
        );
      }

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

  // ============================================================================
  // STATUS & HISTORY ENDPOINTS (UPDATED)
  // ============================================================================

  /**
   * Get deposit status
   */
  static async getDepositStatus(req, res) {
    try {
      const { orderReference } = req.params;
      const userId = req.user.id;
      
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
      
      let reconciliationResult = null;
      if (![DepositStates.COMPLETED, DepositStates.FAILED].includes(paymentRecord.status)) {
        reconciliationResult = await PaymentController.reconcileDepositStatus(orderReference, userId);
        
        if (reconciliationResult.reconciled) {
          await paymentRecord.reload();
        }
      }
      
      const transaction = await Transaction.findOne({
        where: { order_reference: orderReference }
      });
      
      const user = await User.findByPk(userId, {
        attributes: ['wallet_balance']
      });
      
      const response = await PaymentController.formatDepositResponse(paymentRecord);
      response.current_balance = user.wallet_balance;
      response.transaction = transaction ? {
        gateway_status: transaction.gateway_status,
        description: transaction.description,
        balance_before: transaction.balance_before,
        balance_after: transaction.balance_after
      } : null;
      
      if (reconciliationResult) {
        response.reconciliation = {
          performed: true,
          status_changed: reconciliationResult.reconciled,
          previous_status: reconciliationResult.previous_status,
          new_status: reconciliationResult.new_status
        };
      }
      
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
   */
  static async getWalletBalance(req, res) {
    try {
      const userId = req.user.id;
      let requestCurrency;
      try {
        requestCurrency = resolveRequestCurrency(req);
      } catch (currencyError) {
        return res.status(400).json({
          success: false,
          error: currencyError.message,
          code: currencyError.code
        });
      }

      const user = await User.findByPk(userId, {
        attributes: ['id', 'wallet_balance', 'username', 'email', 'phone_number']
      });

      if (!user) {
        return res.status(404).json({
          success: false,
          error: 'User not found'
        });
      }

      const recentDeposits = await PaymentRecord.count({
        where: {
          user_id: userId,
          status: DepositStates.COMPLETED,
          currency: requestCurrency,
          created_at: {
            [Op.gte]: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
          }
        }
      });

      const pendingDeposits = await PaymentRecord.sum('amount', {
        where: {
          user_id: userId,
          status: { [Op.in]: [DepositStates.INITIATED, DepositStates.PROCESSING] },
          payment_method: PaymentMethods.MOBILE_MONEY_DEPOSIT,
          currency: requestCurrency
        }
      }) || 0;

      const response = {
        success: true,
        data: {
          balance: user.wallet_balance,
          currency: requestCurrency,
          user_id: user.id,
          username: user.username,
          email: user.email,
          phone_number: user.phone_number,
          statistics: {
            recent_deposits_count: recentDeposits,
            pending_deposits: pendingDeposits
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
   */
  static async getDepositStats(req, res) {
    try {
      const userId = req.user.id;
      let requestCurrency;
      try {
        requestCurrency = resolveRequestCurrency(req);
      } catch (currencyError) {
        return res.status(400).json({
          success: false,
          error: currencyError.message,
          code: currencyError.code
        });
      }
      
      const now = new Date();
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      
      const totalDeposits = await PaymentRecord.sum('amount', {
        where: {
          user_id: userId,
          status: DepositStates.COMPLETED,
          payment_method: PaymentMethods.MOBILE_MONEY_DEPOSIT,
          currency: requestCurrency
        }
      }) || 0;
      
      const todayDeposits = await PaymentRecord.sum('amount', {
        where: {
          user_id: userId,
          status: DepositStates.COMPLETED,
          created_at: { [Op.gte]: startOfDay },
          payment_method: PaymentMethods.MOBILE_MONEY_DEPOSIT,
          currency: requestCurrency
        }
      }) || 0;
      
      const monthDeposits = await PaymentRecord.sum('amount', {
        where: {
          user_id: userId,
          status: DepositStates.COMPLETED,
          created_at: { [Op.gte]: startOfMonth },
          payment_method: PaymentMethods.MOBILE_MONEY_DEPOSIT,
          currency: requestCurrency
        }
      }) || 0;
      
      const recentCount = await PaymentRecord.count({
        where: {
          user_id: userId,
          status: DepositStates.COMPLETED,
          created_at: { [Op.gte]: thirtyDaysAgo },
          payment_method: PaymentMethods.MOBILE_MONEY_DEPOSIT,
          currency: requestCurrency
        }
      });
      
      const depositCount = await PaymentRecord.count({
        where: {
          user_id: userId,
          status: DepositStates.COMPLETED,
          payment_method: PaymentMethods.MOBILE_MONEY_DEPOSIT,
          currency: requestCurrency
        }
      });
      
      const averageDeposit = depositCount > 0 ? totalDeposits / depositCount : 0;
      
      const pendingDeposits = await PaymentRecord.sum('amount', {
        where: {
          user_id: userId,
          status: { [Op.in]: [DepositStates.INITIATED, DepositStates.PROCESSING] },
          payment_method: PaymentMethods.MOBILE_MONEY_DEPOSIT,
          currency: requestCurrency
        }
      }) || 0;
      
      res.json({
        success: true,
        data: {
          totals: {
            all_time: totalDeposits,
            today: todayDeposits,
            this_month: monthDeposits,
            pending: pendingDeposits
          },
          counts: {
            all_time: depositCount,
            recent_30_days: recentCount
          },
          averages: {
            average_deposit: parseFloat(averageDeposit.toFixed(2))
          },
          currency: requestCurrency,
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
  // WEBHOOK HANDLER (NO CHANGES NEEDED)
  // ============================================================================

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
      
      const isValid = ClickPesaThirdPartyService.verifyWebhookSignature(rawBody, signature);
      if (!isValid) {
        console.warn('[DEPOSIT_WEBHOOK] Invalid signature');
        return res.status(401).json({ success: false, error: 'Invalid signature' });
      }
      
      const payload = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      const { event, eventType, data } = payload;
      const webhookEvent = event || eventType;
      
      if (!webhookEvent || !data) {
        console.warn('[DEPOSIT_WEBHOOK] Invalid payload');
        return res.status(400).json({ success: false, error: 'Invalid payload' });
      }
      
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
      
      const orderReference = data.orderReference || 
                            data.id || 
                            data.transactionId;
      
      if (!orderReference) {
        console.warn('[DEPOSIT_WEBHOOK] No order reference in payload');
        return res.json({ success: true, message: 'Webhook received but no action taken' });
      }
      
      PaymentController.reconcileDepositStatus(orderReference)
        .then(result => {
          console.log(`[DEPOSIT_WEBHOOK] Reconciliation triggered for ${orderReference}:`, 
                     result.reconciled ? 'Status changed' : 'No change');
        })
        .catch(err => {
          console.error(`[DEPOSIT_WEBHOOK] Reconciliation failed for ${orderReference}:`, err.message);
        });
      
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
   * Format deposit response
   */
  static formatDepositResponse(paymentRecord) {
    const metadata = paymentRecord.metadata || {};
    const conversionInfo = metadata.conversion_info || {};
    const recipientDetails = metadata.recipient_details || {};
    const clickpesaData = metadata.clickpesa_data || {};
    
    const transaction = paymentRecord.transaction;
    
      const requestCurrency = metadata.request_currency || paymentRecord.currency;
      const amountUSD = requestCurrency === 'USD'
        ? paymentRecord.amount
        : metadata.collected_amount_usd || conversionInfo.usdAmount;
      const amountTZS = requestCurrency === 'TZS'
        ? paymentRecord.amount
        : metadata.tzs_amount || conversionInfo.tzsAmount;

      return {
        id: paymentRecord.id,
        order_reference: paymentRecord.order_reference,
        payment_reference: paymentRecord.payment_reference,
        transaction_id: paymentRecord.transaction_id,
        // Show both USD and TZS amounts
      amount_usd: amountUSD,
      amount_tzs: amountTZS,
      amount: paymentRecord.amount,
      currency: requestCurrency,
      // Original request details
      request_currency: metadata.request_currency,
      request_amount: metadata.request_amount,
      exchange_rate: metadata.exchange_rate || conversionInfo.rate,
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
   * Validate phone number endpoint (with currency support)
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

      let requestCurrency;
      try {
        requestCurrency = resolveRequestCurrency(req);
      } catch (currencyError) {
        return res.status(400).json({
          success: false,
          error: currencyError.message,
          code: currencyError.code
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
            currency: requestCurrency,
            available_methods: [],
            sender_details: null,
            message: 'Invalid phone number format. Expected: 255XXXXXXXXX'
          }
        });
      }

      // Test with ClickPesa preview
      try {
        const reference = PaymentController.generateOrderReference('TEST');
        const testAmount = 2000;

        const preview = await ClickPesaThirdPartyService.previewUssdPushPayment({
          amount: testAmount,
          currency: requestCurrency,
          orderReference: reference,
          phoneNumber: formattedPhone,
          fetchSenderDetails: true
        });

        return res.json({
          success: true,
          data: {
            valid: true,
            formatted: formattedPhone,
            currency: requestCurrency,
            available_methods: preview.activeMethods || [],
            sender_details: preview.sender || null,
            test_amount: testAmount,
            message: 'Phone number is valid and has available payment methods'
          }
        });
      } catch (previewError) {
        return res.json({
          success: true,
          data: {
            valid: true,
            formatted: formattedPhone,
            currency: requestCurrency,
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

      const fromValidation = PaymentController.validateCurrencyCode(fromCurrency);
      const toValidation = PaymentController.validateCurrencyCode(toCurrency);

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

      const numericAmount = typeof amount === 'string' 
        ? parseFloat(amount.replace(/[^\d.-]/g, ''))
        : amount;
      
      if (isNaN(numericAmount) || numericAmount <= 0) {
        throw new Error(`Invalid amount: ${amount}`);
      }

      let conversion;
      if (fromValidation.currency === 'TZS' && toValidation.currency === 'USD') {
        conversion = await PaymentController.tzsToUsd(numericAmount);
      } else if (fromValidation.currency === 'USD' && toValidation.currency === 'TZS') {
        conversion = await PaymentController.usdToTzs(numericAmount);
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

      const convertedAmount = conversion.convertedAmount
        ?? conversion.usdAmount
        ?? conversion.tzsAmount;
      if (convertedAmount === undefined || convertedAmount === null) {
        throw new Error('Conversion failed to produce a converted amount');
      }

      res.json({
        success: true,
        data: {
          amount: numericAmount,
          from_currency: fromValidation.currency,
          converted_amount: convertedAmount,
          to_currency: toValidation.currency,
          exchange_rate: conversion.rate,
          rate_source: conversion.source,
          timestamp: conversion.timestamp
        }
      });

    } catch (error) {
      console.error('Currency conversion error:', error);
      res.status(400).json({
        success: false,
        error: error.message,
        code: 'CURRENCY_CONVERSION_FAILED'
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
        payment_method: PaymentMethods.MOBILE_MONEY_DEPOSIT,
        [Op.or]: [
          {
            status: { [Op.in]: [DepositStates.INITIATED, DepositStates.PROCESSING] },
            created_at: {
              [Op.lt]: new Date(Date.now() - 2 * 60 * 1000), // Older than 2 minutes
              [Op.gt]: new Date(Date.now() - 24 * 60 * 60 * 1000) // Within 24 hours
            }
          },
          {
            status: DepositStates.COMPLETED,
            [Op.and]: [
              sequelize.where(sequelize.json('metadata.credit_status'), 'pending'),
            ],
          },
        ],
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
        const metadata = deposit.metadata || {};
        const exchangeRate = Number(metadata.exchange_rate);
        const exchangeRatePair = metadata.exchange_rate_pair;
        const usdAmount = Number(metadata.usd_amount);
        const tzsAmount = Number(metadata.tzs_amount);
        const depositAmount = Number(deposit.amount);

        if (Number.isFinite(usdAmount) && usdAmount > 0) {
          report.total_amount_usd += usdAmount;
        } else if (deposit.currency === 'USD' && Number.isFinite(depositAmount)) {
          report.total_amount_usd += depositAmount;
        } else if (
          Number.isFinite(tzsAmount) &&
          Number.isFinite(exchangeRate) &&
          exchangeRate > 0 &&
          exchangeRatePair === 'TZS/USD'
        ) {
          report.total_amount_usd += tzsAmount * exchangeRate;
        }

        if (Number.isFinite(tzsAmount) && tzsAmount > 0) {
          report.total_amount_tzs += tzsAmount;
        } else if (deposit.currency === 'TZS' && Number.isFinite(depositAmount)) {
          report.total_amount_tzs += depositAmount;
        } else if (
          Number.isFinite(usdAmount) &&
          Number.isFinite(exchangeRate) &&
          exchangeRate > 0 &&
          exchangeRatePair === 'USD/TZS'
        ) {
          report.total_amount_tzs += usdAmount * exchangeRate;
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
      const metadata = deposit.metadata || {};
      const exchangeRate = Number(metadata.exchange_rate);
      const exchangeRatePair = metadata.exchange_rate_pair;
      const usdAmount = Number(metadata.usd_amount);
      const tzsAmount = Number(metadata.tzs_amount);
      const depositAmount = Number(deposit.amount);
      let normalizedUSD = 0;

      if (Number.isFinite(usdAmount) && usdAmount > 0) {
        normalizedUSD = usdAmount;
      } else if (deposit.currency === 'USD' && Number.isFinite(depositAmount)) {
        normalizedUSD = depositAmount;
      } else if (
        Number.isFinite(tzsAmount) &&
        Number.isFinite(exchangeRate) &&
        exchangeRate > 0 &&
        exchangeRatePair === 'TZS/USD'
      ) {
        normalizedUSD = tzsAmount * exchangeRate;
      }

      const userId = deposit.user_id;
      if (!userTotals[userId]) {
        userTotals[userId] = {
          total: 0,
          username: deposit.user?.username || 'Unknown',
        };
      }
      if (Number.isFinite(normalizedUSD) && normalizedUSD > 0) {
        userTotals[userId].total += normalizedUSD;
      }
    });
    
    // Convert to array and sort
    const userTotalsArray = Object.entries(userTotals).map(([userId, data]) => ({
      user_id: parseInt(userId),
      username: data.username,
      total_amount_usd: data.total
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
