import React from "react";
import { formatCurrency as configFormatCurrency } from "../../config/currencyConfig";

const WithdrawalForm = ({
  form,
  selectedMethod,
  settings,
  currencySymbol,
  isLoading,
  isValid,
  onSubmit,
  showBankFields,
  showMobileFields,
}) => {
  const { register, setValue, trigger, formState } = form;
  const { errors } = formState;

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <div>
        <label
          htmlFor="amount"
          className="block text-base font-medium text-gray-900 dark:text-white mb-2"
        >
          Amount
        </label>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <span className="text-gray-500 dark:text-gray-400 text-base">
              {currencySymbol}
            </span>
          </div>
          <input
            type="number"
            id="amount"
            step={settings.withdrawalStep}
            min={
              selectedMethod === "bank_transfer"
                ? settings.minBankWithdrawal
                : settings.minMobileMoneyWithdrawal
            }
            max={
              selectedMethod === "bank_transfer"
                ? settings.maxBankWithdrawal
                : settings.maxMobileMoneyWithdrawal
            }
            {...register("amount", { valueAsNumber: true })}
            className="block w-full pl-10 rounded-lg border border-gray-300 dark:border-neutral-600 bg-white dark:bg-neutral-700 py-3 px-4 text-gray-900 dark:text-white focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
            placeholder={settings.minMobileMoneyWithdrawal.toString()}
          />
        </div>
        {errors.amount && (
          <p className="mt-2 text-sm text-red-500">{errors.amount.message}</p>
        )}
        <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
          {selectedMethod === "bank_transfer"
            ? `Min ${configFormatCurrency(settings.minBankWithdrawal)} • Max ${configFormatCurrency(settings.maxBankWithdrawal)}`
            : `Min ${configFormatCurrency(settings.minMobileMoneyWithdrawal)} • Max ${configFormatCurrency(settings.maxMobileMoneyWithdrawal)}`}
        </p>
      </div>

      {showMobileFields && selectedMethod === "mobile_money" && (
        <div>
          <label
            htmlFor="phoneNumber"
            className="block text-base font-medium text-gray-900 dark:text-white mb-2"
          >
            Mobile Money Phone Number
          </label>
          <div className="flex rounded-lg shadow-sm">
            <span className="inline-flex items-center rounded-l-lg border border-r-0 border-gray-300 dark:border-neutral-600 bg-gray-50 dark:bg-neutral-700 px-3 text-gray-600 dark:text-gray-300 text-base">
              +255
            </span>
            <input
              type="tel"
              id="phoneNumber"
              {...register("phoneNumber")}
              onChange={(e) => {
                const value = e.target.value.replace(/[^0-9]/g, "").slice(0, 9);
                setValue("phoneNumber", value, { shouldValidate: true });
                trigger("phoneNumber");
              }}
              placeholder="712345678"
              className="block w-full rounded-r-lg border border-gray-300 dark:border-neutral-600 bg-white dark:bg-neutral-700 py-3 px-4 text-gray-900 dark:text-white placeholder-gray-400 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          {errors.phoneNumber && (
            <p className="mt-2 text-sm text-red-500">{errors.phoneNumber.message}</p>
          )}
          <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
            Enter your phone number without country code.
          </p>
        </div>
      )}

      {showBankFields && selectedMethod === "bank_transfer" && (
        <div className="space-y-4">
          <div>
            <label
              htmlFor="accountNumber"
              className="block text-base font-medium text-gray-900 dark:text-white mb-2"
            >
              Bank Account Number
            </label>
            <input
              type="text"
              id="accountNumber"
              {...register("accountNumber")}
              className="block w-full rounded-lg border border-gray-300 dark:border-neutral-600 bg-white dark:bg-neutral-700 py-3 px-4 text-gray-900 dark:text-white placeholder-gray-400 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
              placeholder="1234567890"
            />
            {errors.accountNumber && (
              <p className="mt-2 text-sm text-red-500">{errors.accountNumber.message}</p>
            )}
          </div>

          <div>
            <label
              htmlFor="accountName"
              className="block text-base font-medium text-gray-900 dark:text-white mb-2"
            >
              Account Holder Name
            </label>
            <input
              type="text"
              id="accountName"
              {...register("accountName")}
              className="block w-full rounded-lg border border-gray-300 dark:border-neutral-600 bg-white dark:bg-neutral-700 py-3 px-4 text-gray-900 dark:text-white placeholder-gray-400 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
              placeholder="John Doe"
            />
            {errors.accountName && (
              <p className="mt-2 text-sm text-red-500">{errors.accountName.message}</p>
            )}
          </div>
        </div>
      )}

      <button
        type="submit"
        disabled={isLoading || !isValid}
        className="w-full inline-flex items-center justify-center px-6 py-3 bg-gradient-to-r from-primary-500 to-primary-600 text-white rounded-lg text-base font-semibold hover:from-primary-600 hover:to-primary-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isLoading ? "Generating Preview..." : "Preview Withdrawal"}
      </button>
    </form>
  );
};

export default WithdrawalForm;
