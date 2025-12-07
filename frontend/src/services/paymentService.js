// services/paymentService.js
import api from './api';

export const paymentService = {
  // Wallet deposit with payment method
  initiateWalletDeposit: async (amount, phoneNumber, paymentMethod) => {
    const response = await api.post('/payments/deposit/initiate', {
      amount: parseInt(amount),
      phoneNumber,
      paymentMethod
    });
    return response.data;
  },

  // Check deposit status
  checkDepositStatus: async (orderReference) => {
    const response = await api.get(`/payments/deposit/status/${orderReference}`);
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
      phoneNumber: phoneNumber
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

  // Get user transaction history (includes deposits and other transactions)
  getTransactionHistory: async (params = {}) => {
    const response = await api.get('/users/transactions', { params });
    return response.data;
  }
};