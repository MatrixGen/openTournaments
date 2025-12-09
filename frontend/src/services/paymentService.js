import api from './api';

export const paymentService = {
  // Wallet deposit
  initiateWalletDeposit: async (amount, phoneNumber) => {
    const response = await api.post('/payments/deposit/initiate', {
      amount: parseInt(amount),
      phoneNumber
    });
    return response.data;
  },

  // Check deposit status with optional force reconciliation
  checkDepositStatus: async (orderReference, forceReconcile = false) => {
    const params = {};
    if (forceReconcile) {
      params.forceReconcile = 'true';
    }
    const response = await api.get(`/payments/deposit/status/${orderReference}`, { params });
    return response.data;
  },

  // Manual reconciliation endpoint
  reconcileDepositStatus: async (orderReference) => {
    const response = await api.post(`/payments/deposit/${orderReference}/reconcile`);
    return response.data;
  },

  // Get deposit history
  getDepositHistory: async (params = {}) => {
    const response = await api.get('/payments/deposit/history', { params });
    return response.data;
  },

  // Validate phone number
  validatePhoneNumber: async (phoneNumber) => {
    const response = await api.post('/payments/validate-phone', {
      phoneNumber
    });
    return response.data;
  },

  // Get wallet balance
  getWalletBalance: async () => {
    const response = await api.get('/payments/wallet/balance');
    return response.data;
  },

  // Cancel pending deposit
  cancelPendingDeposit: async (orderReference) => {
    const response = await api.post(`/payments/deposit/cancel/${orderReference}`);
    return response.data;
  },

  // Get deposit statistics
  getDepositStats: async () => {
    const response = await api.get('/payments/deposit/stats');
    return response.data;
  },

  // Admin endpoints (only accessible by admins)
  admin: {
    // Batch reconcile stuck payments
    batchReconcilePayments: async (limit = 50) => {
      const response = await api.post('/payments/admin/payments/batch-reconcile', { limit });
      return response.data;
    },

    // Reconcile specific payment
    reconcilePayment: async (orderReference) => {
      const response = await api.post(`/payments/admin/payments/${orderReference}/reconcile`);
      return response.data;
    },

    // Get stuck payments
    getStuckPayments: async (limit = 100, hours = 24) => {
      const response = await api.get('/payments/admin/payments/stuck', {
        params: { limit, hours }
      });
      return response.data;
    },

    // Manually update wallet for successful deposit
    manualWalletUpdate: async (orderReference) => {
      const response = await api.post(`/payments/admin/payments/${orderReference}/manual-update`);
      return response.data;
    }
  }
};