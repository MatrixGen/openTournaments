import React from "react";
import {
  ArrowDownTrayIcon,
  ChevronUpIcon,
  UsersIcon,
  CurrencyDollarIcon,
  ArrowPathIcon,
  GiftIcon,
  DocumentDuplicateIcon,
} from "@heroicons/react/24/outline";

const typeConfig = {
  wallet_deposit: {
    color: "bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300",
    text: "Deposit",
    icon: ArrowDownTrayIcon,
  },
  wallet_withdrawal: {
    color: "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300",
    text: "Withdrawal",
    icon: ChevronUpIcon,
  },
  tournament_entry: {
    color: "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300",
    text: "Tournament",
    icon: UsersIcon,
  },
  prize_win: {
    color: "bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-300",
    text: "Prize",
    icon: CurrencyDollarIcon,
  },
  refund: {
    color: "bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-300",
    text: "Refund",
    icon: ArrowPathIcon,
  },
  bonus: {
    color: "bg-pink-100 text-pink-800 dark:bg-pink-900/20 dark:text-pink-300",
    text: "Bonus",
    icon: GiftIcon,
  },
};

const TransactionTypeBadge = ({ type }) => {
  const config = typeConfig[type] || {
    color: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300",
    text: type,
    icon: DocumentDuplicateIcon,
  };
  const Icon = config.icon;

  return (
    <span
      className={`inline-flex items-center px-1.5 py-0.5 md:px-2 md:py-1 rounded-md text-xs font-medium ${config.color}`}
    >
      <Icon className="h-3 w-3 mr-1" />
      {config.text}
    </span>
  );
};

export default TransactionTypeBadge;
