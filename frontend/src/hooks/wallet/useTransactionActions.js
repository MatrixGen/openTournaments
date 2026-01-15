import { useCallback, useState } from "react";
import { transactionService } from "../../services/transactionService";
import { payoutService } from "../../services/payoutService";

export const useTransactionActions = ({ onSuccess, onError, onRefresh }) => {
  const [isReconciling, setIsReconciling] = useState(false);
  const [batchReconciling, setBatchReconciling] = useState(false);

  const reconcileOne = useCallback(
    async (transactionId, orderReference) => {
      setIsReconciling(true);
      try {
        const result = await transactionService.reconcileTransaction(
          transactionId
        );
        if (result.success) {
          if (result.reconciled) {
            onSuccess?.(`Transaction ${orderReference} reconciled successfully`);
          } else {
            onSuccess?.(
              `Transaction ${orderReference} status is already up to date`
            );
          }
          onRefresh?.();
        } else {
          onError?.(result.error || "Failed to reconcile transaction");
        }
      } catch (err) {
        onError?.(err.message || "Failed to reconcile transaction");
      } finally {
        setIsReconciling(false);
      }
    },
    [onError, onRefresh, onSuccess]
  );

  const reconcileBatch = useCallback(
    async (transactionIds) => {
      if (transactionIds.length === 0) {
        onError?.("Please select at least one transaction to reconcile");
        return;
      }

      setBatchReconciling(true);
      try {
        const result = await transactionService.batchReconcileTransactions(
          transactionIds
        );
        if (result.success) {
          onSuccess?.(
            `Successfully reconciled ${result.reconciled} transaction(s)`
          );
          onRefresh?.();
        } else {
          onError?.(result.error || "Failed to batch reconcile transactions");
        }
      } catch (err) {
        onError?.(err.message || "Failed to batch reconcile transactions");
      } finally {
        setBatchReconciling(false);
      }
    },
    [onError, onRefresh, onSuccess]
  );

  const cancelWithdrawal = useCallback(
    async (orderReference) => {
      setIsReconciling(true);
      try {
        const result = await payoutService.cancelPendingWithdrawal(
          orderReference
        );
        if (result.success) {
          onSuccess?.(`Transaction ${orderReference} was canceled successfully`);
          onRefresh?.();
        } else {
          onError?.(
            result.error ||
              `Unexpected error while cancelling ${orderReference}`
          );
        }
      } catch {
        onError?.("Unexpected error occurred, please try again later");
      } finally {
        setIsReconciling(false);
      }
    },
    [onError, onRefresh, onSuccess]
  );

  return {
    reconcileOne,
    reconcileBatch,
    cancelWithdrawal,
    isReconciling,
    batchReconciling,
  };
};
