
import { 
  formatPhoneDisplay, 
  formatDate,
  // Remove formatCurrency import from here
} from "../../utils/formatters";
import {
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  ArrowPathIcon,
  ExclamationTriangleIcon,
  
  ExclamationCircleIcon,
  
} from "@heroicons/react/24/outline";

// Import currency configuration
import { 
  
  
  formatCurrency as configFormatCurrency,
  isMobileMoneySupported 
} from "../../config/currencyConfig";

import StatusBadge from "../../components/payments/StatusBadge";


// Enhanced Deposit Status Display Component - Mobile Optimized
const DepositStatusDisplay = ({
  status,
  orderReference,
}) => {
  if (!status) return null;

  const getStatusIcon = () => {
    switch (status.deposit_status) {
      case "successful":
        return <CheckCircleIcon className="h-6 w-6 md:h-8 md:w-8 text-green-500" />;
      case "failed":
        return <XCircleIcon className="h-6 w-6 md:h-8 md:w-8 text-red-500" />;
      case "cancelled":
        return <XCircleIcon className="h-6 w-6 md:h-8 md:w-8 text-gray-500" />;
      case "expired":
        return <ExclamationTriangleIcon className="h-6 w-6 md:h-8 md:w-8 text-orange-500" />;
      default:
        return <ClockIcon className="h-6 w-6 md:h-8 md:w-8 text-yellow-500 animate-pulse" />;
    }
  };

  const getStatusMessage = () => {
    switch (status.deposit_status) {
      case "successful":
        return "Deposit completed successfully!";
      case "failed":
        return "Deposit failed. Please try again.";
      case "cancelled":
        return "Deposit was cancelled.";
      case "expired":
        return "Deposit request expired. Please initiate a new one.";
      case "processing":
        return "Payment is being processed. Check your payment method.";
      case "pending":
        return "Waiting for payment confirmation...";
      default:
        return isMobileMoneySupported() 
          ? "Deposit initiated. Check your phone for USSD prompt." 
          : "Deposit initiated. Check your payment method.";
    }
  };

  const getPaymentAge = () => {
    if (!status.created_at) return null;
    const created = new Date(status.created_at);
    const now = new Date();
    const diffMinutes = Math.floor((now - created) / (1000 * 60));
    return diffMinutes;
  };

  const paymentAge = getPaymentAge();
  const isStuck = paymentAge > 5 && ["pending", "processing", "initiated"].includes(status.deposit_status);

  return (
    <div className="bg-white dark:bg-neutral-800 rounded-xl p-4 md:p-6 mb-6 border border-gray-200 dark:border-neutral-700 shadow-lg">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center space-x-3 md:space-x-4 flex-1 min-w-0">
          <div className="p-1.5 md:p-2 bg-gray-100 dark:bg-neutral-700 rounded-lg flex-shrink-0">
            {getStatusIcon()}
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-base md:text-lg font-semibold text-gray-900 dark:text-gray-900 dark:text-white truncate">
              Deposit Status
            </h3>
            <div className="flex flex-wrap items-center gap-2 mt-1">
              <StatusBadge status={status.deposit_status} />
              <p className="text-xs md:text-sm text-gray-600 dark:text-gray-300 truncate">
                {getStatusMessage()}
              </p>
            </div>
            {paymentAge !== null && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Initiated {paymentAge} minute{paymentAge !== 1 ? 's' : ''} ago
              </p>
            )}
          </div>
        </div>
      </div>

      {isStuck && (
        <div className="mb-4 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
          <div className="flex items-center space-x-2">
            <ExclamationTriangleIcon className="h-4 w-4 md:h-5 md:w-5 text-yellow-500 flex-shrink-0" />
            <p className="text-xs md:text-sm text-yellow-700 dark:text-yellow-300 flex-1">
              This payment has been pending for {paymentAge} minutes. You can force update the status.
            </p>
          </div>
        </div>
      )}

      {orderReference && (
        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-neutral-700">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
            <div className="bg-gray-50 dark:bg-neutral-700/30 p-3 rounded-lg">
              <p className="text-xs text-gray-500 dark:text-gray-400">Reference</p>
              <p className="text-xs md:text-sm text-gray-900 dark:text-gray-900 dark:text-white font-mono truncate mt-1">
                {orderReference}
              </p>
            </div>
            <div className="bg-gray-50 dark:bg-neutral-700/30 p-3 rounded-lg">
              <p className="text-xs text-gray-500 dark:text-gray-400">Amount</p>
              <p className="text-xl md:text-2xl font-bold text-gray-900 dark:text-gray-900 dark:text-white mt-1">
                {configFormatCurrency(status.display_amount || 0,'TZS')}
              </p>
            </div>
           
          </div>
          
          {status.phone_number && isMobileMoneySupported() && (
            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
              <div className="bg-gray-50 dark:bg-neutral-700/30 p-3 rounded-lg">
                <p className="text-xs text-gray-500 dark:text-gray-400">Phone Number</p>
                <p className="text-sm text-gray-900 dark:text-gray-900 dark:text-white mt-1">
                  {formatPhoneDisplay(status.phone_number)}
                </p>
              </div>
              {status.created_at && (
                <div className="bg-gray-50 dark:bg-neutral-700/30 p-3 rounded-lg">
                  <p className="text-xs text-gray-500 dark:text-gray-400">Initiated At</p>
                  <p className="text-sm text-gray-900 dark:text-gray-900 dark:text-white mt-1">
                    {formatDate(status.created_at)}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default DepositStatusDisplay