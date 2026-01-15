const { Op } = require("sequelize");
const { User, Transaction, PaymentRecord } = require("../models");
const ClickPesaService = require("./clickPesaService");
const WalletService = require("./walletService");
const { WalletError } = require("../errors/WalletError");
const CurrencyUtils = require("../utils/currencyUtils");
const {
  isReversalCompleted,
  markReversalPending,
  markReversalCompleted,
} = require("../utils/reconciliationState");
const {
  usdToTzs,
  tzsToUsd,
  convertAmount,
  validateCurrencyCode,
  validateAmount,
} = require("./currencyService");

const createPayoutFlowService = ({
  PayoutStates,
  PaymentMethods,
  TransactionTypes,
  WithdrawalLimits,
  mapClickPesaStatus,
  logBalanceAudit,
}) => {
  const reserveFundsAtomic = async (
    userId,
    amount,
    currency,
    reference,
    description,
    transaction
  ) => {
    console.log(
      `[FUND_RESERVATION] User ${userId}: Attempting to reserve ${amount} ${currency}`
    );

    if (isNaN(amount) || amount <= 0) {
      throw new WalletError(
        "INVALID_AMOUNT",
        `Invalid reservation amount: ${amount} ${currency}`
      );
    }

    const walletResult = await WalletService.debit({
      userId,
      amount,
      currency,
      type: TransactionTypes.WALLET_WITHDRAWAL,
      reference,
      description,
      transaction,
    });

    const oldBalance = parseFloat(walletResult.balanceBefore);
    const newBalance = parseFloat(walletResult.balanceAfter);

    console.log(
      `[FUND_RESERVATION] User ${userId}: ${oldBalance} → ${newBalance} (-${amount} ${currency})`
    );

    if (logBalanceAudit) {
      await logBalanceAudit(
        userId,
        oldBalance,
        newBalance,
        -amount,
        walletResult.transaction?.id || null,
        null,
        "withdrawal_reservation",
        transaction
      );
    }

    return {
      success: true,
      oldBalance,
      newBalance,
      amountReserved: amount,
      transaction: walletResult.transaction,
    };
  };

  const restoreFundsAtomic = async (
    userId,
    amount,
    currency,
    reference,
    description,
    transaction
  ) => {
    console.log(
      `[FUND_RESTORATION] User ${userId}: Attempting to restore ${amount} ${currency}`
    );

    if (isNaN(amount) || amount <= 0) {
      throw new WalletError(
        "INVALID_AMOUNT",
        `Invalid restoration amount: ${amount} ${currency}`
      );
    }

    const walletResult = await WalletService.credit({
      userId,
      amount,
      currency,
      type: "system_adjustment",
      reference,
      description,
      transaction,
    });

    const oldBalance = parseFloat(walletResult.balanceBefore);
    const newBalance = parseFloat(walletResult.balanceAfter);

    console.log(
      `[FUND_RESTORATION] User ${userId}: ${oldBalance} → ${newBalance} (+${amount} ${currency})`
    );

    if (logBalanceAudit) {
      await logBalanceAudit(
        userId,
        oldBalance,
        newBalance,
        amount,
        walletResult.transaction?.id || null,
        null,
        "withdrawal_failure_restoration",
        transaction
      );
    }

    return {
      success: true,
      oldBalance,
      newBalance,
      amountRestored: amount,
      transaction: walletResult.transaction,
    };
  };

  const validateWithdrawalRequest = async (
    userId,
    amount,
    currency,
    payoutType,
    options = {}
  ) => {
    console.log(
      `[WITHDRAWAL_VALIDATION] User ${userId}: Validating ${amount} ${currency} for ${payoutType}`
    );

    const { reconcilePayoutStatus } = options;

    const currencyValidation = validateCurrencyCode(currency);
    if (!currencyValidation.valid) {
      throw new WalletError("INVALID_CURRENCY", currencyValidation.error);
    }
    const validatedCurrency = currencyValidation.currency;

    const amountValidation = validateAmount(amount);
    if (!amountValidation.valid) {
      throw new WalletError("INVALID_AMOUNT", amountValidation.error);
    }
    const numericAmount = amountValidation.amount;

    const user = await User.findByPk(userId, {
      attributes: [
        "id",
        "wallet_balance",
        "wallet_currency",
        "username",
        "email",
        "phone_number",
      ],
    });

    if (!user) {
      throw new Error("User not found");
    }

    let amountTZS, amountUSD, conversion, exchangeRatePair;

    if (validatedCurrency === "TZS") {
      amountTZS = numericAmount;

      const minTZS =
        payoutType === "bank"
          ? WithdrawalLimits.BANK_MIN_TZS
          : WithdrawalLimits.MOBILE_MIN_TZS;

      if (amountTZS < minTZS) {
        throw new WalletError(
          "LIMIT_EXCEEDED",
          `Minimum ${payoutType} withdrawal amount is ${minTZS.toLocaleString()} TZS`
        );
      }

      if (amountTZS > WithdrawalLimits.MAX_TZS) {
        throw new WalletError(
          "LIMIT_EXCEEDED",
          `Maximum withdrawal amount is ${WithdrawalLimits.MAX_TZS.toLocaleString()} TZS`
        );
      }

      conversion = await tzsToUsd(amountTZS);
      amountUSD = conversion.amount;
      exchangeRatePair = conversion.pair;
    } else if (validatedCurrency === "USD") {
      amountUSD = numericAmount;

      conversion = await usdToTzs(amountUSD);
      amountTZS = conversion.amount;
      exchangeRatePair = conversion.pair;

      const minTZS =
        payoutType === "bank"
          ? WithdrawalLimits.BANK_MIN_TZS
          : WithdrawalLimits.MOBILE_MIN_TZS;

      if (amountTZS < minTZS) {
        const minUSD = await tzsToUsd(minTZS);
        throw new WalletError(
          "LIMIT_EXCEEDED",
          `Minimum ${payoutType} withdrawal amount is ${minUSD.amount.toFixed(2)} USD ` +
            `(approximately ${minTZS.toLocaleString()} TZS)`
        );
      }

      if (amountTZS > WithdrawalLimits.MAX_TZS) {
        const maxUSD = await tzsToUsd(WithdrawalLimits.MAX_TZS);
        throw new WalletError(
          "LIMIT_EXCEEDED",
          `Maximum withdrawal amount is ${maxUSD.amount.toFixed(2)} USD ` +
            `(approximately ${WithdrawalLimits.MAX_TZS.toLocaleString()} TZS)`
        );
      }
    }

    const walletBalance = parseFloat(user.wallet_balance);
    const walletCurrency = user.wallet_currency
      ? String(user.wallet_currency).toUpperCase()
      : validatedCurrency;

    if (!CurrencyUtils.isValidCurrency(walletCurrency)) {
      throw new WalletError(
        "INVALID_CURRENCY",
        `Unsupported wallet currency: ${walletCurrency}`
      );
    }

    let walletDebitAmount = numericAmount;
    let walletConversion = null;
    if (walletCurrency !== validatedCurrency) {
      const conversionResult = await convertAmount(
        numericAmount,
        validatedCurrency,
        walletCurrency
      );
      walletDebitAmount = conversionResult.amount;
      walletConversion = conversionResult;
    }

    if (Number.isNaN(walletBalance)) {
      throw new WalletError("INVALID_WALLET_BALANCE", "Wallet balance is invalid");
    }

    if (walletBalance < walletDebitAmount) {
      throw new WalletError(
        "INSUFFICIENT_FUNDS",
        `Insufficient wallet balance. Available: ${walletBalance.toFixed(
          2
        )} ${walletCurrency}, ` +
          `Required: ${walletDebitAmount.toFixed(2)} ${walletCurrency}`
      );
    }

    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const todayWithdrawals = await PaymentRecord.findAll({
      where: {
        user_id: userId,
        status: PayoutStates.COMPLETED,
        payment_method:
          payoutType === "bank"
            ? PaymentMethods.BANK_PAYOUT
            : PaymentMethods.MOBILE_MONEY_PAYOUT,
        created_at: {
          [Op.gte]: startOfDay,
        },
      },
      attributes: ["id", "amount", "currency", "metadata"],
    });

    let totalTZSToday = 0;
    for (const withdrawal of todayWithdrawals) {
      const metadata = withdrawal.metadata || {};
      const metadataTZS = Number(metadata.tzs_amount);
      if (Number.isFinite(metadataTZS) && metadataTZS > 0) {
        totalTZSToday += metadataTZS;
        continue;
      }

      const amountValue = Number(withdrawal.amount);
      if (!Number.isFinite(amountValue) || amountValue <= 0) {
        continue;
      }

      if (withdrawal.currency === "TZS") {
        totalTZSToday += amountValue;
        continue;
      }

      if (withdrawal.currency === "USD") {
        const exchangeRate = Number(metadata.exchange_rate);
        const exchangeRatePair = metadata.exchange_rate_pair;
        if (Number.isFinite(exchangeRate) && exchangeRate > 0) {
          if (exchangeRatePair === "USD/TZS") {
            totalTZSToday += amountValue * exchangeRate;
            continue;
          }
          if (exchangeRatePair === "TZS/USD") {
            totalTZSToday += amountValue / exchangeRate;
            continue;
          }
        }

        const fallbackConversion = await usdToTzs(amountValue);
        totalTZSToday += fallbackConversion.amount;
      }
    }

    if (totalTZSToday + amountTZS > WithdrawalLimits.DAILY_LIMIT_TZS) {
      const remainingTZS = Math.max(
        0,
        WithdrawalLimits.DAILY_LIMIT_TZS - totalTZSToday
      );
      throw new WalletError(
        "LIMIT_EXCEEDED",
        `Daily withdrawal limit exceeded. You can withdraw up to ${WithdrawalLimits.DAILY_LIMIT_TZS.toLocaleString()} TZS per day. ` +
          `Remaining today: ${remainingTZS.toLocaleString()} TZS`
      );
    }

    const recentWithdrawal = await PaymentRecord.findOne({
      where: {
        user_id: userId,
        status: { [Op.in]: [PayoutStates.INITIATED, PayoutStates.PROCESSING] },
        payment_method:
          payoutType === "bank"
            ? PaymentMethods.BANK_PAYOUT
            : PaymentMethods.MOBILE_MONEY_PAYOUT,
        created_at: {
          [Op.gt]: new Date(Date.now() - 15 * 60 * 1000),
        },
      },
    });

    if (recentWithdrawal) {
      console.log(
        `[WITHDRAWAL_VALIDATION] Found recent withdrawal ${recentWithdrawal.order_reference}`
      );

      try {
        if (reconcilePayoutStatus) {
          await reconcilePayoutStatus(recentWithdrawal.order_reference, userId);
        }
        await recentWithdrawal.reload();

        if (
          [PayoutStates.INITIATED, PayoutStates.PROCESSING].includes(
            recentWithdrawal.status
          )
        ) {
          throw new WalletError(
            "WITHDRAWAL_IN_PROGRESS",
            "You have a withdrawal in progress. Please wait for it to complete before initiating a new one."
          );
        }
      } catch (reconcileError) {
        console.warn(
          "[WITHDRAWAL_VALIDATION] Reconciliation failed:",
          reconcileError.message
        );
        throw new WalletError(
          "WITHDRAWAL_IN_PROGRESS",
          "You have a withdrawal in progress. Please wait for it to complete before initiating a new one."
        );
      }
    }

    console.log(
      `[WITHDRAWAL_VALIDATION] Validation passed for user ${userId}: ${amountTZS} TZS / ${amountUSD} USD`
    );

    return {
      user,
      walletBalance,
      walletBalanceCurrency: walletCurrency,
      requestAmount: numericAmount,
      requestCurrency: validatedCurrency,
      amountTZS,
      amountUSD,
      conversion,
      exchangeRatePair,
      walletCurrency,
      walletDebitAmount,
      walletConversion,
      limits: {
        minTZS:
          payoutType === "bank"
            ? WithdrawalLimits.BANK_MIN_TZS
            : WithdrawalLimits.MOBILE_MIN_TZS,
        maxTZS: WithdrawalLimits.MAX_TZS,
        dailyTZS: WithdrawalLimits.DAILY_LIMIT_TZS,
        remainingDailyTZS: WithdrawalLimits.DAILY_LIMIT_TZS - totalTZSToday,
      },
    };
  };

  const calculatePayoutWithFees = async (amount, payoutMethod, currency) => {
    console.log(
      `[FEE_CALCULATION] Calculating fees for ${amount} ${currency} (${payoutMethod})`
    );

    try {
      const calculation = await ClickPesaService.calculatePayoutWithFees({
        amount,
        currency,
        feeBearer: "MERCHANT",
        payoutMethod: payoutMethod === "bank" ? "BANK_PAYOUT" : "MOBILE_MONEY",
      });

      console.log("[FEE_CALCULATION] ClickPesa calculation:", {
        payoutAmountTZS: calculation.payoutAmountTZS,
        feeAmountTZS: calculation.feeAmountTZS,
        totalDebitAmount: calculation.totalDebitAmount,
      });

      const feeConversion = await tzsToUsd(calculation.feeAmountTZS);
      const payoutConversion = await tzsToUsd(calculation.payoutAmountTZS);
      const requestCurrency = String(currency).toUpperCase();
      const feeAmountRequestCurrency =
        requestCurrency === "TZS"
          ? calculation.feeAmountTZS
          : feeConversion.amount;
      const payoutAmountRequestCurrency =
        requestCurrency === "TZS"
          ? calculation.payoutAmountTZS
          : payoutConversion.amount;

      return {
        feeAmountTZS: calculation.feeAmountTZS,
        payoutAmountTZS: calculation.payoutAmountTZS,
        totalDebitAmountTZS: calculation.totalDebitAmount,
        feeAmountUSD: feeConversion.amount,
        payoutAmountUSD: payoutConversion.amount,
        totalDebitAmountUSD:
          calculation.totalDebitAmount / calculation.conversionInfo?.rate,
        feeAmountRequestCurrency,
        payoutAmountRequestCurrency,
        requestCurrency,
        requestAmount: amount,
        exchangeRate: calculation.conversionInfo?.rate,
        feeBearer: "MERCHANT",
        calculation,
      };
    } catch (error) {
      console.error(
        "[FEE_CALCULATION] ClickPesa fee calculation failed:",
        error.message
      );

      const feePercent = payoutMethod === "bank" ? 0.02 : 0.01;
      const amountTZS =
        currency === "TZS" ? amount : (await usdToTzs(amount)).amount;
      const feeAmountTZS = Math.round(amountTZS * feePercent);
      const payoutAmountTZS = amountTZS - feeAmountTZS;

      const feeConversion = await tzsToUsd(feeAmountTZS);
      const payoutConversion = await tzsToUsd(payoutAmountTZS);
      const amountConversion = await tzsToUsd(amountTZS);
      const requestCurrency = String(currency).toUpperCase();
      const feeAmountRequestCurrency =
        requestCurrency === "TZS" ? feeAmountTZS : feeConversion.amount;
      const payoutAmountRequestCurrency =
        requestCurrency === "TZS" ? payoutAmountTZS : payoutConversion.amount;

      return {
        feeAmountTZS,
        payoutAmountTZS,
        totalDebitAmountTZS: amountTZS,
        feeAmountUSD: feeConversion.amount,
        payoutAmountUSD: payoutConversion.amount,
        totalDebitAmountUSD: amountConversion.amount,
        feeAmountRequestCurrency,
        payoutAmountRequestCurrency,
        requestCurrency,
        requestAmount: amount,
        exchangeRate: amountConversion.rate,
        feeBearer: "MERCHANT",
        note: "Using estimated fees due to calculation error",
        error: error.message,
      };
    }
  };

  const reconcilePayoutStatus = async (orderReference, userId, transaction) => {
    console.log(
      `[PAYOUT_RECONCILE] Starting reconciliation for: ${orderReference}`
    );

    const whereClause = {
      order_reference: orderReference,
      payment_method: {
        [Op.in]: [
          PaymentMethods.MOBILE_MONEY_PAYOUT,
          PaymentMethods.BANK_PAYOUT,
        ],
      },
    };

    if (userId) {
      whereClause.user_id = userId;
    }

    const paymentRecord = await PaymentRecord.findOne({
      where: whereClause,
      transaction,
      lock: transaction.LOCK.UPDATE,
    });

    if (!paymentRecord) {
      return {
        success: false,
        reconciled: false,
        error: "Payout record not found",
      };
    }

    const existingMetadata = paymentRecord.metadata || {};
    const reversalStatus = existingMetadata.reversal_status;

    if (paymentRecord.status === PayoutStates.COMPLETED) {
      return {
        success: true,
        reconciled: false,
        reason: "Already in final state",
        current_status: paymentRecord.status,
      };
    }

    if (paymentRecord.status === PayoutStates.FAILED && isReversalCompleted(existingMetadata)) {
      return {
        success: true,
        reconciled: false,
        reason: "Already failed with reversal completed",
        current_status: paymentRecord.status,
      };
    }

    if (paymentRecord.status === PayoutStates.FAILED && !isReversalCompleted(existingMetadata)) {
      const reversalCurrency = (
        existingMetadata.wallet_currency ||
        paymentRecord.currency ||
        ""
      )
        .trim()
        .toUpperCase();
      const reversalAmount = Number(
        existingMetadata.wallet_debit_amount ?? paymentRecord.amount
      );

      if (!reversalCurrency) {
        throw new WalletError("MISSING_CURRENCY", "Payout currency is missing");
      }
      if (!CurrencyUtils.isValidCurrency(reversalCurrency)) {
        throw new WalletError(
          "INVALID_CURRENCY",
          `Unsupported currency: ${reversalCurrency}`
        );
      }
      if (!Number.isFinite(reversalAmount) || reversalAmount <= 0) {
        throw new WalletError("INVALID_AMOUNT", "Invalid reversal amount");
      }

      let reversalMetadata = markReversalPending(paymentRecord.metadata);
      reversalMetadata = {
        ...reversalMetadata,
        last_reconciliation_check: new Date().toISOString(),
      };

      await paymentRecord.update({ metadata: reversalMetadata }, { transaction });

      const restoreReference = `${orderReference}REV`;
      await restoreFundsAtomic(
        paymentRecord.user_id,
        reversalAmount,
        reversalCurrency,
        restoreReference,
        `Reversal for failed withdrawal ${orderReference}`,
        transaction
      );

      reversalMetadata = markReversalCompleted(reversalMetadata);

      await paymentRecord.update({ metadata: reversalMetadata }, { transaction });

      if (paymentRecord.transaction_id) {
        await Transaction.update(
          {
            metadata: {
              ...reversalMetadata,
              reconciled_at: new Date().toISOString(),
            },
          },
          {
            where: { id: paymentRecord.transaction_id },
            transaction,
          }
        );
      } else {
        console.warn(
          `[PAYOUT_RECONCILE] Missing transaction_id for ${orderReference}; skipping Transaction.update`
        );
      }

      return {
        success: true,
        reconciled: true,
        previous_status: paymentRecord.status,
        new_status: paymentRecord.status,
        note: "Reversal completed for failed payout",
      };
    }

    let clickpesaData;
    try {
      clickpesaData = await ClickPesaService.getPayoutByOrderReference(
        orderReference
      );

      if (!clickpesaData || clickpesaData.length === 0) {
        if (paymentRecord.payment_reference) {
          clickpesaData = await ClickPesaService.getPayoutById(
            paymentRecord.payment_reference
          );
        }
      }

      if (!clickpesaData || (Array.isArray(clickpesaData) && clickpesaData.length === 0)) {
        return {
          success: true,
          reconciled: false,
          reason: "Payout not found in ClickPesa",
        };
      }
    } catch (apiError) {
      console.error(
        `[PAYOUT_RECONCILE] ClickPesa API error: ${apiError.message}`
      );
      throw new Error(`ClickPesa API error: ${apiError.message}`);
    }

    const latestData = Array.isArray(clickpesaData) ? clickpesaData[0] : clickpesaData;
    const remoteStatus = latestData.status;
    const mappedStatus = mapClickPesaStatus(remoteStatus);

    if (paymentRecord.status === mappedStatus) {
      await paymentRecord.update(
        {
          metadata: {
            ...paymentRecord.metadata,
            last_reconciliation_check: new Date().toISOString(),
            clickpesa_last_status: remoteStatus,
          },
        },
        { transaction }
      );

      return {
        success: true,
        reconciled: false,
        reason: "Status unchanged",
        current_status: mappedStatus,
        clickpesa_status: remoteStatus,
      };
    }

    console.log(
      `[PAYOUT_RECONCILE] Status changed: ${paymentRecord.status} → ${mappedStatus} (ClickPesa: ${remoteStatus})`
    );

    const previousStatus = paymentRecord.status;

    const updatedMetadata = {
      ...paymentRecord.metadata,
      previous_status: previousStatus,
      status_changed_at: new Date().toISOString(),
      clickpesa_status: remoteStatus,
      clickpesa_data: latestData,
      last_reconciliation_check: new Date().toISOString(),
      last_reconciliation: new Date().toISOString(),
      reconciled_by: "system",
    };

    await paymentRecord.update(
      {
        status: mappedStatus,
        metadata: updatedMetadata,
      },
      { transaction }
    );

    if (paymentRecord.transaction_id) {
      await Transaction.update(
        {
          status: mappedStatus,
          gateway_status: remoteStatus,
          metadata: {
            ...updatedMetadata,
            reconciled_at: new Date().toISOString(),
          },
        },
        {
          where: { id: paymentRecord.transaction_id },
          transaction,
        }
      );
    } else {
      console.warn(
        `[PAYOUT_RECONCILE] Missing transaction_id for ${orderReference}; skipping Transaction.update`
      );
    }

    if (mappedStatus === PayoutStates.FAILED && previousStatus !== PayoutStates.FAILED) {
      const recordCurrency = (
        updatedMetadata.wallet_currency ||
        paymentRecord.currency ||
        ""
      )
        .trim()
        .toUpperCase();
      const recordAmount = Number(
        updatedMetadata.wallet_debit_amount ?? paymentRecord.amount
      );
      if (!recordCurrency) {
        throw new WalletError("MISSING_CURRENCY", "Payout currency is missing");
      }
      if (!CurrencyUtils.isValidCurrency(recordCurrency)) {
        throw new WalletError(
          "INVALID_CURRENCY",
          `Unsupported currency: ${recordCurrency}`
        );
      }
      if (!Number.isFinite(recordAmount) || recordAmount <= 0) {
        throw new WalletError("INVALID_AMOUNT", "Invalid reversal amount");
      }
      if (isReversalCompleted(updatedMetadata)) {
        return {
          success: true,
          reconciled: true,
          previous_status: previousStatus,
          new_status: mappedStatus,
          clickpesa_status: remoteStatus,
          order_reference: orderReference,
          user_id: paymentRecord.user_id,
          amount: paymentRecord.amount,
          note: "Payout failed but reversal already completed",
        };
      }

      const restoreReference = `${orderReference}REV`;
      let reversalMetadata = markReversalPending(paymentRecord.metadata);
      await paymentRecord.update(
        {
          metadata: reversalMetadata,
        },
        { transaction }
      );

      await restoreFundsAtomic(
        paymentRecord.user_id,
        recordAmount,
        recordCurrency,
        restoreReference,
        `Reversal for failed withdrawal ${orderReference}`,
        transaction
      );

      reversalMetadata = markReversalCompleted(reversalMetadata);
      await paymentRecord.update(
        {
          metadata: reversalMetadata,
        },
        { transaction }
      );

      console.log(
        `[PAYOUT_RECONCILE] Funds restored for failed payout: ${orderReference}`
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
      note:
        mappedStatus === PayoutStates.FAILED
          ? "Funds restored to wallet"
          : "Status updated",
    };
  };

  return {
    reserveFundsAtomic,
    restoreFundsAtomic,
    validateWithdrawalRequest,
    calculatePayoutWithFees,
    reconcilePayoutStatus,
  };
};

module.exports = {
  createPayoutFlowService,
};
