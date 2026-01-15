import { useEffect, useMemo, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { payoutService } from "../../services/payoutService";
import { useAuth } from "../../contexts/AuthContext";
import Banner from "../../components/common/Banner";
import {
  getCurrentCurrency,
  getCurrencyConfig,
  isMobileMoneySupported,
  getWithdrawalSettings,
  formatCurrency as configFormatCurrency,
} from "../../config/currencyConfig";
import WithdrawalHeader from "../../components/wallet/WithdrawalHeader";
import BalanceCard from "../../components/wallet/BalanceCard";
import MethodCards from "../../components/wallet/MethodCards";
import WithdrawalForm from "../../components/wallet/WithdrawalForm";
import WithdrawalPreview from "../../components/wallet/WithdrawalPreview";
import WithdrawalStatus from "../../components/wallet/WithdrawalStatus";
import { BuildingLibraryIcon, DevicePhoneMobileIcon } from "@heroicons/react/24/outline";

const CURRENT_CURRENCY = getCurrentCurrency();
const CURRENCY_SETTINGS = getCurrencyConfig();
const WITHDRAWAL_SETTINGS = getWithdrawalSettings();

const buildSchema = (method, mobileEnabled, bankEnabled) => {
  const minAmount =
    method === "bank_transfer"
      ? WITHDRAWAL_SETTINGS.minBankWithdrawal
      : WITHDRAWAL_SETTINGS.minMobileMoneyWithdrawal;
  const maxAmount =
    method === "bank_transfer"
      ? WITHDRAWAL_SETTINGS.maxBankWithdrawal
      : WITHDRAWAL_SETTINGS.maxMobileMoneyWithdrawal;

  const base = {
    amount: z
      .number({ invalid_type_error: "Amount is required" })
      .min(minAmount, `Minimum withdrawal is ${configFormatCurrency(minAmount)}`)
      .max(maxAmount, `Maximum withdrawal is ${configFormatCurrency(maxAmount)}`),
  };

  if (mobileEnabled && method === "mobile_money") {
    base.phoneNumber = z
      .string()
      .regex(/^\d{9}$/, "Enter a valid 9-digit phone number")
      .transform((val) => (val.startsWith("0") ? `255${val.slice(1)}` : `255${val}`));
  }

  if (bankEnabled && method === "bank_transfer") {
    base.accountNumber = z
      .string()
      .min(5, "Account number must be at least 5 digits")
      .max(20, "Account number is too long");
    base.accountName = z
      .string()
      .min(2, "Account name must be at least 2 characters")
      .max(100, "Account name is too long");
  }

  return z.object(base);
};

export default function Withdrawal() {
  const { user, updateUser } = useAuth();
  const pollingRef = useRef(null);

  const mobileEnabled = isMobileMoneySupported();
  const bankEnabled = CURRENCY_SETTINGS.paymentMethods?.includes("bank_transfer");
  const bankTemporarilyUnavailable = true;
  const bankEnabledForForm = bankEnabled && !bankTemporarilyUnavailable;

  const methods = useMemo(
    () =>
      [
        mobileEnabled && {
          id: "mobile_money",
          name: "Mobile Money",
          description: "Withdraw to your mobile money account",
          icon: DevicePhoneMobileIcon,
        },
        bankEnabled && {
          id: "bank_transfer",
          name: "Bank Transfer",
          description: bankTemporarilyUnavailable
            ? "Temporarily unavailable"
            : "Withdraw to your bank account",
          icon: BuildingLibraryIcon,
          disabled: bankTemporarilyUnavailable,
        },
      ].filter(Boolean),
    [mobileEnabled, bankEnabled, bankTemporarilyUnavailable]
  );

  const [step, setStep] = useState("form");
  const [selectedMethod, setSelectedMethod] = useState(
    mobileEnabled ? "mobile_money" : "bank_transfer"
  );
  const [previewResult, setPreviewResult] = useState(null);
  const [statusResult, setStatusResult] = useState(null);
  const [orderReference, setOrderReference] = useState(null);
  const [recipientSummary, setRecipientSummary] = useState(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);

  const schema = useMemo(
    () => buildSchema(selectedMethod, mobileEnabled, bankEnabledForForm),
    [selectedMethod, mobileEnabled, bankEnabledForForm]
  );

  const form = useForm({
    resolver: zodResolver(schema),
    mode: "onChange",
    defaultValues: {
      amount: mobileEnabled
        ? WITHDRAWAL_SETTINGS.minMobileMoneyWithdrawal
        : WITHDRAWAL_SETTINGS.minBankWithdrawal,
      phoneNumber: "",
      accountNumber: "",
      accountName: "",
    },
  });

  const clearPolling = () => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  };

  const resetFlow = () => {
    setStep("form");
    setPreviewResult(null);
    setStatusResult(null);
    setOrderReference(null);
    setRecipientSummary(null);
    setError("");
    setSuccess("");
    clearPolling();
  };

  const handleSelectMethod = (method) => {
    if (method === "bank_transfer" && bankTemporarilyUnavailable) {
      return;
    }
    setSelectedMethod(method);
    resetFlow();
    form.reset({
      amount:
        method === "bank_transfer"
          ? WITHDRAWAL_SETTINGS.minBankWithdrawal
          : WITHDRAWAL_SETTINGS.minMobileMoneyWithdrawal,
      phoneNumber: "",
      accountNumber: "",
      accountName: "",
    });
  };

  const handlePreview = form.handleSubmit(async (data) => {
    setIsLoading(true);
    setError("");
    setSuccess("");

    try {
      let previewResponse;

      if (selectedMethod === "mobile_money") {
        previewResponse = await payoutService.previewMobileMoneyPayout(
          data.amount,
          data.phoneNumber
        );
        setRecipientSummary({ phone_number: data.phoneNumber });
      } else {
        previewResponse = await payoutService.previewBankPayout(
          data.amount,
          data.accountNumber,
          data.accountName
        );
        setRecipientSummary({
          account_number: data.accountNumber,
          account_name: data.accountName,
        });
      }

      if (!previewResponse.success) {
        throw new Error(previewResponse.error || "Preview failed");
      }

      setPreviewResult(previewResponse.data);
      setStep("preview");
      setSuccess("Preview generated successfully.");
    } catch (err) {
      setError(err.message || "Failed to generate withdrawal preview.");
    } finally {
      setIsLoading(false);
    }
  });

  const handleConfirmWithdrawal = async () => {
    if (!previewResult?.preview_reference) {
      setError("Preview reference is missing. Please try again.");
      return;
    }

    setIsConfirming(true);
    setError("");

    try {
      let createResponse;
      if (selectedMethod === "mobile_money") {
        createResponse = await payoutService.createMobileMoneyPayout(
          previewResult.preview_reference
        );
      } else {
        createResponse = await payoutService.createBankPayout(
          previewResult.preview_reference
        );
      }

      if (!createResponse.success) {
        throw new Error(createResponse.error || "Withdrawal creation failed");
      }

      setOrderReference(createResponse.data.order_reference);
      setStatusResult({
        status: createResponse.data.status,
        ...recipientSummary,
      });
      setStep("status");
      setPreviewResult(null);
      setSuccess("Withdrawal initiated successfully.");

      const walletResponse = await payoutService.getWalletBalance();
      if (walletResponse.success) {
        updateUser({ wallet_balance: walletResponse.data.balance });
      }
    } catch (err) {
      setError(err.message || "Failed to process withdrawal.");
    } finally {
      setIsConfirming(false);
    }
  };

  const handleCancelPreview = () => {
    setPreviewResult(null);
    setRecipientSummary(null);
    setStep("form");
  };

  const pollWithdrawalStatus = async () => {
    if (!orderReference) return;

    try {
      const status = await payoutService.getPayoutStatus(orderReference);
      if (!status.success) {
        throw new Error(status.error || "Failed to check withdrawal status");
      }

      setStatusResult(status.data);

      if (["successful", "failed", "cancelled", "reversed", "refunded"].includes(status.data.status)) {
        clearPolling();
      }
    } catch (err) {
      setError(err.message || "Failed to check withdrawal status");
    }
  };

  const handleCheckStatus = async () => {
    setIsChecking(true);
    await pollWithdrawalStatus();
    setIsChecking(false);
  };

  const handleCancelWithdrawal = async () => {
    if (!orderReference) return;
    setIsCancelling(true);
    try {
      const response = await payoutService.cancelPendingWithdrawal(orderReference);
      if (!response.success) {
        throw new Error(response.error || "Failed to cancel withdrawal");
      }
      setSuccess("Withdrawal cancelled successfully.");
      await pollWithdrawalStatus();
    } catch (err) {
      setError(err.message || "Failed to cancel withdrawal");
    } finally {
      setIsCancelling(false);
    }
  };

  useEffect(() => {
    if (step === "status" && orderReference) {
      clearPolling();
      pollingRef.current = setInterval(() => {
        pollWithdrawalStatus();
      }, 15000);
    }

    return () => clearPolling();
  }, [step, orderReference]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gradient-to-b dark:from-neutral-900 dark:to-neutral-800 safe-padding">
      <main className="mx-auto max-w-4xl py-6 px-4">
        <WithdrawalHeader
          currencyCode={CURRENT_CURRENCY.code}
          currencyName={CURRENT_CURRENCY.name}
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

        {step === "form" && (
          <div className="bg-white dark:bg-neutral-800 rounded-xl shadow-lg p-4 md:p-6 border border-gray-200 dark:border-neutral-700">
            <div className="mb-6">
              <MethodCards
                methods={methods}
                selectedMethod={selectedMethod}
                onSelect={handleSelectMethod}
              />
            </div>
            <WithdrawalForm
              form={form}
              selectedMethod={selectedMethod}
              settings={WITHDRAWAL_SETTINGS}
              currencySymbol={CURRENT_CURRENCY.symbol}
              isLoading={isLoading}
              isValid={form.formState.isValid}
              onSubmit={handlePreview}
              showBankFields={bankEnabledForForm}
              showMobileFields={mobileEnabled}
            />
          </div>
        )}

        {step === "preview" && (
          <WithdrawalPreview
            preview={previewResult}
            onConfirm={handleConfirmWithdrawal}
            onCancel={handleCancelPreview}
            isConfirming={isConfirming}
          />
        )}

        {step === "status" && (
          <WithdrawalStatus
            status={statusResult?.status}
            orderReference={orderReference}
            recipient={recipientSummary}
            onCancel={handleCancelWithdrawal}
            onCheckStatus={handleCheckStatus}
            isCancelling={isCancelling}
            isChecking={isChecking}
            canCancel={["previewed", "pending", "processing", "initiated", "authorized"].includes(
              statusResult?.status
            )}
            balance={user?.wallet_balance}
          />
        )}
      </main>
    </div>
  );
}
