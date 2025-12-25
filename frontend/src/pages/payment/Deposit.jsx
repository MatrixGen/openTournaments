import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { paymentService } from "../../services/paymentService";
import { useAuth } from "../../contexts/AuthContext";
import Banner from "../../components/common/Banner";
import { 
  formatPhoneDisplay, 
  // Remove formatCurrency import from here
} from "../../utils/formatters";
import {
 
  ArrowPathIcon,
  ExclamationTriangleIcon,
  CheckIcon,
  DevicePhoneMobileIcon,
  InformationCircleIcon,
  
  CurrencyDollarIcon,
} from "@heroicons/react/24/outline";

// Import currency configuration
import { 
  getCurrencyConfig, 
  getCurrentCurrency, 
  formatCurrency as formatCurrency,
  getQuickAmounts,
  isMobileMoneySupported, 
} from "../../config/currencyConfig";
import { createDepositSchema } from "../../schemas/createDepositSchema";
import StatusBadge from "../../components/payments/StatusBadge";
import DepositStatusDisplay from "../../components/payments/DepositStatusDisplay";
import QuickAmounts from "../../components/payments/QuickAmounts";
import ValidationResultDisplay from "../../components/payments/ValidationStatusDisplay";

// Get current currency settings
const CURRENT_CURRENCY = getCurrentCurrency();
const CURRENCY_SETTINGS = getCurrencyConfig();




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


  // New states for validation and payment method selection
  const [validationResult, setValidationResult] = useState(null);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState(null);

  const { user, updateUser } = useAuth();

  // Create dynamic schema based on currency
  const depositSchema = createDepositSchema();

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
      amount: CURRENCY_SETTINGS.minDeposit,
      ...(isMobileMoneySupported() ? { phoneNumber: "" } : {}),
    },
  });

  const watchedAmount = watch("amount");
  
  

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
    // Only validate phone number if mobile money is supported
    if (!isMobileMoneySupported()) {
      // For non-mobile money currencies, proceed directly
      setValidationResult({
        valid: true,
        message: "Proceed with deposit",
        available_methods: [
          {
            name: `${CURRENT_CURRENCY.name} Payment`,
            type: "currency",
            status: "AVAILABLE"
          }
        ]
      });
      return;
    }

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
    
  };

// In your Deposit component, update the onSubmit function:
const onSubmit = async (data) => {
  setIsLoading(true);
  setError("");
  setSuccess("");

  try {
    const response = await paymentService.createMobileMoneyDeposit(
      data.amount,
      isMobileMoneySupported() ? data.phoneNumber : null,
      CURRENT_CURRENCY.code // Pass the current currency code
    );

    if (!response.success) {
      throw new Error(response.error || "Failed to initiate deposit");
    }

    setOrderReference(response.data.order_reference);
    setDepositStatus({
      deposit_status: response.data.status,
      amount: response.data.amount_usd, // This is in USD
      display_amount: response.data?.amount_tzs, // Display amount in user's currency
      phone_number: isMobileMoneySupported() ? data.phoneNumber : null,
      created_at: new Date().toISOString(),
      original_currency: CURRENT_CURRENCY.code,
    });

    setSuccess(
      `Deposit initiated! ${
        isMobileMoneySupported()
          ? `Check ${formatPhoneDisplay(data.phoneNumber)} for USSD prompt.`
          : `Check your payment method for confirmation.`
      }`
    );

    // Refresh stats and history
    loadDepositStats();
    
    // Refresh user balance
    const walletResponse = await paymentService.getWalletBalance();
    if (walletResponse.success) {
      // Use display balance for user context
      updateUser({ 
        wallet_balance: walletResponse.data.balance,
        display_balance: walletResponse.display_info?.display_balance,
        display_currency: walletResponse.display_info?.currency
      });
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
        throw new Error(status.error ||"Failed to check deposit status");
      }

      console.log(status.data);
      
      setDepositStatus({ 
        deposit_status: status.data.status,
        //wallet_balance :status.data?.transaction.balance_before,
        amount: status.data.amount_usd, // This is in USD
        display_amount: status.data?.amount_tzs, // Display amount in user's currency
       // phone_number: status.data?.recipient.phone_number ,
        created_at: new Date().toISOString(),
        original_currency: CURRENT_CURRENCY.code
      });

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
      
    } catch (err) {
      setError(err.message || "Failed to cancel deposit");
    } finally {
      setIsCancelling(false);
    }
  };

  // Get quick amounts for current currency
  const quickAmounts = getQuickAmounts();

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gradient-to-b dark:from-neutral-900 dark:to-neutral-800 safe-padding">
      <main className="mx-auto max-w-6xl py-4 md:py-8 px-3 sm:px-4 lg:px-8">
        {/* Mobile Stepper */}
        
        {/* Header - Mobile Optimized */}
        <div className="text-center mb-6">
          <div className="flex items-center justify-center space-x-2 mb-2">
            <CurrencyDollarIcon className="h-6 w-6 md:h-8 md:w-8 text-primary-500" />
            <h1 className="text-2xl md:text-4xl font-bold text-gray-900 dark:text-gray-900 dark:text-white">Deposit Funds</h1>
          </div>
          <div className="flex items-center justify-center mb-3">
            <span className="inline-flex items-center px-3 py-1 rounded-full bg-primary-100 dark:bg-primary-900/30 text-primary-800 dark:text-primary-300 text-sm font-medium">
              {CURRENT_CURRENCY.code} - {CURRENT_CURRENCY.name}
            </span>
          </div>
          <p className="text-sm md:text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto px-4">
            {isMobileMoneySupported() 
              ? "Add funds to your wallet using mobile money. All transactions are secure and encrypted."
              : "Add funds to your wallet using secure payment methods. All transactions are encrypted."}
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
                  {formatCurrency(user?.wallet_balance || 0,'USD')}
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
                      <span className="text-gray-900 dark:text-gray-900 dark:text-white font-medium">
                        {formatCurrency(depositStats.total_deposits || 0,'USD')}
                      </span>
                    </div>
                  </div>
                  <div className="p-3 bg-gray-50 dark:bg-neutral-700/50 rounded-lg">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600 dark:text-gray-400 text-sm">This Month</span>
                      <span className="text-gray-900 dark:text-gray-900 dark:text-white font-medium">
                        {formatCurrency(depositStats.this_month_deposits || 0,'USD')}
                      </span>
                    </div>
                  </div>
                  <div className="p-3 bg-gray-50 dark:bg-neutral-700/50 rounded-lg">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600 dark:text-gray-400 text-sm">
                        Average Deposit
                      </span>
                      <span className="text-gray-900 dark:text-gray-900 dark:text-white font-medium">
                        {formatCurrency(depositStats.average_deposit || 0,'USD')}
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
                  <p className="text-2xl font-bold text-gray-900 dark:text-gray-900 dark:text-white">
                    {formatCurrency(user?.wallet_balance || 0,'USD')}
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
                    className="block text-base md:text-lg font-medium text-gray-900 dark:text-gray-900 dark:text-white mb-3"
                  >
                    How much would you like to deposit?
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
                      step={CURRENCY_SETTINGS.step}
                      min={CURRENCY_SETTINGS.minDeposit}
                      max={CURRENCY_SETTINGS.maxDeposit}
                      {...register("amount", { valueAsNumber: true })}
                      className="block w-full pl-14 md:pl-16 text-lg md:text-xl rounded-lg md:rounded-xl border border-gray-300 dark:border-neutral-600 bg-white dark:bg-neutral-700 py-3 md:py-4 px-4 text-gray-900 dark:text-gray-900 dark:text-white placeholder-gray-400 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all"
                      placeholder={CURRENCY_SETTINGS.minDeposit.toString()}
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
                  <h3 className="text-sm font-medium text-gray-900 dark:text-gray-900 dark:text-white mb-3">
                    Quick Amounts
                  </h3>
                  <QuickAmounts
                    amounts={quickAmounts}
                    selectedAmount={watchedAmount}
                    onSelect={(amount) => {
                      setValue("amount", amount, { shouldValidate: true });
                      trigger("amount");
                    }}
                    currencySymbol={CURRENT_CURRENCY.symbol}
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                    Min: {formatCurrency(CURRENCY_SETTINGS.minDeposit)} | Max: {formatCurrency(CURRENCY_SETTINGS.maxDeposit)}
                  </p>
                </div>

                {/* Phone Number Input (only if mobile money supported) */}
                {isMobileMoneySupported() && (
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
                          if (validationResult) {
                            setValidationResult(null);
                          }
                        }}
                        placeholder="712345678"
                        className="block w-full rounded-r-lg md:rounded-r-xl border border-gray-300 dark:border-neutral-600 bg-white dark:bg-neutral-700 py-3 md:py-4 px-4 text-gray-900 dark:text-gray-900 dark:text-white placeholder-gray-400 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all"
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
                )}

                {/* Action Buttons */}
                <div className="space-y-4">
                  {!validationResult ? (
                    <div className="flex justify-center">
                      <button
                        type="button"
                        onClick={validatePhoneNumber}
                        disabled={isValidatingPhone || (isMobileMoneySupported() && !getValues("phoneNumber"))}
                        className="w-full md:w-auto inline-flex items-center justify-center px-6 md:px-8 py-3 md:py-4 bg-gradient-to-r from-primary-500 to-primary-600 text-gray-900 dark:text-white rounded-lg md:rounded-xl text-base md:text-lg font-semibold hover:from-primary-600 hover:to-primary-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
                      >
                        {isValidatingPhone ? (
                          <>
                            <ArrowPathIcon className="h-4 w-4 md:h-5 md:w-5 animate-spin mr-2" />
                            Validating...
                          </>
                        ) : (
                          <>
                            {isMobileMoneySupported() ? (
                              <>
                                <DevicePhoneMobileIcon className="h-4 w-4 md:h-5 md:w-5 mr-2" />
                                Validate Phone Number
                              </>
                            ) : (
                              <>
                                <CheckIcon className="h-4 w-4 md:h-5 md:w-5 mr-2" />
                                Continue to Payment
                              </>
                            )}
                          </>
                        )}
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-col md:flex-row gap-3">
                      <button
                        type="submit"
                        disabled={isLoading || !isValid}
                        className="flex-1 inline-flex justify-center items-center rounded-lg md:rounded-xl bg-gradient-to-r from-green-500 to-emerald-600 py-4 md:py-5 px-6 text-lg md:text-xl font-semibold text-gray-900 dark:text-white shadow-lg hover:from-green-600 hover:to-emerald-700 focus:outline-none focus:ring-4 focus:ring-green-500/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                      >
                        {isLoading ? (
                          <span className="flex items-center space-x-2 md:space-x-3">
                            <ArrowPathIcon className="h-5 w-5 md:h-6 md:w-6 animate-spin" />
                            <span>Processing...</span>
                          </span>
                        ) : (
                          `Deposit ${formatCurrency(watchedAmount)}`
                        )}
                      </button>
                      
                      <button
                        type="button"
                        onClick={handleClearValidation}
                        className="px-4 md:px-6 py-3 md:py-4 border border-gray-300 dark:border-neutral-600 text-gray-700 dark:text-gray-300 rounded-lg md:rounded-xl text-sm md:text-base font-medium hover:bg-gray-50 dark:hover:bg-neutral-700 transition-colors"
                      >
                        {isMobileMoneySupported() ? 'Change Number' : 'Change Amount'}
                      </button>
                    </div>
                  )}
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
                      {isMobileMoneySupported() ? (
                        <>
                          <li>1. Enter amount and phone number</li>
                          <li>2. Validate your phone number</li>
                          <li>3. Click "Deposit" button</li>
                          <li>4. Check phone for USSD prompt</li>
                          <li>5. Enter PIN to confirm payment</li>
                        </>
                      ) : (
                        <>
                          <li>1. Enter deposit amount</li>
                          <li>2. Continue to payment gateway</li>
                          <li>3. Complete payment securely</li>
                          <li>4. Funds added instantly</li>
                        </>
                      )}
                    </ol>
                  </div>
                  <div>
                    <h4 className="text-xs md:text-sm font-medium text-gray-900 dark:text-gray-900 dark:text-white mb-2 md:mb-3">
                      <ExclamationTriangleIcon className="h-4 w-4 md:h-5 md:w-5 inline mr-1 md:mr-2 text-yellow-500" />
                      Important:
                    </h4>
                    <ul className="text-xs md:text-sm text-gray-600 dark:text-gray-400 space-y-1 md:space-y-2">
                      {isMobileMoneySupported() ? (
                        <>
                          <li>• Transactions complete in 1-2 minutes</li>
                          <li>• Ensure sufficient mobile money balance</li>
                          <li>• USSD sessions expire after 5 minutes</li>
                          <li>• Contact support for any issues</li>
                        </>
                      ) : (
                        <>
                          <li>• Transactions processed instantly</li>
                          <li>• Secure payment processing</li>
                          <li>• No additional fees</li>
                          <li>• Contact support for any issues</li>
                        </>
                      )}
                    </ul>
                  </div>
                </div>
              </div>
            </div>

            {/* Support Info */}
            <div className="mt-6 md:mt-8 bg-white dark:bg-neutral-800 rounded-xl p-4 md:p-6 border border-gray-200 dark:border-neutral-700">
              <div className="flex items-center space-x-2 md:space-x-3 mb-3 md:mb-4">
                <InformationCircleIcon className="h-5 w-5 md:h-6 md:w-6 text-primary-500" />
                <h3 className="text-base md:text-lg font-semibold text-gray-900 dark:text-gray-900 dark:text-white">Need Help?</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
                <div className="p-3 bg-gray-50 dark:bg-neutral-700/50 rounded-lg">
                  <h4 className="text-xs md:text-sm font-medium text-gray-900 dark:text-gray-900 dark:text-white mb-1 md:mb-2">Payment Issues</h4>
                  <p className="text-xs md:text-sm text-gray-600 dark:text-gray-400">
                    If payment fails, use "Force Update" to check status.
                  </p>
                </div>
                <div className="p-3 bg-gray-50 dark:bg-neutral-700/50 rounded-lg">
                  <h4 className="text-xs md:text-sm font-medium text-gray-900 dark:text-gray-900 dark:text-white mb-1 md:mb-2">Stuck Payments</h4>
                  <p className="text-xs md:text-sm text-gray-600 dark:text-gray-400">
                    Payments pending for over 5 minutes will show reconciliation options.
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