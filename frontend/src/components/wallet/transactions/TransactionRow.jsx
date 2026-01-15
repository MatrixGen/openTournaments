import React from "react";
import {
  ArrowPathIcon,
  BanknotesIcon,
  EyeIcon,
  ExclamationTriangleIcon,
  ArrowDownTrayIcon,
} from "@heroicons/react/24/outline";
import {
  formatCurrency,
  formatDate,
  getPaymentStatusBgColor,
  getPaymentStatusColor,
} from "../../../utils/formatters";
import TransactionStatusBadge from "./TransactionStatusBadge";
import TransactionTypeBadge from "./TransactionTypeBadge";
import { isStuck, canReconcile, canCancel } from "../../../utils/transactionUiUtils";

const TransactionRow = ({
  transaction,
  onReconcile,
  onCancel,
  onViewDetails,
  isReconciling,
  isSelected,
  onToggleSelect,
}) => {
  const {
    id,
    order_reference,
    type,
    amount,
    status,
    created_at,
    balance_before,
    balance_after,
    metadata,
  } = transaction;

  const stuck = isStuck(status, created_at);
  const canReconcileNow = canReconcile(status, type);
  const canCancelNow = canCancel(status, type);

  return (
    <div
      className={`bg-white dark:bg-neutral-800 rounded-lg border border-gray-200 dark:border-neutral-700 hover:border-gray-300 dark:hover:border-neutral-600 transition-colors ${
        isSelected ? "ring-2 ring-primary-500 dark:ring-primary-600" : ""
      }`}
    >
      <div className="p-3 md:p-4">
        <div className="flex items-start justify-between">
          <div className="md:hidden mr-2 mt-1">
            <input
              type="checkbox"
              checked={isSelected}
              onChange={() => onToggleSelect(id)}
              className="h-4 w-4 rounded border-gray-300 dark:border-neutral-600 bg-white dark:bg-neutral-700 text-primary-600 dark:text-primary-500 focus:ring-primary-500"
            />
          </div>

          <div className="flex items-start space-x-3 flex-1 min-w-0">
            <div
              className={`p-2 rounded-lg ${getPaymentStatusBgColor(status)} flex-shrink-0`}
            >
              <BanknotesIcon
                className={`h-5 w-5 ${getPaymentStatusColor(status)}`}
              />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-1.5 mb-2">
                <TransactionTypeBadge type={type} />
                <TransactionStatusBadge status={status} />
                {stuck && (
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded-md text-xs font-medium bg-yellow-500/20 text-yellow-600 dark:text-yellow-400">
                    <ExclamationTriangleIcon className="h-3 w-3 mr-1" />
                    Stuck
                  </span>
                )}
              </div>

              <div className="space-y-2 md:space-y-0 md:grid md:grid-cols-2 lg:grid-cols-3 gap-2 mb-2">
                <div className="truncate">
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Reference
                  </p>
                  <p className="text-sm text-gray-900 dark:text-white font-mono truncate">
                    {order_reference}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Amount
                  </p>
                  <p
                    className={`text-base md:text-lg font-semibold ${
                      amount >= 0
                        ? "text-green-600 dark:text-green-400"
                        : "text-red-600 dark:text-red-400"
                    }`}
                  >
                    {amount >= 0 ? "+" : ""}
                    {formatCurrency(amount)}
                  </p>
                </div>
                <div className="md:col-span-2 lg:col-span-1">
                  <p className="text-xs text-gray-500 dark:text-gray-400">Date</p>
                  <p className="text-sm text-gray-900 dark:text-white">
                    {formatDate(created_at)}
                  </p>
                </div>
              </div>

              {metadata?.phone_number && (
                <div className="mb-2">
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Phone Number
                  </p>
                  <p className="text-sm text-gray-900 dark:text-white">
                    {metadata.phone_number}
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center space-x-1 ml-2 flex-shrink-0">
            <button
              onClick={() => onViewDetails(transaction)}
              className="p-1.5 md:p-2 text-gray-400 hover:text-gray-700 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-neutral-700 rounded-lg transition-colors"
              title="View Details"
            >
              <EyeIcon className="h-4 w-4" />
            </button>

            {canReconcileNow && (
              <button
                onClick={() => onReconcile(id, order_reference)}
                disabled={isReconciling}
                className={`p-1.5 md:p-2 rounded-lg transition-colors ${
                  stuck
                    ? "bg-yellow-500/20 text-yellow-600 dark:text-yellow-500 hover:bg-yellow-500/30"
                    : "bg-blue-500/20 text-blue-600 dark:text-blue-500 hover:bg-blue-500/30"
                } disabled:opacity-50 disabled:cursor-not-allowed`}
                title={stuck ? "Force Reconcile" : "Check Status"}
              >
                <ArrowPathIcon
                  className={`h-4 w-4 ${isReconciling ? "animate-spin" : ""}`}
                />
              </button>
            )}

            {canCancelNow && (
              <button
                onClick={() => onCancel(order_reference)}
                disabled={isReconciling}
                className={`p-1.5 md:p-2 rounded-lg transition-colors ${
                  stuck
                    ? "bg-yellow-500/20 text-yellow-600 dark:text-yellow-500 hover:bg-yellow-500/30"
                    : "bg-blue-500/20 text-blue-600 dark:text-blue-500 hover:bg-blue-500/30"
                } disabled:opacity-50 disabled:cursor-not-allowed`}
                title={stuck ? "Force Reconcile" : "Check Status"}
              >
                <ArrowPathIcon
                  className={`h-4 w-4 ${isReconciling ? "animate-spin" : ""}`}
                />
              </button>
            )}
          </div>
        </div>

        {balance_before !== undefined && balance_after !== undefined && (
          <div className="mt-3 pt-3 border-t border-gray-200 dark:border-neutral-700">
            <div className="flex items-center justify-between text-xs md:text-sm">
              <div className="truncate">
                <span className="text-gray-500 dark:text-gray-400">Before:</span>
                <span className="ml-1 text-gray-900 dark:text-white">
                  {formatCurrency(balance_before)}
                </span>
              </div>
              <ArrowDownTrayIcon className="h-3 w-3 md:h-4 md:w-4 text-gray-400 dark:text-gray-500 mx-2 flex-shrink-0" />
              <div className="truncate">
                <span className="text-gray-500 dark:text-gray-400">After:</span>
                <span className="ml-1 text-gray-900 dark:text-white font-semibold">
                  {formatCurrency(balance_after)}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TransactionRow;
