import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { paymentService } from "../../services/paymentService";
import { useAuth } from "../../contexts/AuthContext";
import Banner from "../../components/common/Banner";
import { formatCurrency, formatPhoneDisplay } from "../../utils/formatters";
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

// Status badge component
const StatusBadge = ({ status }) => {
  const statusConfig = {
    initiated: { color: "bg-yellow-100 text-yellow-800", text: "Initiated" },
    pending: { color: "bg-yellow-100 text-yellow-800", text: "Pending" },
    processing: { color: "bg-blue-100 text-blue-800", text: "Processing" },
    successful: { color: "bg-green-100 text-green-800", text: "Successful" },
    failed: { color: "bg-red-100 text-red-800", text: "Failed" },
    cancelled: { color: "bg-gray-100 text-gray-800", text: "Cancelled" },
    expired: { color: "bg-orange-100 text-orange-800", text: "Expired" },
  };

  const config = statusConfig[status] || statusConfig.pending;

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}
    >
      {config.text}
    </span>
  );
};

// Payment Method Card Component
const PaymentMethodCard = ({ method, isSelected, onSelect, showFee = true }) => {
  const getMethodIcon = (name) => {
    if (name.includes("TIGO")) return "🟢";
    if (name.includes("AIRTEL")) return "🔴";
    if (name.includes("MPESA")) return "🟢";
    if (name.includes("HALO")) return "🟣";
    if (name.includes("VODA")) return "🔵";
    return "📱";
  };

  const getMethodColor = (name) => {
    if (name.includes("TIGO")) return "border-green-500 hover:border-green-400";
    if (name.includes("AIRTEL")) return "border-red-500 hover:border-red-400";
    if (name.includes("MPESA")) return "border-green-500 hover:border-green-400";
    if (name.includes("HALO")) return "border-purple-500 hover:border-purple-400";
    if (name.includes("VODA")) return "border-blue-500 hover:border-blue-400";
    return "border-primary-500 hover:border-primary-400";
  };

  const getMethodBgColor = (name) => {
    if (name.includes("TIGO")) return "bg-green-500/10";
    if (name.includes("AIRTEL")) return "bg-red-500/10";
    if (name.includes("MPESA")) return "bg-green-500/10";
    if (name.includes("HALO")) return "bg-purple-500/10";
    if (name.includes("VODA")) return "bg-blue-500/10";
    return "bg-primary-500/10";
  };

  return (
    <button
      type="button"
      onClick={() => onSelect(method)}
      className={`w-full p-4 rounded-xl border-2 transition-all duration-200 ${
        isSelected
          ? `${getMethodColor(method.name)} bg-opacity-20 scale-[1.02] shadow-lg`
          : "border-neutral-600 hover:border-neutral-500 bg-neutral-800"
      } ${getMethodBgColor(method.name)}`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="text-2xl">{getMethodIcon(method.name)}</div>
          <div className="text-left">
            <h4 className="font-semibold text-white">{method.name}</h4>
            <div className="flex items-center space-x-2 mt-1">
              <span
                className={`px-2 py-1 rounded-full text-xs font-medium ${
                  method.status === "AVAILABLE"
                    ? "bg-green-500/20 text-green-400"
                    : "bg-yellow-500/20 text-yellow-400"
                }`}
              >
                {method.status}
              </span>
              {showFee && (
                <span className="text-xs text-gray-400">
                  Fee: {formatCurrency(method.fee)} TZS
                </span>
              )}
            </div>
          </div>
        </div>
        {isSelected && (
          <CheckIcon className="h-5 w-5 text-primary-500" />
        )}
      </div>
    </button>
  );
};

// Deposit status display component
const DepositStatusDisplay = ({
  status,
  orderReference,
  onCancel,
  isCancelling,
}) => {
  if (!status) return null;

  const getStatusIcon = () => {
    switch (status.deposit_status) {
      case "successful":
        return <CheckCircleIcon className="h-5 w-5 text-green-500" />;
      case "failed":
        return <XCircleIcon className="h-5 w-5 text-red-500" />;
      case "cancelled":
        return <XCircleIcon className="h-5 w-5 text-gray-500" />;
      case "expired":
        return <ExclamationTriangleIcon className="h-5 w-5 text-orange-500" />;
      default:
        return <ClockIcon className="h-5 w-5 text-yellow-500" />;
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

  return (
    <div className="bg-neutral-800 rounded-lg p-4 mb-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          {getStatusIcon()}
          <div>
            <h3 className="text-sm font-medium text-white">Deposit Status</h3>
            <div className="flex items-center space-x-2 mt-1">
              <StatusBadge status={status.deposit_status} />
              <p className="text-sm text-gray-400">{getStatusMessage()}</p>
            </div>
          </div>
        </div>

        {isCancellable && (
          <button
            onClick={onCancel}
            disabled={isCancelling}
            className="inline-flex items-center px-3 py-1.5 border border-red-600 text-red-600 rounded-md text-sm font-medium hover:bg-red-600 hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isCancelling ? (
              <ArrowPathIcon className="h-4 w-4 animate-spin mr-1" />
            ) : null}
            Cancel
          </button>
        )}
      </div>

      {orderReference && (
        <div className="mt-4 pt-4 border-t border-neutral-700">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-gray-500">Reference</p>
              <p className="text-sm text-white font-mono">{orderReference}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Amount</p>
              <p className="text-sm text-white">
                {formatCurrency(status.amount || 0)} TZS
              </p>
            </div>
          </div>
          {status.phone_number && (
            <div className="mt-2">
              <p className="text-xs text-gray-500">Phone Number</p>
              <p className="text-sm text-white">
                {formatPhoneDisplay(status.phone_number)}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// Validation Result Display Component
const ValidationResultDisplay = ({ 
  validationResult, 
  selectedMethod, 
  onSelectMethod,
  onClearValidation 
}) => {
  if (!validationResult?.valid) return null;

  const {
    available_methods = [],
    sender_details,
    message
  } = validationResult;

  return (
    <div className="bg-gradient-to-br from-neutral-800 to-neutral-900 rounded-xl p-6 mb-6 border border-neutral-700 shadow-lg">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-green-500/20 rounded-lg">
            <CheckCircleIcon className="h-6 w-6 text-green-500" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">Phone Verified ✅</h3>
            <p className="text-sm text-gray-400">{message}</p>
          </div>
        </div>
        <button
          onClick={onClearValidation}
          className="text-gray-400 hover:text-white text-sm"
        >
          Change Number
        </button>
      </div>

      {/* Account Details */}
      {sender_details && (
        <div className="mb-6 p-4 bg-neutral-800/50 rounded-lg">
          <div className="flex items-center space-x-3 mb-3">
            <UserCircleIcon className="h-5 w-5 text-primary-400" />
            <h4 className="text-sm font-medium text-white">Account Details</h4>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <p className="text-xs text-gray-500">Account Name</p>
              <p className="text-sm text-white font-medium">{sender_details.accountName}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Provider</p>
              <p className="text-sm text-white font-medium">{sender_details.accountProvider}</p>
            </div>
          </div>
        </div>
      )}

      {/* Available Payment Methods */}
      <div className="mb-4">
        <div className="flex items-center space-x-3 mb-4">
          <BanknotesIcon className="h-5 w-5 text-primary-400" />
          <h4 className="text-sm font-medium text-white">Available Payment Methods</h4>
        </div>
        
        {available_methods.length === 0 ? (
          <div className="text-center py-4">
            <ExclamationTriangleIcon className="h-8 w-8 text-yellow-500 mx-auto mb-2" />
            <p className="text-gray-400">No payment methods available for this number</p>
          </div>
        ) : (
          <div className="space-y-3">
            {available_methods.map((method) => (
              <PaymentMethodCard
                key={method.name}
                method={method}
                isSelected={selectedMethod?.name === method.name}
                onSelect={onSelectMethod}
              />
            ))}
          </div>
        )}
      </div>

      {/* Selection Status */}
      {selectedMethod && (
        <div className="p-4 bg-primary-500/10 border border-primary-500/30 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-white font-medium">Selected Method</p>
              <p className="text-primary-400 text-sm">{selectedMethod.name}</p>
              <p className="text-xs text-gray-400 mt-1">
                Transaction fee: {formatCurrency(selectedMethod.fee)} TZS
              </p>
            </div>
            <CheckIcon className="h-6 w-6 text-primary-500" />
          </div>
        </div>
      )}
    </div>
  );
};

export default function Deposit() {
  const [isLoading, setIsLoading] = useState(false);
  const [isValidatingPhone, setIsValidatingPhone] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [orderReference, setOrderReference] = useState(null);
  const [depositStatus, setDepositStatus] = useState(null);
  const [depositStats, setDepositStats] = useState(null);
  const [pollingInterval, setPollingInterval] = useState(null);
  const [recentDeposits, setRecentDeposits] = useState([]);
  
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

  // Clear validation when phone number changes
  useEffect(() => {
    if (watchedPhoneNumber && validationResult) {
      // Only clear if the phone number has changed significantly
      const currentFormatted = getFormattedPhone(watchedPhoneNumber);
      if (currentFormatted !== validationResult.formatted) {
        setValidationResult(null);
        setSelectedPaymentMethod(null);
      }
    }
  }, [watchedPhoneNumber]);

  // Load deposit stats and recent deposits
  useEffect(() => {
    loadDepositStats();
    loadRecentDeposits();
  }, []);

  // Setup polling for deposit status
  useEffect(() => {
    if (orderReference && !depositStatus?.deposit_status === "successful") {
      const interval = setInterval(() => {
        pollDepositStatus(orderReference);
      }, 5000); // Poll every 5 seconds

      setPollingInterval(interval);

      return () => {
        if (interval) clearInterval(interval);
      };
    }
  }, [orderReference]);

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

  const loadRecentDeposits = async () => {
    try {
      const history = await paymentService.getDepositHistory({ limit: 5 });
      if (history.success) {
        setRecentDeposits(history.data.deposits);
      }
    } catch (err) {
      console.error("Failed to load recent deposits:", err);
    }
  };

  const getFormattedPhone = (phone) => {
    if (!phone.startsWith("255")) {
      if (phone.startsWith("0")) {
        return `255${phone.slice(1)}`;
      }
      return `255${phone}`;
    }
    return phone;
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

      if (!data.available_methods || data.available_methods.length === 0) {
        setError("No payment methods available for this phone number. Please try another number.");
        return;
      }

      setValidationResult(data);

      // Auto-select the first available method if there's only one
      if (data.available_methods.length === 1) {
        setSelectedPaymentMethod(data.available_methods[0]);
      }

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
  };

  const onSubmit = async (data) => {
    if (!selectedPaymentMethod) {
      setError("Please select a payment method");
      return;
    }

    setIsLoading(true);
    setError("");
    setSuccess("");

    try {
      // Initiate deposit with selected payment method
      const response = await paymentService.initiateWalletDeposit(
        data.amount,
        data.phoneNumber,
        selectedPaymentMethod.name
      );

      if (!response.success) {
        throw new Error(response.error || "Failed to initiate deposit");
      }

      setOrderReference(response.data.order_reference);
      setDepositStatus({
        deposit_status: response.data.status,
        amount: response.data.amount,
        phone_number: data.phoneNumber,
        payment_method: selectedPaymentMethod.name,
      });

      setSuccess(
        `Deposit initiated! Check ${formatPhoneDisplay(data.phoneNumber)} for ${selectedPaymentMethod.name} USSD prompt.`
      );

      // Refresh stats and history
      loadDepositStats();
      loadRecentDeposits();
    } catch (err) {
      console.error("Deposit error:", err);
      setError(err.message || "Failed to process deposit. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const pollDepositStatus = async (orderRef) => {
    try {
      const status = await paymentService.checkDepositStatus(orderRef);

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

        // Refresh stats
        loadDepositStats();
        loadRecentDeposits();

        // Reset form after 5 seconds
        setTimeout(() => {
          reset();
          setOrderReference(null);
          setDepositStatus(null);
          setValidationResult(null);
          setSelectedPaymentMethod(null);
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

  const handleCancelDeposit = async () => {
    if (!orderReference) return;

    setIsCancelling(true);
    try {
      const response =
        await paymentService.cancelPendingDeposit(orderReference);

      if (!response.success) {
        throw new Error(response.error || "Failed to cancel deposit");
      }

      setSuccess("Deposit cancelled successfully.");
      if (pollingInterval) clearInterval(pollingInterval);
      setOrderReference(null);
      setDepositStatus(null);
      reset();
    } catch (err) {
      setError(err.message || "Failed to cancel deposit");
    } finally {
      setIsCancelling(false);
    }
  };

  const quickAmounts = [1000, 5000, 10000, 25000, 50000, 100000];

  const commonPhonePrefixes = [
    { label: "Vodacom", value: "25575" },
    { label: "Airtel", value: "25568" },
    { label: "Tigo", value: "25565" },
    { label: "Halotel", value: "25562" },
    { label: "TTCL", value: "25573" },
    { label: "Zantel", value: "25577" },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-neutral-900 to-neutral-800">
      <main className="mx-auto max-w-4xl py-8 px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white">Deposit Funds</h1>
          <p className="mt-2 text-gray-400">
            Add funds to your wallet using mobile money
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column: Wallet Info & Stats */}
          <div className="lg:col-span-1 space-y-6">
            {/* Current Balance Card */}
            <div className="bg-neutral-800 rounded-xl p-6 shadow-lg">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-white">
                  Current Balance
                </h2>
                <div className="bg-primary-500/20 p-2 rounded-lg">
                  <span className="text-primary-400 text-sm font-medium">
                    TZS
                  </span>
                </div>
              </div>
              <div className="mb-6">
                <p className="text-4xl font-bold text-white">
                  {formatCurrency(user?.wallet_balance || 0)}
                </p>
                <p className="text-gray-400 text-sm mt-1">
                  Available for tournaments
                </p>
              </div>

              {/* Quick Stats */}
              {depositStats && (
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400 text-sm">
                      Total Deposits
                    </span>
                    <span className="text-white font-medium">
                      {formatCurrency(depositStats.total_deposits || 0)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400 text-sm">This Month</span>
                    <span className="text-white font-medium">
                      {formatCurrency(depositStats.this_month_deposits || 0)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400 text-sm">
                      Average Deposit
                    </span>
                    <span className="text-white font-medium">
                      {formatCurrency(depositStats.average_deposit || 0)}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Recent Deposits */}
            <div className="bg-neutral-800 rounded-xl p-6 shadow-lg">
              <h3 className="text-lg font-semibold text-white mb-4">
                Recent Deposits
              </h3>
              {recentDeposits.length > 0 ? (
                <div className="space-y-3">
                  {recentDeposits.map((deposit) => (
                    <div
                      key={deposit.id}
                      className="flex items-center justify-between py-2 border-b border-neutral-700 last:border-0"
                    >
                      <div>
                        <p className="text-white font-medium">
                          {formatCurrency(deposit.amount)}
                        </p>
                        <p className="text-gray-400 text-xs">
                          {new Date(deposit.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <StatusBadge status={deposit.status} />
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-sm text-center py-4">
                  No recent deposits
                </p>
              )}
              <button
                onClick={loadRecentDeposits}
                className="mt-4 w-full text-center text-primary-500 hover:text-primary-400 text-sm font-medium"
              >
                View Full History →
              </button>
            </div>
          </div>

          {/* Right Column: Deposit Form */}
          <div className="lg:col-span-2">
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
                isCancelling={isCancelling}
              />
            )}

            {/* Security Info */}
            <Banner
              type="info"
              message="All transactions are secure and encrypted. Your payment information is never stored on our servers."
              className="mb-6"
            />

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
            <div className="bg-neutral-800 rounded-xl shadow-lg p-6">
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                {/* Amount Input */}
                <div>
                  <label
                    htmlFor="amount"
                    className="block text-sm font-medium text-white mb-2"
                  >
                    Deposit Amount (TZS)
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <span className="text-gray-400">TZS</span>
                    </div>
                    <input
                      type="number"
                      id="amount"
                      step="100"
                      min="1000"
                      max="1000000"
                      {...register("amount", { valueAsNumber: true })}
                      className="block w-full pl-12 rounded-lg border border-neutral-600 bg-neutral-700 py-3 px-4 text-white placeholder-gray-400 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500 sm:text-sm transition-all"
                      placeholder="1000"
                    />
                  </div>
                  {errors.amount && (
                    <p className="mt-2 text-sm text-red-400">
                      {errors.amount.message}
                    </p>
                  )}
                </div>

                {/* Quick Amount Buttons */}
                <div className="bg-neutral-700/50 p-4 rounded-lg">
                  <h3 className="text-sm font-medium text-white mb-3">
                    Quick Amounts
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
                    {quickAmounts.map((amount) => (
                      <button
                        key={amount}
                        type="button"
                        onClick={() => {
                          setValue("amount", amount, { shouldValidate: true });
                          trigger("amount");
                        }}
                        className={`py-2 px-3 text-sm font-medium rounded-lg transition-all ${
                          watchedAmount === amount
                            ? "bg-primary-500 text-white shadow-lg transform scale-105"
                            : "bg-neutral-600 hover:bg-neutral-500 text-white hover:shadow-md"
                        }`}
                      >
                        {formatCurrency(amount)}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Phone Number Input */}
                <div>
                  <label
                    htmlFor="phoneNumber"
                    className="block text-sm font-medium text-white mb-2"
                  >
                    Mobile Money Phone Number
                  </label>
                  <div className="flex rounded-lg shadow-sm">
                    <span className="inline-flex items-center rounded-l-lg border border-r-0 border-neutral-600 bg-neutral-700 px-4 text-gray-300">
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
                        // Clear validation if phone number changes
                        if (validationResult) {
                          setValidationResult(null);
                          setSelectedPaymentMethod(null);
                        }
                      }}
                      placeholder="712345678"
                      className="block w-full rounded-r-lg border border-neutral-600 bg-neutral-700 py-3 px-4 text-white placeholder-gray-400 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500 sm:text-sm transition-all"
                      disabled={!!validationResult}
                    />
                  </div>
                  {errors.phoneNumber && (
                    <p className="mt-2 text-sm text-red-400">
                      {errors.phoneNumber.message}
                    </p>
                  )}
                  <p className="mt-2 text-xs text-gray-400">
                    Enter your phone number without country code (e.g.,
                    712345678)
                  </p>
                </div>

                {/* Network Quick Buttons - Only show if not validated */}
                {!validationResult && (
                  <div className="bg-neutral-700/50 p-4 rounded-lg">
                    <h3 className="text-sm font-medium text-white mb-3">
                      Quick Network Selection
                    </h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
                      {commonPhonePrefixes.map((network) => (
                        <button
                          key={network.value}
                          type="button"
                          onClick={async () => {
                            const currentValue = getValues("phoneNumber") || "";
                            const baseNumber = currentValue
                              .replace(/^255[0-9]{2}/, "")
                              .slice(0, 7);
                            const newValue = `${network.value}${baseNumber}`;
                            setValue("phoneNumber", newValue, {
                              shouldValidate: true,
                            });
                            await trigger("phoneNumber");
                          }}
                          className={`py-2 px-3 text-sm font-medium rounded-lg transition-all ${
                            watchedPhoneNumber?.startsWith(network.value)
                              ? "bg-primary-500 text-white shadow-lg transform scale-105"
                              : "bg-neutral-600 hover:bg-neutral-500 text-white hover:shadow-md"
                          }`}
                        >
                          {network.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Validation Button */}
                {!validationResult ? (
                  <div className="flex justify-center">
                    <button
                      type="button"
                      onClick={validatePhoneNumber}
                      disabled={isValidatingPhone || !getValues("phoneNumber")}
                      className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-primary-500 to-primary-600 text-white rounded-lg text-base font-semibold hover:from-primary-600 hover:to-primary-700 transition-all transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                    >
                      {isValidatingPhone ? (
                        <>
                          <ArrowPathIcon className="h-5 w-5 animate-spin mr-2" />
                          Validating Phone Number...
                        </>
                      ) : (
                        <>
                          <DevicePhoneMobileIcon className="h-5 w-5 mr-2" />
                          Validate Phone Number
                        </>
                      )}
                    </button>
                  </div>
                ) : null}

                {/* Submit Button - Only show if payment method is selected */}
                {selectedPaymentMethod && (
                  <div>
                    {/* Payment Summary */}
                    <div className="mb-6 p-4 bg-neutral-800/50 rounded-lg">
                      <h4 className="text-sm font-medium text-white mb-3">
                        Payment Summary
                      </h4>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-gray-400">Deposit Amount:</span>
                          <span className="text-white">
                            {formatCurrency(watchedAmount)} TZS
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Transaction Fee:</span>
                          <span className="text-white">
                            {formatCurrency(selectedPaymentMethod.fee)} TZS
                          </span>
                        </div>
                        <div className="pt-3 border-t border-neutral-700 flex justify-between">
                          <span className="text-gray-400 font-medium">Total:</span>
                          <span className="text-lg font-bold text-white">
                            {formatCurrency(watchedAmount + selectedPaymentMethod.fee)} TZS
                          </span>
                        </div>
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={
                        isLoading ||
                        !isValid ||
                        depositStatus?.deposit_status === "processing"
                      }
                      className="flex w-full justify-center items-center rounded-lg bg-gradient-to-r from-green-500 to-emerald-600 py-4 px-6 text-lg font-semibold text-white shadow-lg hover:from-green-600 hover:to-emerald-700 focus:outline-none focus:ring-4 focus:ring-green-500/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all transform hover:scale-[1.02]"
                    >
                      {isLoading ? (
                        <span className="flex items-center space-x-3">
                          <ArrowPathIcon className="h-5 w-5 animate-spin" />
                          <span>Initiating Deposit via {selectedPaymentMethod.name}...</span>
                        </span>
                      ) : (
                        `Pay ${formatCurrency(watchedAmount + selectedPaymentMethod.fee)} TZS via ${selectedPaymentMethod.name}`
                      )}
                    </button>
                    <p className="mt-3 text-xs text-center text-gray-400">
                      By proceeding, you agree to receive a USSD prompt on your mobile phone
                    </p>
                  </div>
                )}
              </form>
            </div>

            {/* Instructions & Support */}
            <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-neutral-800 rounded-xl p-6">
                <h3 className="text-sm font-medium text-white mb-3">
                  How to Deposit:
                </h3>
                <ol className="text-sm text-gray-400 space-y-2">
                  <li className="flex items-start">
                    <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-primary-500/20 text-primary-400 text-xs font-bold mr-2">
                      1
                    </span>
                    Enter amount and phone number
                  </li>
                  <li className="flex items-start">
                    <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-primary-500/20 text-primary-400 text-xs font-bold mr-2">
                      2
                    </span>
                    Validate phone number
                  </li>
                  <li className="flex items-start">
                    <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-primary-500/20 text-primary-400 text-xs font-bold mr-2">
                      3
                    </span>
                    Select preferred payment method
                  </li>
                  <li className="flex items-start">
                    <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-primary-500/20 text-primary-400 text-xs font-bold mr-2">
                      4
                    </span>
                    Click "Pay" and check phone for USSD prompt
                  </li>
                  <li className="flex items-start">
                    <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-primary-500/20 text-primary-400 text-xs font-bold mr-2">
                      5
                    </span>
                    Enter your PIN to confirm payment
                  </li>
                </ol>
              </div>

              <div className="bg-neutral-800 rounded-xl p-6">
                <h3 className="text-sm font-medium text-white mb-3">
                  Need Help?
                </h3>
                <ul className="text-sm text-gray-400 space-y-2">
                  <li className="flex items-center">
                    <CheckCircleIcon className="h-4 w-4 text-green-500 mr-2" />
                    Transactions typically complete in 1-2 minutes
                  </li>
                  <li className="flex items-center">
                    <ExclamationTriangleIcon className="h-4 w-4 text-yellow-500 mr-2" />
                    Ensure your mobile money account has sufficient balance
                  </li>
                  <li className="flex items-center">
                    <ClockIcon className="h-4 w-4 text-blue-500 mr-2" />
                    USSD sessions expire after 5 minutes
                  </li>
                </ul>
                <div className="mt-4 pt-4 border-t border-neutral-700">
                  <a
                    href="/support"
                    className="inline-flex items-center text-primary-500 hover:text-primary-400 text-sm font-medium"
                  >
                    Contact Support →
                  </a>
                </div>
              </div>
            </div>

            {/* Terms Notice */}
            <Banner
              type="info"
              message="By depositing, you agree to our Terms of Service and Privacy Policy."
              className="mt-6"
            />
          </div>
        </div>
      </main>
    </div>
  );
}