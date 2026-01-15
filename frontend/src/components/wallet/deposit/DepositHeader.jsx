import React from "react";

const DepositHeader = ({ currencyCode, currencyName, subtitle }) => {
  return (
    <div className="text-center mb-6">
      <h1 className="text-2xl md:text-4xl font-bold text-gray-900 dark:text-white">
        Deposit Funds
      </h1>
      <div className="flex items-center justify-center mt-3">
        <span className="inline-flex items-center px-3 py-1 rounded-full bg-primary-100 dark:bg-primary-900/30 text-primary-800 dark:text-primary-300 text-sm font-medium">
          {currencyCode} - {currencyName}
        </span>
      </div>
      {subtitle && (
        <p className="text-sm md:text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto px-4 mt-3">
          {subtitle}
        </p>
      )}
    </div>
  );
};

export default DepositHeader;
