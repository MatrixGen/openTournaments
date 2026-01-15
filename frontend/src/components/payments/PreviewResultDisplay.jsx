// Preview Result Display Component - Mobile Optimized
// pages/wallet/Withdrawal.jsx

import { formatPhoneDisplay } from "../../utils/formatters";
import {
  ArrowPathIcon,
  UserCircleIcon,
  InformationCircleIcon,
} from "@heroicons/react/24/outline";

// Import currency configuration
const currencyLocales = {
  USD: "en-US",
  TZS: "sw-TZ",
};

const formatAmount = (amount, currency) => {
  const numericAmount = Number(amount);
  if (!Number.isFinite(numericAmount)) {
    return `0 ${currency}`;
  }
  const decimals = currency === "TZS" ? 0 : 2;
  const locale = currencyLocales[currency] || "en-US";
  const formatted = new Intl.NumberFormat(locale, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(numericAmount);
  return `${formatted} ${currency}`;
};

const normalizePayoutPreview = (previewResult) => {
  const requestCurrency =
    previewResult.receive_currency ||
    previewResult.request_currency ||
    previewResult.currency;
  const requestAmount =
    previewResult.receive_amount ??
    previewResult.request_amount ??
    previewResult.amount ??
    0;

  const totalFee =
    previewResult.total_fee ??
    (previewResult.total_debit_amount != null
      ? Number(previewResult.total_debit_amount) - Number(requestAmount)
      : null);
  const totalDebit =
    previewResult.total_debit ??
    previewResult.total_debit_amount ??
    (totalFee != null ? Number(requestAmount) + Number(totalFee) : null);

  return {
    requestAmount,
    requestCurrency,
    totalFee,
    totalDebit,
  };
};

const PreviewResultDisplay = ({
  previewResult,
  onConfirm,
  onCancelPreview,
  isConfirming,
}) => {
  if (!previewResult) return null;

  const normalized = normalizePayoutPreview(previewResult);
  if (normalized?.isInvalid) {
    return null;
  }

  const {
    requestAmount,
    requestCurrency,
    totalFee,
    totalDebit,
  } = normalized;

  const { recipient, channel_provider } = previewResult;

  return (
    <div className="bg-white dark:bg-neutral-800 rounded-xl p-4 md:p-6 mb-6 border border-gray-200 dark:border-neutral-700 shadow-lg">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2 md:space-x-3">
          <div className="p-1.5 md:p-2 bg-blue-500/20 rounded-lg">
            <InformationCircleIcon className="h-4 w-4 md:h-6 md:w-6 text-blue-500" />
          </div>
          <div>
            <h3 className="text-sm md:text-lg font-semibold text-gray-900 dark:text-gray-900 dark:text-white">
              Withdrawal Preview
            </h3>
            <p className="text-xs md:text-sm text-gray-600 dark:text-gray-400">
              Review details before confirming
            </p>
          </div>
        </div>
        <button
          onClick={onCancelPreview}
          className="text-xs md:text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
        >
          Change
        </button>
      </div>

      <div className="space-y-4 md:space-y-6">
        {/* Amount Summary */}
        <div className="bg-gray-50 dark:bg-neutral-700/50 rounded-lg p-4 md:p-6">
          <div className="grid grid-cols-1 gap-4">
            <div className="text-center">
              <p className="text-xs text-gray-500 dark:text-gray-400">
                You Will Receive
              </p>
              <p className="text-xl md:text-2xl font-bold text-gray-900 dark:text-gray-900 dark:text-white">
                {formatAmount(requestAmount || 0, requestCurrency)}
              </p>
            </div>
            <div className="text-center">
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Total Fee
              </p>
              <p className="text-lg md:text-xl font-bold text-gray-700 dark:text-gray-200">
                {formatAmount(totalFee || 0, requestCurrency)}
              </p>
            </div>
            <div className="text-center">
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Total Deducted
              </p>
              <p className="text-lg md:text-xl font-bold text-red-600 dark:text-red-500">
                {formatAmount(totalDebit || 0, requestCurrency)}
              </p>
            </div>
          </div>
        </div>

        {/* Recipient Details */}
        <div className="bg-gray-50 dark:bg-neutral-700/50 rounded-lg p-4 md:p-6">
          <div className="flex items-center space-x-2 md:space-x-3 mb-3 md:mb-4">
            <UserCircleIcon className="h-4 w-4 md:h-5 md:w-5 text-primary-500 dark:text-primary-400" />
            <h4 className="text-sm md:text-base font-medium text-gray-900 dark:text-gray-900 dark:text-white">
              Recipient Details
            </h4>
          </div>

          {recipient?.phone_number && (
            <div className="flex items-center justify-between py-2">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Phone Number
              </p>
              <p className="text-sm font-medium text-gray-900 dark:text-gray-900 dark:text-white">
                {formatPhoneDisplay(recipient.phone_number)}
              </p>
            </div>
          )}

          {recipient?.account_number && (
            <div className="flex items-center justify-between py-2">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Account Number
              </p>
              <p className="text-sm font-medium text-gray-900 dark:text-gray-900 dark:text-white">
                {recipient.account_number}
              </p>
            </div>
          )}

          {recipient?.account_name && (
            <div className="flex items-center justify-between py-2">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Account Name
              </p>
              <p className="text-sm font-medium text-gray-900 dark:text-gray-900 dark:text-white">
                {recipient.account_name}
              </p>
            </div>
          )}

          {channel_provider && (
            <div className="flex items-center justify-between py-2">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Provider
              </p>
              <p className="text-sm font-medium text-gray-900 dark:text-gray-900 dark:text-white">
                {channel_provider}
              </p>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col md:flex-row gap-3">
          <button
            onClick={onConfirm}
            disabled={isConfirming}
            className="flex-1 inline-flex justify-center items-center rounded-lg md:rounded-xl bg-gradient-to-r from-green-500 to-emerald-600 py-4 md:py-5 px-6 text-lg md:text-xl font-semibold text-gray-900 dark:text-white shadow-lg hover:from-green-600 hover:to-emerald-700 focus:outline-none focus:ring-4 focus:ring-green-500/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {isConfirming ? (
              <span className="flex items-center space-x-2 md:space-x-3">
                <ArrowPathIcon className="h-5 w-5 md:h-6 md:w-6 animate-spin" />
                <span>Processing...</span>
              </span>
            ) : (
              `Confirm Withdrawal of ${formatAmount(requestAmount || 0, requestCurrency)}`
            )}
          </button>

          <button
            onClick={onCancelPreview}
            className="px-4 md:px-6 py-3 md:py-4 border border-gray-300 dark:border-neutral-600 text-gray-700 dark:text-gray-300 rounded-lg md:rounded-xl text-sm md:text-base font-medium hover:bg-gray-50 dark:hover:bg-neutral-700 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default PreviewResultDisplay;
