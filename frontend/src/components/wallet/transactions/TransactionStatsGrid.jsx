import React from "react";
import {
  DocumentDuplicateIcon,
  CurrencyDollarIcon,
  ClockIcon,
  CheckCircleIcon,
} from "@heroicons/react/24/outline";
import { formatCurrency } from "../../../utils/formatters";

const TransactionStatsGrid = ({ stats }) => {
  if (!stats) return null;

  const statCards = [
    {
      title: "Total",
      value: stats.total_transactions,
      change: stats.transactions_change,
      icon: DocumentDuplicateIcon,
      color: "bg-blue-100 dark:bg-blue-900/20",
      iconColor: "text-blue-600 dark:text-blue-400",
    },
    {
      title: "Volume",
      value: formatCurrency(stats.total_volume),
      change: stats.volume_change,
      icon: CurrencyDollarIcon,
      color: "bg-green-100 dark:bg-green-900/20",
      iconColor: "text-green-600 dark:text-green-400",
    },
    {
      title: "Pending",
      value: stats.pending_transactions,
      change: null,
      icon: ClockIcon,
      color: "bg-yellow-100 dark:bg-yellow-900/20",
      iconColor: "text-yellow-600 dark:text-yellow-400",
    },
    {
      title: "Success Rate",
      value: `${stats.success_rate}%`,
      change: stats.success_rate_change,
      icon: CheckCircleIcon,
      color: "bg-emerald-100 dark:bg-emerald-900/20",
      iconColor: "text-emerald-600 dark:text-emerald-400",
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-6">
      {statCards.map((stat) => (
        <div
          key={stat.title}
          className="bg-white dark:bg-neutral-800 rounded-xl p-3 md:p-4 border border-gray-200 dark:border-neutral-700"
        >
          <div className="flex items-center justify-between mb-2">
            <div className={`p-1.5 md:p-2 rounded-lg ${stat.color}`}>
              <stat.icon className={`h-4 w-4 md:h-5 md:w-5 ${stat.iconColor}`} />
            </div>
            {stat.change !== null && (
              <span
                className={`text-xs font-medium ${
                  stat.change >= 0
                    ? "text-green-600 dark:text-green-400"
                    : "text-red-600 dark:text-red-400"
                }`}
              >
                {stat.change >= 0 ? "+" : ""}
                {stat.change}%
              </span>
            )}
          </div>
          <div>
            <p className="text-lg md:text-2xl font-bold text-gray-900 dark:text-white truncate">
              {stat.value}
            </p>
            <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400 truncate">
              {stat.title}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
};

export default TransactionStatsGrid;
