import { useEffect, useMemo, useRef, useState } from "react";
import { v4 as uuidv4 } from "uuid";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { paymentService } from "../../services/paymentService";
import { useAuth } from "../../contexts/AuthContext";
import Banner from "../../components/common/Banner";
import {
  getCurrencyConfig,
  getCurrentCurrency,
  getQuickAmounts,
  isMobileMoneySupported,
} from "../../config/currencyConfig";
import { createDepositSchema } from "../../schemas/createDepositSchema";
import DepositHeader from "../../components/wallet/deposit/DepositHeader";
import BalanceCard from "../../components/wallet/deposit/BalanceCard";
import DepositForm from "../../components/wallet/deposit/DepositForm";
import DepositValidation from "../../components/wallet/deposit/DepositValidation";
import DepositStatus from "../../components/wallet/deposit/DepositStatus";

const CURRENT_CURRENCY = getCurrentCurrency();
const CURRENCY_SETTINGS = getCurrencyConfig();

const isTerminalStatus = (status) =>
  ["successful", "failed", "cancelled", "expired"].includes(status);

export default function Deposit() {
  const { user, updateUser } = useAuth();
  const pollRef = useRef(null);
  const idempotencyRef = useRef(null);
  const lastAttemptRef = useRef(null);

  const [step, setStep] = useState("form");
  const [isLoading, setIsLoading] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [isReconciling, setIsReconciling] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [orderReference, setOrderReference] = useState(null);
  const [depositStatus, setDepositStatus] = useState(null);
  const [validationResult, setValidationResult] = useState(null);

  const depositSchema = createDepositSchema();

  const form = useForm({
    resolver: zodResolver(depositSchema),
    mode: "onChange",
    defaultValues: {
      amount: CURRENCY_SETTINGS.minDeposit,
      ...(isMobileMoneySupported() ? { phoneNumber: "" } : {}),
    },
  });

  const quickAmounts = useMemo(() => getQuickAmounts(), []);

  const clearPolling = () => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  };

  const normalizeStatus = (status) =>
    status === "completed" ? "successful" : status;

  const updateStatusState = (data) => {
    const normalizedStatus = normalizeStatus(data.status || data.deposit_status);
    const displayAmount = data.display_amount ?? data.amount_tzs ?? data.amount;
    const displayCurrency = data.display_currency ?? data.currency ?? CURRENT_CURRENCY.code;
    setDepositStatus({
      deposit_status: normalizedStatus,
      status: normalizedStatus,
      order_reference: data.order_reference || orderReference,
      amount_display: displayAmount,
      currency_display: displayCurrency,
      display_amount: displayAmount,
      display_currency: displayCurrency,
      phone_number: data.phone_number,
      created_at: data.created_at || new Date().toISOString(),
    });

    if (isTerminalStatus(normalizedStatus)) {
      clearPolling();
      idempotencyRef.current = null;
      lastAttemptRef.current = null;
    }
  };

  const handleValidatePhone = async () => {
    if (!isMobileMoneySupported()) {
      setValidationResult({
        valid: true,
        message: "Ready to proceed",
        available_methods: [],
      });
      setStep("validated");
      return;
    }

    const phoneNumber = form.getValues("phoneNumber");
    if (!phoneNumber) {
      setError("Please enter a phone number first");
      return;
    }

    setIsValidating(true);
    setError("");
    setValidationResult(null);

    try {
      const result = await paymentService.validatePhoneNumber(phoneNumber);
      if (!result.success) {
        throw new Error(result.error || "Validation failed");
      }

      if (!result.data.valid) {
        throw new Error(result.data.message || "Invalid phone number format");
      }

      setValidationResult(result.data);
      setStep("validated");
    } catch (err) {
      setError(err.message || "Failed to validate phone number");
    } finally {
      setIsValidating(false);
    }
  };

  const handleCreateDeposit = async () => {
    if (isMobileMoneySupported() && step !== "validated") {
      setError("Validate your phone number first");
      return;
    }

    setIsLoading(true);
    setError("");
    setSuccess("");

    try {
      const data = form.getValues();
      const attemptSignature = JSON.stringify({
        amount: data.amount,
        phoneNumber: isMobileMoneySupported() ? data.phoneNumber : null,
      });
      if (lastAttemptRef.current !== attemptSignature) {
        idempotencyRef.current = `depo_${uuidv4()}`;
        lastAttemptRef.current = attemptSignature;
      }
      const response = await paymentService.createMobileMoneyDeposit(
        data.amount,
        isMobileMoneySupported() ? data.phoneNumber : null,
        idempotencyRef.current
      );

      if (!response.success) {
        throw new Error(response.error || "Failed to initiate deposit");
      }

      setOrderReference(response.data.order_reference);
      updateStatusState(response.data);
      setStep("status");
      setSuccess("Deposit initiated successfully.");

      const walletResponse = await paymentService.getWalletBalance();
      if (walletResponse.success) {
        updateUser({
          wallet_balance: walletResponse.data.balance,
          display_balance: walletResponse.display_info?.display_balance,
          display_currency: walletResponse.display_info?.currency,
        });
      }
    } catch (err) {
      setError(err.message || "Failed to process deposit");
    } finally {
      setIsLoading(false);
    }
  };

  const pollDepositStatus = async (forceReconcile = false) => {
    if (!orderReference) return;

    try {
      const status = await paymentService.checkDepositStatus(orderReference, forceReconcile);
      if (!status.success) {
        throw new Error(status.error || "Failed to check deposit status");
      }

      updateStatusState(status.data);

      if (normalizeStatus(status.data.status) === "successful") {
        setSuccess("Deposit successful! Your wallet balance has been updated.");

        const walletResponse = await paymentService.getWalletBalance();
        if (walletResponse.success) {
          updateUser({
            wallet_balance: walletResponse.data.balance,
            display_balance: walletResponse.display_info?.display_balance,
            display_currency: walletResponse.display_info?.currency,
          });
        }
      }
    } catch (err) {
      console.error("Status check error:", err);
    }
  };

  const handleReconcileStatus = async () => {
    setIsReconciling(true);
    try {
      await pollDepositStatus(false);
    } finally {
      setIsReconciling(false);
    }
  };

  const handleForceReconcile = async () => {
    setIsReconciling(true);
    try {
      const result = await paymentService.reconcileDepositStatus(orderReference);
      if (!result.success) {
        throw new Error(result.error || "Failed to reconcile payment status");
      }
      await pollDepositStatus(false);
    } catch (err) {
      setError(err.message || "Failed to force reconcile payment");
    } finally {
      setIsReconciling(false);
    }
  };

  const handleCancelDeposit = async () => {
    if (!orderReference) return;

    setIsCancelling(true);
    try {
      const response = await paymentService.cancelPendingDeposit(orderReference);
      if (!response.success) {
        throw new Error(response.error || "Failed to cancel deposit");
      }
      setSuccess("Deposit cancelled successfully.");
      clearPolling();
      setOrderReference(null);
      setDepositStatus(null);
      setStep("form");
      form.reset();
      idempotencyRef.current = null;
      lastAttemptRef.current = null;
    } catch (err) {
      setError(err.message || "Failed to cancel deposit");
    } finally {
      setIsCancelling(false);
    }
  };

  useEffect(() => {
    if (!orderReference || isTerminalStatus(depositStatus?.status)) {
      return clearPolling();
    }

    clearPolling();
    pollRef.current = setInterval(() => {
      pollDepositStatus(false);
    }, 10000);

    return () => clearPolling();
  }, [orderReference]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gradient-to-b dark:from-neutral-900 dark:to-neutral-800 safe-padding">
      <main className="mx-auto max-w-4xl py-6 px-4">
        <DepositHeader
          currencyCode={CURRENT_CURRENCY.code}
          currencyName={CURRENT_CURRENCY.name}
          subtitle={
            isMobileMoneySupported()
              ? "Add funds using mobile money."
              : "Add funds using available payment methods."
          }
        />

        <div className="mb-6">
          <BalanceCard
            balance={user?.wallet_balance || 0}
            currencyCode={CURRENT_CURRENCY.code}
          />
        </div>

        {error && (
          <Banner
            type="error"
            title="Error"
            message={error}
            onClose={() => setError("")}
            className="mb-4"
          />
        )}

        {success && (
          <Banner
            type="success"
            title="Success"
            message={success}
            className="mb-4"
          />
        )}

        {step === "status" && (
          <DepositStatus
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

        {step === "validated" && (
          <DepositValidation
            validationResult={validationResult}
            onClear={() => {
              setValidationResult(null);
              setStep("form");
            }}
            onSubmit={handleCreateDeposit}
            isLoading={isLoading}
          />
        )}

        {step === "form" && (
          <div className="bg-white dark:bg-neutral-800 rounded-xl shadow-lg p-4 md:p-6 border border-gray-200 dark:border-neutral-700">
            <DepositForm
              form={form}
              currencySymbol={CURRENT_CURRENCY.symbol}
              settings={CURRENCY_SETTINGS}
              quickAmounts={quickAmounts}
              showPhone={isMobileMoneySupported()}
              onValidate={handleValidatePhone}
              isValidating={isValidating}
              isSubmitEnabled={!isMobileMoneySupported() || !!form.getValues("phoneNumber")}
            />
          </div>
        )}
      </main>
    </div>
  );
}
