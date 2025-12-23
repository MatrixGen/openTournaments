
import {
  CheckCircleIcon,
  
  ExclamationTriangleIcon,
  CheckIcon,
  BanknotesIcon,
  DevicePhoneMobileIcon,
  UserCircleIcon,
  
  CurrencyDollarIcon,
} from "@heroicons/react/24/outline";

// Import currency configuration
import { 
  
  
  isMobileMoneySupported 
} from "../../config/currencyConfig";




// Validation Result Display Component - Mobile Optimized
const ValidationResultDisplay = ({
  validationResult,
  selectedMethod,
  onSelectMethod,
  onClearValidation,
}) => {
  if (!validationResult?.valid) return null;

  const { available_methods = [], sender_details, message } = validationResult;

  return (
    <div className="bg-white dark:bg-neutral-800 rounded-xl p-4 md:p-6 mb-6 border border-gray-200 dark:border-neutral-700 shadow-lg">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2 md:space-x-3 flex-1 min-w-0">
          <div className="p-1.5 md:p-2 bg-green-500/20 rounded-lg flex-shrink-0">
            <CheckCircleIcon className="h-4 w-4 md:h-6 md:w-6 text-green-500" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-sm md:text-lg font-semibold text-gray-900 dark:text-white truncate">
              {isMobileMoneySupported() ? 'Phone Verified ✓' : 'Payment Method Verified ✓'}
            </h3>
            <p className="text-xs md:text-sm text-gray-600 dark:text-gray-400 truncate">
              {message}
            </p>
          </div>
        </div>
        <button
          onClick={onClearValidation}
          className="text-xs md:text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 ml-2 flex-shrink-0"
        >
          Change
        </button>
      </div>

      {sender_details && (
        <div className="mb-4 md:mb-6 p-3 md:p-4 bg-gray-50 dark:bg-neutral-700/50 rounded-lg">
          <div className="flex items-center space-x-2 md:space-x-3 mb-2 md:mb-3">
            <UserCircleIcon className="h-4 w-4 md:h-5 md:w-5 text-primary-500 dark:text-primary-400" />
            <h4 className="text-xs md:text-sm font-medium text-gray-900 dark:text-white">Account Details</h4>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 md:gap-3">
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">Account Name</p>
              <p className="text-sm text-gray-900 dark:text-white font-medium truncate">
                {sender_details.accountName}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">Provider</p>
              <p className="text-sm text-gray-900 dark:text-white font-medium">
                {sender_details.accountProvider}
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="mb-4">
        <div className="flex items-center space-x-2 md:space-x-3 mb-3 md:mb-4">
          <BanknotesIcon className="h-4 w-4 md:h-5 md:w-5 text-primary-500 dark:text-primary-400" />
          <h4 className="text-xs md:text-sm font-medium text-gray-900 dark:text-white">
            Available Payment Methods
          </h4>
        </div>

        {available_methods.length === 0 ? (
          <div className="text-center py-4">
            <ExclamationTriangleIcon className="h-6 w-6 md:h-8 md:w-8 text-yellow-500 mx-auto mb-2" />
            <p className="text-sm text-gray-600 dark:text-gray-400">
              No payment methods available
            </p>
          </div>
        ) : (
          <div className="space-y-2 md:space-y-3">
            {available_methods.map((method) => (
              <button
                key={method.name}
                type="button"
                onClick={() => onSelectMethod(method)}
                className={`w-full p-3 md:p-4 rounded-lg md:rounded-xl border transition-all duration-200 text-left ${
                  selectedMethod?.name === method.name
                    ? "border-primary-500 bg-primary-50 dark:bg-primary-900/20 shadow-sm md:shadow-lg"
                    : "border-gray-200 dark:border-neutral-600 hover:border-gray-300 dark:hover:border-neutral-500 bg-gray-50 dark:bg-neutral-800"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2 md:space-x-3 min-w-0">
                    {method.type === 'mobile' ? (
                      <DevicePhoneMobileIcon className="h-4 w-4 md:h-6 md:w-6 text-primary-500 dark:text-primary-400 flex-shrink-0" />
                    ) : (
                      <CurrencyDollarIcon className="h-4 w-4 md:h-6 md:w-6 text-primary-500 dark:text-primary-400 flex-shrink-0" />
                    )}
                    <div className="min-w-0">
                      <h4 className="text-sm md:text-base font-semibold text-gray-900 dark:text-white truncate">
                        {method.name}
                      </h4>
                      <div className="flex items-center space-x-1 md:space-x-2 mt-0.5">
                        <span
                          className={`px-1.5 py-0.5 md:px-2 md:py-1 rounded-full text-xs font-medium ${
                            method.status === "AVAILABLE"
                              ? "bg-green-500/20 text-green-600 dark:text-green-400"
                              : "bg-yellow-500/20 text-yellow-600 dark:text-yellow-400"
                          }`}
                        >
                          {method.status}
                        </span>
                      </div>
                    </div>
                  </div>
                  {selectedMethod?.name === method.name && (
                    <CheckIcon className="h-4 w-4 md:h-5 md:w-5 text-primary-500 dark:text-primary-400 flex-shrink-0" />
                  )}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ValidationResultDisplay