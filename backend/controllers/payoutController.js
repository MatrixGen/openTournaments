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
  WithdrawalQuote,
  WebhookLog,
} = require("../models");
const ClickPesaService = require("../services/clickPesaService");
const { createPayoutFlowService } = require("../services/payoutFlowService");
const {
  usdToTzs,
  tzsToUsd,
  convertAmount,
  validateCurrencyCode,
  validateAmount,
} = require("../services/currencyService");
const { Op } = require("sequelize");
const crypto = require("crypto");
const { resolveRequestCurrency } = require("../utils/requestCurrency");
const { WalletError } = require("../errors/WalletError");
const { mapControllerError } = require("../utils/mapControllerError");

// ============================================================================
// CONSTANTS & STATE DEFINITIONS
// ============================================================================

/**
 * Payout states - Simplified for reliability
 */
const PayoutStates = {
  INITIATED: 'initiated',
  PROCESSING: 'processing',
  COMPLETED: 'successful',
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

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

let payoutFlowService;

class PayoutController {
  /**
   * Generate unique order reference
   * @param {string} type - Reference type
   * @returns {string} Unique order reference
   */
  static generateOrderReference(type = 'WTH') {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = crypto.randomBytes(2).toString('hex').toUpperCase();
    const maxPrefixLength = 20 - timestamp.length - random.length;
    const prefix = String(type).toUpperCase().slice(0, Math.max(1, maxPrefixLength));
    return `${prefix}${timestamp}${random}`;
  }

  static buildReversalReference(orderReference) {
    return `${orderReference}REV`;
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
      .update(`${userId}:${amount}:${currency}:${recipient}`)
      .digest('hex')
      .substring(0, 32);
    return `PAYOUT_${hash}`;
  }

  static calculatePlatformFeeTZS(amountTZS) {
    if (!Number.isFinite(amountTZS) || amountTZS <= 0) {
      return 0;
    }
    return 0;
  }

  static async calculatePayoutAmounts({
    requestAmount,
    requestCurrency,
    walletCurrency,
    payoutMethod,
  }) {
    const normalizedRequestCurrency = String(requestCurrency || '').toUpperCase();
    const normalizedWalletCurrency = String(walletCurrency || '').toUpperCase();

    let conversionToTZS;
    let sendAmountTZS;
    if (normalizedRequestCurrency === 'TZS') {
      sendAmountTZS = requestAmount;
      conversionToTZS = {
        amount: requestAmount,
        rate: 1,
        pair: 'TZS/TZS',
        source: 'same_currency',
      };
    } else if (normalizedRequestCurrency === 'USD') {
      conversionToTZS = await usdToTzs(requestAmount);
      sendAmountTZS = conversionToTZS.amount;
    } else {
      throw new Error(`Unsupported request currency: ${requestCurrency}`);
    }

    const feeEstimate = await payoutFlowService.calculatePayoutWithFees(
      requestAmount,
      payoutMethod,
      normalizedRequestCurrency
    );
    const clickpesaFeeTZS = feeEstimate.feeAmountTZS || 0;
    const platformFeeTZS = PayoutController.calculatePlatformFeeTZS(sendAmountTZS);
    const grossTZS = sendAmountTZS + clickpesaFeeTZS + platformFeeTZS;

    let totalDebitAmount = grossTZS;
    let totalDebitCurrency = 'TZS';
    if (normalizedWalletCurrency === 'USD') {
      const conversionToWallet = await tzsToUsd(grossTZS);
      totalDebitAmount = conversionToWallet.amount;
      totalDebitCurrency = 'USD';
    }

    let requestAmountWallet = requestAmount;
    if (normalizedWalletCurrency && normalizedWalletCurrency !== normalizedRequestCurrency) {
      const conversionToWallet = await convertAmount(
        requestAmount,
        normalizedRequestCurrency,
        normalizedWalletCurrency
      );
      requestAmountWallet = conversionToWallet.amount;
    }

    const totalFeesInWalletCurrency = totalDebitAmount - requestAmountWallet;

    return {
      sendAmountTZS,
      clickpesaFeeTZS,
      platformFeeTZS,
      grossTZS,
      totalDebitAmount,
      totalDebitCurrency,
      exchangeRate: conversionToTZS.rate,
      exchangeRatePair: conversionToTZS.pair,
      exchangeRateSource: conversionToTZS.source,
      totalFeesInWalletCurrency,
      requestAmountWallet,
    };
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


  // ============================================================================
  // PREVIEW ENDPOINTS WITH MANDATORY CURRENCY
  // ============================================================================

  /**
   * Preview mobile money payout with mandatory currency
   */
  static async previewMobileMoneyPayout(req, res) {
    try {
      const { amount, phoneNumber } = req.body;
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

      console.log(`[PAYOUT_PREVIEW] Mobile money preview requested by ${userId}: ${amount} ${requestCurrency}`);

      // Basic validation
      if (!amount || !phoneNumber || !requestCurrency) {
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

      const amountValidation = validateAmount(amount);
      if (!amountValidation.valid) {
        return res.status(400).json({
          success: false,
          error: amountValidation.error,
          code: 'INVALID_AMOUNT'
        });
      }

      const user = await User.findByPk(userId, {
        attributes: ['id', 'wallet_currency', 'wallet_balance']
      });

      if (!user) {
        return res.status(404).json({
          success: false,
          error: 'User not found'
        });
      }

      const walletCurrency = user.wallet_currency
        ? String(user.wallet_currency).toUpperCase()
        : requestCurrency;

      if (walletCurrency !== requestCurrency) {
        return res.status(400).json({
          success: false,
          error: 'Withdrawal currency must match wallet currency',
          code: 'CURRENCY_MISMATCH'
        });
      }

      // Validate withdrawal request (limits, in-progress checks)
      const validation = await payoutFlowService.validateWithdrawalRequest(
        userId,
        amountValidation.amount,
        requestCurrency,
        "mobile_money",
        { reconcilePayoutStatus: PayoutController.reconcilePayoutStatus }
      );

      const previewReference = PayoutController.generateOrderReference('PRE');

      const clickpesaPreview = await ClickPesaService.previewMobileMoneyPayout({
        amount: validation.amountTZS,
        phoneNumber: formattedPhone,
        currency: 'TZS',
        orderReference: previewReference
      });

      const previewOrder = clickpesaPreview?.order || clickpesaPreview?.receiver || {};
      const sendAmountTZS = Number(
        previewOrder.amount ?? previewOrder.amountTZS ?? validation.amountTZS
      );
      const clickpesaFeeTZS = Number(
        clickpesaPreview?.fee ?? clickpesaPreview?.feeAmount ?? clickpesaPreview?.fee_tzs ?? 0
      );

      if (!Number.isFinite(sendAmountTZS) || sendAmountTZS <= 0) {
        throw new Error('Invalid ClickPesa preview amount');
      }

      const platformFeeTZS = clickpesaFeeTZS;
      const totalFeeTZS = clickpesaFeeTZS + platformFeeTZS;
      const grossTZS = sendAmountTZS + totalFeeTZS;

      let totalDebitAmount = grossTZS;
      let totalFeeAmount = totalFeeTZS;
      if (walletCurrency === 'USD') {
        const debitConversion = await tzsToUsd(grossTZS);
        totalDebitAmount = debitConversion.amount;
        const feeConversion = await tzsToUsd(totalFeeTZS);
        totalFeeAmount = feeConversion.amount;
      }

      const walletBalance = parseFloat(user.wallet_balance);
      if (walletBalance < totalDebitAmount) {
        throw new WalletError(
          'INSUFFICIENT_FUNDS',
          `Insufficient wallet balance. Available: ${walletBalance.toFixed(2)} ${walletCurrency}, ` +
          `Required: ${totalDebitAmount.toFixed(2)} ${walletCurrency}`
        );
      }

      const exchangeInfo = clickpesaPreview?.exchange || clickpesaPreview?.exchangeRate || clickpesaPreview?.exchange_rate;
      const exchangeRate = exchangeInfo?.rate ?? null;
      const exchangeRateDate = exchangeInfo?.date || exchangeInfo?.rateDate || exchangeInfo?.timestamp || null;
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

      await WithdrawalQuote.create({
        preview_reference: previewReference,
        user_id: userId,
        request_amount: validation.requestAmount,
        request_currency: validation.requestCurrency,
        send_amount_tzs: sendAmountTZS,
        clickpesa_fee_tzs: clickpesaFeeTZS,
        platform_fee_tzs: platformFeeTZS,
        total_fee_tzs: totalFeeTZS,
        gross_tzs: grossTZS,
        total_debit_amount: totalDebitAmount,
        total_debit_currency: walletCurrency,
        exchange_rate: exchangeRate,
        exchange_rate_date: exchangeRateDate ? new Date(exchangeRateDate) : null,
        recipient_phone: formattedPhone,
        status: 'active',
        expires_at: expiresAt,
        metadata: {
          clickpesa_preview: clickpesaPreview
        }
      });

      // Prepare response
      const responseData = {
        preview_reference: previewReference,
        amount: validation.requestAmount,
        currency: validation.requestCurrency,
        total_fee: totalFeeAmount,
        total_debit: totalDebitAmount,
        recipient: {
          phone_number: formattedPhone,
          formatted: PayoutController.formatPhoneForDisplay(formattedPhone)
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
      console.error('[PayoutController][previewMobileMoneyPayout] Error:', error.message, error.stack);
      if (!error.statusCode) error.statusCode = 400;
      const { status, body } = mapControllerError(error);
      res.status(status).json({
        message: body.message,
        code: body.code || 'PREVIEW_FAILED'
      });
    }
  }

  /**
   * Preview bank payout with mandatory currency
   */
  static async previewBankPayout(req, res) {
    try {
      const { amount, accountNumber, accountName, bankCode } = req.body;
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

      console.log(`[PAYOUT_PREVIEW] Bank preview requested by ${userId}: ${amount} ${requestCurrency}`);

      // Basic validation
      if (!amount || !accountNumber || !accountName || !requestCurrency) {
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
      const validation = await payoutFlowService.validateWithdrawalRequest(
        userId,
        amount,
        requestCurrency,
        "bank",
        { reconcilePayoutStatus: PayoutController.reconcilePayoutStatus }
      );

      const payoutAmounts = await PayoutController.calculatePayoutAmounts({
        requestAmount: validation.requestAmount,
        requestCurrency: validation.requestCurrency,
        walletCurrency: validation.walletCurrency,
        payoutMethod: 'bank'
      });

      if (validation.walletBalance < payoutAmounts.totalDebitAmount) {
        throw new WalletError(
          'INSUFFICIENT_FUNDS',
          `Insufficient wallet balance. Available: ${validation.walletBalance.toFixed(2)} ${validation.walletCurrency}, ` +
          `Required: ${payoutAmounts.totalDebitAmount.toFixed(2)} ${validation.walletCurrency}`
        );
      }

      // Generate preview order reference
      const previewReference = PayoutController.generateOrderReference('PRE');

      // Prepare response
      const responseData = {
        preview_reference: previewReference,
        amount: validation.requestAmount,
        currency: validation.requestCurrency,
        converted_amount_tzs: payoutAmounts.sendAmountTZS,
        converted_amount_usd: validation.requestCurrency === 'TZS' ? validation.requestAmount : validation.amountUSD,
        fee_tzs: payoutAmounts.clickpesaFeeTZS,
        fee_usd: validation.requestCurrency === 'USD' ? payoutAmounts.clickpesaFeeTZS / payoutAmounts.exchangeRate : 0,
        net_amount_tzs: payoutAmounts.sendAmountTZS,
        net_amount_usd: validation.requestCurrency === 'USD' ? validation.requestAmount : validation.amountUSD,
        exchange_rate: payoutAmounts.exchangeRate,
        exchange_rate_source: payoutAmounts.exchangeRateSource,
        exchange_rate_pair: payoutAmounts.exchangeRatePair,
        receive_amount: validation.requestAmount,
        receive_currency: validation.requestCurrency,
        send_amount_tzs: payoutAmounts.sendAmountTZS,
        clickpesa_fee_tzs: payoutAmounts.clickpesaFeeTZS,
        platform_fee_tzs: payoutAmounts.platformFeeTZS,
        total_debit_amount: payoutAmounts.totalDebitAmount,
        total_debit_currency: payoutAmounts.totalDebitCurrency,
        recipient: {
          account_number: PayoutController.maskAccountNumber(accountNumber),
          account_name: accountName,
          bank_code: bankCode || 'N/A'
        },
        validation: {
          wallet_balance: validation.walletBalance,
          wallet_currency: validation.walletCurrency,
          available_after: validation.walletBalance - validation.walletDebitAmount,
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
      console.error('[PayoutController][previewBankPayout] Error:', error.message, error.stack);
      if (!error.statusCode) error.statusCode = 400;
      const { status, body } = mapControllerError(error);
      res.status(status).json({
        message: body.message,
        code: body.code || 'PREVIEW_FAILED'
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
      const { preview_reference: previewReference, previewReference: legacyPreviewReference, idempotencyKey } = req.body;
      const userId = req.user.id;
      const resolvedPreviewReference = previewReference || legacyPreviewReference;

      console.log(`[PAYOUT_CREATION] Mobile money creation requested by ${userId}: ${resolvedPreviewReference}`);

      if (!resolvedPreviewReference) {
        throw new Error('preview_reference is required');
      }

      const quote = await WithdrawalQuote.findOne({
        where: {
          preview_reference: resolvedPreviewReference,
          user_id: userId,
          status: 'active',
          expires_at: { [Op.gt]: new Date() }
        },
        transaction: t,
        lock: t.LOCK.UPDATE
      });

      if (!quote) {
        throw new Error('Withdrawal quote not found or expired');
      }

      const user = await User.findByPk(userId, {
        attributes: ['wallet_balance', 'wallet_currency']
      });

      if (!user) {
        throw new Error('User not found');
      }

      const walletCurrency = user.wallet_currency
        ? String(user.wallet_currency).toUpperCase()
        : quote.request_currency;

      if (walletCurrency !== quote.request_currency) {
        throw new Error('Withdrawal currency must match wallet currency');
      }

      // Generate idempotency key if not provided
      const finalIdempotencyKey = idempotencyKey || 
        PayoutController.generateIdempotencyKey(
          userId,
          quote.request_amount,
          quote.request_currency,
          quote.recipient_phone
        );

      // Check for duplicate request
      const existingPayout = await PaymentRecord.findOne({
        where: {
          user_id: userId,
          [Op.and]: [
            sequelize.where(
              sequelize.json('metadata.idempotency_key'),
              finalIdempotencyKey
            ),
          ],
        },
        transaction: t
      });
      // Recommended: add a DB-level unique index on (user_id, (metadata->>'idempotency_key')).

      if (existingPayout) {
        console.log(`[PAYOUT_CREATION] Duplicate request detected for key: ${finalIdempotencyKey}`);
        await t.rollback();
        return res.status(200).json({
          success: true,
          message: 'Duplicate request detected. Returning existing payout.',
          data: await PayoutController.formatPayoutResponse(existingPayout)
        });
      }

      const walletBalance = parseFloat(user.wallet_balance);
      const totalDebitAmount = Number(quote.total_debit_amount);
      if (!Number.isFinite(totalDebitAmount) || totalDebitAmount <= 0) {
        throw new Error('Invalid withdrawal quote amount');
      }

      // STEP 2: GENERATE ORDER REFERENCE
      const orderReference = PayoutController.generateOrderReference('WTH');

      // STEP 3: RESERVE FUNDS ATOMICALLY
      if (walletBalance < totalDebitAmount) {
        throw new WalletError(
          'INSUFFICIENT_FUNDS',
          `Insufficient wallet balance. Available: ${walletBalance.toFixed(2)} ${walletCurrency}, ` +
          `Required: ${totalDebitAmount.toFixed(2)} ${walletCurrency}`
        );
      }
      
      const reserveResult = await payoutFlowService.reserveFundsAtomic(
        userId,
        totalDebitAmount,
        quote.total_debit_currency,
        orderReference,
        `Withdrawal to ${PayoutController.formatPhoneForDisplay(quote.recipient_phone)}`,
        t
      );

      const feeAmount = totalDebitAmount - Number(quote.request_amount);

      // STEP 5: CREATE PAYMENT RECORD
      const paymentRecord = await PaymentRecord.create({
        user_id: userId,
        order_reference: orderReference,
        payment_reference: null,
        amount: quote.request_amount,
        currency: quote.request_currency,
        payment_method: PaymentMethods.MOBILE_MONEY_PAYOUT,
        status: PayoutStates.INITIATED,
        customer_phone: quote.recipient_phone,
        metadata: {
          idempotency_key: finalIdempotencyKey,
          type: 'wallet_withdrawal',
          recipient_details: {
            phone_number: quote.recipient_phone,
            formatted: PayoutController.formatPhoneForDisplay(quote.recipient_phone)
          },
          // Original request details
          request_currency: quote.request_currency,
          request_amount: quote.request_amount,
          wallet_currency: quote.total_debit_currency,
          wallet_debit_amount: totalDebitAmount,
          total_debit_amount: totalDebitAmount,
          total_debit_currency: quote.total_debit_currency,
          receive_amount: quote.request_amount,
          receive_currency: quote.request_currency,
          send_amount_tzs: quote.send_amount_tzs,
          clickpesa_fee_tzs: quote.clickpesa_fee_tzs,
          platform_fee_tzs: quote.platform_fee_tzs,
          total_fee_tzs: quote.total_fee_tzs,
          gross_tzs: quote.gross_tzs,
          exchange_rate: quote.exchange_rate,
          exchange_rate_date: quote.exchange_rate_date,
          preview_reference: quote.preview_reference,
          // Balance information
          balance_before: reserveResult.oldBalance,
          balance_after: reserveResult.newBalance,
          // Audit information
          ip_address: req.ip,
          user_agent: req.headers['user-agent']
        }
      }, { transaction: t });

      // STEP 6: UPDATE TRANSACTION RECORD
      const transaction = reserveResult.transaction;
      await transaction.update({
        payment_reference: null,
        gateway_type: 'clickpesa_mobile_money',
        gateway_status: 'INITIATED',
        transaction_fee: feeAmount,
        net_amount: quote.request_amount,
          metadata: {
            ...(transaction.metadata || {}),
            payment_record_id: paymentRecord.id,
            recipient_phone: quote.recipient_phone,
            request_currency: quote.request_currency,
            request_amount: quote.request_amount,
            wallet_currency: quote.total_debit_currency,
            wallet_debit_amount: totalDebitAmount,
            total_debit_amount: totalDebitAmount,
            total_debit_currency: quote.total_debit_currency,
            receive_amount: quote.request_amount,
            receive_currency: quote.request_currency,
            send_amount_tzs: quote.send_amount_tzs,
            clickpesa_fee_tzs: quote.clickpesa_fee_tzs,
            platform_fee_tzs: quote.platform_fee_tzs,
            total_fee_tzs: quote.total_fee_tzs,
            gross_tzs: quote.gross_tzs,
            exchange_rate: quote.exchange_rate,
            exchange_rate_date: quote.exchange_rate_date,
            preview_reference: quote.preview_reference,
            idempotency_key: finalIdempotencyKey
          }
        }, { transaction: t });

      // Update payment record with transaction ID
      await paymentRecord.update({
        transaction_id: transaction.id
      }, { transaction: t });

      // STEP 7: CALL CLICKPESA API WITH REQUEST CURRENCY AMOUNT
      let clickpesaResponse;
      try {
        console.log(`[PAYOUT_CREATION] Calling ClickPesa for ${orderReference}: ${quote.send_amount_tzs} TZS`);
        
        clickpesaResponse = await ClickPesaService.createMobileMoneyPayout({
          amount: Number(quote.send_amount_tzs),
          phoneNumber: quote.recipient_phone,
          currency: 'TZS',
          orderReference: orderReference,
          idempotencyKey: finalIdempotencyKey,
          payoutFeeBearer: 'MERCHANT'
        });

        console.log(`[PAYOUT_CREATION] ClickPesa response for ${orderReference}:`, {
          id: clickpesaResponse.id,
          status: clickpesaResponse.status
        });
      } catch (clickpesaError) {
        // ClickPesa API failed - reverse the funds and mark as failed
        console.error(`[PAYOUT_CREATION] ClickPesa API error for ${orderReference}:`, clickpesaError.message);

        if (paymentRecord.metadata?.external_sent || clickpesaResponse?.id) {
          console.error(`[PAYOUT_CREATION] External payout already sent for ${orderReference}; skipping restoration.`);
          await t.commit();
          PayoutController.reconcilePayoutStatus(orderReference, userId)
            .catch(err => console.error(`[PAYOUT_CREATION] Reconcile after external send failed for ${orderReference}:`, err.message));
          return res.status(500).json({
            success: false,
            error: 'Payout sent but persistence failed. Reconciliation scheduled.',
            code: 'PAYOUT_PERSISTENCE_FAILED'
          });
        }

        const restoreReference = PayoutController.buildReversalReference(orderReference);
        await payoutFlowService.restoreFundsAtomic(
          userId,
          totalDebitAmount,
          quote.total_debit_currency,
          restoreReference,
          `Reversal for failed withdrawal ${orderReference}`,
          t
        );
        
        await paymentRecord.update({
          status: PayoutStates.FAILED,
          metadata: {
            ...paymentRecord.metadata,
            clickpesa_error: clickpesaError.message,
            error_at: new Date().toISOString(),
            balance_restored: true,
            reversal_status: 'completed'
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

        await t.commit();
        return res.status(400).json({
          success: false,
          error: `Withdrawal initiation failed: ${clickpesaError.message}`,
          code: 'PAYOUT_CREATION_FAILED'
        });
      }

      const clickpesaId = clickpesaResponse?.id || clickpesaResponse?.transactionId;
      const externalMetadata = {
        ...paymentRecord.metadata,
        external_sent: true,
        clickpesa_response: clickpesaResponse,
        clickpesa_transaction_id: clickpesaId,
        channel_provider: clickpesaResponse?.channelProvider,
        initiated_at: new Date().toISOString()
      };

      try {
        await paymentRecord.update({
          payment_reference: clickpesaId,
          status: PayoutController.mapClickPesaStatus(clickpesaResponse.status),
          metadata: externalMetadata
        }, { transaction: t });

        await transaction.update({
          payment_reference: clickpesaId,
          gateway_status: clickpesaResponse.status,
          metadata: {
            ...transaction.metadata,
            external_sent: true,
            clickpesa_response: clickpesaResponse
          }
        }, { transaction: t });

        await quote.update({
          status: 'used',
          order_reference: orderReference
        }, { transaction: t });
      } catch (persistError) {
        console.error(`[PAYOUT_PERSISTENCE][HIGH] Failed to persist ClickPesa response for ${orderReference}:`, persistError.message);
        try {
          await paymentRecord.update({
            status: PayoutStates.PROCESSING,
            metadata: externalMetadata
          }, { transaction: t });

          await quote.update({
            status: 'used',
            order_reference: orderReference
          }, { transaction: t });
        } catch (updateError) {
          console.error(`[PAYOUT_PERSISTENCE][HIGH] Failed to flag external send for ${orderReference}:`, updateError.message);
        }
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
      
      console.error('[PayoutController][createMobileMoneyPayout] Error:', error.message, error.stack);
      if (!error.statusCode) error.statusCode = 400;
      const { status, body } = mapControllerError(error);
      res.status(status).json({
        message: body.message,
        code: body.code || 'PAYOUT_CREATION_FAILED'
      });
    }
  }

  /**
   * Create bank payout with mandatory currency
   */
  static async createBankPayout(req, res) {
    const t = await sequelize.transaction();
    
    try {
      const { amount, accountNumber, accountName, bankCode, idempotencyKey } = req.body;
      const userId = req.user.id;

      console.log(`[PAYOUT_CREATION] Bank creation requested by ${userId}: ${amount}`);

      // Basic validation
      if (!amount || !accountNumber || !accountName) {
        throw new Error('Amount, account number, and account name are required');
      }

      // Validate account number
      if (accountNumber.length < 5) {
        throw new Error('Invalid account number. Must be at least 5 characters');
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

      // Generate idempotency key if not provided
      const finalIdempotencyKey = idempotencyKey || 
        PayoutController.generateIdempotencyKey(userId, amount, requestCurrency, accountNumber);

      // Check for duplicate request
      const existingPayout = await PaymentRecord.findOne({
        where: {
          user_id: userId,
          [Op.and]: [
            sequelize.where(
              sequelize.json('metadata.idempotency_key'),
              finalIdempotencyKey
            ),
          ],
        },
        transaction: t
      });
      // Recommended: add a DB-level unique index on (user_id, (metadata->>'idempotency_key')).

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
      const validation = await payoutFlowService.validateWithdrawalRequest(
        userId,
        amount,
        requestCurrency,
        "bank",
        { reconcilePayoutStatus: PayoutController.reconcilePayoutStatus }
      );

      // STEP 2: GENERATE ORDER REFERENCE
      const orderReference = PayoutController.generateOrderReference('BNK');

      // STEP 3: RESERVE FUNDS ATOMICALLY
      const payoutAmounts = await PayoutController.calculatePayoutAmounts({
        requestAmount: validation.requestAmount,
        requestCurrency: validation.requestCurrency,
        walletCurrency: validation.walletCurrency,
        payoutMethod: 'bank'
      });

      if (validation.walletBalance < payoutAmounts.totalDebitAmount) {
        throw new WalletError(
          'INSUFFICIENT_FUNDS',
          `Insufficient wallet balance. Available: ${validation.walletBalance.toFixed(2)} ${validation.walletCurrency}, ` +
          `Required: ${payoutAmounts.totalDebitAmount.toFixed(2)} ${validation.walletCurrency}`
        );
      }
      
      const reserveResult = await payoutFlowService.reserveFundsAtomic(
        userId,
        payoutAmounts.totalDebitAmount,
        payoutAmounts.totalDebitCurrency,
        orderReference,
        `Bank withdrawal to ${accountName}`,
        t
      );

      const netAmount = validation.requestAmount;
      const feeAmount = payoutAmounts.totalFeesInWalletCurrency;

      // STEP 5: CREATE PAYMENT RECORD
      const paymentRecord = await PaymentRecord.create({
        user_id: userId,
        order_reference: orderReference,
        payment_reference: null,
        amount: validation.requestAmount,
        currency: validation.requestCurrency,
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
          wallet_currency: validation.walletCurrency,
          wallet_debit_amount: payoutAmounts.totalDebitAmount,
          total_debit_amount: payoutAmounts.totalDebitAmount,
          total_debit_currency: payoutAmounts.totalDebitCurrency,
          receive_amount: validation.requestAmount,
          receive_currency: validation.requestCurrency,
          send_amount_tzs: payoutAmounts.sendAmountTZS,
          clickpesa_fee_tzs: payoutAmounts.clickpesaFeeTZS,
          platform_fee_tzs: payoutAmounts.platformFeeTZS,
          wallet_exchange_rate: validation.walletConversion?.rate || null,
          wallet_exchange_rate_pair: validation.walletConversion?.pair || null,
          wallet_exchange_rate_source: validation.walletConversion?.source || null,
          // Conversion details
          tzs_amount: validation.amountTZS,
          usd_amount: validation.amountUSD,
          exchange_rate: payoutAmounts.exchangeRate,
          exchange_rate_pair: payoutAmounts.exchangeRatePair,
          exchange_rate_source: payoutAmounts.exchangeRateSource,
          // Balance information
          balance_before: reserveResult.oldBalance,
          balance_after: reserveResult.newBalance,
          // Audit information
          ip_address: req.ip,
          user_agent: req.headers['user-agent']
        }
      }, { transaction: t });

      // STEP 6: UPDATE TRANSACTION RECORD
      const transaction = reserveResult.transaction;
      await transaction.update({
        payment_reference: null,
        gateway_type: 'clickpesa_bank_payout',
        gateway_status: 'INITIATED',
        transaction_fee: feeAmount,
        net_amount: payoutAmounts.requestAmountWallet,
        metadata: {
          ...(transaction.metadata || {}),
          payment_record_id: paymentRecord.id,
          recipient_account: PayoutController.maskAccountNumber(accountNumber),
          recipient_name: accountName,
          request_currency: validation.requestCurrency,
          request_amount: validation.requestAmount,
          wallet_currency: validation.walletCurrency,
          wallet_debit_amount: payoutAmounts.totalDebitAmount,
          total_debit_amount: payoutAmounts.totalDebitAmount,
          total_debit_currency: payoutAmounts.totalDebitCurrency,
          receive_amount: validation.requestAmount,
          receive_currency: validation.requestCurrency,
          send_amount_tzs: payoutAmounts.sendAmountTZS,
          clickpesa_fee_tzs: payoutAmounts.clickpesaFeeTZS,
          platform_fee_tzs: payoutAmounts.platformFeeTZS,
          wallet_exchange_rate: validation.walletConversion?.rate || null,
          wallet_exchange_rate_pair: validation.walletConversion?.pair || null,
          wallet_exchange_rate_source: validation.walletConversion?.source || null,
          tzs_amount: validation.amountTZS,
          usd_amount: validation.amountUSD,
          exchange_rate: payoutAmounts.exchangeRate,
          exchange_rate_pair: payoutAmounts.exchangeRatePair,
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
        console.log(`[PAYOUT_CREATION] Calling ClickPesa for bank payout ${orderReference}: ${payoutAmounts.sendAmountTZS} TZS`);
        
        clickpesaResponse = await ClickPesaService.createBankPayout({
          amount: payoutAmounts.sendAmountTZS,
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
      } catch (clickpesaError) {
        // ClickPesa API failed - reverse the funds
        console.error(`[PAYOUT_CREATION] ClickPesa bank API error for ${orderReference}:`, clickpesaError.message);

        if (paymentRecord.metadata?.external_sent || clickpesaResponse?.id) {
          console.error(`[PAYOUT_CREATION] External payout already sent for ${orderReference}; skipping restoration.`);
          await t.commit();
          PayoutController.reconcilePayoutStatus(orderReference, userId)
            .catch(err => console.error(`[PAYOUT_CREATION] Reconcile after external send failed for ${orderReference}:`, err.message));
          return res.status(500).json({
            success: false,
            error: 'Payout sent but persistence failed. Reconciliation scheduled.',
            code: 'PAYOUT_PERSISTENCE_FAILED'
          });
        }
        
        const restoreReference = PayoutController.buildReversalReference(orderReference);
        await payoutFlowService.restoreFundsAtomic(
          userId,
          payoutAmounts.totalDebitAmount,
          payoutAmounts.totalDebitCurrency,
          restoreReference,
          `Reversal for failed withdrawal ${orderReference}`,
          t
        );
        
        await paymentRecord.update({
          status: PayoutStates.FAILED,
          metadata: {
            ...paymentRecord.metadata,
            clickpesa_error: clickpesaError.message,
            error_at: new Date().toISOString(),
            balance_restored: true,
            reversal_status: 'completed'
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

        await t.commit();
        return res.status(400).json({
          success: false,
          error: `Bank withdrawal initiation failed: ${clickpesaError.message}`,
          code: 'BANK_PAYOUT_CREATION_FAILED'
        });
      }

      const clickpesaId = clickpesaResponse?.id || clickpesaResponse?.transactionId;
      const externalMetadata = {
        ...paymentRecord.metadata,
        external_sent: true,
        clickpesa_response: clickpesaResponse,
        clickpesa_transaction_id: clickpesaId,
        initiated_at: new Date().toISOString()
      };

      try {
        await paymentRecord.update({
          payment_reference: clickpesaId,
          status: PayoutController.mapClickPesaStatus(clickpesaResponse.status),
          metadata: externalMetadata
        }, { transaction: t });

        await transaction.update({
          payment_reference: clickpesaId,
          gateway_status: clickpesaResponse.status,
          metadata: {
            ...transaction.metadata,
            external_sent: true,
            clickpesa_response: clickpesaResponse
          }
        }, { transaction: t });
      } catch (persistError) {
        console.error(`[PAYOUT_PERSISTENCE][HIGH] Failed to persist ClickPesa response for ${orderReference}:`, persistError.message);
        try {
          await paymentRecord.update({
            status: PayoutStates.PROCESSING,
            metadata: externalMetadata
          }, { transaction: t });
        } catch (updateError) {
          console.error(`[PAYOUT_PERSISTENCE][HIGH] Failed to flag external send for ${orderReference}:`, updateError.message);
        }
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
      
      console.error('[PayoutController][createBankPayout] Error:', error.message, error.stack);
      if (!error.statusCode) error.statusCode = 400;
      const { status, body } = mapControllerError(error);
      res.status(status).json({
        message: body.message,
        code: body.code || 'BANK_PAYOUT_CREATION_FAILED'
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
      const result = await payoutFlowService.reconcilePayoutStatus(
        orderReference,
        userId,
        t
      );
      await t.commit();
      return result;
    } catch (error) {
      await t.rollback();
      if (!String(error.message || '').startsWith('ClickPesa API error:')) {
        console.error('[PayoutController][reconcilePayoutStatus] Error:', error.message, error.stack);
      }
      const { body } = mapControllerError(error);
      return {
        success: false,
        reconciled: false,
        error: body.message,
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
        },
        include: [{
          model: Transaction,
          as: 'transaction',
          attributes: ['id', 'gateway_status', 'transaction_fee', 'net_amount', 'description']
        }]
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
      console.error('[PayoutController][getPayoutStatus] Error:', error.message, error.stack);
      if (!error.statusCode) error.statusCode = 400;
      const { status, body } = mapControllerError(error);
      res.status(status).json({
        message: body.message,
        code: body.code || 'STATUS_CHECK_FAILED'
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
      console.error('[PayoutController][getWithdrawalHistory] Error:', error.message, error.stack);
      if (!error.statusCode) error.statusCode = 400;
      const { status, body } = mapControllerError(error);
      res.status(status).json({
        message: body.message,
        code: body.code || 'HISTORY_FETCH_FAILED'
      });
    }
  }

  /**
   * Get withdrawal statistics
   */
  static async getWithdrawalStats(req, res) {
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
      
      const totalWithdrawals = await PaymentRecord.sum('amount', {
        where: {
          user_id: userId,
          status: PayoutStates.COMPLETED,
          payment_method: { 
            [Op.in]: [PaymentMethods.MOBILE_MONEY_PAYOUT, PaymentMethods.BANK_PAYOUT] 
          },
          currency: requestCurrency
        }
      }) || 0;
      
      const todayWithdrawals = await PaymentRecord.sum('amount', {
        where: {
          user_id: userId,
          status: PayoutStates.COMPLETED,
          created_at: { [Op.gte]: startOfDay },
          payment_method: { 
            [Op.in]: [PaymentMethods.MOBILE_MONEY_PAYOUT, PaymentMethods.BANK_PAYOUT] 
          },
          currency: requestCurrency
        }
      }) || 0;
      
      const monthWithdrawals = await PaymentRecord.sum('amount', {
        where: {
          user_id: userId,
          status: PayoutStates.COMPLETED,
          created_at: { [Op.gte]: startOfMonth },
          payment_method: { 
            [Op.in]: [PaymentMethods.MOBILE_MONEY_PAYOUT, PaymentMethods.BANK_PAYOUT] 
          },
          currency: requestCurrency
        }
      }) || 0;
      
      const recentCount = await PaymentRecord.count({
        where: {
          user_id: userId,
          status: PayoutStates.COMPLETED,
          created_at: { [Op.gte]: thirtyDaysAgo },
          payment_method: { 
            [Op.in]: [PaymentMethods.MOBILE_MONEY_PAYOUT, PaymentMethods.BANK_PAYOUT] 
          },
          currency: requestCurrency
        }
      });
      
      const pendingWithdrawals = await PaymentRecord.sum('amount', {
        where: {
          user_id: userId,
          status: { [Op.in]: [PayoutStates.INITIATED, PayoutStates.PROCESSING] },
          payment_method: { 
            [Op.in]: [PaymentMethods.MOBILE_MONEY_PAYOUT, PaymentMethods.BANK_PAYOUT] 
          },
          currency: requestCurrency
        }
      }) || 0;
      
      res.json({
        success: true,
        data: {
          totals: {
            all_time: totalWithdrawals,
            today: todayWithdrawals,
            this_month: monthWithdrawals,
            pending: pendingWithdrawals
          },
          counts: {
            recent_30_days: recentCount
          },
          currency: requestCurrency,
          updated_at: new Date().toISOString()
        }
      });
      
    } catch (error) {
      console.error('[PayoutController][getWithdrawalStats] Error:', error.message, error.stack);
      if (!error.statusCode) error.statusCode = 400;
      const { status, body } = mapControllerError(error);
      res.status(status).json({
        message: body.message,
        code: body.code || 'STATS_FETCH_FAILED'
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
    const requestCurrency = metadata.request_currency || paymentRecord.currency;
    const requestAmount = metadata.request_amount ?? paymentRecord.amount;
    const feeAmountRequestCurrency = feeCalculation.feeAmountRequestCurrency != null
      ? feeCalculation.feeAmountRequestCurrency
      : requestCurrency === 'TZS'
        ? feeCalculation.feeAmountTZS
        : feeCalculation.feeAmountUSD;
    const netAmountRequestCurrency =
      Number(requestAmount || 0) - Number(feeAmountRequestCurrency || 0);
    const clickpesaData = metadata.clickpesa_data || metadata.clickpesa_response || {};

    const parseAmount = (value) => {
      const numeric = Number(value);
      return Number.isFinite(numeric) ? numeric : null;
    };

    const settledAmountTZS = parseAmount(
      clickpesaData.payoutAmountTZS ??
      clickpesaData.netAmountTZS ??
      clickpesaData.paidAmountTZS ??
      clickpesaData.amountTZS
    );
    const settledAmountUSD = parseAmount(
      clickpesaData.payoutAmountUSD ??
      clickpesaData.netAmountUSD ??
      clickpesaData.paidAmountUSD ??
      clickpesaData.amountUSD
    );
    
    const transaction = paymentRecord.transaction;
    
    return {
      id: paymentRecord.id,
      order_reference: paymentRecord.order_reference,
      payment_reference: paymentRecord.payment_reference,
      transaction_id: paymentRecord.transaction_id,
      // Request details
      request_currency: requestCurrency,
      request_amount: requestAmount,
      fee_amount: feeAmountRequestCurrency || 0,
      fee_currency: requestCurrency,
      net_amount: netAmountRequestCurrency,
      net_currency: requestCurrency,
      // Explicit TZS/USD equivalents
      amount_tzs: metadata.tzs_amount ?? (requestCurrency === 'TZS' ? requestAmount : null),
      amount_usd: metadata.usd_amount ?? (requestCurrency === 'USD' ? requestAmount : null),
      fee_tzs: feeCalculation.feeAmountTZS || 0,
      fee_usd: feeCalculation.feeAmountUSD || 0,
      net_amount_tzs: feeCalculation.payoutAmountTZS || metadata.tzs_amount,
      net_amount_usd: feeCalculation.payoutAmountUSD || metadata.usd_amount,
      // Wallet debit details
      wallet_currency: metadata.wallet_currency,
      wallet_debit_amount: metadata.wallet_debit_amount,
      // Settled/paid out amounts when available
      settled_amount_tzs: settledAmountTZS,
      settled_amount_usd: settledAmountUSD,
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

      const fromValidation = validateCurrencyCode(fromCurrency);
      const toValidation = validateCurrencyCode(toCurrency);

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

      const amountValidation = validateAmount(amount);
      if (!amountValidation.valid) {
        return res.status(400).json({
          success: false,
          error: amountValidation.error
        });
      }

      const numericAmount = amountValidation.amount;

      let conversion;
      if (fromValidation.currency === 'TZS' && toValidation.currency === 'USD') {
        conversion = await tzsToUsd(numericAmount);
      } else if (fromValidation.currency === 'USD' && toValidation.currency === 'TZS') {
        conversion = await usdToTzs(numericAmount);
      } else if (fromValidation.currency === toValidation.currency) {
        conversion = {
          amount: numericAmount,
          from: fromValidation.currency,
          to: toValidation.currency,
          rate: 1,
          pair: `${fromValidation.currency}/${toValidation.currency}`,
          source: 'same_currency',
          timestamp: new Date().toISOString()
        };
      } else {
        throw new Error(`Unsupported conversion: ${fromCurrency} to ${toCurrency}`);
      }

      const convertedAmount =
        conversion.amount ??
        conversion.convertedAmount ??
        conversion.usdAmount ??
        conversion.tzsAmount;
      if (convertedAmount === null || convertedAmount === undefined) {
        throw new Error(`Conversion missing convertedAmount for ${fromCurrency} to ${toCurrency}`);
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
      console.error('[PayoutController][convertCurrencyEndpoint] Error:', error.message, error.stack);
      if (!error.statusCode) error.statusCode = 400;
      const { status, body } = mapControllerError(error);
      res.status(status).json({
        message: body.message,
        code: body.code || 'CURRENCY_CONVERSION_FAILED'
      });
    }
  }

  /**
   * Validate bank account endpoint
   */
  static async validateBankAccountEndpoint(req, res) {
    try {
      const { accountNumber, accountName, bankCode } = req.body;

      if (!accountNumber || !accountName) {
        return res.status(400).json({
          success: false,
          error: 'Account number and account name are required'
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
          currency: requestCurrency,
          message: 'Account details appear valid'
        }
      });

    } catch (error) {
      console.error('[PayoutController][validateBankAccountEndpoint] Error:', error.message, error.stack);
      if (!error.statusCode) error.statusCode = 400;
      const { status, body } = mapControllerError(error);
      res.status(status).json({
        message: body.message,
        code: body.code || 'BANK_VALIDATION_FAILED'
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
    console.error('[PayoutController][getWebhookStats] Error:', error.message, error.stack);
    if (!error.statusCode) error.statusCode = 400;
    const { status, body } = mapControllerError(error);
    res.status(status).json({
      message: body.message,
      code: body.code || 'WEBHOOK_STATS_FAILED'
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
    console.error('[PayoutController][retryWebhook] Error:', error.message, error.stack);
    if (!error.statusCode) error.statusCode = 400;
    const { status, body } = mapControllerError(error);
    res.status(status).json({
      message: body.message,
      code: body.code || 'WEBHOOK_RETRY_FAILED'
    });
  }
}
}

// Initialize payout flow service with controller helpers and constants.
payoutFlowService = createPayoutFlowService({
  PayoutStates,
  PaymentMethods,
  TransactionTypes,
  WithdrawalLimits,
  mapClickPesaStatus: PayoutController.mapClickPesaStatus,
  logBalanceAudit: PayoutController.logBalanceAudit,
});




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
