'use strict';

const { User, Transaction } = require('../models');
const { WalletError } = require('../errors/WalletError');


const normalizeAmountInput = (value) => {
  if (value === null || value === undefined) {
    throw new WalletError('INVALID_AMOUNT', 'Amount is required');
  }

  if (typeof value === 'number') {
    if (!Number.isFinite(value)) {
      throw new WalletError('INVALID_AMOUNT', 'Amount must be a finite number');
    }
    return value.toString();
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (trimmed.length === 0) {
      throw new WalletError('INVALID_AMOUNT', 'Amount cannot be empty');
    }
    return trimmed;
  }

  throw new WalletError('INVALID_AMOUNT', 'Amount must be a string or number');
};

const toCents = (value) => {
  const raw = normalizeAmountInput(value);
  const match = raw.match(/^(-)?(\d+)(?:\.(\d+))?$/);
  if (!match) {
    throw new WalletError('INVALID_AMOUNT_FORMAT', `Invalid amount format: ${raw}`);
  }

  const sign = match[1] ? -1n : 1n;
  const whole = match[2];
  const fractionRaw = match[3] || '';
  const fractionPadded = fractionRaw.padEnd(2, '0');
  const fraction = fractionPadded.slice(0, 2);
  const remainder = fractionRaw.slice(2);

  let cents = BigInt(whole) * 100n + BigInt(fraction || '0');

  if (remainder.length > 0) {
    const first = remainder[0];
    const roundUp = first > '5' || (first === '5' && /[1-9]/.test(remainder.slice(1)));
    if (roundUp) {
      cents += 1n;
    }
  }

  return cents * sign;
};

const centsToDecimalString = (centsValue) => {
  const cents = BigInt(centsValue);
  const sign = cents < 0n ? '-' : '';
  const absolute = cents < 0n ? -cents : cents;
  const whole = absolute / 100n;
  const fraction = absolute % 100n;
  return `${sign}${whole.toString()}.${fraction.toString().padStart(2, '0')}`;
};

const assertRequired = (value, fieldName, code) => {
  if (value === null || value === undefined || value === '') {
    throw new WalletError(code, `${fieldName} is required`);
  }
};

const applyDeltaCents = async ({
  userId,
  deltaCents,
  amountCents,
  currency,
  type,
  reference,
  description,
  tournamentId,
  metadata,
  transaction,
}) => {
  assertRequired(transaction, 'transaction', 'MISSING_TRANSACTION');
  assertRequired(reference, 'reference', 'MISSING_REFERENCE');
  assertRequired(userId, 'userId', 'MISSING_USER_ID');
  assertRequired(currency, 'currency', 'MISSING_CURRENCY');

  if (deltaCents === 0n) {
    throw new WalletError('INVALID_AMOUNT', 'Amount must be non-zero');
  }

  const existingTransaction = await Transaction.findOne({
    where: { order_reference: reference },
    transaction,
    lock: transaction.LOCK.UPDATE,
  });

  if (existingTransaction) {
    if (existingTransaction.user_id !== userId) {
      throw new WalletError('IDEMPOTENCY_CONFLICT', 'Order reference already used by another user');
    }

    if (existingTransaction.status === 'completed') {
      return {
        status: 'already_applied',
        transaction: existingTransaction,
        balanceBefore: existingTransaction.balance_before,
        balanceAfter: existingTransaction.balance_after,
        balanceAfterCents: toCents(existingTransaction.balance_after),
      };
    }
  }

  const user = await User.findByPk(userId, {
    transaction,
    lock: transaction.LOCK.UPDATE,
  });

  if (!user) {
    throw new WalletError('USER_NOT_FOUND', 'User not found');
  }

  if (user.wallet_currency) {
    const walletCurrencyNormalized = String(user.wallet_currency).toUpperCase();
    const requestCurrencyNormalized = String(currency).toUpperCase();
    if (walletCurrencyNormalized !== requestCurrencyNormalized) {
      throw new WalletError(
        'CURRENCY_MISMATCH',
        'Wallet currency does not match request currency',
        {
          walletCurrency: walletCurrencyNormalized,
          requestCurrency: requestCurrencyNormalized,
        }
      );
    }
  }

  const balanceBeforeCents = toCents(user.wallet_balance || '0');
  const balanceAfterCents = balanceBeforeCents + deltaCents;

  if (balanceAfterCents < 0n) {
    throw new WalletError('INSUFFICIENT_FUNDS', 'Insufficient wallet balance');
  }

  const balanceBefore = centsToDecimalString(balanceBeforeCents);
  const balanceAfter = centsToDecimalString(balanceAfterCents);
  const amountDecimal = centsToDecimalString(amountCents);

  await user.update({ wallet_balance: balanceAfter }, { transaction });

  let transactionRecord;
  if (existingTransaction) {
    if (type && existingTransaction.type && existingTransaction.type !== type) {
      throw new WalletError('IDEMPOTENCY_CONFLICT', 'Transaction type mismatch for existing reference');
    }

    if (existingTransaction.currency && existingTransaction.currency !== currency) {
      throw new WalletError('CURRENCY_MISMATCH', 'Transaction currency mismatch for existing reference');
    }

    if (existingTransaction.amount !== null && existingTransaction.amount !== undefined) {
      const existingAmountCents = toCents(existingTransaction.amount);
      if (existingAmountCents !== amountCents) {
        throw new WalletError('IDEMPOTENCY_CONFLICT', 'Transaction amount mismatch for existing reference');
      }
    }

    const mergedMetadata = metadata
      ? { ...(existingTransaction.metadata || {}), ...metadata }
      : existingTransaction.metadata;

    transactionRecord = await existingTransaction.update(
      {
        type: type || existingTransaction.type,
        amount: existingTransaction.amount ?? amountDecimal,
        currency,
        balance_before: balanceBefore,
        balance_after: balanceAfter,
        status: 'completed',
        description: description || existingTransaction.description,
        tournament_id: tournamentId ?? existingTransaction.tournament_id,
        metadata: mergedMetadata,
      },
      { transaction }
    );
  } else {
    transactionRecord = await Transaction.create(
      {
        user_id: userId,
        tournament_id: tournamentId || null,
        order_reference: reference,
        type: type || 'system_adjustment',
        amount: amountDecimal,
        currency,
        balance_before: balanceBefore,
        balance_after: balanceAfter,
        status: 'completed',
        description: description || null,
        metadata: metadata || null,
      },
      { transaction }
    );
  }

  return {
    status: 'applied',
    transaction: transactionRecord,
    balanceBefore,
    balanceAfter,
    balanceAfterCents,
  };
};

const debit = async ({
  userId,
  amount,
  currency,
  type,
  reference,
  description,
  tournamentId,
  metadata,
  transaction,
}) => {
  assertRequired(amount, 'amount', 'INVALID_AMOUNT');
  const amountCents = toCents(amount);
  if (amountCents <= 0n) {
    throw new WalletError('INVALID_AMOUNT', 'Debit amount must be positive');
  }

  return applyDeltaCents({
    userId,
    deltaCents: -amountCents,
    amountCents,
    currency,
    type,
    reference,
    description,
    tournamentId,
    metadata,
    transaction,
  });
};

const credit = async ({
  userId,
  amount,
  currency,
  type,
  reference,
  description,
  tournamentId,
  metadata,
  transaction,
}) => {
  assertRequired(amount, 'amount', 'INVALID_AMOUNT');
  const amountCents = toCents(amount);
  if (amountCents <= 0n) {
    throw new WalletError('INVALID_AMOUNT', 'Credit amount must be positive');
  }

  return applyDeltaCents({
    userId,
    deltaCents: amountCents,
    amountCents,
    currency,
    type,
    reference,
    description,
    tournamentId,
    metadata,
    transaction,
  });
};

const applyDelta = async ({
  userId,
  delta,
  currency,
  type,
  reference,
  description,
  tournamentId,
  metadata,
  transaction,
}) => {
  assertRequired(delta, 'delta', 'INVALID_AMOUNT');
  const deltaCents = toCents(delta);
  const amountCents = deltaCents < 0n ? -deltaCents : deltaCents;

  return applyDeltaCents({
    userId,
    deltaCents,
    amountCents,
    currency,
    type,
    reference,
    description,
    tournamentId,
    metadata,
    transaction,
  });
};

module.exports = {
  debit,
  credit,
  applyDelta,
  toCents,
};
