import api from './api';

export const paymentService = {
  getPaymentMethods: async () => {
    const response = await api.get('/payments/methods');
    return response.data;
  },

  createDeposit: async (amount, paymentMethodId) => {
    const response = await api.post('/payments/deposit', {
      amount,
      payment_method_id: paymentMethodId
    });
    return response.data;
  },

  getTransactionHistory: async (params = {}) => {
    const response = await api.get('/payments/transactions', { params });
    return response.data;
  },

  getWalletBalance: async () => {
    const response = await api.get('/users/wallet');
    return response.data;
  }
};