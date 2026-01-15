import React, { useEffect, useMemo, useRef, useState } from "react";
import { MagnifyingGlassIcon, XMarkIcon } from "@heroicons/react/24/outline";

const AUTO_CLOSE_MS = 6000;
const POPOVER_WIDTH = 320;
const TRANSITION_MS = 180;

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

  const timerRef = useRef(null);
  const [isVisible, setIsVisible] = useState(false);
  const [shouldRender, setShouldRender] = useState(false);

  const anchorRect = useMemo(() => {
    if (!anchorRef?.current) return null;
    return anchorRef.current.getBoundingClientRect();
  }, [anchorRef, isOpen]);

  useEffect(() => {
    if (isOpen) {
      setShouldRender(true);
      requestAnimationFrame(() => setIsVisible(true));
    } else if (shouldRender) {
      setIsVisible(false);
      const hideTimer = setTimeout(() => {
        setShouldRender(false);
      }, TRANSITION_MS);
      return () => clearTimeout(hideTimer);
    }
    return undefined;
  }, [isOpen, shouldRender]);

  useEffect(() => {
    if (!isOpen) return;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      onClose();
    }, AUTO_CLOSE_MS);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [isOpen, onClose]);

  if (!shouldRender) return null;

  const positionStyle = anchorRect
    ? {
        top: Math.min(anchorRect.bottom + 8, window.innerHeight - 16),
        left: Math.min(
          Math.max(anchorRect.left, 16),
          window.innerWidth - POPOVER_WIDTH - 16
        ),
      }
    : { top: 72, left: 16 };

  return (
    <div className="fixed inset-0 z-50 md:hidden pointer-events-none">
      <div
        className={`absolute w-[90vw] max-w-sm bg-white dark:bg-neutral-800 shadow-xl rounded-xl border border-gray-200 dark:border-neutral-700 pointer-events-auto transition-all duration-200 ease-out origin-top-left ${
          isVisible ? "opacity-100 scale-100" : "opacity-0 scale-95"
        }`}
        style={positionStyle}
        onMouseMove={() => {
          if (timerRef.current) clearTimeout(timerRef.current);
          timerRef.current = setTimeout(onClose, AUTO_CLOSE_MS);
        }}
        onKeyDown={() => {
          if (timerRef.current) clearTimeout(timerRef.current);
          timerRef.current = setTimeout(onClose, AUTO_CLOSE_MS);
        }}
      >
        <div className="px-4 py-3 border-b border-gray-200 dark:border-neutral-700 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Filters</h3>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-white"
          >
            <XMarkIcon className="h-4 w-4" />
          </button>
        </div>

        <div className="px-4 py-3 space-y-3">
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
        </div>
      </div>
    </div>
  );
};

export default MobileFilterDrawer;
