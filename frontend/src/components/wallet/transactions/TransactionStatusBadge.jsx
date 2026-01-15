import React from "react";

const statusConfig = {
  initiated: {
    color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300",
    text: "Initiated",
  },
  pending: {
    color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300",
    text: "Pending",
  },
  processing: {
    color: "bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300",
    text: "Processing",
  },
  completed: {
    color: "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300",
    text: "Successful",
  },
  successful: {
    color: "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300",
    text: "Successful",
  },
  failed: {
    color: "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300",
    text: "Failed",
  },
  cancelled: {
    color: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300",
    text: "Cancelled",
  },
  expired: {
    color: "bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-300",
    text: "Expired",
  },
  refunded: {
    color: "bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-300",
    text: "Refunded",
  },
  reversed: {
    color: "bg-pink-100 text-pink-800 dark:bg-pink-900/20 dark:text-pink-300",
    text: "Reversed",
  },
};

const TransactionStatusBadge = ({ status }) => {
  const config = statusConfig[status] || statusConfig.pending;
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 md:px-3 md:py-1 rounded-full text-xs font-medium ${config.color}`}
    >
      {config.text}
    </span>
  );
};

export default TransactionStatusBadge;
