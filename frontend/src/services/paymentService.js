// src/services/paymentService.js
import api from './api';

export const paymentService = {
  /**
   * PREVIEW DEPOSIT (Simplified - currency handled by interceptor)
   */
  previewMobileMoneyDeposit: async (amount, phoneNumber) => {
    try {
      // Just send amount and phone number - currency will be added by interceptor
      const response = await api.post('/payments/deposit/preview', {
        amount,
        phoneNumber
      });
      return response.data;
    } catch (error) {
      console.error('Failed to preview deposit:', error);
      throw error;
    }
  },

  /**
   * CREATE DEPOSIT (Simplified)
   */
  createMobileMoneyDeposit: async (amount, phoneNumber, idempotencyKey = null) => {
    try {
      const payload = {
        amount,
        phoneNumber
      };
      
      if (idempotencyKey) {
        payload.idempotencyKey = idempotencyKey;
      }
      
      const response = await api.post('/payments/deposit/initiate', payload);
      return response.data;
    } catch (error) {
      console.error('Failed to initiate deposit:', error);
      throw error;
    }
  },

  /**
   * CHECK DEPOSIT STATUS
   */
  checkDepositStatus: async (orderReference) => {
    try {
      const response = await api.get(`/payments/deposit/status/${orderReference}`);
      return response.data;
    } catch (error) {
      console.error('Failed to check deposit status:', error);
      throw error;
    }
  },

  /**
   * GET DEPOSIT HISTORY
   */
  getDepositHistory: async (params = {}) => {
    try {
      const response = await api.get('/payments/deposit/history', { params });
      return response.data;
    } catch (error) {
      console.error('Failed to get deposit history:', error);
      throw error;
    }
  },

  /**
   * GET WALLET BALANCE
   */
  getWalletBalance: async () => {
    try {
      const response = await api.get('/payments/wallet/balance');
      return response.data;
    } catch (error) {
      console.error('Failed to get wallet balance:', error);
      throw error;
    }
  },

  /**
   * VALIDATE PHONE NUMBER
   */
  validatePhoneNumber: async (phoneNumber) => {
    try {
      const response = await api.post('/payments/validate-phone', {
        phoneNumber
      });
      return response.data;
    } catch (error) {
      console.error('Failed to validate phone number:', error);
      throw error;
    }
  },

  /**
   * CONVERT CURRENCY (using backend rates)
   */
  convertCurrency: async (amount, fromCurrency, toCurrency) => {
    try {
      const response = await api.post('/payments/convert-currency', {
        amount,
        fromCurrency,
        toCurrency
      });
      return response.data;
    } catch (error) {
      console.error('Failed to convert currency:', error);
      throw error;
    }
  },

  /**
   * GET DEPOSIT STATISTICS
   */
  getDepositStats: async () => {
    try {
      const response = await api.get('/payments/deposit/stats');
      return response.data;
    } catch (error) {
      console.error('Failed to get deposit stats:', error);
      throw error;
    }
  },

  /**
   * VALIDATE DEPOSIT AMOUNT (client-side validation)
   */
  validateDepositAmount: (amount) => {
    // Get current currency from api
    const currency = api.getCurrentCurrency();
    
    if (currency === 'TZS') {
      if (amount < 1000) {
        return {
          valid: false,
          error: 'Minimum deposit is 1,000 TZS'
        };
      }
      if (amount > 1000000) {
        return {
          valid: false,
          error: 'Maximum deposit is 1,000,000 TZS'
        };
      }
    } else if (currency === 'USD') {
      if (amount < 0.4) {
        return {
          valid: false,
          error: 'Minimum deposit is $0.40 USD'
        };
      }
      if (amount > 400) {
        return {
          valid: false,
          error: 'Maximum deposit is $400 USD'
        };
      }
    }
    
    return {
      valid: true,
      amount: amount,
      currency: currency
    };
  },

  /**
   * FORMAT CURRENCY FOR DISPLAY (using current currency)
   */
  formatCurrency: (amount) => {
    const currency = api.getCurrentCurrency();
    const formatter = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: currency === 'TZS' ? 0 : 2
    });
    
    // For TZS, we need to override the symbol
    if (currency === 'TZS') {
      return `${amount.toLocaleString('en-US')} TZS`;
    }
    
    return formatter.format(amount);
  },

  /**
   * FORMAT PHONE NUMBER
   */
  formatPhoneNumber: (phoneNumber) => {
    if (!phoneNumber) return '';
    
    const digits = phoneNumber.replace(/\D/g, '');
    
    // Tanzanian format
    if (digits.startsWith('255') && digits.length === 12) {
      return `+${digits.substring(0, 3)} ${digits.substring(3, 6)} ${digits.substring(6, 9)} ${digits.substring(9)}`;
    }
    
    return phoneNumber;
  }
};

export default paymentService;