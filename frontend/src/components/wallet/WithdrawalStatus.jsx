import React from "react";
import { formatCurrency as configFormatCurrency } from "../../config/currencyConfig";
import { formatPhoneDisplay } from "../../utils/formatters";

const statusStyles = {
  initiated: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300",
  processing: "bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300",
  pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300",
  successful: "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300",
  successfull: "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300",
  failed: "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300",
  cancelled: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300",
  reversed: "bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-300",
  refunded: "bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300",
};

const WithdrawalStatus = ({
  status,
  orderReference,
  recipient,
  onCancel,
  onCheckStatus,
  isCancelling,
  isChecking,
  canCancel,
  balance,
}) => {
  if (!status) return null;
  const style = statusStyles[status] || statusStyles.pending;

  return (
    <div className="bg-white dark:bg-neutral-800 rounded-xl p-4 md:p-6 border border-gray-200 dark:border-neutral-700 shadow-lg">
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-sm text-gray-500 dark:text-gray-400">Status</p>
          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${style}`}>
            {status}
          </span>
        </div>
        {balance != null && (
          <div className="text-right">
            <p className="text-xs text-gray-500 dark:text-gray-400">Balance</p>
            <p className="text-sm font-semibold text-gray-900 dark:text-white">
              {configFormatCurrency(balance)}
            </p>
          </div>
        )}
      </div>

      {orderReference && (
        <div className="mb-4">
          <p className="text-xs text-gray-500 dark:text-gray-400">Reference</p>
          <p className="text-sm font-mono text-gray-900 dark:text-white break-all">
            {orderReference}
          </p>
        </div>
      )}

      {recipient && (
        <div className="space-y-2">
          {recipient.phone_number && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500 dark:text-gray-400">Phone</span>
              <span className="text-gray-900 dark:text-white">
                {formatPhoneDisplay(recipient.phone_number)}
              </span>
            </div>
          )}
          {recipient.account_number && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500 dark:text-gray-400">Account</span>
              <span className="text-gray-900 dark:text-white">
                {recipient.account_number}
              </span>
            </div>
          )}
          {recipient.account_name && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500 dark:text-gray-400">Name</span>
              <span className="text-gray-900 dark:text-white">
                {recipient.account_name}
              </span>
            </div>
          )}
        </div>
      )}

      <div className="mt-4 flex flex-col md:flex-row gap-3">
        {canCancel && (
          <button
            onClick={onCancel}
            disabled={isCancelling}
            className="flex-1 px-4 py-2 border border-red-500 text-red-600 dark:text-red-500 rounded-lg text-sm font-medium hover:bg-red-50 dark:hover:bg-red-900/10 disabled:opacity-50"
          >
            {isCancelling ? "Cancelling..." : "Cancel"}
          </button>
        )}
        <button
          onClick={onCheckStatus}
          disabled={isChecking}
          className="flex-1 px-4 py-2 border border-blue-500 text-blue-600 dark:text-blue-500 rounded-lg text-sm font-medium hover:bg-blue-50 dark:hover:bg-blue-900/10 disabled:opacity-50"
        >
          {isChecking ? "Checking..." : "Check Status"}
        </button>
      </div>
    </div>
  );
};

export default WithdrawalStatus;
