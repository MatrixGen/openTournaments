import React from "react";
import {
  ArrowPathIcon,
  ArrowDownTrayIcon,
  AdjustmentsHorizontalIcon,
  ChartBarIcon,
} from "@heroicons/react/24/outline";

const TransactionsHeader = ({
  loading,
  exporting,
  onRefresh,
  onExport,
  onOpenFilters,
  filterButtonRef,
  onToggleStats,
}) => {
  return (
    <div className="mb-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <button
            onClick={onOpenFilters}
            ref={filterButtonRef}
            className="md:hidden p-2.5 bg-white dark:bg-neutral-800 border border-gray-300 dark:border-neutral-700 rounded-lg text-gray-700 dark:text-gray-300"
          >
            <AdjustmentsHorizontalIcon className="h-5 w-5" />
          </button>

          <button
            onClick={onToggleStats}
            className="p-2.5 bg-white dark:bg-neutral-800 border border-gray-300 dark:border-neutral-700 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-neutral-700"
            title="Toggle stats"
          >
            <ChartBarIcon className="h-5 w-5" />
          </button>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={onRefresh}
            disabled={loading}
            className="inline-flex items-center px-3 md:px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50"
          >
            <ArrowPathIcon
              className={`h-4 w-4 mr-1 md:mr-2 ${loading ? "animate-spin" : ""}`}
            />
            <span className="hidden md:inline">Refresh</span>
          </button>

          <button
            onClick={onExport}
            disabled={exporting}
            className="hidden md:inline-flex items-center px-4 py-2 bg-white dark:bg-neutral-800 border border-gray-300 dark:border-neutral-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-neutral-700 transition-colors disabled:opacity-50"
          >
            <ArrowDownTrayIcon
              className={`h-4 w-4 mr-2 ${exporting ? "animate-spin" : ""}`}
            />
            Export
          </button>
        </div>
      </div>
    </div>
  );
};

export default TransactionsHeader;
