import { useEffect, useMemo, useRef, useState } from "react";
import Banner from "../../components/common/Banner";
import TransactionsHeader from "../../components/wallet/transactions/TransactionsHeader";
import TransactionStatsGrid from "../../components/wallet/transactions/TransactionStatsGrid";
import BulkActionsBar from "../../components/wallet/transactions/BulkActionsBar";
import TransactionList from "../../components/wallet/transactions/TransactionList";
import PaginationBar from "../../components/wallet/transactions/PaginationBar";
import MobileFAB from "../../components/wallet/transactions/MobileFAB";
import MobileFilterDrawer from "../../components/wallet/transactions/MobileFilterDrawer";
import TransactionDetailsModal from "../../components/wallet/transactions/TransactionDetailsModal";
import { useTransactionsQuery } from "../../hooks/wallet/useTransactionsQuery";
import { useTransactionStats } from "../../hooks/wallet/useTransactionStats";
import { useTransactionSelection } from "../../hooks/wallet/useTransactionSelection";
import { useTransactionActions } from "../../hooks/wallet/useTransactionActions";

export default function Transactions() {
  const filterButtonRef = useRef(null);
  const [filters, setFilters] = useState({
    type: "all",
    status: "all",
    period: "month",
    minAmount: "",
    maxAmount: "",
    startDate: "",
    endDate: "",
    search: "",
  });
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [showMobileActions, setShowMobileActions] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [success, setSuccess] = useState("");

  const {
    transactions,
    loading,
    error,
    exporting,
    paginationState,
    setPaginationState,
    fetchTransactions,
    exportTransactions,
    setError,
  } = useTransactionsQuery({
    pagination: { page: 1, limit: 10, total: 0, pages: 0 },
    filters,
  });

  const { stats, fetchStats } = useTransactionStats(filters.period);

  const {
    selectedTransactions,
    toggleSelection,
    clearSelection,
    setSelectedTransactions,
  } = useTransactionSelection(transactions);

  const { reconcileOne, reconcileBatch, cancelWithdrawal, isReconciling, batchReconciling } =
    useTransactionActions({
      onSuccess: (message) => setSuccess(message),
      onError: (message) => setError(message),
      onRefresh: () => {
        fetchTransactions();
        fetchStats();
      },
    });

  useEffect(() => {
    fetchTransactions();
    fetchStats();
  }, [fetchTransactions, fetchStats]);

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPaginationState((prev) => ({ ...prev, page: 1 }));
  };

  const handleResetFilters = () => {
    setFilters({
      type: "all",
      status: "all",
      period: "month",
      minAmount: "",
      maxAmount: "",
      startDate: "",
      endDate: "",
      search: "",
    });
    setPaginationState((prev) => ({ ...prev, page: 1 }));
  };

  const handleBatchReconcile = async () => {
    await reconcileBatch(Array.from(selectedTransactions));
    setSelectedTransactions(new Set());
    setShowMobileActions(false);
  };

  const handleExport = async () => {
    const successExport = await exportTransactions();
    if (successExport) {
      setSuccess("Transactions exported successfully");
    }
  };

  const handleViewDetails = (transaction) => {
    setSelectedTransaction(transaction);
    setShowDetailsModal(true);
  };

  const totalSelected = selectedTransactions.size;
  const listPagination = useMemo(() => ({
    page: paginationState.page,
    limit: paginationState.limit,
    total: paginationState.total,
    pages: paginationState.pages,
  }), [paginationState]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gradient-to-b dark:from-neutral-900 dark:to-neutral-800 safe-padding">
      <main className="mx-auto max-w-7xl py-4 md:py-8 px-3 sm:px-4 lg:px-8">
        <TransactionsHeader
          loading={loading}
          exporting={exporting}
          onRefresh={fetchTransactions}
          onExport={handleExport}
          onOpenFilters={() => setShowMobileFilters(true)}
          filterButtonRef={filterButtonRef}
          onToggleStats={() => setShowStats((prev) => !prev)}
        />

        {showStats && <TransactionStatsGrid stats={stats} />}

        {error && (
          <Banner
            type="error"
            title="Error"
            message={error}
            onClose={() => setError("")}
            className="mb-6"
          />
        )}

        {success && (
          <Banner
            type="success"
            title="Success"
            message={success}
            onClose={() => setSuccess("")}
            className="mb-6"
          />
        )}

        <BulkActionsBar
          selectedCount={totalSelected}
          onClear={clearSelection}
          onBatchReconcile={handleBatchReconcile}
          batchReconciling={batchReconciling}
          className="hidden md:block"
        />

        <div className="bg-white dark:bg-neutral-800 rounded-xl border border-gray-200 dark:border-neutral-700 overflow-hidden">
          <TransactionList
            transactions={transactions}
            loading={loading}
            pagination={listPagination}
            onReconcile={reconcileOne}
            onCancel={cancelWithdrawal}
            onViewDetails={handleViewDetails}
            isReconciling={isReconciling}
            selectedTransactions={selectedTransactions}
            onToggleSelect={toggleSelection}
          />

          {transactions.length > 0 && (
            <PaginationBar
              pagination={listPagination}
              loading={loading}
              onPageChange={(page) =>
                setPaginationState((prev) => ({ ...prev, page }))
              }
            />
          )}
        </div>
      </main>

      <MobileFAB
        showActions={showMobileActions}
        onToggle={() => setShowMobileActions(!showMobileActions)}
        selectedCount={totalSelected}
        onClear={clearSelection}
        onBatchReconcile={handleBatchReconcile}
        batchReconciling={batchReconciling}
      />

      <MobileFilterDrawer
        isOpen={showMobileFilters}
        onClose={() => setShowMobileFilters(false)}
        filters={filters}
        onFilterChange={handleFilterChange}
        onReset={handleResetFilters}
        anchorRef={filterButtonRef}
      />

      <TransactionDetailsModal
        transaction={selectedTransaction}
        isOpen={showDetailsModal}
        onClose={() => setShowDetailsModal(false)}
        onReconcile={reconcileOne}
        isReconciling={isReconciling}
      />
    </div>
  );
}
