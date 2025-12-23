// src/services/paymentService.js
import api from './api';
import { 
  getCurrentCurrency, 
  convertCurrency,
  formatCurrency,
  isMobileMoneySupported 
} from '../config/currencyConfig';

// Helper function to convert amount to USD
const convertToUSD = (amount, fromCurrency) => {
  // If already USD, return as is
  if (fromCurrency === 'USD') {
    return {
      amount: amount,
      convertedAmount: amount,
      originalCurrency: fromCurrency,
      exchangeRate: 1,
      originalAmount: amount
    };
  }
  
  // Convert to USD
  const conversion = convertCurrency(amount, fromCurrency, 'USD');
  return {
    amount: conversion.convertedAmount,
    convertedAmount: conversion.convertedAmount,
    originalCurrency: fromCurrency,
    exchangeRate: conversion.rate,
    originalAmount: amount
  };
};

// Helper function to prepare request data with currency conversion
const prepareDepositRequest = (amount, phoneNumber = null, fromCurrency = null) => {
  const currentCurrency = fromCurrency || getCurrentCurrency().code;
  
  // Convert amount to USD
  const conversion = convertToUSD(amount, currentCurrency);
  
  // Prepare the request payload in camelCase
  const payload = {
    amount: conversion.amount, // Amount in USD
    originalAmount: conversion.originalAmount, // Original amount in user's currency
    originalCurrency: conversion.originalCurrency, // Original currency code
    exchangeRate: conversion.exchangeRate, // Exchange rate used
    convertedAt: new Date().toISOString(),
    metadata: {
      displayAmount: formatCurrency(amount, currentCurrency), // For display purposes
      userCurrency: currentCurrency
    }
  };
  
  // Add phone number if mobile money is supported
  if (phoneNumber && isMobileMoneySupported(currentCurrency)) {
    payload.phoneNumber = phoneNumber;
  }
  
  return payload;
};

export const paymentService = {
  // Wallet deposit
  initiateWalletDeposit: async (amount, phoneNumber = null, fromCurrency = null) => {
    const payload = prepareDepositRequest(amount, phoneNumber, fromCurrency);
    
    const response = await api.post('/payments/deposit/initiate', payload);
    
    // Add conversion info to response for client-side display
    if (response.data && response.data.success) {
      response.data.conversion = {
        original_amount: payload.originalAmount,
        original_currency: payload.originalCurrency,
        exchange_rate: payload.exchangeRate,
        display_amount: payload.metadata.displayAmount
      };
    }
    
    return response.data;
  },

  // Check deposit status with optional force reconciliation
  checkDepositStatus: async (orderReference, forceReconcile = false) => {
    const params = {};
    if (forceReconcile) {
      params.forceReconcile = 'true';
    }
    const response = await api.get(`/payments/deposit/status/${orderReference}`, { params });
    
    // If response contains amount in USD, add conversion info for display
    if (response.data && response.data.success && response.data.data) {
      const depositData = response.data.data;
      const originalCurrency = depositData.originalCurrency || depositData.original_currency;
      
      if (depositData.currency === 'USD' && originalCurrency) {
        // Convert USD back to original currency for display
        const conversion = convertCurrency(
          depositData.amount, 
          'USD', 
          originalCurrency
        );
        
        response.data.displayInfo = {
          displayAmount: formatCurrency(conversion.convertedAmount, originalCurrency),
          originalCurrency: originalCurrency,
          exchangeRate: 1 / conversion.rate // Rate from USD to original currency
        };
      }
    }
    
    return response.data;
  },

  // Manual reconciliation endpoint
  reconcileDepositStatus: async (orderReference) => {
    const response = await api.post(`/payments/deposit/${orderReference}/reconcile`);
    return response.data;
  },

  // Get deposit history - returns in USD, add conversion for display
  getDepositHistory: async (params = {}) => {
    const response = await api.get('/payments/deposit/history', { params });
    
    // Add display info for each transaction
    if (response.data && response.data.success && response.data.data) {
      const currentCurrency = getCurrentCurrency().code;
      
      response.data.data = response.data.data.map(transaction => {
        if (transaction.currency === 'USD' && currentCurrency !== 'USD') {
          const conversion = convertCurrency(transaction.amount, 'USD', currentCurrency);
          
          return {
            ...transaction,
            displayInfo: {
              displayAmount: formatCurrency(conversion.convertedAmount, currentCurrency),
              originalAmount: transaction.amount,
              exchangeRate: conversion.rate
            }
          };
        }
        return transaction;
      });
    }
    
    return response.data;
  },

  // Validate phone number
  validatePhoneNumber: async (phoneNumber, currencyCode = null) => {
    const currentCurrency = currencyCode || getCurrentCurrency().code;
    
    const response = await api.post('/payments/validate-phone', {
      phoneNumber: phoneNumber,
      countryCode: currentCurrency === 'TZS' ? 'TZ' : 
                   currentCurrency === 'KES' ? 'KE' : 
                   currentCurrency === 'USD' ? 'US' : 'US',
      currency: currentCurrency
    });
    
    return response.data;
  },

  // Get wallet balance - returns in USD, convert to current currency for display
  getWalletBalance: async () => {
    const response = await api.get('/payments/wallet/balance');
    
    // Convert balance from USD to current currency for display
    if (response.data && response.data.success) {
      const currentCurrency = getCurrentCurrency().code;
      
      if (currentCurrency !== 'USD') {
        const conversion = convertCurrency(response.data.data.balance, 'USD', currentCurrency);
        
        response.data.displayInfo = {
          displayBalance: formatCurrency(conversion.convertedAmount, currentCurrency),
          originalBalance: response.data.data.balance,
          exchangeRate: conversion.rate,
          currency: currentCurrency
        };
      } else {
        response.data.displayInfo = {
          displayBalance: formatCurrency(response.data.data.balance, 'USD'),
          currency: 'USD'
        };
      }
    }
    
    return response.data;
  },

  // Cancel pending deposit
  cancelPendingDeposit: async (orderReference) => {
    const response = await api.post(`/payments/deposit/cancel/${orderReference}`);
    return response.data;
  },

  // Get deposit statistics - returns in USD, convert for display
  getDepositStats: async () => {
    const response = await api.get('/payments/deposit/stats');
    
    // Convert stats from USD to current currency for display
    if (response.data && response.data.success && response.data.data) {
      const currentCurrency = getCurrentCurrency().code;
      const stats = response.data.data;
      
      if (currentCurrency !== 'USD') {
        response.data.displayStats = {};
        
        // Convert all monetary values - handle both camelCase and snake_case from backend
        const monetaryFields = [
          'totalDeposits',
          'thisMonthDeposits',
          'averageDeposit',
          'minDeposit',
          'maxDeposit',
          'pendingDeposits'
        ];
        
        monetaryFields.forEach(field => {
          // Check for snake_case field first (backend might return snake_case)
          const snakeCaseField = field.replace(/([A-Z])/g, '_$1').toLowerCase();
          const value = stats[snakeCaseField] !== undefined ? stats[snakeCaseField] : stats[field];
          
          if (value !== undefined) {
            const conversion = convertCurrency(value, 'USD', currentCurrency);
            response.data.displayStats[field] = formatCurrency(conversion.convertedAmount, currentCurrency);
            response.data.displayStats[`${field}Raw`] = conversion.convertedAmount;
          }
        });
        
        // Copy non-monetary fields
        response.data.displayStats.totalCount = stats.totalCount || stats.total_count;
        response.data.displayStats.successCount = stats.successCount || stats.success_count;
        response.data.displayStats.failedCount = stats.failedCount || stats.failed_count;
        response.data.displayStats.currency = currentCurrency;
      } else {
        // For USD, just format the numbers
        response.data.displayStats = {
          totalDeposits: formatCurrency(stats.totalDeposits || stats.total_deposits, 'USD'),
          thisMonthDeposits: formatCurrency(stats.thisMonthDeposits || stats.this_month_deposits, 'USD'),
          averageDeposit: formatCurrency(stats.averageDeposit || stats.average_deposit, 'USD'),
          minDeposit: formatCurrency(stats.minDeposit || stats.min_deposit, 'USD'),
          maxDeposit: formatCurrency(stats.maxDeposit || stats.max_deposit, 'USD'),
          pendingDeposits: formatCurrency(stats.pendingDeposits || stats.pending_deposits || 0, 'USD'),
          totalCount: stats.totalCount || stats.total_count,
          successCount: stats.successCount || stats.success_count,
          failedCount: stats.failedCount || stats.failed_count,
          currency: 'USD'
        };
      }
    }
    
    return response.data;
  },

  // Get exchange rates for display purposes
  getExchangeRates: async () => {
    try {
      const response = await api.get('/payments/exchange-rates');
      return response.data;
    } catch (error) {
      console.error('Failed to fetch exchange rates:', error);
      // Return fallback rates if API fails
      return {
        success: true,
        data: {
          USD: 1,
          TZS: 2500, // 1 USD = 2500 TZS
          KES: 150,  // 1 USD = 150 KES
          EUR: 0.92, // 1 USD = 0.92 EUR
          GBP: 0.79  // 1 USD = 0.79 GBP
        }
      };
    }
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
      
      // Add display info for stuck payments
      if (response.data && response.data.success && response.data.data) {
        const currentCurrency = getCurrentCurrency().code;
        
        response.data.data = response.data.data.map(payment => {
          if (payment.currency === 'USD' && currentCurrency !== 'USD') {
            const conversion = convertCurrency(payment.amount, 'USD', currentCurrency);
            
            return {
              ...payment,
              displayInfo: {
                displayAmount: formatCurrency(conversion.convertedAmount, currentCurrency),
                exchangeRate: conversion.rate
              }
            };
          }
          return payment;
        });
      }
      
      return response.data;
    },

    // Manually update wallet for successful deposit
    manualWalletUpdate: async (orderReference) => {
      const response = await api.post(`/payments/admin/payments/${orderReference}/manual-update`);
      return response.data;
    },
    
    // Update exchange rates (admin only)
    updateExchangeRates: async (rates) => {
      const response = await api.post('/payments/admin/exchange-rates/update', { rates });
      return response.data;
    }
  }
};

export default paymentService;