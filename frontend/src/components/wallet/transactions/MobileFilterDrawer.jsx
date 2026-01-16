import React from "react";
import { MagnifyingGlassIcon } from "@heroicons/react/24/outline";
import FilterPopoverDrawer from "../../common/FilterPopoverDrawer";

const MobileFilterDrawer = ({
  isOpen,
  onClose,
  filters,
  onFilterChange,
  onReset,
  anchorRef,
}) => {
  const statusOptions = [
    { value: "all", label: "All Statuses" },
    { value: "pending", label: "Pending" },
    { value: "processing", label: "Processing" },
    { value: "completed", label: "Successful" },
    { value: "failed", label: "Failed" },
    { value: "cancelled", label: "Cancelled" },
  ];

  const typeOptions = [
    { value: "all", label: "All Types" },
    { value: "wallet_deposit", label: "Deposits" },
    { value: "wallet_withdrawal", label: "Withdrawals" },
    { value: "tournament_entry", label: "Tournament Entries" },
    { value: "prize_win", label: "Prize Wins" },
  ];

  return (
    <FilterPopoverDrawer
      isOpen={isOpen}
      onClose={onClose}
      anchorRef={anchorRef}
      title="Filters"
    >
      <div>
        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
          Transaction Type
        </label>
        <select
          value={filters.type}
          onChange={(e) => onFilterChange("type", e.target.value)}
          className="w-full bg-white dark:bg-neutral-700 border border-gray-300 dark:border-neutral-600 rounded-lg px-2.5 py-2 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
        >
          {typeOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
          Status
        </label>
        <select
          value={filters.status}
          onChange={(e) => onFilterChange("status", e.target.value)}
          className="w-full bg-white dark:bg-neutral-700 border border-gray-300 dark:border-neutral-600 rounded-lg px-2.5 py-2 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
        >
          {statusOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
          Period
        </label>
        <select
          value={filters.period}
          onChange={(e) => onFilterChange("period", e.target.value)}
          className="w-full bg-white dark:bg-neutral-700 border border-gray-300 dark:border-neutral-600 rounded-lg px-2.5 py-2 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
        >
          <option value="today">Today</option>
          <option value="week">This Week</option>
          <option value="month">This Month</option>
          <option value="year">This Year</option>
          <option value="all">All Time</option>
        </select>
      </div>

      <div className="pt-2 border-t border-gray-200 dark:border-neutral-700">
        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
          Search Reference
        </label>
        <div className="relative">
          <MagnifyingGlassIcon className="absolute left-2.5 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            value={filters.search || ""}
            onChange={(e) => onFilterChange("search", e.target.value)}
            placeholder="Search references..."
            className="w-full bg-white dark:bg-neutral-700 border border-gray-300 dark:border-neutral-600 rounded-lg pl-8 pr-3 py-2 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
        </div>
      </div>

      <div className="flex items-center justify-between pt-2">
        <button
          onClick={onReset}
          className="text-xs text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
        >
          Reset
        </button>
        <button
          onClick={onClose}
          className="px-3 py-1.5 bg-primary-600 text-white text-xs rounded-lg hover:bg-primary-700"
        >
          Done
        </button>
      </div>
    </FilterPopoverDrawer>
  );
};

export default MobileFilterDrawer;
