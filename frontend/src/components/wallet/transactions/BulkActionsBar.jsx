import React from "react";
import { ArrowPathIcon } from "@heroicons/react/24/outline";

const BulkActionsBar = ({
  selectedCount,
  onClear,
  onBatchReconcile,
  batchReconciling,
  className,
}) => {
  if (selectedCount === 0) return null;

  return (
    <div className={`mb-6 bg-gradient-to-r from-blue-500/10 to-blue-600/10 dark:from-blue-500/20 dark:to-blue-600/20 border border-blue-500/30 rounded-xl p-4 ${className || ""}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-blue-500/20 rounded-lg">
            <ArrowPathIcon className="h-5 w-5 text-blue-600 dark:text-blue-500" />
          </div>
          <div>
            <h3 className="text-sm font-medium text-gray-900 dark:text-white">
              {selectedCount} transaction(s) selected
            </h3>
            <p className="text-xs text-blue-600 dark:text-blue-400">
              Ready for batch operations
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={onClear}
            className="px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
          >
            Clear
          </button>

          <button
            onClick={onBatchReconcile}
            disabled={batchReconciling}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            <ArrowPathIcon
              className={`h-4 w-4 mr-2 ${batchReconciling ? "animate-spin" : ""}`}
            />
            Reconcile {selectedCount}
          </button>
        </div>
      </div>
    </div>
  );
};

export default BulkActionsBar;
