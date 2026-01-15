// src/services/payoutService.js
import api from './api';

export const payoutService = {
  /**
   * PREVIEW MOBILE MONEY PAYOUT
   */
  previewMobileMoneyPayout: async (amount, phoneNumber) => {
    try {
      const response = await api.post('/payouts/withdraw/mobile-money/preview', {
        amount,
        phoneNumber
      });
      return response.data;
    } catch (error) {
      console.error('Failed to preview mobile money payout:', error);
      throw error;
    }
  },

  /**
   * CREATE MOBILE MONEY PAYOUT
   */
  createMobileMoneyPayout: async (previewReference) => {
    try {
      const response = await api.post('/payouts/withdraw/mobile-money/create', {
        preview_reference: previewReference
      });
      return response.data;
    } catch (error) {
      console.error('Failed to create mobile money payout:', error);
      throw error;
    }
  },

  /**
   * PREVIEW BANK PAYOUT
   */
  previewBankPayout: async (amount, accountNumber, accountName, bankCode = null) => {
    try {
      const payload = {
        amount,
        accountNumber,
        accountName
      };
      
      if (bankCode) {
        payload.bankCode = bankCode;
      }
      
      const response = await api.post('/payouts/withdraw/bank/preview', payload);
      return response.data;
    } catch (error) {
      console.error('Failed to preview bank payout:', error);
      throw error;
    }
  },

  /**
   * CREATE BANK PAYOUT
   */
  createBankPayout: async (previewReference) => {
    try {
      const response = await api.post('/payouts/withdraw/bank/create', {
        preview_reference: previewReference
      });
      return response.data;
    } catch (error) {
      console.error('Failed to create bank payout:', error);
      throw error;
    }
  },

  /**
   * GET PAYOUT STATUS
   */
  getPayoutStatus: async (orderReference) => {
    try {
      const response = await api.get(`/payouts/withdraw/status/${orderReference}`);
      return response.data;
    } catch (error) {
      console.error('Failed to get payout status:', error);
      throw error;
    }
  },

  /**
   * GET WITHDRAWAL HISTORY
   */
  getWithdrawalHistory: async (params = {}) => {
    try {
      const response = await api.get('/payouts/withdraw/history', { params });
      return response.data;
    } catch (error) {
      console.error('Failed to get withdrawal history:', error);
      throw error;
    }
  },

  /**
   * GET WITHDRAWAL STATISTICS
   */
  getWithdrawalStats: async () => {
    try {
      const response = await api.get('/payouts/withdraw/stats');
      return response.data;
    } catch (error) {
      console.error('Failed to get withdrawal stats:', error);
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
   * VALIDATE WITHDRAWAL AMOUNT (client-side)
   */
  validateWithdrawalAmount: (amount, isBank = false) => {
    const currency = api.getCurrentCurrency();
    
    if (currency === 'TZS') {
      const minTZS = isBank ? 10000 : 1000; // 10,000 for bank, 1,000 for mobile
      const maxTZS = 5000000; // 5,000,000 TZS
      
      if (amount < minTZS) {
        return {
          valid: false,
          error: `Minimum withdrawal is ${minTZS.toLocaleString()} TZS`
        };
      }
      
      if (amount > maxTZS) {
        return {
          valid: false,
          error: `Maximum withdrawal is ${maxTZS.toLocaleString()} TZS`
        };
      }
    } else if (currency === 'USD') {
      const minUSD = isBank ? 4 : 0.4; // $4 for bank, $0.40 for mobile
      const maxUSD = 2000; // $2,000 USD
      
      if (amount < minUSD) {
        return {
          valid: false,
          error: `Minimum withdrawal is $${minUSD.toFixed(2)} USD`
        };
      }
      
      if (amount > maxUSD) {
        return {
          valid: false,
          error: `Maximum withdrawal is $${maxUSD.toFixed(2)} USD`
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
   * CHECK IF USER CAN WITHDRAW
   */
  canWithdraw: async (amount) => {
    try {
      // Get wallet balance
      const walletResponse = await api.get('/payments/wallet/balance');
      if (!walletResponse.data.success) {
        throw new Error('Failed to fetch wallet balance');
      }

      const walletBalanceUSD = walletResponse.data.data.balance_usd;
      
      // Convert requested amount to USD using backend
      const conversionResponse = await api.post('/payments/convert-currency', {
        amount: amount,
        fromCurrency: api.getCurrentCurrency(),
        toCurrency: 'USD'
      });

      if (!conversionResponse.data.success) {
        throw new Error('Currency conversion failed');
      }

      const amountUSD = conversionResponse.data.data.converted_amount;

      if (walletBalanceUSD < amountUSD) {
        return {
          canWithdraw: false,
          reason: 'Insufficient wallet balance',
          walletBalanceUSD: walletBalanceUSD,
          requiredAmountUSD: amountUSD
        };
      }

      return {
        canWithdraw: true,
        walletBalanceUSD: walletBalanceUSD,
        requestedAmountUSD: amountUSD,
        requestedAmount: amount,
        currency: api.getCurrentCurrency(),
        message: 'You can proceed with the withdrawal'
      };
    } catch (error) {
      console.error('Withdrawal check error:', error);
      return {
        canWithdraw: false,
        reason: error.message
      };
    }
  },

  /**
   * FORMAT TZS CURRENCY
   */
  formatTZSCurrency: (amount) => {
    return `${amount.toLocaleString('en-US')} TZS`;
  },

  /**
   * VALIDATE BANK ACCOUNT
   */
  validateBankAccount: async (accountNumber, accountName, bankCode = null) => {
    try {
      const response = await api.post('/payouts/validate-bank-account', {
        accountNumber,
        accountName,
        bankCode
      });
      return response.data;
    } catch (error) {
      console.error('Failed to validate bank account:', error);
      throw error;
    }
  },

  /**
   * GET AVAILABLE BANKS
   */
  getBanksList: async () => {
    try {
      const response = await api.get('/payouts/banks');
      return response.data;
    } catch (error) {
      console.error('Failed to get banks list:', error);
      throw error;
    }
  }
};

export default payoutService;
