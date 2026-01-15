import React from "react";
import { formatCurrency as configFormatCurrency } from "../../config/currencyConfig";

const WithdrawalPreview = ({ preview, onConfirm, onCancel, isConfirming }) => {
  if (!preview) return null;

  return (
    <div className="bg-white dark:bg-neutral-800 rounded-xl p-4 md:p-6 border border-gray-200 dark:border-neutral-700 shadow-lg">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
        Withdrawal Preview
      </h3>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-500 dark:text-gray-400">Amount</span>
          <span className="text-base font-semibold text-gray-900 dark:text-white">
            {configFormatCurrency(preview.amount || 0, preview.currency)}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-500 dark:text-gray-400">Total fee</span>
          <span className="text-base font-semibold text-gray-900 dark:text-white">
            {configFormatCurrency(preview.total_fee || 0, preview.currency)}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-500 dark:text-gray-400">Total deducted</span>
          <span className="text-base font-semibold text-red-600 dark:text-red-500">
            {configFormatCurrency(preview.total_debit || 0, preview.currency)}
          </span>
        </div>
        {preview.expires_in && (
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Quote expires in {preview.expires_in}
          </p>
        )}
      </div>

      <div className="mt-6 flex flex-col md:flex-row gap-3">
        <button
          onClick={onConfirm}
          disabled={isConfirming}
          className="flex-1 inline-flex items-center justify-center px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg text-base font-semibold hover:from-green-600 hover:to-emerald-700 transition-all disabled:opacity-50"
        >
          {isConfirming ? "Processing..." : "Confirm Withdrawal"}
        </button>
        <button
          onClick={onCancel}
          className="flex-1 px-6 py-3 border border-gray-300 dark:border-neutral-600 text-gray-700 dark:text-gray-200 rounded-lg text-base font-medium hover:bg-gray-50 dark:hover:bg-neutral-700"
        >
          Cancel
        </button>
      </div>
    </div>
  );
};

export default WithdrawalPreview;
