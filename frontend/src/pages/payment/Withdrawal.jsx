// pages/wallet/Withdrawal.jsx
import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { payoutService } from "../../services/payoutService";
import { useAuth } from "../../contexts/AuthContext";
import Banner from "../../components/common/Banner";
import { 
  formatPhoneDisplay, 
  
} from "../../utils/formatters";
import {
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  ArrowPathIcon,
  ExclamationTriangleIcon,
  CheckIcon,
  BanknotesIcon,
  DevicePhoneMobileIcon,
  UserCircleIcon,
  InformationCircleIcon,
  ExclamationCircleIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  BuildingLibraryIcon,
  CurrencyDollarIcon,
  ArrowDownTrayIcon,
} from "@heroicons/react/24/outline";

// Import currency configuration
import { 
  getCurrentCurrency, 
  getCurrencyConfig, 
  formatCurrency as configFormatCurrency,
  getQuickAmounts,
  isMobileMoneySupported,
  getWithdrawalSettings,
  getWithdrawalFee,
  getProcessingTime,
} from "../../config/currencyConfig";
import PreviewResultDisplay from "../../components/payments/PreviewResultDisplay";

// Get current currency settings
const CURRENT_CURRENCY = getCurrentCurrency();
const CURRENCY_SETTINGS = getCurrencyConfig();
const WITHDRAWAL_SETTINGS = getWithdrawalSettings();

// Dynamic withdrawal schemas based on currency and method
const createMobileMoneyWithdrawalSchema = () => {
  return z.object({
    amount: z
      .number()
      .min(
        WITHDRAWAL_SETTINGS.minMobileMoneyWithdrawal, 
        `Minimum withdrawal is ${configFormatCurrency(WITHDRAWAL_SETTINGS.minMobileMoneyWithdrawal)}`
      )
      .max(
        WITHDRAWAL_SETTINGS.maxMobileMoneyWithdrawal, 
        `Maximum withdrawal is ${configFormatCurrency(WITHDRAWAL_SETTINGS.maxMobileMoneyWithdrawal)}`
      )
      .refine((val) => val % WITHDRAWAL_SETTINGS.withdrawalStep === 0, {
        message: `Amount must be in multiples of ${configFormatCurrency(WITHDRAWAL_SETTINGS.withdrawalStep)}`,
      }),
    ...(isMobileMoneySupported() ? {
      phoneNumber: z
        .string()
        .min(9, "Phone number must be at least 9 digits")
        .max(12, "Phone number is too long")
        .regex(/^[0-9]+$/, "Phone number must contain only digits")
        .transform((val) => {
          // Add country code based on currency/region
          if (CURRENT_CURRENCY.code === 'TZS') {
            if (!val.startsWith("255")) {
              if (val.startsWith("0")) {
                return `255${val.slice(1)}`;
              }
              return `255${val}`;
            }
          } else if (CURRENT_CURRENCY.code === 'KES') {
            if (!val.startsWith("254")) {
              if (val.startsWith("0")) {
                return `254${val.slice(1)}`;
              }
              return `254${val}`;
            }
          }
          return val;
        }),
    } : {}),
  });
};

const createBankWithdrawalSchema = () => {
  return z.object({
    amount: z
      .number()
      .min(
        WITHDRAWAL_SETTINGS.minBankWithdrawal, 
        `Minimum bank withdrawal is ${configFormatCurrency(WITHDRAWAL_SETTINGS.minBankWithdrawal)}`
      )
      .max(
        WITHDRAWAL_SETTINGS.maxBankWithdrawal, 
        `Maximum withdrawal is ${configFormatCurrency(WITHDRAWAL_SETTINGS.maxBankWithdrawal)}`
      )
      .refine((val) => val % WITHDRAWAL_SETTINGS.withdrawalStep === 0, {
        message: `Amount must be in multiples of ${configFormatCurrency(WITHDRAWAL_SETTINGS.withdrawalStep)}`,
      }),
    accountNumber: z
      .string()
      .min(5, "Account number must be at least 5 digits")
      .max(20, "Account number is too long"),
    accountName: z
      .string()
      .min(2, "Account name must be at least 2 characters")
      .max(100, "Account name is too long"),
    ...(CURRENT_CURRENCY.code === 'USD' ? {
      bic: z
        .string()
        .optional()
        .refine((val) => !val || val.length >= 8, {
          message: "BIC must be at least 8 characters if provided",
        }),
    } : {}),
  });
};

// Status badge component - Mobile Optimized (same as before, but with USD compatibility)
const StatusBadge = ({ status }) => {
  const statusConfig = {
    previewed: { 
      color: "bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300", 
      text: "Previewed", 
      icon: InformationCircleIcon 
    },
    initiated: { 
      color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300", 
      text: "Initiated", 
      icon: ClockIcon 
    },
    authorized: { 
      color: "bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-300", 
      text: "Authorized", 
      icon: CheckCircleIcon 
    },
    processing: { 
      color: "bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300", 
      text: "Processing", 
      icon: ArrowPathIcon 
    },
    pending: { 
      color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300", 
      text: "Pending", 
      icon: ClockIcon 
    },
    successful: { 
      color: "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300", 
      text: "Successful", 
      icon: CheckCircleIcon 
    },
    failed: { 
      color: "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300", 
      text: "Failed", 
      icon: XCircleIcon 
    },
    cancelled: { 
      color: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300", 
      text: "Cancelled", 
      icon: XCircleIcon 
    },
    reversed: { 
      color: "bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-300", 
      text: "Reversed", 
      icon: ArrowPathIcon 
    },
    refunded: { 
      color: "bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300", 
      text: "Refunded", 
      icon: ArrowPathIcon 
    },
  };

  const config = statusConfig[status] || statusConfig.pending;
  const Icon = config.icon;

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 md:px-3 md:py-1 rounded-full text-xs md:text-sm font-medium ${config.color}`}
    >
      <Icon className="h-3 w-3 md:h-4 md:w-4 mr-1" />
      {config.text}
    </span>
  );
};

// Enhanced Withdrawal Status Display Component - Mobile Optimized
const WithdrawalStatusDisplay = ({
  status,
  orderReference,
  withdrawalMethod,
  recipientDetails,
  onCancel,
  onReconcile,
  isCancelling,
  isReconciling,
  user,
}) => {
  if (!status) return null;

  const getStatusIcon = () => {
    switch (status) {
      case "successful":
        return <CheckCircleIcon className="h-6 w-6 md:h-8 md:w-8 text-green-500" />;
      case "failed":
      case "cancelled":
        return <XCircleIcon className="h-6 w-6 md:h-8 md:w-8 text-red-500" />;
      case "reversed":
      case "refunded":
        return <ArrowPathIcon className="h-6 w-6 md:h-8 md:w-8 text-blue-500" />;
      default:
        return <ClockIcon className="h-6 w-6 md:h-8 md:w-8 text-yellow-500 animate-pulse" />;
    }
  };

  const getStatusMessage = () => {
    switch (status) {
      case "successful":
        return "Withdrawal completed successfully!";
      case "failed":
        return "Withdrawal failed. Please try again.";
      case "cancelled":
        return "Withdrawal was cancelled.";
      case "reversed":
        return "Withdrawal was reversed.";
      case "refunded":
        return "Withdrawal was refunded.";
      case "processing":
        return "Withdrawal is being processed.";
      case "pending":
      case "initiated":
        return "Withdrawal initiated. Processing...";
      case "authorized":
        return "Withdrawal authorized. Processing...";
      default:
        return "Withdrawal in progress...";
    }
  };

  const isCancellable = ["previewed", "pending", "processing", "initiated", "authorized"].includes(status);

  const getMethodDisplay = () => {
    switch (withdrawalMethod) {
      case "mobile_money_payout":
        return "Mobile Money";
      case "bank_payout":
        return "Bank Transfer";
      default:
        return "Withdrawal";
    }
  };

  const methodIcon = withdrawalMethod === "mobile_money_payout" ? 
    <DevicePhoneMobileIcon className="h-4 w-4 text-blue-500" /> : 
    <BuildingLibraryIcon className="h-4 w-4 text-green-500" />;

  return (
    <div className="bg-white dark:bg-neutral-800 rounded-xl p-4 md:p-6 mb-6 border border-gray-200 dark:border-neutral-700 shadow-lg">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center space-x-3 md:space-x-4 flex-1 min-w-0">
          <div className="p-1.5 md:p-2 bg-gray-100 dark:bg-neutral-700 rounded-lg flex-shrink-0">
            {getStatusIcon()}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center space-x-2 mb-1">
              <span className="text-xs md:text-sm text-gray-500 dark:text-gray-400">
                {getMethodDisplay()}
              </span>
              <StatusBadge status={status} />
            </div>
            <h3 className="text-base md:text-lg font-semibold text-gray-900 dark:text-gray-900 dark:text-white truncate">
              Withdrawal Status
            </h3>
            <p className="text-xs md:text-sm text-gray-600 dark:text-gray-300 truncate">
              {getStatusMessage()}
            </p>
          </div>
        </div>
      </div>

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
              <p className="text-xs text-gray-500 dark:text-gray-400">Method</p>
              <div className="flex items-center space-x-2 mt-1">
                {methodIcon}
                <p className="text-sm text-gray-900 dark:text-gray-900 dark:text-white font-medium">
                  {getMethodDisplay()}
                </p>
              </div>
            </div>
            {user && (
              <div className="bg-gray-50 dark:bg-neutral-700/30 p-3 rounded-lg">
                <p className="text-xs text-gray-500 dark:text-gray-400">Current Balance</p>
                <p className="text-xl md:text-2xl font-bold text-green-600 dark:text-green-500 mt-1">
                  {configFormatCurrency(user.wallet_balance || 0,'USD')}
                </p>
              </div>
            )}
          </div>
          
          {recipientDetails && (
            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
              {recipientDetails.phone_number && (
                <div className="bg-gray-50 dark:bg-neutral-700/30 p-3 rounded-lg">
                  <p className="text-xs text-gray-500 dark:text-gray-400">Phone Number</p>
                  <p className="text-sm text-gray-900 dark:text-gray-900 dark:text-white mt-1">
                    {formatPhoneDisplay(recipientDetails.phone_number)}
                  </p>
                </div>
              )}
              {recipientDetails.account_number && (
                <div className="bg-gray-50 dark:bg-neutral-700/30 p-3 rounded-lg">
                  <p className="text-xs text-gray-500 dark:text-gray-400">Account Number</p>
                  <p className="text-sm text-gray-900 dark:text-gray-900 dark:text-white font-mono truncate mt-1">
                    {recipientDetails.account_number}
                  </p>
                </div>
              )}
              {recipientDetails.account_name && (
                <div className="bg-gray-50 dark:bg-neutral-700/30 p-3 rounded-lg">
                  <p className="text-xs text-gray-500 dark:text-gray-400">Account Name</p>
                  <p className="text-sm text-gray-900 dark:text-gray-900 dark:text-white font-medium truncate mt-1">
                    {recipientDetails.account_name}
                  </p>
                </div>
              )}
              {recipientDetails.bic && (
                <div className="bg-gray-50 dark:bg-neutral-700/30 p-3 rounded-lg">
                  <p className="text-xs text-gray-500 dark:text-gray-400">BIC Code</p>
                  <p className="text-sm text-gray-900 dark:text-gray-900 dark:text-white font-mono truncate mt-1">
                    {recipientDetails.bic}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Action buttons - Mobile optimized */}
          <div className="mt-4 flex flex-wrap gap-2">
            {isCancellable && (
              <button
                onClick={() => onCancel(orderReference)}
                disabled={isCancelling}
                className="flex-1 min-w-[140px] inline-flex items-center justify-center px-3 py-2 border border-red-600 text-red-600 dark:text-red-500 dark:border-red-500 rounded-lg text-sm font-medium hover:bg-red-600 dark:hover:bg-red-600 hover:text-gray-900 dark:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isCancelling ? (
                  <ArrowPathIcon className="h-4 w-4 animate-spin mr-1" />
                ) : (
                  <XCircleIcon className="h-4 w-4 mr-1" />
                )}
                {isCancelling ? 'Cancelling...' : 'Cancel'}
              </button>
            )}
            
            <button
              onClick={() => onReconcile(orderReference)}
              disabled={isReconciling}
              className="flex-1 min-w-[140px] inline-flex items-center justify-center px-3 py-2 border border-blue-600 text-blue-600 dark:text-blue-500 dark:border-blue-500 rounded-lg text-sm font-medium hover:bg-blue-600 dark:hover:bg-blue-600 hover:text-gray-900 dark:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isReconciling ? (
                <ArrowPathIcon className="h-4 w-4 animate-spin mr-1" />
              ) : (
                <ArrowPathIcon className="h-4 w-4 mr-1" />
              )}
              {isReconciling ? 'Checking...' : 'Check Status'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// Quick Amounts Component
const QuickAmounts = ({ amounts, selectedAmount, onSelect, minAmount }) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  const handlePrev = () => {
    setCurrentIndex((prev) => Math.max(prev - 1, 0));
  };

  const handleNext = () => {
    setCurrentIndex((prev) => Math.min(prev + 1, amounts.length - 3));
  };

  const filteredAmounts = amounts.filter(amount => amount >= minAmount);

  return (
    <div className="relative">
      <div className="hidden md:grid md:grid-cols-3 lg:grid-cols-6 gap-2 md:gap-3">
        {filteredAmounts.map((amount) => (
          <button
            key={amount}
            type="button"
            onClick={() => onSelect(amount)}
            className={`py-2 md:py-3 px-3 md:px-4 text-sm md:text-base font-medium rounded-lg transition-all ${
              selectedAmount === amount
                ? "bg-primary-500 text-gray-900 dark:text-white shadow-lg"
                : "bg-gray-100 dark:bg-neutral-700 hover:bg-gray-200 dark:hover:bg-neutral-600 text-gray-900 dark:text-gray-900 dark:text-white"
            }`}
          >
            {configFormatCurrency(amount)}
          </button>
        ))}
      </div>
      
      {/* Mobile carousel */}
      <div className="md:hidden">
        {filteredAmounts.length > 0 ? (
          <div className="flex items-center space-x-2">
            <button
              onClick={handlePrev}
              disabled={currentIndex === 0}
              className="p-2 text-gray-500 disabled:opacity-30"
            >
              <ChevronLeftIcon className="h-5 w-5" />
            </button>
            
            <div className="flex-1 overflow-hidden">
              <div 
                className="flex transition-transform duration-300"
                style={{ transform: `translateX(-${currentIndex * (100 / 3)}%)` }}
              >
                {filteredAmounts.map((amount) => (
                  <div key={amount} className="w-1/3 flex-shrink-0 px-1">
                    <button
                      type="button"
                      onClick={() => onSelect(amount)}
                      className={`w-full py-2 text-sm font-medium rounded-lg transition-all ${
                        selectedAmount === amount
                          ? "bg-primary-500 text-gray-900 dark:text-white shadow-lg"
                          : "bg-gray-100 dark:bg-neutral-700 hover:bg-gray-200 dark:hover:bg-neutral-600 text-gray-900 dark:text-gray-900 dark:text-white"
                      }`}
                    >
                      {configFormatCurrency(amount)}
                    </button>
                  </div>
                ))}
              </div>
            </div>
            
            <button
              onClick={handleNext}
              disabled={currentIndex >= filteredAmounts.length - 3}
              className="p-2 text-gray-500 disabled:opacity-30"
            >
              <ChevronRightIcon className="h-5 w-5" />
            </button>
          </div>
        ) : (
          <div className="text-center py-4 text-gray-500 dark:text-gray-400">
            No quick amounts available for this method
          </div>
        )}
      </div>
    </div>
  );
};

// Method Selection Component
const WithdrawalMethodSelection = ({ selectedMethod, onSelectMethod }) => {
  const methods = [
    ...(isMobileMoneySupported() ? [{
      id: "mobile_money",
      name: "Mobile Money",
      description: `Withdraw to your mobile money account (${getProcessingTime('mobileMoney')})`,
      icon: DevicePhoneMobileIcon,
      color: "from-blue-500 to-blue-600",
      minAmount: WITHDRAWAL_SETTINGS.minMobileMoneyWithdrawal,
      maxAmount: WITHDRAWAL_SETTINGS.maxMobileMoneyWithdrawal,
      fee: getWithdrawalFee('mobileMoney'),
    }] : []),
    {
      id: "bank_transfer",
      name: "Bank Transfer",
      description: `Withdraw to your bank account (${getProcessingTime('bankTransfer')})`,
      icon: BuildingLibraryIcon,
      color: "from-green-500 to-green-600",
      minAmount: WITHDRAWAL_SETTINGS.minBankWithdrawal,
      maxAmount: WITHDRAWAL_SETTINGS.maxBankWithdrawal,
      fee: getWithdrawalFee('bankTransfer'),
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 mb-6 md:mb-8">
      {methods.map((method) => {
        const Icon = method.icon;
        const isSelected = selectedMethod === method.id;
        
        return (
          <button
            key={method.id}
            type="button"
            onClick={() => onSelectMethod(method.id)}
            className={`relative p-4 md:p-6 rounded-xl md:rounded-2xl border-2 transition-all duration-300 text-left overflow-hidden group ${
              isSelected
                ? "border-primary-500 bg-primary-50 dark:bg-primary-900/20 shadow-lg"
                : "border-gray-200 dark:border-neutral-700 hover:border-gray-300 dark:hover:border-neutral-600 bg-white dark:bg-neutral-800"
            }`}
          >
            <div className={`absolute inset-0 bg-gradient-to-br ${method.color} opacity-0 group-hover:opacity-5 transition-opacity duration-300`} />
            
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-3 md:mb-4">
                <div className={`p-2 md:p-3 rounded-lg md:rounded-xl bg-gradient-to-br ${method.color} bg-opacity-10`}>
                  <Icon className="h-5 w-5 md:h-6 md:w-6 text-gray-900 dark:text-gray-900 dark:text-white" />
                </div>
                {isSelected && (
                  <CheckIcon className="h-5 w-5 md:h-6 md:w-6 text-primary-500 dark:text-primary-400" />
                )}
              </div>
              
              <h3 className="text-base md:text-xl font-semibold text-gray-900 dark:text-gray-900 dark:text-white mb-2">
                {method.name}
              </h3>
              
              <p className="text-xs md:text-sm text-gray-600 dark:text-gray-400 mb-3">
                {method.description}
              </p>
              
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs md:text-sm">
                  <span className="text-gray-600 dark:text-gray-400">Minimum:</span>
                  <span className="text-green-600 dark:text-green-400 font-medium">
                    {configFormatCurrency(method.minAmount)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs md:text-sm">
                  <span className="text-gray-600 dark:text-gray-400">Maximum:</span>
                  <span className="text-gray-900 dark:text-gray-900 dark:text-white font-medium">
                    {configFormatCurrency(method.maxAmount)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs md:text-sm">
                  <span className="text-gray-600 dark:text-gray-400">Fee:</span>
                  <span className="text-red-600 dark:text-red-400 font-medium">
                    {configFormatCurrency(method.fee)}
                  </span>
                </div>
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
};

export default function Withdrawal() {
  const [isLoading, setIsLoading] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [isReconciling, setIsReconciling] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [orderReference, setOrderReference] = useState(null);
  const [withdrawalStatus, setWithdrawalStatus] = useState(null);
  const [withdrawalStats, setWithdrawalStats] = useState(null);
  const [pollingInterval, setPollingInterval] = useState(null);
  const [selectedMethod, setSelectedMethod] = useState(
    isMobileMoneySupported() ? "mobile_money" : "bank_transfer"
  );
  const [previewResult, setPreviewResult] = useState(null);
  const [recipientDetails, setRecipientDetails] = useState(null);
  const [withdrawalMethod, setWithdrawalMethod] = useState(null);

  const { user, updateUser } = useAuth();

  // Choose schema based on selected method
  const schema = selectedMethod === "mobile_money" 
    ? createMobileMoneyWithdrawalSchema() 
    : createBankWithdrawalSchema();

  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
    setValue,
    watch,
    trigger,
    getValues,
    reset,
  } = useForm({
    resolver: zodResolver(schema),
    mode: "onChange",
    defaultValues: {
      amount: isMobileMoneySupported() 
        ? WITHDRAWAL_SETTINGS.minMobileMoneyWithdrawal 
        : WITHDRAWAL_SETTINGS.minBankWithdrawal,
      phoneNumber: "",
      accountNumber: "",
      accountName: "",
      ...(CURRENT_CURRENCY.code === 'USD' ? { bic: "" } : {}),
    },
  });

  const watchedAmount = watch("amount");
 

  // Mobile steps for stepper
  
  // Setup polling for withdrawal status
  useEffect(() => {
    if (orderReference && withdrawalStatus?.status !== "successful") {
      const interval = setInterval(() => {
        pollWithdrawalStatus(orderReference);
      }, 15000);

      setPollingInterval(interval);

      return () => {
        if (interval) clearInterval(interval);
      };
    }
  }, [orderReference, withdrawalStatus]);

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollingInterval) clearInterval(pollingInterval);
    };
  }, [pollingInterval]);

  const loadWithdrawalStats = async () => {
    try {
      const stats = await payoutService.getWithdrawalStats();
      if (stats.success) {
        setWithdrawalStats(stats.data);
      }
    } catch (err) {
      console.error("Failed to load withdrawal stats:", err);
    }
  };

  const handleSelectMethod = (method) => {
    setSelectedMethod(method);
    setPreviewResult(null);
    setError("");
    
    // Reset form values when switching methods
    reset({
      amount: method === "bank_transfer" 
        ? WITHDRAWAL_SETTINGS.minBankWithdrawal 
        : WITHDRAWAL_SETTINGS.minMobileMoneyWithdrawal,
      phoneNumber: "",
      accountNumber: "",
      accountName: "",
      ...(CURRENT_CURRENCY.code === 'USD' ? { bic: "" } : {}),
    });
  };

  const handlePreview = async (data) => {
    setIsLoading(true);
    setError("");

    try {
      let previewResponse;
      
      if (selectedMethod === "mobile_money") {
        previewResponse = await payoutService.previewMobileMoneyPayout(
          data.amount,
          data.phoneNumber,
          CURRENT_CURRENCY.code
        );
        
        setRecipientDetails({
          phone_number: data.phoneNumber,
        });
        setWithdrawalMethod("mobile_money_payout");
      } else {
        previewResponse = await payoutService.previewBankPayout(
          data.amount,
          data.accountNumber,
          data.accountName,
          data.bic,
          CURRENT_CURRENCY.code
        );
        
        setRecipientDetails({
          account_number: data.accountNumber,
          account_name: data.accountName,
          bic: data.bic,
        });
        setWithdrawalMethod("bank_payout");
      }

      if (!previewResponse.success) {
        throw new Error(previewResponse.error || "Preview failed");
      }
     // console.log('preview response :', previewResponse.data);
      
      setPreviewResult(previewResponse.data);
      setSuccess("Preview generated successfully. Review details below.");

    } catch (err) {
      console.error("Preview error:", err);
      setError(err.message || "Failed to generate withdrawal preview. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirmWithdrawal = async () => {
    setIsConfirming(true);
    setError("");

    try {
      let createResponse;
      const data = getValues();
      
      if (selectedMethod === "mobile_money") {
        createResponse = await payoutService.createMobileMoneyPayout(
          data.amount,
          data.phoneNumber,
          previewResult.order_reference,
          CURRENT_CURRENCY.code
        );
      } else {
        createResponse = await payoutService.createBankPayout(
          data.amount,
          data.accountNumber,
          data.accountName,
          data.bic,
          previewResult.order_reference,
          CURRENT_CURRENCY.code
        );
      }

      if (!createResponse.success) {
        throw new Error(createResponse.error || "Withdrawal creation failed");
      }

      setOrderReference(createResponse.data.order_reference);
      setWithdrawalStatus({
        status: createResponse.data.status,
        amount: data.amount,
        ...recipientDetails,
      });

      setPreviewResult(null);
      setSuccess(`Withdrawal initiated successfully! ${selectedMethod === "mobile_money" ? "You will receive funds within 24 hours." : "You will receive funds within 1-3 business days."}`);

      // Refresh stats and user balance
      loadWithdrawalStats();
      
      const walletResponse = await payoutService.getWalletBalance();
      if (walletResponse.success) {
        updateUser({ wallet_balance: walletResponse.data.balance });
      }
      
    } catch (err) {
      console.error("Withdrawal creation error:", err);
      setError(err.message || "Failed to process withdrawal. Please try again.");
    } finally {
      setIsConfirming(false);
    }
  };

  const handleCancelPreview = () => {
    setPreviewResult(null);
    setRecipientDetails(null);
    setError("");
    setSuccess("");
  };

  const pollWithdrawalStatus = async (orderRef) => {
    try {
      const status = await payoutService.getPayoutStatus(orderRef);

      if (!status.success) {
        throw new Error(status.error || "Failed to check withdrawal status");
      }

      setWithdrawalStatus(status.data);

      if (status.data.status === "successful") {
        if (pollingInterval) clearInterval(pollingInterval);
        setSuccess("Withdrawal successful! Funds have been sent.");

        const walletResponse = await payoutService.getWalletBalance();
        if (walletResponse.success) {
          updateUser({ wallet_balance: walletResponse.data.balance });
        }

        loadWithdrawalStats();

        setTimeout(() => {
          reset();
          setOrderReference(null);
          setWithdrawalStatus(null);
          setPreviewResult(null);
          setRecipientDetails(null);
          
        }, 5000);
      } else if (
        ["failed", "cancelled", "reversed", "refunded"].includes(status.data.status)
      ) {
        if (pollingInterval) clearInterval(pollingInterval);
        setError(`Withdrawal ${status.data.status}.`);
      }
    } catch (err) {
      console.error("Status check error:", err);
    }
  };

  const handleReconcileStatus = async (orderRef) => {
    setIsReconciling(true);
    try {
      const result = await payoutService.reconcilePayoutStatus(orderRef);
      
      if (result.success) {
        if (result.reconciled) {
          setSuccess("Withdrawal status updated successfully.");
        } else {
          setSuccess("Withdrawal status is already up to date.");
        }
        
        await pollWithdrawalStatus(orderRef);
      } else {
        setError(result.error || "Failed to reconcile withdrawal status");
      }
    } catch (err) {
      setError(err.message || "Failed to reconcile withdrawal");
    } finally {
      setIsReconciling(false);
    }
  };

  const handleCancelWithdrawal = async (orderRef) => {
    setIsCancelling(true);
    try {
      const response = await payoutService.cancelPendingWithdrawal(orderRef);

      if (!response.success) {
        throw new Error(response.error || "Failed to cancel withdrawal");
      }

      setSuccess("Withdrawal cancelled successfully.");
      if (pollingInterval) clearInterval(pollingInterval);
      setOrderReference(null);
      setWithdrawalStatus(null);
      reset();
      
    } catch (err) {
      setError(err.message || "Failed to cancel withdrawal");
    } finally {
      setIsCancelling(false);
    }
  };

  const quickAmounts = getQuickAmounts().concat([
    WITHDRAWAL_SETTINGS.maxMobileMoneyWithdrawal * 0.25,
    WITHDRAWAL_SETTINGS.maxMobileMoneyWithdrawal * 0.5,
    WITHDRAWAL_SETTINGS.maxMobileMoneyWithdrawal * 0.75,
  ]).sort((a, b) => a - b);

  // Initial load
  useEffect(() => {
    loadWithdrawalStats();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gradient-to-b dark:from-neutral-900 dark:to-neutral-800 safe-padding">
      <main className="mx-auto max-w-6xl py-4 md:py-8 px-3 sm:px-4 lg:px-8">
        
        {/* Header - Mobile Optimized */}
        <div className="text-center mb-6">
          <div className="flex items-center justify-center space-x-2 mb-2">
            <CurrencyDollarIcon className="h-6 w-6 md:h-8 md:w-8 text-primary-500" />
            <h1 className="text-2xl md:text-4xl font-bold text-gray-900 dark:text-gray-900 dark:text-white">Withdraw Funds</h1>
          </div>
          <div className="flex items-center justify-center mb-3">
            <span className="inline-flex items-center px-3 py-1 rounded-full bg-primary-100 dark:bg-primary-900/30 text-primary-800 dark:text-primary-300 text-sm font-medium">
              {CURRENT_CURRENCY.code} - {CURRENT_CURRENCY.name}
            </span>
          </div>
          <p className="text-sm md:text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto px-4">
            Transfer funds from your wallet to your account.
          </p>
        </div>

        <div className="flex flex-col lg:grid lg:grid-cols-4 gap-6">
          {/* Left Column: Wallet Info & Stats - Hidden on mobile, visible on desktop */}
          <div className="hidden lg:block lg:col-span-1 space-y-6">
            {/* Current Balance Card */}
            <div className="bg-white dark:bg-neutral-800 rounded-xl p-6 shadow-lg border border-gray-200 dark:border-neutral-700">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-900 dark:text-white">
                  Wallet Balance
                </h2>
                <div className="bg-primary-500/20 p-2 rounded-lg">
                  <span className="text-primary-600 dark:text-primary-400 text-sm font-medium">
                    {CURRENT_CURRENCY.code}
                  </span>
                </div>
              </div>
              <div className="mb-6">
                <p className="text-5xl font-bold text-gray-900 dark:text-gray-900 dark:text-white mb-2">
                  {configFormatCurrency(user?.wallet_balance || 0)}
                </p>
                <p className="text-gray-600 dark:text-gray-400 text-sm">
                  Available for withdrawal
                </p>
              </div>

              {/* Quick Stats */}
              {withdrawalStats && (
                <div className="space-y-4">
                  <div className="p-3 bg-gray-50 dark:bg-neutral-700/50 rounded-lg">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600 dark:text-gray-400 text-sm">
                        Total Withdrawals
                      </span>
                      <span className="text-gray-900 dark:text-gray-900 dark:text-white font-medium">
                        {configFormatCurrency(withdrawalStats.total_withdrawals || 0,'USD')}
                      </span>
                    </div>
                  </div>
                  <div className="p-3 bg-gray-50 dark:bg-neutral-700/50 rounded-lg">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600 dark:text-gray-400 text-sm">This Month</span>
                      <span className="text-gray-900 dark:text-gray-900 dark:text-white font-medium">
                        {configFormatCurrency(withdrawalStats.this_month_withdrawals || 0,'USD')}
                      </span>
                    </div>
                  </div>
                  <div className="p-3 bg-gray-50 dark:bg-neutral-700/50 rounded-lg">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600 dark:text-gray-400 text-sm">
                        Total Fees Paid
                      </span>
                      <span className="text-gray-900 dark:text-gray-900 dark:text-white font-medium">
                        {configFormatCurrency(withdrawalStats.total_fees_paid || 0,'USD')}
                      </span>
                    </div>
                  </div>
                  {withdrawalStats.pending_withdrawals > 0 && (
                    <div className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                      <div className="flex justify-between items-center">
                        <span className="text-yellow-600 dark:text-yellow-400 text-sm">
                          Pending Withdrawals
                        </span>
                        <span className="text-yellow-600 dark:text-yellow-400 font-medium">
                          {configFormatCurrency(withdrawalStats.pending_withdrawals || 0,'USD')}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Recent Withdrawals */}
            <div className="bg-white dark:bg-neutral-800 rounded-xl p-6 shadow-lg border border-gray-200 dark:border-neutral-700">
              <button
                onClick={() => window.location.href = '/wallet/transactions?type=withdrawal'}
                className="mt-4 w-full text-center text-primary-600 dark:text-primary-500 hover:text-primary-700 dark:hover:text-primary-400 text-sm font-medium py-2"
              >
                View Withdrawal History →
              </button>
            </div>
          </div>

          {/* Right Column: Withdrawal Form */}
          <div className="lg:col-span-3">
            {/* Mobile Balance Card */}
            <div className="lg:hidden bg-white dark:bg-neutral-800 rounded-xl p-4 mb-6 shadow border border-gray-200 dark:border-neutral-700">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Current Balance</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-gray-900 dark:text-white">
                    {configFormatCurrency(user?.wallet_balance || 0,'USD')}
                  </p>
                </div>
                <button
                  onClick={() => window.location.href = '/wallet/transactions?type=withdrawal'}
                  className="text-sm text-primary-600 dark:text-primary-500"
                >
                  History →
                </button>
              </div>
            </div>

            {/* Error Banner */}
            {error && (
              <Banner
                type="error"
                title="Error"
                message={error}
                onClose={() => setError("")}
                className="mb-6"
              />
            )}

            {/* Success Banner */}
            {success && (
              <Banner
                type="success"
                title="Success"
                message={success}
                className="mb-6"
              />
            )}

            {/* Withdrawal Status Display */}
            {withdrawalStatus && orderReference && (
              <WithdrawalStatusDisplay
                status={withdrawalStatus.status}
                orderReference={orderReference}
                withdrawalMethod={withdrawalMethod}
                recipientDetails={withdrawalStatus}
                onCancel={handleCancelWithdrawal}
                onReconcile={handleReconcileStatus}
                isCancelling={isCancelling}
                isReconciling={isReconciling}
                user={user}
              />
            )}

            {/* Preview Result Display */}
            {previewResult && (
              <PreviewResultDisplay
                previewResult={previewResult}
                withdrawalMethod={selectedMethod}
                onConfirm={handleConfirmWithdrawal}
                onCancelPreview={handleCancelPreview}
                isConfirming={isConfirming}
              />
            )}

            {/* Main Form */}
            {!previewResult && !orderReference && (
              <div className="bg-white dark:bg-neutral-800 rounded-xl shadow-lg p-4 md:p-8 border border-gray-200 dark:border-neutral-700">
                {/* Method Selection */}
                <div className="mb-8">
                  <h2 className="text-base md:text-xl font-semibold text-gray-900 dark:text-gray-900 dark:text-white mb-4">
                    Select Withdrawal Method
                  </h2>
                  <WithdrawalMethodSelection
                    selectedMethod={selectedMethod}
                    onSelectMethod={handleSelectMethod}
                  />
                </div>

                <form onSubmit={handleSubmit(handlePreview)} className="space-y-6 md:space-y-8">
                  {/* Amount Input */}
                  <div>
                    <label
                      htmlFor="amount"
                      className="block text-base md:text-lg font-medium text-gray-900 dark:text-gray-900 dark:text-white mb-3"
                    >
                      How much would you like to withdraw?
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 md:pl-4 flex items-center pointer-events-none">
                        <span className="text-gray-500 dark:text-gray-400 text-base md:text-xl">
                          {CURRENT_CURRENCY.symbol}
                        </span>
                      </div>
                      <input
                        type="number"
                        id="amount"
                        step={WITHDRAWAL_SETTINGS.withdrawalStep}
                        min={selectedMethod === "bank_transfer" 
                          ? WITHDRAWAL_SETTINGS.minBankWithdrawal 
                          : WITHDRAWAL_SETTINGS.minMobileMoneyWithdrawal}
                        max={WITHDRAWAL_SETTINGS.maxBankWithdrawal}
                        {...register("amount", { valueAsNumber: true })}
                        className="block w-full pl-14 md:pl-16 text-lg md:text-xl rounded-lg md:rounded-xl border border-gray-300 dark:border-neutral-600 bg-white dark:bg-neutral-700 py-3 md:py-4 px-4 text-gray-900 dark:text-gray-900 dark:text-white placeholder-gray-400 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all"
                        placeholder={selectedMethod === "bank_transfer" 
                          ? WITHDRAWAL_SETTINGS.minBankWithdrawal.toString() 
                          : WITHDRAWAL_SETTINGS.minMobileMoneyWithdrawal.toString()}
                      />
                    </div>
                    {errors.amount && (
                      <p className="mt-2 text-sm text-red-500 dark:text-red-400">
                        {errors.amount.message}
                      </p>
                    )}
                    <p className="mt-2 text-xs md:text-sm text-gray-500 dark:text-gray-400">
                      {selectedMethod === "bank_transfer" 
                        ? `Minimum: ${configFormatCurrency(WITHDRAWAL_SETTINGS.minBankWithdrawal)} | Maximum: ${configFormatCurrency(WITHDRAWAL_SETTINGS.maxBankWithdrawal)}` 
                        : `Minimum: ${configFormatCurrency(WITHDRAWAL_SETTINGS.minMobileMoneyWithdrawal)} | Maximum: ${configFormatCurrency(WITHDRAWAL_SETTINGS.maxMobileMoneyWithdrawal)}`}
                    </p>
                  </div>

                  {/* Quick Amount Buttons */}
                  <div className="bg-gray-50 dark:bg-neutral-700/50 p-4 rounded-lg md:rounded-xl">
                    <h3 className="text-sm font-medium text-gray-900 dark:text-gray-900 dark:text-white mb-3">
                      Quick Amounts
                    </h3>
                    <QuickAmounts
                      amounts={quickAmounts}
                      selectedAmount={watchedAmount}
                      minAmount={selectedMethod === "bank_transfer" 
                        ? WITHDRAWAL_SETTINGS.minBankWithdrawal 
                        : WITHDRAWAL_SETTINGS.minMobileMoneyWithdrawal}
                      onSelect={(amount) => {
                        setValue("amount", amount, { shouldValidate: true });
                        trigger("amount");
                      }}
                    />
                  </div>

                  {/* Method-specific fields */}
                  {selectedMethod === "mobile_money" ? (
                    /* Mobile Money Fields */
                    <div>
                      <label
                        htmlFor="phoneNumber"
                        className="block text-base md:text-lg font-medium text-gray-900 dark:text-gray-900 dark:text-white mb-3"
                      >
                        Mobile Money Phone Number
                      </label>
                      <div className="flex rounded-lg md:rounded-xl shadow-sm">
                        <span className="inline-flex items-center rounded-l-lg md:rounded-l-xl border border-r-0 border-gray-300 dark:border-neutral-600 bg-gray-50 dark:bg-neutral-700 px-3 md:px-4 text-gray-600 dark:text-gray-300 text-base md:text-lg">
                          {CURRENT_CURRENCY.code === 'TZS' ? '+255' : CURRENT_CURRENCY.code === 'KES' ? '+254' : '+'}
                        </span>
                        <input
                          type="tel"
                          id="phoneNumber"
                          {...register("phoneNumber")}
                          onChange={(e) => {
                            const value = e.target.value
                              .replace(/[^0-9]/g, "")
                              .slice(0, 9);
                            setValue("phoneNumber", value, {
                              shouldValidate: true,
                            });
                          }}
                          placeholder="712345678"
                          className="block w-full rounded-r-lg md:rounded-r-xl border border-gray-300 dark:border-neutral-600 bg-white dark:bg-neutral-700 py-3 md:py-4 px-4 text-gray-900 dark:text-gray-900 dark:text-white placeholder-gray-400 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all"
                        />
                      </div>
                      {errors.phoneNumber && (
                        <p className="mt-2 text-sm text-red-500 dark:text-red-400">
                          {errors.phoneNumber.message}
                        </p>
                      )}
                      <p className="mt-2 text-xs md:text-sm text-gray-500 dark:text-gray-400">
                        Enter your phone number without country code (e.g., 712345678)
                      </p>
                    </div>
                  ) : (
                    /* Bank Transfer Fields */
                    <div className="space-y-6 md:space-y-8">
                      <div>
                        <label
                          htmlFor="accountNumber"
                          className="block text-base md:text-lg font-medium text-gray-900 dark:text-gray-900 dark:text-white mb-3"
                        >
                          Bank Account Number
                        </label>
                        <input
                          type="text"
                          id="accountNumber"
                          {...register("accountNumber")}
                          className="block w-full text-lg md:text-xl rounded-lg md:rounded-xl border border-gray-300 dark:border-neutral-600 bg-white dark:bg-neutral-700 py-3 md:py-4 px-4 text-gray-900 dark:text-gray-900 dark:text-white placeholder-gray-400 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all"
                          placeholder="1234567890"
                        />
                        {errors.accountNumber && (
                          <p className="mt-2 text-sm text-red-500 dark:text-red-400">
                            {errors.accountNumber.message}
                          </p>
                        )}
                      </div>

                      <div>
                        <label
                          htmlFor="accountName"
                          className="block text-base md:text-lg font-medium text-gray-900 dark:text-gray-900 dark:text-white mb-3"
                        >
                          Account Holder Name
                        </label>
                        <input
                          type="text"
                          id="accountName"
                          {...register("accountName")}
                          className="block w-full text-lg md:text-xl rounded-lg md:rounded-xl border border-gray-300 dark:border-neutral-600 bg-white dark:bg-neutral-700 py-3 md:py-4 px-4 text-gray-900 dark:text-gray-900 dark:text-white placeholder-gray-400 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all"
                          placeholder="John Doe"
                        />
                        {errors.accountName && (
                          <p className="mt-2 text-sm text-red-500 dark:text-red-400">
                            {errors.accountName.message}
                          </p>
                        )}
                        <p className="mt-2 text-xs md:text-sm text-gray-500 dark:text-gray-400">
                          Must match the name on your bank account exactly
                        </p>
                      </div>

                      {CURRENT_CURRENCY.code === 'USD' && (
                        <div>
                          <label
                            htmlFor="bic"
                            className="block text-base md:text-lg font-medium text-gray-900 dark:text-gray-900 dark:text-white mb-3"
                          >
                            BIC/SWIFT Code (Optional)
                          </label>
                          <input
                            type="text"
                            id="bic"
                            {...register("bic")}
                            className="block w-full text-lg md:text-xl rounded-lg md:rounded-xl border border-gray-300 dark:border-neutral-600 bg-white dark:bg-neutral-700 py-3 md:py-4 px-4 text-gray-900 dark:text-gray-900 dark:text-white placeholder-gray-400 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all"
                            placeholder="NMBTZTZT"
                          />
                          {errors.bic && (
                            <p className="mt-2 text-sm text-red-500 dark:text-red-400">
                              {errors.bic.message}
                            </p>
                          )}
                          <p className="mt-2 text-xs md:text-sm text-gray-500 dark:text-gray-400">
                            Required for international bank transfers
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Preview Button */}
                  <div className="flex justify-center">
                    <button
                      type="submit"
                      disabled={isLoading || !isValid}
                      className="w-full md:w-auto inline-flex items-center justify-center px-6 md:px-8 py-3 md:py-4 bg-gradient-to-r from-primary-500 to-primary-600 text-gray-900 dark:text-white rounded-lg md:rounded-xl text-base md:text-lg font-semibold hover:from-primary-600 hover:to-primary-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
                    >
                      {isLoading ? (
                        <>
                          <ArrowPathIcon className="h-4 w-4 md:h-5 md:w-5 animate-spin mr-2" />
                          Generating Preview...
                        </>
                      ) : (
                        <>
                          <ArrowDownTrayIcon className="h-4 w-4 md:h-5 md:w-5 mr-2" />
                          Preview Withdrawal
                        </>
                      )}
                    </button>
                  </div>
                </form>

                {/* Instructions */}
                <div className="mt-6 md:mt-8 pt-6 md:pt-8 border-t border-gray-200 dark:border-neutral-700">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                    <div>
                      <h4 className="text-xs md:text-sm font-medium text-gray-900 dark:text-gray-900 dark:text-white mb-2 md:mb-3">
                        <InformationCircleIcon className="h-4 w-4 md:h-5 md:w-5 inline mr-1 md:mr-2 text-primary-500 dark:text-primary-400" />
                        How it works:
                      </h4>
                      <ol className="text-xs md:text-sm text-gray-600 dark:text-gray-400 space-y-1 md:space-y-2 pl-2">
                        <li>1. Select withdrawal method</li>
                        <li>2. Enter amount and details</li>
                        <li>3. Preview withdrawal (see fees)</li>
                        <li>4. Confirm withdrawal</li>
                        <li>5. Track status in real-time</li>
                      </ol>
                    </div>
                    <div>
                      <h4 className="text-xs md:text-sm font-medium text-gray-900 dark:text-gray-900 dark:text-white mb-2 md:mb-3">
                        <ExclamationTriangleIcon className="h-4 w-4 md:h-5 md:w-5 inline mr-1 md:mr-2 text-yellow-500" />
                        Important:
                      </h4>
                      <ul className="text-xs md:text-sm text-gray-600 dark:text-gray-400 space-y-1 md:space-y-2">
                        <li>• Mobile Money: {getProcessingTime('mobileMoney')}</li>
                        <li>• Bank Transfer: {getProcessingTime('bankTransfer')}</li>
                        <li>• Transaction fees apply</li>
                        <li>• Daily limits may apply</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Support Info */}
            <div className="mt-6 md:mt-8 bg-white dark:bg-neutral-800 rounded-xl p-4 md:p-6 border border-gray-200 dark:border-neutral-700">
              <div className="flex items-center space-x-2 md:space-x-3 mb-3 md:mb-4">
                <InformationCircleIcon className="h-5 w-5 md:h-6 md:w-6 text-primary-500" />
                <h3 className="text-base md:text-lg font-semibold text-gray-900 dark:text-gray-900 dark:text-white">Need Help?</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
                <div className="p-3 bg-gray-50 dark:bg-neutral-700/50 rounded-lg">
                  <h4 className="text-xs md:text-sm font-medium text-gray-900 dark:text-gray-900 dark:text-white mb-1 md:mb-2">Withdrawal Issues</h4>
                  <p className="text-xs md:text-sm text-gray-600 dark:text-gray-400">
                    Use "Check Status" to update withdrawal status.
                  </p>
                </div>
                <div className="p-3 bg-gray-50 dark:bg-neutral-700/50 rounded-lg">
                  <h4 className="text-xs md:text-sm font-medium text-gray-900 dark:text-gray-900 dark:text-white mb-1 md:mb-2">Processing Times</h4>
                  <p className="text-xs md:text-sm text-gray-600 dark:text-gray-400">
                    Bank transfers take {getProcessingTime('bankTransfer')} to reflect.
                  </p>
                </div>
                <div className="p-3 bg-gray-50 dark:bg-neutral-700/50 rounded-lg">
                  <h4 className="text-xs md:text-sm font-medium text-gray-900 dark:text-gray-900 dark:text-white mb-1 md:mb-2">24/7 Support</h4>
                  <p className="text-xs md:text-sm text-gray-600 dark:text-gray-400">
                    Contact support for any issues: support@example.com
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}