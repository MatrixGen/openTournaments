import React from "react";
import {
  ClockIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
} from "@heroicons/react/24/outline";

const QuickActionsCards = ({ pendingCount, stuckCount, successRate, onSelectAllPending }) => {
  return (
    <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
      <button
        onClick={onSelectAllPending}
        disabled={pendingCount === 0}
        className="p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-xl text-left hover:bg-yellow-500/20 transition-colors disabled:opacity-50"
      >
        <div className="flex items-center space-x-3">
          <ClockIcon className="h-5 w-5 text-yellow-600 dark:text-yellow-500" />
          <div>
            <h4 className="text-sm font-medium text-gray-900 dark:text-white">
              Select All Pending
            </h4>
            <p className="text-xs text-yellow-600 dark:text-yellow-400">
              {pendingCount} pending
            </p>
          </div>
        </div>
      </button>

      <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl">
        <div className="flex items-center space-x-3">
          <ExclamationTriangleIcon className="h-5 w-5 text-red-600 dark:text-red-500" />
          <div>
            <h4 className="text-sm font-medium text-gray-900 dark:text-white">
              Stuck Transactions
            </h4>
            <p className="text-xs text-red-600 dark:text-red-400">
              {stuckCount} stuck for over 5 minutes
            </p>
          </div>
        </div>
      </div>

      <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-xl">
        <div className="flex items-center space-x-3">
          <CheckCircleIcon className="h-5 w-5 text-green-600 dark:text-green-500" />
          <div>
            <h4 className="text-sm font-medium text-gray-900 dark:text-white">
              Success Rate
            </h4>
            <p className="text-xs text-green-600 dark:text-green-400">
              {successRate || 0}% successful
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QuickActionsCards;
