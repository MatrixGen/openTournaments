import React from "react";

const DepositValidation = ({
  validationResult,
  onClear,
  onSubmit,
  isLoading,
}) => {
  if (!validationResult?.valid) return null;

  return (
    <div className="bg-white dark:bg-neutral-800 rounded-xl p-4 md:p-6 border border-gray-200 dark:border-neutral-700 shadow-lg">
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-sm text-gray-500 dark:text-gray-400">Validated</p>
          <p className="text-base font-semibold text-gray-900 dark:text-white">
            {validationResult.message || "Ready to proceed"}
          </p>
        </div>
        <button
          type="button"
          onClick={onClear}
          className="text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700"
        >
          Change
        </button>
      </div>

      <button
        type="button"
        onClick={onSubmit}
        disabled={isLoading}
        className="w-full inline-flex items-center justify-center px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg text-base font-semibold hover:from-green-600 hover:to-emerald-700 transition-all disabled:opacity-50"
      >
        {isLoading ? "Processing..." : "Deposit"}
      </button>
    </div>
  );
};

export default DepositValidation;
