import { useCallback, useState } from "react";
import { transactionService } from "../../services/transactionService";
import { normalizeFilters } from "../../utils/filterUtils";

export const useTransactionsQuery = ({ pagination, filters }) => {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [exporting, setExporting] = useState(false);
  const [paginationState, setPaginationState] = useState(pagination);

  const fetchTransactions = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = {
        page: paginationState.page,
        limit: paginationState.limit,
        ...normalizeFilters(filters),
      };
      const response = await transactionService.getTransactions(params);
      if (response.success) {
        setTransactions(response.data.transactions);
        setPaginationState({
          page: response.data.page,
          limit: response.data.limit,
          total: response.data.total,
          pages: response.data.pages,
        });
      } else {
        setError(response.error || "Failed to fetch transactions");
      }
    } catch (err) {
      setError(err.message || "Failed to load transactions");
    } finally {
      setLoading(false);
    }
  }, [filters, paginationState.page, paginationState.limit]);

  const exportTransactions = useCallback(async () => {
    setExporting(true);
    setError("");
    try {
      const params = normalizeFilters(filters);
      const response = await transactionService.exportTransactions(params);
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute(
        "download",
        `transactions-${new Date().toISOString().split("T")[0]}.csv`
      );
      document.body.appendChild(link);
      link.click();
      link.remove();
      return true;
    } catch (err) {
      setError(err.message || "Failed to export transactions");
      return false;
    } finally {
      setExporting(false);
    }
  }, [filters]);

  return {
    transactions,
    loading,
    error,
    exporting,
    paginationState,
    setPaginationState,
    fetchTransactions,
    exportTransactions,
    setError,
  };
};
