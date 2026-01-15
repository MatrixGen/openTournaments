import React from "react";
import TransactionRow from "./TransactionRow";
import { BanknotesIcon, ArrowPathIcon } from "@heroicons/react/24/outline";

const TransactionList = ({
  transactions,
  loading,
  pagination,
  onReconcile,
  onCancel,
  onViewDetails,
  isReconciling,
  selectedTransactions,
  onToggleSelect,
}) => {
  if (loading) {
    return (
      <div className="py-12 md:py-20 text-center">
        <ArrowPathIcon className="h-8 w-8 animate-spin text-primary-600 dark:text-primary-500 mx-auto" />
        <p className="mt-3 text-gray-600 dark:text-gray-400">
          Loading transactions...
        </p>
      </div>
    );
  }

  if (transactions.length === 0) {
    return (
      <div className="py-12 md:py-20 text-center">
        <BanknotesIcon className="h-10 w-10 md:h-12 md:w-12 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
          No transactions found
        </h3>
        <p className="text-gray-600 dark:text-gray-500 max-w-md mx-auto px-4">
          No transactions available for this filter.
        </p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-gray-200 dark:divide-neutral-700">
      {transactions.map((transaction) => (
        <TransactionRow
          key={transaction.id}
          transaction={transaction}
          onReconcile={onReconcile}
          onCancel={onCancel}
          onViewDetails={onViewDetails}
          isReconciling={isReconciling}
          isSelected={selectedTransactions.has(transaction.id)}
          onToggleSelect={onToggleSelect}
        />
      ))}
      {pagination && (
        <div className="px-4 md:px-6 py-4 border-t border-gray-200 dark:border-neutral-700">
          <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
            <span>
              Showing {transactions.length} of {pagination.total}
            </span>
            <span>
              Page {pagination.page} of {pagination.pages}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default TransactionList;
