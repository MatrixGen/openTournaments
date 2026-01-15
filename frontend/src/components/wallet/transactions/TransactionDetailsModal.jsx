import React from "react";
import {
  BanknotesIcon,
  XCircleIcon,
} from "@heroicons/react/24/outline";
import { formatCurrency, formatDate, getPaymentStatusBgColor, getPaymentStatusColor } from "../../../utils/formatters";
import TransactionStatusBadge from "./TransactionStatusBadge";
import TransactionTypeBadge from "./TransactionTypeBadge";

const TransactionDetailsModal = ({
  transaction,
  isOpen,
  onClose,
  onReconcile,
  isReconciling,
}) => {
  if (!isOpen || !transaction) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" aria-hidden="true"></div>

        <div className="relative inline-block align-bottom bg-white dark:bg-neutral-800 rounded-xl text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg w-full max-h-[90vh] overflow-y-auto">
          <div className="px-4 md:px-6 py-4 border-b border-gray-200 dark:border-neutral-700">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Transaction Details
              </h3>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-white"
              >
                <XCircleIcon className="h-6 w-6" />
              </button>
            </div>
          </div>

          <div className="px-4 md:px-6 py-4 space-y-4">
            <div className="flex items-center space-x-4">
              <div className={`p-3 rounded-xl ${getPaymentStatusBgColor(transaction.status)}`}>
                <BanknotesIcon className={`h-8 w-8 ${getPaymentStatusColor(transaction.status)}`} />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <TransactionTypeBadge type={transaction.type} />
                  <TransactionStatusBadge status={transaction.status} />
                </div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white mt-2">
                  {transaction.amount >= 0 ? "+" : ""}{formatCurrency(transaction.amount)}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <div className="p-3 bg-gray-100 dark:bg-neutral-700/50 rounded-lg">
                  <p className="text-xs text-gray-500 dark:text-gray-400">Transaction ID</p>
                  <p className="text-sm text-gray-900 dark:text-white font-mono truncate">
                    {transaction.id}
                  </p>
                </div>
                <div className="p-3 bg-gray-100 dark:bg-neutral-700/50 rounded-lg">
                  <p className="text-xs text-gray-500 dark:text-gray-400">Order Reference</p>
                  <p className="text-sm text-gray-900 dark:text-white font-mono">
                    {transaction.order_reference}
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <div className="p-3 bg-gray-100 dark:bg-neutral-700/50 rounded-lg">
                  <p className="text-xs text-gray-500 dark:text-gray-400">Created At</p>
                  <p className="text-sm text-gray-900 dark:text-white">
                    {formatDate(transaction.created_at)}
                  </p>
                </div>
                <div className="p-3 bg-gray-100 dark:bg-neutral-700/50 rounded-lg">
                  <p className="text-xs text-gray-500 dark:text-gray-400">Updated At</p>
                  <p className="text-sm text-gray-900 dark:text-white">
                    {formatDate(transaction.updated_at)}
                  </p>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-gray-200 dark:border-neutral-700">
              <div className="flex flex-col sm:flex-row sm:justify-end space-y-2 sm:space-y-0 sm:space-x-3">
                <button
                  onClick={onClose}
                  className="px-4 py-2.5 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                >
                  Close
                </button>
                {["pending", "processing", "initiated"].includes(transaction.status) &&
                  transaction.type === "wallet_deposit" && (
                    <button
                      onClick={() => {
                        onReconcile(transaction.id, transaction.order_reference);
                        onClose();
                      }}
                      disabled={isReconciling}
                      className="px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                    >
                      Reconcile Now
                    </button>
                  )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TransactionDetailsModal;
