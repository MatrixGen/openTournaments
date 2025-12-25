import { useState, useEffect, useMemo, useCallback } from "react";
import { transactionService } from "../../services/transactionService";
import Banner from "../../components/common/Banner";
import {
  formatCurrency,
  formatDate,
  getPaymentStatusColor,
  getPaymentStatusBgColor,
} from "../../utils/formatters";
import {
  ArrowPathIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  BanknotesIcon,
  ArrowDownTrayIcon,
  ChevronUpIcon,
  ChevronDownIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  EyeIcon,
  DocumentDuplicateIcon,
  ChartBarIcon,
  CurrencyDollarIcon,
  GiftIcon,
  UsersIcon,
  XMarkIcon,
  Bars3Icon,
  AdjustmentsHorizontalIcon,
} from "@heroicons/react/24/outline";
import payoutService from "../../services/payoutService";

// Status Badge Component
const StatusBadge = ({ status }) => {
  const statusConfig = {
    initiated: { color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300", text: "Initiated" },
    pending: { color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300", text: "Pending" },
    processing: { color: "bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300", text: "Processing" },
    completed: { color: "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300", text: "Successful" },
    failed: { color: "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300", text: "Failed" },
    cancelled: { color: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300", text: "Cancelled" },
    expired: { color: "bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-300", text: "Expired" },
    refunded: { color: "bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-300", text: "Refunded" },
    reversed: { color: "bg-pink-100 text-pink-800 dark:bg-pink-900/20 dark:text-pink-300", text: "Reversed" },
  };

  const config = statusConfig[status] || statusConfig.pending;

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 md:px-3 md:py-1 rounded-full text-xs font-medium ${config.color}`}
    >
      {config.text}
    </span>
  );
};

// Transaction Type Badge
const TypeBadge = ({ type }) => {
  const typeConfig = {
    wallet_deposit: { color: "bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300", text: "Deposit", icon: ArrowDownTrayIcon },
    wallet_withdrawal: { color: "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300", text: "Withdrawal", icon: ChevronUpIcon },
    tournament_entry: { color: "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300", text: "Tournament", icon: UsersIcon },
    prize_win: { color: "bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-300", text: "Prize", icon: CurrencyDollarIcon },
    refund: { color: "bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-300", text: "Refund", icon: ArrowPathIcon },
    bonus: { color: "bg-pink-100 text-pink-800 dark:bg-pink-900/20 dark:text-pink-300", text: "Bonus", icon: GiftIcon },
  };

  const config = typeConfig[type] || { color: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300", text: type, icon: DocumentDuplicateIcon };
  const Icon = config.icon;

  return (
    <span
      className={`inline-flex items-center px-1.5 py-0.5 md:px-2 md:py-1 rounded-md text-xs font-medium ${config.color}`}
    >
      <Icon className="h-3 w-3 mr-1" />
      {config.text}
    </span>
  );
};

// Transaction Item Component - Mobile Optimized
const TransactionItem = ({
  transaction,
  onReconcile,
  onCancel,
  onViewDetails,
  isReconciling,
  isSelected,
  onToggleSelect,
}) => {
  const {
    id,
    order_reference,
    type,
    amount,
    status,
    created_at,
    balance_before,
    balance_after,
   // gateway_status,
    metadata,
  } = transaction;

  const isPending = ["pending", "processing", "initiated"].includes(status);
  const isStuck = isPending && new Date() - new Date(created_at) > 5 * 60 * 1000;
  const canReconcile = isPending && type === "wallet_deposit";
  const canCancel = isPending && type === "wallet_withdrawal"

  return (
    <div className={`bg-white dark:bg-neutral-800 rounded-lg border border-gray-200 dark:border-neutral-700 hover:border-gray-300 dark:hover:border-neutral-600 transition-colors ${isSelected ? 'ring-2 ring-primary-500 dark:ring-primary-600' : ''}`}>
      <div className="p-3 md:p-4">
        <div className="flex items-start justify-between">
          {/* Selection checkbox - hidden on desktop */}
          <div className="md:hidden mr-2 mt-1">
            <input
              type="checkbox"
              checked={isSelected}
              onChange={() => onToggleSelect(id)}
              className="h-4 w-4 rounded border-gray-300 dark:border-neutral-600 bg-white dark:bg-neutral-700 text-primary-600 dark:text-primary-500 focus:ring-primary-500"
            />
          </div>
          
          <div className="flex items-start space-x-3 flex-1 min-w-0">
            <div className={`p-2 rounded-lg ${getPaymentStatusBgColor(status)} flex-shrink-0`}>
              <BanknotesIcon className={`h-5 w-5 ${getPaymentStatusColor(status)}`} />
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-1.5 mb-2">
                <TypeBadge type={type} />
                <StatusBadge status={status} />
                {isStuck && (
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded-md text-xs font-medium bg-yellow-500/20 text-yellow-600 dark:text-yellow-400">
                    <ExclamationTriangleIcon className="h-3 w-3 mr-1" />
                    Stuck
                  </span>
                )}
              </div>
              
              <div className="space-y-2 md:space-y-0 md:grid md:grid-cols-2 lg:grid-cols-3 gap-2 mb-2">
                <div className="truncate">
                  <p className="text-xs text-gray-500 dark:text-gray-400">Reference</p>
                  <p className="text-sm text-gray-900 dark:text-gray-900 dark:text-white font-mono truncate">{order_reference}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Amount</p>
                  <p className={`text-base md:text-lg font-semibold ${amount >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                    {amount >= 0 ? '+' : ''}{formatCurrency(amount,'USD')}
                  </p>
                </div>
                <div className="md:col-span-2 lg:col-span-1">
                  <p className="text-xs text-gray-500 dark:text-gray-400">Date</p>
                  <p className="text-sm text-gray-900 dark:text-gray-900 dark:text-white">{formatDate(created_at)}</p>
                </div>
              </div>
              
              {metadata?.phone_number && (
                <div className="mb-2">
                  <p className="text-xs text-gray-500 dark:text-gray-400">Phone Number</p>
                  <p className="text-sm text-gray-900 dark:text-gray-900 dark:text-white">{metadata.phone_number}</p>
                </div>
              )}
            </div>
          </div>
          
          <div className="flex items-center space-x-1 ml-2 flex-shrink-0">
            <button
              onClick={() => onViewDetails(transaction)}
              className="p-1.5 md:p-2 text-gray-400 hover:text-gray-700 dark:hover:text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-neutral-700 rounded-lg transition-colors"
              title="View Details"
            >
              <EyeIcon className="h-4 w-4" />
            </button>
            
            {canReconcile && (
              <button
                onClick={() => onReconcile(id, order_reference)}
                disabled={isReconciling}
                className={`p-1.5 md:p-2 rounded-lg transition-colors ${
                  isStuck
                    ? 'bg-yellow-500/20 text-yellow-600 dark:text-yellow-500 hover:bg-yellow-500/30'
                    : 'bg-blue-500/20 text-blue-600 dark:text-blue-500 hover:bg-blue-500/30'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
                title={isStuck ? "Force Reconcile" : "Check Status"}
              >
                <ArrowPathIcon className={`h-4 w-4 ${isReconciling ? 'animate-spin' : ''}`} />
              </button>
            )}

            {canCancel && (
              <button
                onClick={() => onCancel(order_reference)}
                disabled={isReconciling}
                className={`p-1.5 md:p-2 rounded-lg transition-colors ${
                  isStuck
                    ? 'bg-yellow-500/20 text-yellow-600 dark:text-yellow-500 hover:bg-yellow-500/30'
                    : 'bg-blue-500/20 text-blue-600 dark:text-blue-500 hover:bg-blue-500/30'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
                title={isStuck ? "Force Reconcile" : "Check Status"}
              >
                <ArrowPathIcon className={`h-4 w-4 ${isReconciling ? 'animate-spin' : ''}`} />
              </button>
            )}
          </div>
        </div>
        
        {balance_before !== undefined && balance_after !== undefined && (
          <div className="mt-3 pt-3 border-t border-gray-200 dark:border-neutral-700">
            <div className="flex items-center justify-between text-xs md:text-sm">
              <div className="truncate">
                <span className="text-gray-500 dark:text-gray-400">Before:</span>
                <span className="ml-1 text-gray-900 dark:text-gray-900 dark:text-white">{formatCurrency(balance_before,'USD')}</span>
              </div>
              <ArrowDownTrayIcon className="h-3 w-3 md:h-4 md:w-4 text-gray-400 dark:text-gray-500 mx-2 flex-shrink-0" />
              <div className="truncate">
                <span className="text-gray-500 dark:text-gray-400">After:</span>
                <span className="ml-1 text-gray-900 dark:text-gray-900 dark:text-white font-semibold">
                  {formatCurrency(balance_after,'USD')}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Mobile Filter Drawer
const MobileFilterDrawer = ({ isOpen, onClose, filters, onFilterChange, onReset }) => {
  const statusOptions = [
    { value: 'all', label: 'All Statuses' },
    { value: 'pending', label: 'Pending' },
    { value: 'processing', label: 'Processing' },
    { value: 'completed', label: 'Successful' },
    { value: 'failed', label: 'Failed' },
    { value: 'cancelled', label: 'Cancelled' },
  ];
  
  const typeOptions = [
    { value: 'all', label: 'All Types' },
    { value: 'wallet_deposit', label: 'Deposits' },
    { value: 'wallet_withdrawal', label: 'Withdrawals' },
    { value: 'tournament_entry', label: 'Tournament Entries' },
    { value: 'prize_win', label: 'Prize Wins' },
  ];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 md:hidden">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <div className="fixed inset-y-0 right-0 w-full max-w-sm bg-white dark:bg-neutral-800 shadow-xl">
        <div className="flex flex-col h-full">
          <div className="px-4 py-4 border-b border-gray-200 dark:border-neutral-700 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-900 dark:text-white">Filters</h3>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-900 dark:text-white"
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>
          
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Transaction Type
              </label>
              <select
                value={filters.type}
                onChange={(e) => onFilterChange('type', e.target.value)}
                className="w-full bg-white dark:bg-neutral-700 border border-gray-300 dark:border-neutral-600 rounded-lg px-3 py-2 text-gray-900 dark:text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                {typeOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Status
              </label>
              <select
                value={filters.status}
                onChange={(e) => onFilterChange('status', e.target.value)}
                className="w-full bg-white dark:bg-neutral-700 border border-gray-300 dark:border-neutral-600 rounded-lg px-3 py-2 text-gray-900 dark:text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                {statusOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Period
              </label>
              <select
                value={filters.period}
                onChange={(e) => onFilterChange('period', e.target.value)}
                className="w-full bg-white dark:bg-neutral-700 border border-gray-300 dark:border-neutral-600 rounded-lg px-3 py-2 text-gray-900 dark:text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                <option value="today">Today</option>
                <option value="week">This Week</option>
                <option value="month">This Month</option>
                <option value="year">This Year</option>
                <option value="all">All Time</option>
              </select>
            </div>
            
            <div className="pt-4 border-t border-gray-200 dark:border-neutral-700">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Search Reference
              </label>
              <div className="relative">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  value={filters.search || ''}
                  onChange={(e) => onFilterChange('search', e.target.value)}
                  placeholder="Search references..."
                  className="w-full bg-white dark:bg-neutral-700 border border-gray-300 dark:border-neutral-600 rounded-lg pl-10 pr-4 py-2 text-gray-900 dark:text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>
          
          <div className="px-4 py-4 border-t border-gray-200 dark:border-neutral-700 space-y-3">
            <button
              onClick={onReset}
              className="w-full px-4 py-2.5 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-neutral-600 rounded-lg hover:bg-gray-50 dark:hover:bg-neutral-700"
            >
              Reset Filters
            </button>
            <button
              onClick={onClose}
              className="w-full px-4 py-2.5 bg-primary-600 text-gray-900 dark:text-white rounded-lg hover:bg-primary-700"
            >
              Apply Filters
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Statistics Component - Mobile Optimized
const TransactionStats = ({ stats }) => {
  if (!stats) return null;
  
  const statCards = [
    {
      title: "Total",
      value: stats.total_transactions,
      change: stats.transactions_change,
      icon: DocumentDuplicateIcon,
      color: "bg-blue-100 dark:bg-blue-900/20",
      iconColor: "text-blue-600 dark:text-blue-400",
    },
    {
      title: "Volume",
      value: formatCurrency(stats.total_volume,'USD'),
      change: stats.volume_change,
      icon: CurrencyDollarIcon,
      color: "bg-green-100 dark:bg-green-900/20",
      iconColor: "text-green-600 dark:text-green-400",
    },
    {
      title: "Pending",
      value: stats.pending_transactions,
      change: null,
      icon: ClockIcon,
      color: "bg-yellow-100 dark:bg-yellow-900/20",
      iconColor: "text-yellow-600 dark:text-yellow-400",
    },
    {
      title: "Success Rate",
      value: `${stats.success_rate}%`,
      change: stats.success_rate_change,
      icon: CheckCircleIcon,
      color: "bg-emerald-100 dark:bg-emerald-900/20",
      iconColor: "text-emerald-600 dark:text-emerald-400",
    },
  ];
  
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3 md:gap-4 mb-6">
      {statCards.map((stat, index) => (
        <div key={index} className="bg-white dark:bg-neutral-800 rounded-xl p-3 md:p-4 border border-gray-200 dark:border-neutral-700">
          <div className="flex items-center justify-between mb-2">
            <div className={`p-1.5 md:p-2 rounded-lg ${stat.color}`}>
              <stat.icon className={`h-4 w-4 md:h-5 md:w-5 ${stat.iconColor}`} />
            </div>
            {stat.change !== null && (
              <span className={`text-xs font-medium ${stat.change >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                {stat.change >= 0 ? '+' : ''}{stat.change}%
              </span>
            )}
          </div>
          <div>
            <p className="text-lg md:text-2xl font-bold text-gray-900 dark:text-gray-900 dark:text-white truncate">{stat.value}</p>
            <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400 truncate">{stat.title}</p>
          </div>
        </div>
      ))}
    </div>
  );
};

// Main Transactions Page Component - Mobile Optimized
export default function Transactions() {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    pages: 0,
  });
  const [stats, setStats] = useState(null);
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [isReconciling, setIsReconciling] = useState(false);
  const [batchReconciling, setBatchReconciling] = useState(false);
  const [selectedTransactions, setSelectedTransactions] = useState(new Set());
  const [exporting, setExporting] = useState(false);
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [showMobileActions, setShowMobileActions] = useState(false);
  
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

  // Mobile view state
  const [isMobileView, setIsMobileView] = useState(window.innerWidth < 768);
  
  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      setIsMobileView(window.innerWidth < 768);
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Fetch transactions
  const fetchTransactions = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        page: pagination.page,
        limit: pagination.limit,
        ...filters,
      };
      
      Object.keys(params).forEach(key => {
        if (params[key] === "all" || params[key] === "") {
          delete params[key];
        }
      });
      
      const response = await transactionService.getTransactions(params);
      
      if (response.success) {
        setTransactions(response.data.transactions);
        setPagination({
          page: response.data.page,
          limit: response.data.limit,
          total: response.data.total,
          pages: response.data.pages,
        });
      } else {
        setError(response.error || "Failed to fetch transactions");
      }
    } catch (err) {
      console.error("Fetch transactions error:", err);
      setError(err.message || "Failed to load transactions");
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.limit, filters]);
  
  // Fetch statistics
  const fetchStats = useCallback(async () => {
    try {
      const statsResponse = await transactionService.getTransactionStats({
        period: filters.period,
      });
      
      if (statsResponse.success) {
        setStats(statsResponse.data);
      }
    } catch (err) {
      console.error("Fetch stats error:", err);
    }
  }, [filters.period]);
  
  // Load data on mount and when filters change
  useEffect(() => {
    fetchTransactions();
    fetchStats();
  }, [fetchTransactions, fetchStats]);
  
  // Handle filter changes
  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPagination(prev => ({ ...prev, page: 1 }));
  };
  
  // Reset filters
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
    setPagination(prev => ({ ...prev, page: 1 }));
  };
  
  // Reconcile single transaction
  const handleReconcileTransaction = async (transactionId, orderReference) => {
    setIsReconciling(true);
    try {
      const result = await transactionService.reconcileTransaction(transactionId);
      
      if (result.success) {
        if (result.reconciled) {
          setSuccess(`Transaction ${orderReference} reconciled successfully`);
        } else {
          setSuccess(`Transaction ${orderReference} status is already up to date`);
        }
        
        fetchTransactions();
        fetchStats();
      } else {
        setError(result.error || "Failed to reconcile transaction");
      }
    } catch (err) {
      setError(err.message || "Failed to reconcile transaction");
    } finally {
      setIsReconciling(false);
    }
  };

  const handleCancelWithdrawal = async (orderReference)=>{
    setIsReconciling(true);
    try{
      const result = await payoutService.cancelPendingWithdrawal(orderReference)
      if (result.success){
        setSuccess(`Transaction ${orderReference} was canceled successfully `)
      }else {
        setError(`unexpected error occur while cancelling transaction ${orderReference}`)
      }
    }
    catch{
      setError(`unexpected error occured !, please try again later`)
    }finally{
      setIsReconciling(false)
    }
  }
  
  // Batch reconcile selected transactions
  const handleBatchReconcile = async () => {
    if (selectedTransactions.size === 0) {
      setError("Please select at least one transaction to reconcile");
      return;
    }
    
    setBatchReconciling(true);
    try {
      const transactionIds = Array.from(selectedTransactions);
      const result = await transactionService.batchReconcileTransactions(transactionIds);
      
      if (result.success) {
        setSuccess(`Successfully reconciled ${result.reconciled} transaction(s)`);
        setSelectedTransactions(new Set());
        setShowMobileActions(false);
        
        fetchTransactions();
        fetchStats();
      } else {
        setError(result.error || "Failed to batch reconcile transactions");
      }
    } catch (err) {
      setError(err.message || "Failed to batch reconcile transactions");
    } finally {
      setBatchReconciling(false);
    }
  };
  
  // Export transactions
  const handleExportTransactions = async () => {
    setExporting(true);
    try {
      const params = { ...filters };
      Object.keys(params).forEach(key => {
        if (params[key] === "all" || params[key] === "") {
          delete params[key];
        }
      });
      
      const response = await transactionService.exportTransactions(params);
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `transactions-${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      
      setSuccess("Transactions exported successfully");
    } catch  {
      setError("Failed to export transactions");
    } finally {
      setExporting(false);
    }
  };
  
  // Toggle transaction selection
  const toggleTransactionSelection = (transactionId) => {
    const newSelection = new Set(selectedTransactions);
    if (newSelection.has(transactionId)) {
      newSelection.delete(transactionId);
    } else {
      newSelection.add(transactionId);
    }
    setSelectedTransactions(newSelection);
  };
  
  // Select all pending transactions
  const selectAllPending = () => {
    const pendingIds = transactions
      .filter(t => ["pending", "processing", "initiated"].includes(t.status))
      .map(t => t.id);
    setSelectedTransactions(new Set(pendingIds));
  };
  
  // Clear selection
  const clearSelection = () => {
    setSelectedTransactions(new Set());
    setShowMobileActions(false);
  };
  
  // View transaction details
  const handleViewDetails = (transaction) => {
    setSelectedTransaction(transaction);
    setShowDetailsModal(true);
  };
  
  // Get pending transactions count
  const pendingCount = useMemo(() => {
    return transactions.filter(t => ["pending", "processing", "initiated"].includes(t.status)).length;
  }, [transactions]);
  
  // Get stuck transactions count
  const stuckCount = useMemo(() => {
    return transactions.filter(t => {
      const isPending = ["pending", "processing", "initiated"].includes(t.status);
      const isStuck = isPending && new Date() - new Date(t.created_at) > 5 * 60 * 1000;
      return isStuck;
    }).length;
  }, [transactions]);

  // Mobile floating action button
  const MobileFAB = () => (
    <div className="fixed bottom-20 right-4 z-40 md:hidden">
      <div className="flex flex-col items-end space-y-2">
        {showMobileActions && (
          <>
            <button
              onClick={clearSelection}
              className="px-4 py-2 bg-gray-700 text-gray-900 dark:text-white rounded-lg shadow-lg transform transition-all duration-200 hover:scale-105"
            >
              Clear
            </button>
            <button
              onClick={handleBatchReconcile}
              disabled={batchReconciling}
              className="px-4 py-2 bg-blue-600 text-gray-900 dark:text-white rounded-lg shadow-lg transform transition-all duration-200 hover:scale-105 disabled:opacity-50"
            >
              Reconcile {selectedTransactions.size}
            </button>
          </>
        )}
        
        <button
          onClick={() => setShowMobileActions(!showMobileActions)}
          className="p-4 bg-primary-600 text-gray-900 dark:text-white rounded-full shadow-lg transform transition-all duration-200 hover:scale-105"
        >
          <Bars3Icon className="h-6 w-6" />
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gradient-to-b dark:from-neutral-900 dark:to-neutral-800 safe-padding">
      <main className="mx-auto max-w-7xl py-4 md:py-8 px-3 sm:px-4 lg:px-8">
        {/* Header - Mobile Optimized */}
        <div className="mb-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between space-y-4 md:space-y-0">
            <div>
              <h1 className="text-xl md:text-3xl font-bold text-gray-900 dark:text-gray-900 dark:text-white">Transactions</h1>
              <p className="mt-1 md:mt-2 text-sm md:text-base text-gray-600 dark:text-gray-400">
                View and manage all transactions
              </p>
            </div>
            
            <div className="flex items-center space-x-2">
              {/* Mobile filter button */}
              <button
                onClick={() => setShowMobileFilters(true)}
                className="md:hidden p-2.5 bg-white dark:bg-neutral-800 border border-gray-300 dark:border-neutral-700 rounded-lg text-gray-700 dark:text-gray-300"
              >
                <AdjustmentsHorizontalIcon className="h-5 w-5" />
              </button>
              
              <button
                onClick={fetchTransactions}
                disabled={loading}
                className="inline-flex items-center px-3 md:px-4 py-2 bg-primary-600 text-gray-900 dark:text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50"
              >
                <ArrowPathIcon className={`h-4 w-4 md:h-4 md:w-4 mr-1 md:mr-2 ${loading ? 'animate-spin' : ''}`} />
                <span className="hidden md:inline">Refresh</span>
              </button>
              
              <button
                onClick={handleExportTransactions}
                disabled={exporting || transactions.length === 0}
                className="hidden md:inline-flex items-center px-4 py-2 bg-white dark:bg-neutral-800 border border-gray-300 dark:border-neutral-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-neutral-700 transition-colors disabled:opacity-50"
              >
                <ArrowDownTrayIcon className={`h-4 w-4 mr-2 ${exporting ? 'animate-spin' : ''}`} />
                Export
              </button>
            </div>
          </div>
        </div>
        
        {/* Stats */}
        <TransactionStats stats={stats} />
        
        {/* Error/Success Banners */}
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
            className="mb-6"
          />
        )}
        
        {/* Bulk Actions - Desktop */}
        {selectedTransactions.size > 0 && !isMobileView && (
          <div className="mb-6 bg-gradient-to-r from-blue-500/10 to-blue-600/10 dark:from-blue-500/20 dark:to-blue-600/20 border border-blue-500/30 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-blue-500/20 rounded-lg">
                  <ArrowPathIcon className="h-5 w-5 text-blue-600 dark:text-blue-500" />
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-900 dark:text-gray-900 dark:text-white">
                    {selectedTransactions.size} transaction(s) selected
                  </h3>
                  <p className="text-xs text-blue-600 dark:text-blue-400">
                    Ready for batch operations
                  </p>
                </div>
              </div>
              
              <div className="flex items-center space-x-3">
                <button
                  onClick={clearSelection}
                  className="px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-900 dark:text-white"
                >
                  Clear
                </button>
                
                <button
                  onClick={handleBatchReconcile}
                  disabled={batchReconciling}
                  className="inline-flex items-center px-4 py-2 bg-blue-600 text-gray-900 dark:text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  <ArrowPathIcon className={`h-4 w-4 mr-2 ${batchReconciling ? 'animate-spin' : ''}`} />
                  Reconcile {selectedTransactions.size} Transaction(s)
                </button>
              </div>
            </div>
          </div>
        )}
        
        {/* Quick Actions - Mobile Cards */}
        <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          <button
            onClick={selectAllPending}
            disabled={pendingCount === 0}
            className="p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-xl text-left hover:bg-yellow-500/20 transition-colors disabled:opacity-50"
          >
            <div className="flex items-center space-x-3">
              <ClockIcon className="h-5 w-5 text-yellow-600 dark:text-yellow-500" />
              <div>
                <h4 className="text-sm font-medium text-gray-900 dark:text-gray-900 dark:text-white">Select All Pending</h4>
                <p className="text-xs text-yellow-600 dark:text-yellow-400">{pendingCount} pending</p>
              </div>
            </div>
          </button>
          
          <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl">
            <div className="flex items-center space-x-3">
              <ExclamationTriangleIcon className="h-5 w-5 text-red-600 dark:text-red-500" />
              <div>
                <h4 className="text-sm font-medium text-gray-900 dark:text-gray-900 dark:text-white">Stuck Transactions</h4>
                <p className="text-xs text-red-600 dark:text-red-400">{stuckCount} stuck for over 5 minutes</p>
              </div>
            </div>
          </div>
          
          <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-xl">
            <div className="flex items-center space-x-3">
              <CheckCircleIcon className="h-5 w-5 text-green-600 dark:text-green-500" />
              <div>
                <h4 className="text-sm font-medium text-gray-900 dark:text-gray-900 dark:text-white">Success Rate</h4>
                <p className="text-xs text-green-600 dark:text-green-400">
                  {stats?.success_rate || 0}% successful
                </p>
              </div>
            </div>
          </div>
        </div>
        
        {/* Transactions List */}
        <div className="bg-white dark:bg-neutral-800 rounded-xl border border-gray-200 dark:border-neutral-700 overflow-hidden">
          <div className="px-4 md:px-6 py-4 border-b border-gray-200 dark:border-neutral-700">
            <div className="flex flex-col md:flex-row md:items-center justify-between space-y-3 md:space-y-0">
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-900 dark:text-white">Transactions</h2>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Showing {transactions.length} of {pagination.total}
                </p>
              </div>
              
              <div className="flex items-center space-x-4">
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  Page {pagination.page} of {pagination.pages}
                </div>
              </div>
            </div>
          </div>
          
          {loading ? (
            <div className="py-12 md:py-20 text-center">
              <ArrowPathIcon className="h-8 w-8 animate-spin text-primary-600 dark:text-primary-500 mx-auto" />
              <p className="mt-3 text-gray-600 dark:text-gray-400">Loading transactions...</p>
            </div>
          ) : transactions.length === 0 ? (
            <div className="py-12 md:py-20 text-center">
              <BanknotesIcon className="h-10 w-10 md:h-12 md:w-12 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-900 dark:text-white mb-2">No transactions found</h3>
              <p className="text-gray-600 dark:text-gray-500 max-w-md mx-auto px-4">
                {filters.status !== 'all' || filters.type !== 'all' 
                  ? 'Try adjusting your filters to see more results'
                  : 'No transactions available yet'}
              </p>
            </div>
          ) : (
            <>
              <div className="divide-y divide-gray-200 dark:divide-neutral-700">
                {transactions.map((transaction) => (
                  <TransactionItem
                    key={transaction.id}
                    transaction={transaction}
                    onReconcile={handleReconcileTransaction}
                    onCancel ={handleCancelWithdrawal}
                    onViewDetails={handleViewDetails}
                    isReconciling={isReconciling}
                    isSelected={selectedTransactions.has(transaction.id)}
                    onToggleSelect={toggleTransactionSelection}
                  />
                ))}
              </div>
              
              {/* Pagination - Mobile Optimized */}
              <div className="px-4 md:px-6 py-4 border-t border-gray-200 dark:border-neutral-700">
                <div className="flex flex-col sm:flex-row items-center justify-between space-y-4 sm:space-y-0">
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    Showing {(pagination.page - 1) * pagination.limit + 1} to{" "}
                    {Math.min(pagination.page * pagination.limit, pagination.total)} of{" "}
                    {pagination.total}
                  </div>
                  
                  <div className="flex items-center space-x-1">
                    <button
                      onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                      disabled={pagination.page <= 1 || loading}
                      className="px-3 py-1.5 bg-white dark:bg-neutral-700 border border-gray-300 dark:border-neutral-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-neutral-600 disabled:opacity-50"
                    >
                      Prev
                    </button>
                    
                    <div className="hidden sm:flex items-center space-x-1 mx-2">
                      {Array.from({ length: Math.min(3, pagination.pages) }, (_, i) => {
                        let pageNum;
                        if (pagination.pages <= 3) {
                          pageNum = i + 1;
                        } else if (pagination.page <= 2) {
                          pageNum = i + 1;
                        } else if (pagination.page >= pagination.pages - 1) {
                          pageNum = pagination.pages - 2 + i;
                        } else {
                          pageNum = pagination.page - 1 + i;
                        }
                        
                        return (
                          <button
                            key={pageNum}
                            onClick={() => setPagination(prev => ({ ...prev, page: pageNum }))}
                            className={`w-8 h-8 rounded-lg ${
                              pagination.page === pageNum
                                ? 'bg-primary-600 text-gray-900 dark:text-white'
                                : 'bg-white dark:bg-neutral-700 border border-gray-300 dark:border-neutral-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-neutral-600'
                            }`}
                          >
                            {pageNum}
                          </button>
                        );
                      })}
                    </div>
                    
                    <button
                      onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                      disabled={pagination.page >= pagination.pages || loading}
                      className="px-3 py-1.5 bg-white dark:bg-neutral-700 border border-gray-300 dark:border-neutral-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-neutral-600 disabled:opacity-50"
                    >
                      Next
                    </button>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
        
        {/* Help Section - Mobile Stacked */}
        <div className="mt-8 space-y-6 md:space-y-0 md:grid md:grid-cols-2 gap-6">
          <div className="bg-white dark:bg-neutral-800 rounded-xl p-4 md:p-6 border border-gray-200 dark:border-neutral-700">
            <h3 className="text-sm font-medium text-gray-900 dark:text-gray-900 dark:text-white mb-3">
              About Transaction Reconciliation
            </h3>
            <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1.5">
              <li>• Use "Reconcile" to check latest status from ClickPesa</li>
              <li>• Stuck transactions can be force-reconciled</li>
              <li>• Batch reconcile multiple transactions at once</li>
              <li>• Check gateway status for discrepancies</li>
            </ul>
          </div>
          
          <div className="bg-white dark:bg-neutral-800 rounded-xl p-4 md:p-6 border border-gray-200 dark:border-neutral-700">
            <h3 className="text-sm font-medium text-gray-900 dark:text-gray-900 dark:text-white mb-3">
              Common Issues & Solutions
            </h3>
            <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1.5">
              <li><strong>Pending too long:</strong> Reconcile to check status</li>
              <li><strong>Status mismatch:</strong> Gateway differs from local</li>
              <li><strong>Missing transactions:</strong> Check filters and refresh</li>
              <li><strong>Balance not updated:</strong> Contact support</li>
            </ul>
          </div>
        </div>
      </main>
      
      {/* Mobile Floating Action Button */}
      <MobileFAB />
      
      {/* Mobile Filter Drawer */}
      <MobileFilterDrawer
        isOpen={showMobileFilters}
        onClose={() => setShowMobileFilters(false)}
        filters={filters}
        onFilterChange={handleFilterChange}
        onReset={handleResetFilters}
      />
      
      {/* Transaction Details Modal - Mobile Optimized */}
      {showDetailsModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" aria-hidden="true">
              <div className="absolute inset-0 bg-gray-500 dark:bg-neutral-900 opacity-90"></div>
            </div>
            
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">
              &#8203;
            </span>
            
            <div className="inline-block align-bottom bg-white dark:bg-neutral-800 rounded-xl text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-3xl sm:w-full w-full h-[90vh] md:h-auto overflow-y-auto">
              <div className="px-4 md:px-6 py-4 border-b border-gray-200 dark:border-neutral-700">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-900 dark:text-white">
                    Transaction Details
                  </h3>
                  <button
                    onClick={() => setShowDetailsModal(false)}
                    className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-900 dark:text-white transition-colors"
                  >
                    <XCircleIcon className="h-6 w-6" />
                  </button>
                </div>
              </div>
              
              {selectedTransaction && (
                <div className="px-4 md:px-6 py-4 space-y-4">
                  {/* Mobile simplified header */}
                  <div className="md:hidden space-y-3">
                    <div className="flex items-center space-x-3">
                      <div className={`p-3 rounded-xl ${getPaymentStatusBgColor(selectedTransaction.status)}`}>
                        <BanknotesIcon className={`h-8 w-8 ${getPaymentStatusColor(selectedTransaction.status)}`} />
                      </div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <TypeBadge type={selectedTransaction.type} />
                          <StatusBadge status={selectedTransaction.status} />
                        </div>
                        <p className="text-2xl font-bold text-gray-900 dark:text-gray-900 dark:text-white mt-2">
                          {selectedTransaction.amount >= 0 ? '+' : ''}{formatCurrency(selectedTransaction.amount,'USD')}
                        </p>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3">
                      <div className="p-3 bg-gray-100 dark:bg-neutral-700/50 rounded-lg">
                        <p className="text-xs text-gray-500 dark:text-gray-400">Reference</p>
                        <p className="text-sm text-gray-900 dark:text-gray-900 dark:text-white font-mono truncate">
                          {selectedTransaction.order_reference}
                        </p>
                      </div>
                      
                      <div className="p-3 bg-gray-100 dark:bg-neutral-700/50 rounded-lg">
                        <p className="text-xs text-gray-500 dark:text-gray-400">Date</p>
                        <p className="text-sm text-gray-900 dark:text-gray-900 dark:text-white">{formatDate(selectedTransaction.created_at)}</p>
                      </div>
                    </div>
                  </div>
                  
                  {/* Desktop details */}
                  <div className="hidden md:block space-y-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className={`p-3 rounded-xl ${getPaymentStatusBgColor(selectedTransaction.status)}`}>
                          <BanknotesIcon className={`h-8 w-8 ${getPaymentStatusColor(selectedTransaction.status)}`} />
                        </div>
                        <div>
                          <div className="flex items-center space-x-3">
                            <TypeBadge type={selectedTransaction.type} />
                            <StatusBadge status={selectedTransaction.status} />
                          </div>
                          <p className="text-2xl font-bold text-gray-900 dark:text-gray-900 dark:text-white mt-2">
                            {selectedTransaction.amount >= 0 ? '+' : ''}{formatCurrency(selectedTransaction.amount,'USD')}
                          </p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-3">
                        <div className="p-3 bg-gray-100 dark:bg-neutral-700/50 rounded-lg">
                          <p className="text-xs text-gray-500 dark:text-gray-400">Transaction ID</p>
                          <p className="text-sm text-gray-900 dark:text-gray-900 dark:text-white font-mono truncate">
                            {selectedTransaction.id}
                          </p>
                        </div>
                        
                        <div className="p-3 bg-gray-100 dark:bg-neutral-700/50 rounded-lg">
                          <p className="text-xs text-gray-500 dark:text-gray-400">Order Reference</p>
                          <p className="text-sm text-gray-900 dark:text-gray-900 dark:text-white font-mono">
                            {selectedTransaction.order_reference}
                          </p>
                        </div>
                      </div>
                      
                      <div className="space-y-3">
                        <div className="p-3 bg-gray-100 dark:bg-neutral-700/50 rounded-lg">
                          <p className="text-xs text-gray-500 dark:text-gray-400">Created At</p>
                          <p className="text-sm text-gray-900 dark:text-gray-900 dark:text-white">{formatDate(selectedTransaction.created_at)}</p>
                        </div>
                        
                        <div className="p-3 bg-gray-100 dark:bg-neutral-700/50 rounded-lg">
                          <p className="text-xs text-gray500 dark:text-gray-400">Updated At</p>
                          <p className="text-sm text-gray-900 dark:text-gray-900 dark:text-white">{formatDate(selectedTransaction.updated_at)}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Action buttons */}
                  <div className="pt-4 border-t border-gray-200 dark:border-neutral-700">
                    <div className="flex flex-col sm:flex-row sm:justify-end space-y-2 sm:space-y-0 sm:space-x-3">
                      <button
                        onClick={() => setShowDetailsModal(false)}
                        className="px-4 py-2.5 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-900 dark:text-white transition-colors"
                      >
                        Close
                      </button>
                      {["pending", "processing", "initiated"].includes(selectedTransaction.status) && 
                       selectedTransaction.type === "wallet_deposit" && (
                        <button
                          onClick={() => {
                            handleReconcileTransaction(selectedTransaction.id, selectedTransaction.order_reference);
                            setShowDetailsModal(false);
                          }}
                          disabled={isReconciling}
                          className="px-4 py-2.5 bg-blue-600 text-gray-900 dark:text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                        >
                          Reconcile Now
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}