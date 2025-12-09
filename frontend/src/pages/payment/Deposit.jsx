import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { paymentService } from "../../services/paymentService";
import { useAuth } from "../../contexts/AuthContext";
import Banner from "../../components/common/Banner";
import { formatCurrency, formatPhoneDisplay, formatDate } from "../../utils/formatters";
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
  XMarkIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from "@heroicons/react/24/outline";

// Schema for mobile money deposit
const depositSchema = z.object({
  amount: z
    .number()
    .min(1000, "Minimum deposit is 1,000 TZS")
    .max(1000000, "Maximum deposit is 1,000,000 TZS")
    .refine((val) => val % 100 === 0, {
      message: "Amount must be in multiples of 100 TZS",
    }),
  phoneNumber: z
    .string()
    .min(9, "Phone number must be at least 9 digits")
    .max(12, "Phone number is too long")
    .regex(/^[0-9]+$/, "Phone number must contain only digits")
    .transform((val) => {
      // Add country code if not present (Tanzania)
      if (!val.startsWith("255")) {
        if (val.startsWith("0")) {
          return `255${val.slice(1)}`;
        }
        return `255${val}`;
      }
      return val;
    }),
});

// Status badge component - Mobile Optimized
const StatusBadge = ({ status }) => {
  const statusConfig = {
    initiated: { 
      color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300", 
      text: "Initiated", 
      icon: ClockIcon 
    },
    pending: { 
      color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300", 
      text: "Pending", 
      icon: ClockIcon 
    },
    processing: { 
      color: "bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300", 
      text: "Processing", 
      icon: ArrowPathIcon 
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
    expired: { 
      color: "bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-300", 
      text: "Expired", 
      icon: ExclamationTriangleIcon 
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

// Enhanced Deposit Status Display Component - Mobile Optimized
const DepositStatusDisplay = ({
  status,
  orderReference,
  onCancel,
  onReconcile,
  onForceReconcile,
  isCancelling,
  isReconciling,
  user,
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
        return "Payment is being processed. Check your phone.";
      case "pending":
        return "Waiting for payment confirmation...";
      default:
        return "Deposit initiated. Check your phone for USSD prompt.";
    }
  };

  const isCancellable = ["pending", "processing", "initiated"].includes(
    status.deposit_status
  );

  // Calculate payment age
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
            <h3 className="text-base md:text-lg font-semibold text-gray-900 dark:text-white truncate">
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
              <p className="text-xs md:text-sm text-gray-900 dark:text-white font-mono truncate mt-1">
                {orderReference}
              </p>
            </div>
            <div className="bg-gray-50 dark:bg-neutral-700/30 p-3 rounded-lg">
              <p className="text-xs text-gray-500 dark:text-gray-400">Amount</p>
              <p className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white mt-1">
                {formatCurrency(status.amount || 0)} TZS
              </p>
            </div>
            {user && (
              <div className="bg-gray-50 dark:bg-neutral-700/30 p-3 rounded-lg">
                <p className="text-xs text-gray-500 dark:text-gray-400">Current Balance</p>
                <p className="text-xl md:text-2xl font-bold text-green-600 dark:text-green-500 mt-1">
                  {formatCurrency(user.wallet_balance || 0)} TZS
                </p>
              </div>
            )}
          </div>
          
          {status.phone_number && (
            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
              <div className="bg-gray-50 dark:bg-neutral-700/30 p-3 rounded-lg">
                <p className="text-xs text-gray-500 dark:text-gray-400">Phone Number</p>
                <p className="text-sm text-gray-900 dark:text-white mt-1">
                  {formatPhoneDisplay(status.phone_number)}
                </p>
              </div>
              {status.created_at && (
                <div className="bg-gray-50 dark:bg-neutral-700/30 p-3 rounded-lg">
                  <p className="text-xs text-gray-500 dark:text-gray-400">Initiated At</p>
                  <p className="text-sm text-gray-900 dark:text-white mt-1">
                    {formatDate(status.created_at)}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Action buttons - Mobile optimized */}
          <div className="mt-4 flex flex-wrap gap-2">
            {isStuck && (
              <>
                <button
                  onClick={() => onReconcile(orderReference)}
                  disabled={isReconciling}
                  className="flex-1 min-w-[140px] inline-flex items-center justify-center px-3 py-2 border border-blue-600 text-blue-600 dark:text-blue-500 dark:border-blue-500 rounded-lg text-sm font-medium hover:bg-blue-600 dark:hover:bg-blue-600 hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isReconciling ? (
                    <ArrowPathIcon className="h-4 w-4 animate-spin mr-1" />
                  ) : (
                    <ArrowPathIcon className="h-4 w-4 mr-1" />
                  )}
                  {isReconciling ? 'Checking...' : 'Check Status'}
                </button>
                
                <button
                  onClick={() => onForceReconcile(orderReference)}
                  disabled={isReconciling}
                  className="flex-1 min-w-[140px] inline-flex items-center justify-center px-3 py-2 border border-yellow-600 text-yellow-600 dark:text-yellow-500 dark:border-yellow-500 rounded-lg text-sm font-medium hover:bg-yellow-600 dark:hover:bg-yellow-600 hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Force reconciliation with ClickPesa"
                >
                  <ExclamationCircleIcon className="h-4 w-4 mr-1" />
                  Force Update
                </button>
              </>
            )}
            
            {isCancellable && (
              <button
                onClick={() => onCancel(orderReference)}
                disabled={isCancelling}
                className="flex-1 min-w-[140px] inline-flex items-center justify-center px-3 py-2 border border-red-600 text-red-600 dark:text-red-500 dark:border-red-500 rounded-lg text-sm font-medium hover:bg-red-600 dark:hover:bg-red-600 hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isCancelling ? (
                  <ArrowPathIcon className="h-4 w-4 animate-spin mr-1" />
                ) : (
                  <XCircleIcon className="h-4 w-4 mr-1" />
                )}
                {isCancelling ? 'Cancelling...' : 'Cancel'}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

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
              Phone Verified ✓
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
              No payment methods available for this number
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
                    <DevicePhoneMobileIcon className="h-4 w-4 md:h-6 md:w-6 text-primary-500 dark:text-primary-400 flex-shrink-0" />
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

// Mobile Stepper Component
const MobileStepper = ({ currentStep, steps }) => {
  return (
    <div className="md:hidden mb-6">
      <div className="flex items-center justify-between mb-2">
        {steps.map((step, index) => (
          <div key={step.id} className="flex flex-col items-center flex-1">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center ${
                index <= currentStep
                  ? "bg-primary-500 text-white"
                  : "bg-gray-200 dark:bg-neutral-700 text-gray-500 dark:text-gray-400"
              }`}
            >
              {step.icon}
            </div>
            <span className="text-xs mt-1 text-gray-600 dark:text-gray-400">{step.label}</span>
          </div>
        ))}
      </div>
      <div className="relative h-1 bg-gray-200 dark:bg-neutral-700 rounded-full">
        <div
          className="absolute top-0 left-0 h-1 bg-primary-500 rounded-full transition-all duration-300"
          style={{ width: `${(currentStep / (steps.length - 1)) * 100}%` }}
        />
      </div>
    </div>
  );
};

// Quick Amounts Component with carousel for mobile
const QuickAmounts = ({ amounts, selectedAmount, onSelect }) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  const handlePrev = () => {
    setCurrentIndex((prev) => Math.max(prev - 1, 0));
  };

  const handleNext = () => {
    setCurrentIndex((prev) => Math.min(prev + 1, amounts.length - 3));
  };

  return (
    <div className="relative">
      <div className="hidden md:grid md:grid-cols-3 lg:grid-cols-6 gap-2 md:gap-3">
        {amounts.map((amount) => (
          <button
            key={amount}
            type="button"
            onClick={() => onSelect(amount)}
            className={`py-2 md:py-3 px-3 md:px-4 text-sm md:text-base font-medium rounded-lg transition-all ${
              selectedAmount === amount
                ? "bg-primary-500 text-white shadow-lg"
                : "bg-gray-100 dark:bg-neutral-700 hover:bg-gray-200 dark:hover:bg-neutral-600 text-gray-900 dark:text-white"
            }`}
          >
            {formatCurrency(amount)}
          </button>
        ))}
      </div>
      
      {/* Mobile carousel */}
      <div className="md:hidden">
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
              {amounts.map((amount) => (
                <div key={amount} className="w-1/3 flex-shrink-0 px-1">
                  <button
                    type="button"
                    onClick={() => onSelect(amount)}
                    className={`w-full py-2 text-sm font-medium rounded-lg transition-all ${
                      selectedAmount === amount
                        ? "bg-primary-500 text-white shadow-lg"
                        : "bg-gray-100 dark:bg-neutral-700 hover:bg-gray-200 dark:hover:bg-neutral-600 text-gray-900 dark:text-white"
                    }`}
                  >
                    {formatCurrency(amount)}
                  </button>
                </div>
              ))}
            </div>
          </div>
          
          <button
            onClick={handleNext}
            disabled={currentIndex >= amounts.length - 3}
            className="p-2 text-gray-500 disabled:opacity-30"
          >
            <ChevronRightIcon className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default function Deposit() {
  const [isLoading, setIsLoading] = useState(false);
  const [isValidatingPhone, setIsValidatingPhone] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [isReconciling, setIsReconciling] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [orderReference, setOrderReference] = useState(null);
  const [depositStatus, setDepositStatus] = useState(null);
  const [depositStats, setDepositStats] = useState(null);
  const [pollingInterval, setPollingInterval] = useState(null);
  const [currentStep, setCurrentStep] = useState(0);

  // New states for validation and payment method selection
  const [validationResult, setValidationResult] = useState(null);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState(null);

  const { user, updateUser } = useAuth();

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
    resolver: zodResolver(depositSchema),
    mode: "onChange",
    defaultValues: {
      amount: 1000,
      phoneNumber: "",
    },
  });

  const watchedAmount = watch("amount");
  const watchedPhoneNumber = watch("phoneNumber");

  // Mobile steps for stepper
  const mobileSteps = [
    { id: 1, label: "Amount", icon: "💰" },
    { id: 2, label: "Phone", icon: "📱" },
    { id: 3, label: "Confirm", icon: "✓" },
  ];

  // Update step based on form state
  useEffect(() => {
    if (watchedAmount >= 1000) setCurrentStep(1);
    if (watchedPhoneNumber?.length >= 9) setCurrentStep(2);
    if (validationResult) setCurrentStep(3);
  }, [watchedAmount, watchedPhoneNumber, validationResult]);

  // Setup polling for deposit status
  useEffect(() => {
    if (orderReference && depositStatus?.deposit_status !== "successful") {
      const interval = setInterval(() => {
        pollDepositStatus(orderReference);
      }, 10000); // Poll every 10 seconds

      setPollingInterval(interval);

      return () => {
        if (interval) clearInterval(interval);
      };
    }
  }, [orderReference, depositStatus]);

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollingInterval) clearInterval(pollingInterval);
    };
  }, [pollingInterval]);

  const loadDepositStats = async () => {
    try {
      const stats = await paymentService.getDepositStats();
      if (stats.success) {
        setDepositStats(stats.data);
      }
    } catch (err) {
      console.error("Failed to load deposit stats:", err);
    }
  };

  const validatePhoneNumber = async () => {
    const phoneNumber = getValues("phoneNumber");
    if (!phoneNumber) {
      setError("Please enter a phone number first");
      return;
    }

    setIsValidatingPhone(true);
    setError("");
    setValidationResult(null);
    setSelectedPaymentMethod(null);

    try {
      const validationResult = await paymentService.validatePhoneNumber(phoneNumber);

      if (!validationResult.success) {
        throw new Error(validationResult.error || "Validation failed");
      }

      const data = validationResult.data;

      if (!data.valid) {
        setError(data.message || "Invalid phone number format");
        return;
      }

      setValidationResult(data);

    } catch (err) {
      console.error("Validation error:", err);
      setError(err.message || "Failed to validate phone number. Please try again.");
    } finally {
      setIsValidatingPhone(false);
    }
  };

  const handleSelectPaymentMethod = (method) => {
    setSelectedPaymentMethod(method);
  };

  const handleClearValidation = () => {
    setValidationResult(null);
    setSelectedPaymentMethod(null);
    setCurrentStep(2);
  };

  const onSubmit = async (data) => {
    setIsLoading(true);
    setError("");
    setSuccess("");

    try {
      const response = await paymentService.initiateWalletDeposit(
        data.amount,
        data.phoneNumber
      );

      if (!response.success) {
        throw new Error(response.error || "Failed to initiate deposit");
      }

      setOrderReference(response.data.order_reference);
      setDepositStatus({
        deposit_status: response.data.status,
        amount: response.data.amount,
        phone_number: data.phoneNumber,
        created_at: new Date().toISOString(),
      });

      setSuccess(
        `Deposit initiated! Check ${formatPhoneDisplay(data.phoneNumber)} for USSD prompt.`
      );

      // Refresh stats and history
      loadDepositStats();
      
      // Refresh user balance
      const walletResponse = await paymentService.getWalletBalance();
      if (walletResponse.success) {
        updateUser({ wallet_balance: walletResponse.data.balance });
      }
      
    } catch (err) {
      console.error("Deposit error:", err);
      setError(err.message || "Failed to process deposit. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const pollDepositStatus = async (orderRef, forceReconcile = false) => {
    try {
      const status = await paymentService.checkDepositStatus(orderRef, forceReconcile);

      if (!status.success) {
        throw new Error(status.error || "Failed to check deposit status");
      }

      setDepositStatus(status.data);

      // If successful, update user balance and stop polling
      if (status.data.deposit_status === "successful") {
        if (pollingInterval) clearInterval(pollingInterval);
        setSuccess("Deposit successful! Your wallet balance has been updated.");

        // Update user balance in context
        const walletResponse = await paymentService.getWalletBalance();
        if (walletResponse.success) {
          updateUser({ wallet_balance: walletResponse.data.balance });
        }

        // Refresh stats and history
        loadDepositStats();

        // Reset form after 5 seconds
        setTimeout(() => {
          reset();
          setOrderReference(null);
          setDepositStatus(null);
          setValidationResult(null);
          setSelectedPaymentMethod(null);
          setCurrentStep(0);
        }, 5000);
      } else if (
        ["failed", "cancelled", "expired"].includes(status.data.deposit_status)
      ) {
        if (pollingInterval) clearInterval(pollingInterval);
        setError(`Deposit ${status.data.deposit_status}.`);
      }
    } catch (err) {
      console.error("Status check error:", err);
    }
  };

  const handleReconcileStatus = async (orderRef) => {
    setIsReconciling(true);
    try {
      await pollDepositStatus(orderRef, false);
    } finally {
      setIsReconciling(false);
    }
  };

  const handleForceReconcile = async (orderRef) => {
    setIsReconciling(true);
    try {
      const result = await paymentService.reconcileDepositStatus(orderRef);
      
      if (result.success) {
        if (result.reconciled) {
          setSuccess("Payment status updated successfully.");
        } else {
          setSuccess("Payment status is already up to date.");
        }
        
        // Refresh status
        await pollDepositStatus(orderRef, false);
      } else {
        setError(result.error || "Failed to reconcile payment status");
      }
    } catch (err) {
      setError(err.message || "Failed to force reconcile payment");
    } finally {
      setIsReconciling(false);
    }
  };

  const handleCancelDeposit = async (orderRef) => {
    setIsCancelling(true);
    try {
      const response = await paymentService.cancelPendingDeposit(orderRef);

      if (!response.success) {
        throw new Error(response.error || "Failed to cancel deposit");
      }

      setSuccess("Deposit cancelled successfully.");
      if (pollingInterval) clearInterval(pollingInterval);
      setOrderReference(null);
      setDepositStatus(null);
      reset();
      setCurrentStep(0);
    } catch (err) {
      setError(err.message || "Failed to cancel deposit");
    } finally {
      setIsCancelling(false);
    }
  };

  const quickAmounts = [1000, 5000, 10000, 25000, 50000, 100000];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gradient-to-b dark:from-neutral-900 dark:to-neutral-800 safe-padding">
      <main className="mx-auto max-w-6xl py-4 md:py-8 px-3 sm:px-4 lg:px-8">
        {/* Mobile Stepper */}
        <MobileStepper currentStep={currentStep} steps={mobileSteps} />
        
        {/* Header - Mobile Optimized */}
        <div className="text-center mb-6">
          <h1 className="text-2xl md:text-4xl font-bold text-gray-900 dark:text-white mb-2">Deposit Funds</h1>
          <p className="text-sm md:text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto px-4">
            Add funds to your wallet using mobile money. All transactions are secure and encrypted.
          </p>
        </div>

        <div className="flex flex-col lg:grid lg:grid-cols-4 gap-6">
          {/* Left Column: Wallet Info & Stats - Hidden on mobile, visible on desktop */}
          <div className="hidden lg:block lg:col-span-1 space-y-6">
            {/* Current Balance Card */}
            <div className="bg-white dark:bg-neutral-800 rounded-xl p-6 shadow-lg border border-gray-200 dark:border-neutral-700">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Wallet Balance
                </h2>
                <div className="bg-primary-500/20 p-2 rounded-lg">
                  <span className="text-primary-600 dark:text-primary-400 text-sm font-medium">
                    TZS
                  </span>
                </div>
              </div>
              <div className="mb-6">
                <p className="text-5xl font-bold text-gray-900 dark:text-white mb-2">
                  {formatCurrency(user?.wallet_balance || 0)}
                </p>
                <p className="text-gray-600 dark:text-gray-400 text-sm">
                  Available for tournaments & withdrawals
                </p>
              </div>

              {/* Quick Stats */}
              {depositStats && (
                <div className="space-y-4">
                  <div className="p-3 bg-gray-50 dark:bg-neutral-700/50 rounded-lg">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600 dark:text-gray-400 text-sm">
                        Total Deposits
                      </span>
                      <span className="text-gray-900 dark:text-white font-medium">
                        {formatCurrency(depositStats.total_deposits || 0)}
                      </span>
                    </div>
                  </div>
                  <div className="p-3 bg-gray-50 dark:bg-neutral-700/50 rounded-lg">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600 dark:text-gray-400 text-sm">This Month</span>
                      <span className="text-gray-900 dark:text-white font-medium">
                        {formatCurrency(depositStats.this_month_deposits || 0)}
                      </span>
                    </div>
                  </div>
                  <div className="p-3 bg-gray-50 dark:bg-neutral-700/50 rounded-lg">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600 dark:text-gray-400 text-sm">
                        Average Deposit
                      </span>
                      <span className="text-gray-900 dark:text-white font-medium">
                        {formatCurrency(depositStats.average_deposit || 0)}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Recent Deposits */}
            <div className="bg-white dark:bg-neutral-800 rounded-xl p-6 shadow-lg border border-gray-200 dark:border-neutral-700">
              <button
                onClick={() => window.location.href = '/transactions'}
                className="mt-4 w-full text-center text-primary-600 dark:text-primary-500 hover:text-primary-700 dark:hover:text-primary-400 text-sm font-medium py-2"
              >
                View transactions History →
              </button>
            </div>
          </div>

          {/* Right Column: Deposit Form */}
          <div className="lg:col-span-3">
            {/* Mobile Balance Card */}
            <div className="lg:hidden bg-white dark:bg-neutral-800 rounded-xl p-4 mb-6 shadow border border-gray-200 dark:border-neutral-700">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Current Balance</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {formatCurrency(user?.wallet_balance || 0)} TZS
                  </p>
                </div>
                <button
                  onClick={() => window.location.href = '/transactions'}
                  className="text-sm text-primary-600 dark:text-primary-500"
                >
                  View History →
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

            {/* Deposit Status Display */}
            {depositStatus && orderReference && (
              <DepositStatusDisplay
                status={depositStatus}
                orderReference={orderReference}
                onCancel={handleCancelDeposit}
                onReconcile={handleReconcileStatus}
                onForceReconcile={handleForceReconcile}
                isCancelling={isCancelling}
                isReconciling={isReconciling}
                user={user}
              />
            )}

            {/* Validation Result Display */}
            {validationResult && (
              <ValidationResultDisplay
                validationResult={validationResult}
                selectedMethod={selectedPaymentMethod}
                onSelectMethod={handleSelectPaymentMethod}
                onClearValidation={handleClearValidation}
              />
            )}

            {/* Deposit Form */}
            <div className="bg-white dark:bg-neutral-800 rounded-xl shadow-lg p-4 md:p-8 border border-gray-200 dark:border-neutral-700">
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 md:space-y-8">
                {/* Amount Input */}
                <div>
                  <label
                    htmlFor="amount"
                    className="block text-base md:text-lg font-medium text-gray-900 dark:text-white mb-3"
                  >
                    How much would you like to deposit?
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 md:pl-4 flex items-center pointer-events-none">
                      <span className="text-gray-500 dark:text-gray-400 text-base md:text-xl">TZS</span>
                    </div>
                    <input
                      type="number"
                      id="amount"
                      step="100"
                      min="1000"
                      max="1000000"
                      {...register("amount", { valueAsNumber: true })}
                      className="block w-full pl-14 md:pl-16 text-lg md:text-xl rounded-lg md:rounded-xl border border-gray-300 dark:border-neutral-600 bg-white dark:bg-neutral-700 py-3 md:py-4 px-4 text-gray-900 dark:text-white placeholder-gray-400 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all"
                      placeholder="1000"
                    />
                  </div>
                  {errors.amount && (
                    <p className="mt-2 text-sm text-red-500 dark:text-red-400">
                      {errors.amount.message}
                    </p>
                  )}
                </div>

                {/* Quick Amount Buttons */}
                <div className="bg-gray-50 dark:bg-neutral-700/50 p-4 rounded-lg md:rounded-xl">
                  <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-3">
                    Quick Amounts
                  </h3>
                  <QuickAmounts
                    amounts={quickAmounts}
                    selectedAmount={watchedAmount}
                    onSelect={(amount) => {
                      setValue("amount", amount, { shouldValidate: true });
                      trigger("amount");
                    }}
                  />
                </div>

                {/* Phone Number Input */}
                <div>
                  <label
                    htmlFor="phoneNumber"
                    className="block text-base md:text-lg font-medium text-gray-900 dark:text-white mb-3"
                  >
                    Mobile Money Phone Number
                  </label>
                  <div className="flex rounded-lg md:rounded-xl shadow-sm">
                    <span className="inline-flex items-center rounded-l-lg md:rounded-l-xl border border-r-0 border-gray-300 dark:border-neutral-600 bg-gray-50 dark:bg-neutral-700 px-3 md:px-4 text-gray-600 dark:text-gray-300 text-base md:text-lg">
                      +255
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
                        if (validationResult) {
                          setValidationResult(null);
                        }
                      }}
                      placeholder="712345678"
                      className="block w-full rounded-r-lg md:rounded-r-xl border border-gray-300 dark:border-neutral-600 bg-white dark:bg-neutral-700 py-3 md:py-4 px-4 text-gray-900 dark:text-white placeholder-gray-400 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all"
                      disabled={!!validationResult}
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

                {/* Action Buttons */}
                <div className="space-y-4">
                  {!validationResult ? (
                    <div className="flex justify-center">
                      <button
                        type="button"
                        onClick={validatePhoneNumber}
                        disabled={isValidatingPhone || !getValues("phoneNumber")}
                        className="w-full md:w-auto inline-flex items-center justify-center px-6 md:px-8 py-3 md:py-4 bg-gradient-to-r from-primary-500 to-primary-600 text-white rounded-lg md:rounded-xl text-base md:text-lg font-semibold hover:from-primary-600 hover:to-primary-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
                      >
                        {isValidatingPhone ? (
                          <>
                            <ArrowPathIcon className="h-4 w-4 md:h-5 md:w-5 animate-spin mr-2" />
                            Validating...
                          </>
                        ) : (
                          <>
                            <DevicePhoneMobileIcon className="h-4 w-4 md:h-5 md:w-5 mr-2" />
                            Validate Phone Number
                          </>
                        )}
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-col md:flex-row gap-3">
                      <button
                        type="submit"
                        disabled={isLoading || !isValid}
                        className="flex-1 inline-flex justify-center items-center rounded-lg md:rounded-xl bg-gradient-to-r from-green-500 to-emerald-600 py-4 md:py-5 px-6 text-lg md:text-xl font-semibold text-white shadow-lg hover:from-green-600 hover:to-emerald-700 focus:outline-none focus:ring-4 focus:ring-green-500/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                      >
                        {isLoading ? (
                          <span className="flex items-center space-x-2 md:space-x-3">
                            <ArrowPathIcon className="h-5 w-5 md:h-6 md:w-6 animate-spin" />
                            <span>Processing...</span>
                          </span>
                        ) : (
                          `Deposit ${formatCurrency(watchedAmount)} TZS`
                        )}
                      </button>
                      
                      <button
                        type="button"
                        onClick={handleClearValidation}
                        className="px-4 md:px-6 py-3 md:py-4 border border-gray-300 dark:border-neutral-600 text-gray-700 dark:text-gray-300 rounded-lg md:rounded-xl text-sm md:text-base font-medium hover:bg-gray-50 dark:hover:bg-neutral-700 transition-colors"
                      >
                        Change Number
                      </button>
                    </div>
                  )}
                </div>
              </form>

              {/* Instructions */}
              <div className="mt-6 md:mt-8 pt-6 md:pt-8 border-t border-gray-200 dark:border-neutral-700">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                  <div>
                    <h4 className="text-xs md:text-sm font-medium text-gray-900 dark:text-white mb-2 md:mb-3">
                      <InformationCircleIcon className="h-4 w-4 md:h-5 md:w-5 inline mr-1 md:mr-2 text-primary-500 dark:text-primary-400" />
                      How it works:
                    </h4>
                    <ol className="text-xs md:text-sm text-gray-600 dark:text-gray-400 space-y-1 md:space-y-2 pl-2">
                      <li>1. Enter amount and phone number</li>
                      <li>2. Validate your phone number</li>
                      <li>3. Click "Deposit" button</li>
                      <li>4. Check phone for USSD prompt</li>
                      <li>5. Enter PIN to confirm payment</li>
                    </ol>
                  </div>
                  <div>
                    <h4 className="text-xs md:text-sm font-medium text-gray-900 dark:text-white mb-2 md:mb-3">
                      <ExclamationTriangleIcon className="h-4 w-4 md:h-5 md:w-5 inline mr-1 md:mr-2 text-yellow-500" />
                      Important:
                    </h4>
                    <ul className="text-xs md:text-sm text-gray-600 dark:text-gray-400 space-y-1 md:space-y-2">
                      <li>• Transactions complete in 1-2 minutes</li>
                      <li>• Ensure sufficient mobile money balance</li>
                      <li>• USSD sessions expire after 5 minutes</li>
                      <li>• Contact support for any issues</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>

            {/* Support Info */}
            <div className="mt-6 md:mt-8 bg-white dark:bg-neutral-800 rounded-xl p-4 md:p-6 border border-gray-200 dark:border-neutral-700">
              <div className="flex items-center space-x-2 md:space-x-3 mb-3 md:mb-4">
                <InformationCircleIcon className="h-5 w-5 md:h-6 md:w-6 text-primary-500" />
                <h3 className="text-base md:text-lg font-semibold text-gray-900 dark:text-white">Need Help?</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
                <div className="p-3 bg-gray-50 dark:bg-neutral-700/50 rounded-lg">
                  <h4 className="text-xs md:text-sm font-medium text-gray-900 dark:text-white mb-1 md:mb-2">Payment Issues</h4>
                  <p className="text-xs md:text-sm text-gray-600 dark:text-gray-400">
                    If payment fails, use "Force Update" to check status.
                  </p>
                </div>
                <div className="p-3 bg-gray-50 dark:bg-neutral-700/50 rounded-lg">
                  <h4 className="text-xs md:text-sm font-medium text-gray-900 dark:text-white mb-1 md:mb-2">Stuck Payments</h4>
                  <p className="text-xs md:text-sm text-gray-600 dark:text-gray-400">
                    Payments pending for over 5 minutes will show reconciliation options.
                  </p>
                </div>
                <div className="p-3 bg-gray-50 dark:bg-neutral-700/50 rounded-lg">
                  <h4 className="text-xs md:text-sm font-medium text-gray-900 dark:text-white mb-1 md:mb-2">24/7 Support</h4>
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