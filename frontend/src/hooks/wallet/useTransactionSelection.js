import { useMemo, useState } from "react";
import { isPending } from "../../utils/transactionUiUtils";

export const useTransactionSelection = (transactions) => {
  const [selectedTransactions, setSelectedTransactions] = useState(new Set());

  const toggleSelection = (transactionId) => {
    const next = new Set(selectedTransactions);
    if (next.has(transactionId)) {
      next.delete(transactionId);
    } else {
      next.add(transactionId);
    }
    setSelectedTransactions(next);
  };

  const clearSelection = () => {
    setSelectedTransactions(new Set());
  };

  const selectAllPending = () => {
    const pendingIds = transactions
      .filter((t) => isPending(t.status))
      .map((t) => t.id);
    setSelectedTransactions(new Set(pendingIds));
  };

  const pendingCount = useMemo(
    () => transactions.filter((t) => isPending(t.status)).length,
    [transactions]
  );

  const stuckCount = useMemo(
    () =>
      transactions.filter((t) =>
        isPending(t.status) && new Date() - new Date(t.created_at) > 5 * 60 * 1000
      ).length,
    [transactions]
  );

  return {
    selectedTransactions,
    toggleSelection,
    clearSelection,
    selectAllPending,
    pendingCount,
    stuckCount,
    setSelectedTransactions,
  };
};
