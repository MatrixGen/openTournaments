import React from "react";
import { formatCurrency as configFormatCurrency } from "../../config/currencyConfig";

const BalanceCard = ({ balance, currencyCode }) => {
  return (
    <div className="bg-white dark:bg-neutral-800 rounded-xl p-4 md:p-6 shadow border border-gray-200 dark:border-neutral-700">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500 dark:text-gray-400">Wallet Balance</p>
          <p className="text-2xl md:text-4xl font-bold text-gray-900 dark:text-white">
            {configFormatCurrency(balance || 0)}
          </p>
        </div>
        <span className="text-sm font-medium text-primary-600 dark:text-primary-400">
          {currencyCode}
        </span>
      </div>
    </div>
  );
};

export default BalanceCard;
