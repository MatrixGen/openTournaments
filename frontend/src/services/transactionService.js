import api from './api';

export const transactionService = {
  // Get all transactions (with filters)
  getTransactions: async (params = {}) => {
    const response = await api.get('/transactions', { params });
    return response.data;
  },

  // Get transaction by ID
  getTransactionById: async (transactionId) => {
    const response = await api.get(`/transactions/${transactionId}`);
    return response.data;
  },

  // Reconcile specific transaction
  reconcileTransaction: async (transactionId) => {
    const response = await api.post(`/transactions/${transactionId}/reconcile`);
    return response.data;
  },

  // Batch reconcile transactions
  batchReconcileTransactions: async (transactionIds = []) => {
    const response = await api.post('/transactions/batch-reconcile', {
      transactionIds
    });
    return response.data;
  },

  // Get transaction statistics
  getTransactionStats: async (params = {}) => {
    const response = await api.get('/transactions/stats', { params });
    return response.data;
  },

  // Get pending transactions for reconciliation
  getPendingTransactions: async (limit = 50, hours = 24) => {
    const response = await api.get('/transactions/pending', {
      params: { limit, hours }
    });
    return response.data;
  },

  // Export transactions to CSV
  exportTransactions: async (params = {}) => {
    const response = await api.get('/transactions/export', {
      params,
      responseType: 'blob'
    });
    return response;
  },

  // Get transaction summary by period
  getTransactionSummary: async (period = 'month') => {
    const response = await api.get('/transactions/summary', {
      params: { period }
    });
    return response.data;
  }
};