// services/payoutService.js
import api from './api';
import { 
  getCurrentCurrency, 
  convertCurrency,
  formatCurrency,
  isMobileMoneySupported,
  getWithdrawalSettings,
  calculateWithdrawalFee,
  calculateNetWithdrawalAmount
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

/*/ Helper function to prepare payout request with currency conversion
const preparePayoutRequest = (amount, method, details = {}, fromCurrency = null) => {
  const currentCurrency = fromCurrency || getCurrentCurrency().code;
  const settings = getWithdrawalSettings(currentCurrency);
  
  // Convert amount to USD
  const conversion = convertToUSD(amount, currentCurrency);
  
  // Calculate fees in original currency for display
  const feeInOriginalCurrency = calculateWithdrawalFee(amount, method, currentCurrency);
  const netAmountInOriginalCurrency = calculateNetWithdrawalAmount(amount, method, currentCurrency);
  
  // Prepare the request payload in camelCase
  const payload = {
    amount: conversion.amount, // Amount in USD
    originalAmount: conversion.originalAmount, // Original amount in user's currency
    originalCurrency: conversion.originalCurrency, // Original currency code
    exchangeRate: conversion.exchangeRate, // Exchange rate used
    convertedAt: new Date().toISOString(),
    payoutMethod: method,
    metadata: {
      displayAmount: formatCurrency(amount, currentCurrency),
      displayFee: formatCurrency(feeInOriginalCurrency, currentCurrency),
      displayNetAmount: formatCurrency(netAmountInOriginalCurrency, currentCurrency),
      userCurrency: currentCurrency,
      methodDetails: details
    }
  };
  
  // Add method-specific details in camelCase
  if (method === 'mobile_money') {
    payload.phoneNumber = details.phoneNumber;
    payload.metadata.method = 'mobile_money_payout';
  } else if (method === 'bank_transfer') {
    payload.accountNumber = details.accountNumber;
    payload.accountName = details.accountName;
    if (details.bic) {
      payload.bic = details.bic;
    }
    payload.metadata.method = 'bank_payout';
  }
  
  return payload;
};
*/
// Helper to add display info to responses
const addDisplayInfo = (response, originalCurrency = null) => {
  if (response && response.success && response.data) {
    const currentCurrency = originalCurrency || getCurrentCurrency().code;
    const data = response.data;
    
    if (data.currency === 'USD' && currentCurrency !== 'USD') {
      // Convert amounts back to original currency for display
      if (data.amount) {
        const amountConversion = convertCurrency(data.amount, 'USD', currentCurrency);
        response.displayInfo = {
          displayAmount: formatCurrency(amountConversion.convertedAmount, currentCurrency),
          displayCurrency: currentCurrency,
          exchangeRate: amountConversion.rate,
          originalAmountUsd: data.amount
        };
      }
      
      // Convert fee if present
      if (data.fee) {
        const feeConversion = convertCurrency(data.fee, 'USD', currentCurrency);
        response.displayInfo = {
          ...response.displayInfo,
          displayFee: formatCurrency(feeConversion.convertedAmount, currentCurrency),
          originalFeeUsd: data.fee
        };
      }
      
      // Convert net amount if present
      if (data.netAmount) {
        const netConversion = convertCurrency(data.netAmount, 'USD', currentCurrency);
        response.displayInfo = {
          ...response.displayInfo,
          displayNetAmount: formatCurrency(netConversion.convertedAmount, currentCurrency),
          originalNetAmountUsd: data.netAmount
        };
      }
    } else if (data.currency === 'USD') {
      // For USD users, just format
      response.displayInfo = {
        displayAmount: formatCurrency(data.amount, 'USD'),
        displayCurrency: 'USD'
      };
    }
  }
  
  return response;
};

export const payoutService = {
  // 1. Mobile Money Payout Preview
  previewMobileMoneyPayout: async (amount, phoneNumber, currencyCode = null) => {
    const currentCurrency = currencyCode || getCurrentCurrency().code;
    
    // Convert to USD for backend
    const conversion = convertToUSD(amount, currentCurrency);
    
    const response = await api.post('/payouts/withdraw/mobile-money/preview', {
      amount: conversion.amount,
      phoneNumber: phoneNumber,
      originalAmount: conversion.originalAmount,
      originalCurrency: conversion.originalCurrency,
      exchangeRate: conversion.exchangeRate
    });
    
    // Add display info for client
    return addDisplayInfo(response.data, currentCurrency);
  },

  // 2. Create Mobile Money Payout
  createMobileMoneyPayout: async (amount, phoneNumber, orderReference, currencyCode = null) => {
    const currentCurrency = currencyCode || getCurrentCurrency().code;
    const conversion = convertToUSD(amount, currentCurrency);
    
    const response = await api.post('/payouts/withdraw/mobile-money/create', {
      amount: conversion.amount,
      phoneNumber: phoneNumber,
      orderReference: orderReference,
      originalAmount: conversion.originalAmount,
      originalCurrency: conversion.originalCurrency,
      exchangeRate: conversion.exchangeRate
    });
    
    return addDisplayInfo(response.data, currentCurrency);
  },

  // 3. Bank Payout Preview
  previewBankPayout: async (amount, accountNumber, accountName, bic = null, currencyCode = null) => {
    const currentCurrency = currencyCode || getCurrentCurrency().code;
    const conversion = convertToUSD(amount, currentCurrency);
    
    const payload = {
      amount: conversion.amount,
      accountNumber: accountNumber,
      accountName: accountName,
      originalAmount: conversion.originalAmount,
      originalCurrency: conversion.originalCurrency,
      exchangeRate: conversion.exchangeRate
    };
    
    if (bic) {
      payload.bic = bic;
    }
    
    const response = await api.post('/payouts/withdraw/bank/preview', payload);
    return addDisplayInfo(response.data, currentCurrency);
  },

  // 4. Create Bank Payout
  createBankPayout: async (amount, accountNumber, accountName, bic, orderReference, currencyCode = null) => {
    const currentCurrency = currencyCode || getCurrentCurrency().code;
    const conversion = convertToUSD(amount, currentCurrency);
    
    const response = await api.post('/payouts/withdraw/bank/create', {
      amount: conversion.amount,
      accountNumber: accountNumber,
      accountName: accountName,
      bic: bic,
      orderReference: orderReference,
      originalAmount: conversion.originalAmount,
      originalCurrency: conversion.originalCurrency,
      exchangeRate: conversion.exchangeRate
    });
    
    return addDisplayInfo(response.data, currentCurrency);
  },

  // 5. Get Payout Status
  getPayoutStatus: async (orderReference) => {
    const response = await api.get(`/payouts/withdraw/status/${orderReference}`);
    
    // If response contains original currency info, use it for display
    if (response.data && response.data.success && response.data.data) {
      const data = response.data.data;
      const originalCurrency = data.originalCurrency || getCurrentCurrency().code;
      return addDisplayInfo(response.data, originalCurrency);
    }
    
    return response.data;
  },

  // 6. Get Withdrawal History
  getWithdrawalHistory: async (params = {}) => {
    const response = await api.get('/payouts/withdraw/history', { params });
    
    // Add display info for each withdrawal
    if (response.data && response.data.success && response.data.data) {
      const currentCurrency = getCurrentCurrency().code;
      
      response.data.data = response.data.data.map(withdrawal => {
        if (withdrawal.currency === 'USD') {
          const displayCurrency = withdrawal.originalCurrency || currentCurrency;
          
          if (displayCurrency !== 'USD') {
            const amountConversion = convertCurrency(withdrawal.amount, 'USD', displayCurrency);
            const feeConversion = withdrawal.fee ? 
              convertCurrency(withdrawal.fee, 'USD', displayCurrency) : null;
            const netConversion = withdrawal.netAmount ? 
              convertCurrency(withdrawal.netAmount, 'USD', displayCurrency) : null;
            
            return {
              ...withdrawal,
              displayInfo: {
                displayAmount: formatCurrency(amountConversion.convertedAmount, displayCurrency),
                displayFee: feeConversion ? 
                  formatCurrency(feeConversion.convertedAmount, displayCurrency) : null,
                displayNetAmount: netConversion ? 
                  formatCurrency(netConversion.convertedAmount, displayCurrency) : null,
                displayCurrency: displayCurrency,
                exchangeRate: amountConversion.rate
              }
            };
          }
        }
        return withdrawal;
      });
    }
    
    return response.data;
  },

  // 7. Cancel Pending Withdrawal
  cancelPendingWithdrawal: async (orderReference) => {
    const response = await api.post(`/payouts/withdraw/cancel/${orderReference}`);
    return response.data;
  },

  // 8. Get Withdrawal Statistics
  getWithdrawalStats: async (currencyCode = null) => {
    const currentCurrency = currencyCode || getCurrentCurrency().code;
    const response = await api.get('/payouts/withdraw/stats');
    
    // Convert stats from USD to current currency for display
    if (response.data && response.data.success && response.data.data) {
      const stats = response.data.data;
      
      if (currentCurrency !== 'USD') {
        response.data.displayStats = {};
        
        // Convert all monetary values
        const monetaryFields = [
          'totalWithdrawals',
          'thisMonthWithdrawals',
          'averageWithdrawal',
          'totalFeesPaid',
          'pendingWithdrawals',
          'minWithdrawal',
          'maxWithdrawal'
        ];
        
        monetaryFields.forEach(field => {
          // Map camelCase to snake_case for backend response (assuming backend returns snake_case)
          const snakeCaseField = field.replace(/([A-Z])/g, '_$1').toLowerCase();
          if (stats[snakeCaseField] !== undefined) {
            const conversion = convertCurrency(stats[snakeCaseField], 'USD', currentCurrency);
            response.data.displayStats[field] = formatCurrency(conversion.convertedAmount, currentCurrency);
            response.data.displayStats[`${field}Raw`] = conversion.convertedAmount;
          }
        });
        
        // Copy non-monetary fields
        response.data.displayStats.totalCount = stats.total_count || stats.totalCount;
        response.data.displayStats.successCount = stats.success_count || stats.successCount;
        response.data.displayStats.failedCount = stats.failed_count || stats.failedCount;
        response.data.displayStats.currency = currentCurrency;
      } else {
        // For USD, just format the numbers
        response.data.displayStats = {
          totalWithdrawals: formatCurrency(stats.total_withdrawals || stats.totalWithdrawals, 'USD'),
          thisMonthWithdrawals: formatCurrency(stats.this_month_withdrawals || stats.thisMonthWithdrawals, 'USD'),
          averageWithdrawal: formatCurrency(stats.average_withdrawal || stats.averageWithdrawal, 'USD'),
          totalFeesPaid: formatCurrency(stats.total_fees_paid || stats.totalFeesPaid, 'USD'),
          pendingWithdrawals: formatCurrency(stats.pending_withdrawals || stats.pendingWithdrawals || 0, 'USD'),
          minWithdrawal: formatCurrency(stats.min_withdrawal || stats.minWithdrawal, 'USD'),
          maxWithdrawal: formatCurrency(stats.max_withdrawal || stats.maxWithdrawal, 'USD'),
          totalCount: stats.total_count || stats.totalCount,
          successCount: stats.success_count || stats.successCount,
          failedCount: stats.failed_count || stats.failedCount,
          currency: 'USD'
        };
      }
    }
    
    return response.data;
  },

  // 9. User Reconciliation
  reconcilePayoutStatus: async (orderReference) => {
    const response = await api.post(`/payouts/withdraw/reconcile/${orderReference}`);
    return response.data;
  },

  // 10. Get Banks List
  getBanksList: async (currencyCode = null) => {
    const currentCurrency = currencyCode || getCurrentCurrency().code;
    const response = await api.get('/payouts/banks', {
      params: { currency: currentCurrency }
    });
    return response.data;
  },

  // Helper method to initiate complete mobile money withdrawal flow
  withdrawToMobileMoney: async (amount, phoneNumber, currencyCode = null) => {
    try {
      const currentCurrency = currencyCode || getCurrentCurrency().code;
      
      // Step 1: Preview to get fees and order reference
      const preview = await payoutService.previewMobileMoneyPayout(
        amount, 
        phoneNumber, 
        currentCurrency
      );
      
      if (!preview.success) {
        throw new Error(preview.error || 'Preview failed');
      }

      // Step 2: Create the payout
      const createResult = await payoutService.createMobileMoneyPayout(
        amount,
        phoneNumber,
        preview.data.orderReference || preview.data.order_reference,
        currentCurrency
      );

      return createResult;
    } catch (error) {
      console.error('Mobile money withdrawal error:', error);
      throw error;
    }
  },

  // Helper method to initiate complete bank withdrawal flow
  withdrawToBank: async (amount, accountNumber, accountName, bic = null, currencyCode = null) => {
    try {
      const currentCurrency = currencyCode || getCurrentCurrency().code;
      
      // Step 1: Preview to get fees and order reference
      const preview = await payoutService.previewBankPayout(
        amount,
        accountNumber,
        accountName,
        bic,
        currentCurrency
      );
      
      if (!preview.success) {
        throw new Error(preview.error || 'Preview failed');
      }

      // Step 2: Create the payout
      const createResult = await payoutService.createBankPayout(
        amount,
        accountNumber,
        accountName,
        bic,
        preview.data.orderReference || preview.data.order_reference,
        currentCurrency
      );

      return createResult;
    } catch (error) {
      console.error('Bank withdrawal error:', error);
      throw error;
    }
  },

  // Helper to check if user can withdraw
  canWithdraw: async (amount, payoutMethod = 'mobile_money', currencyCode = null) => {
    try {
      const currentCurrency = currencyCode || getCurrentCurrency().code;
      const settings = getWithdrawalSettings(currentCurrency);
      
      // Get wallet balance first
      const walletResponse = await api.get('/payments/wallet/balance');
      if (!walletResponse.data.success) {
        throw new Error('Failed to fetch wallet balance');
      }

      const walletBalance = walletResponse.data.data.balance; // This is in USD
      
      // Convert requested amount to USD for comparison
      const conversion = convertToUSD(amount, currentCurrency);
      const amountInUSD = conversion.amount;
      
      // Check minimum amounts
      const minAmount = payoutMethod === 'bank' 
        ? settings.minBankWithdrawal 
        : settings.minMobileMoneyWithdrawal;
      
      if (amount < minAmount) {
        return {
          canWithdraw: false,
          reason: `Minimum withdrawal amount is ${formatCurrency(minAmount, currentCurrency)}`,
          minAmount: minAmount,
          displayMinAmount: formatCurrency(minAmount, currentCurrency)
        };
      }

      // Check wallet balance (compare in USD)
      if (walletBalance < amountInUSD) {
        const walletInUserCurrency = convertCurrency(walletBalance, 'USD', currentCurrency);
        return {
          canWithdraw: false,
          reason: 'Insufficient wallet balance',
          walletBalanceUsd: walletBalance,
          walletBalanceDisplay: formatCurrency(walletInUserCurrency.convertedAmount, currentCurrency),
          requiredAmountUsd: amountInUSD,
          requiredAmountDisplay: formatCurrency(amount, currentCurrency)
        };
      }

      // Calculate fees and net amount
      const fee = calculateWithdrawalFee(amount, payoutMethod, currentCurrency);
      const netAmount = calculateNetWithdrawalAmount(amount, payoutMethod, currentCurrency);
      
      return {
        canWithdraw: true,
        walletBalanceUsd: walletBalance,
        walletBalanceDisplay: formatCurrency(
          convertCurrency(walletBalance, 'USD', currentCurrency).convertedAmount,
          currentCurrency
        ),
        requestedAmountUsd: amountInUSD,
        requestedAmountDisplay: formatCurrency(amount, currentCurrency),
        feeAmountDisplay: formatCurrency(fee, currentCurrency),
        netAmountDisplay: formatCurrency(netAmount, currentCurrency),
        message: 'You can proceed with the withdrawal'
      };
    } catch (error) {
      console.error('Withdrawal check error:', error);
      return {
        canWithdraw: false,
        reason: error.message || 'Unable to validate withdrawal'
      };
    }
  },

  // Get recent withdrawals for dashboard
  getRecentWithdrawals: async (limit = 5) => {
    const response = await api.get('/payouts/withdraw/history', {
      params: {
        limit,
        page: 1
      }
    });
    
    // Add display info for each withdrawal
    if (response.data && response.data.success && response.data.data) {
      const currentCurrency = getCurrentCurrency().code;
      
      response.data.data = response.data.data.map(withdrawal => {
        if (withdrawal.currency === 'USD' && currentCurrency !== 'USD') {
          const conversion = convertCurrency(withdrawal.amount, 'USD', currentCurrency);
          return {
            ...withdrawal,
            displayInfo: {
              displayAmount: formatCurrency(conversion.convertedAmount, currentCurrency),
              exchangeRate: conversion.rate
            }
          };
        }
        return withdrawal;
      });
    }
    
    return response.data;
  },

  // Get withdrawal summary for user dashboard
  getWithdrawalSummary: async (currencyCode = null) => {
    try {
      const currentCurrency = currencyCode || getCurrentCurrency().code;
      
      const [statsResponse, recentResponse] = await Promise.all([
        payoutService.getWithdrawalStats(currentCurrency),
        payoutService.getRecentWithdrawals(3)
      ]);

      return {
        success: true,
        data: {
          stats: statsResponse.data,
          displayStats: statsResponse.displayStats,
          recent: recentResponse.data?.withdrawals || []
        }
      };
    } catch (error) {
      console.error('Withdrawal summary error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  },

  // Get available withdrawal methods for current currency
  getAvailableWithdrawalMethods: async (currencyCode = null) => {
    const currentCurrency = currencyCode || getCurrentCurrency().code;
    const settings = getWithdrawalSettings(currentCurrency);
    
    const methods = [];
    
    // Mobile Money
    if (isMobileMoneySupported(currentCurrency)) {
      methods.push({
        id: 'mobile_money',
        name: 'Mobile Money',
        minAmount: settings.minMobileMoneyWithdrawal,
        maxAmount: settings.maxMobileMoneyWithdrawal,
        fee: settings.withdrawalFees.mobileMoney,
        processingTime: settings.withdrawalProcessingTimes.mobileMoney,
        available: true
      });
    }
    
    // Bank Transfer
    methods.push({
      id: 'bank_transfer',
      name: 'Bank Transfer',
      minAmount: settings.minBankWithdrawal,
      maxAmount: settings.maxBankWithdrawal,
      fee: settings.withdrawalFees.bankTransfer,
      processingTime: settings.withdrawalProcessingTimes.bankTransfer,
      available: true
    });
    
    return {
      success: true,
      data: methods,
      currency: currentCurrency
    };
  },

  // Admin endpoints (only accessible by admins)
  admin: {
    // Batch reconcile stuck payouts
    batchReconcilePayouts: async (limit = 50) => {
      const response = await api.post('/payouts/admin/payouts/batch-reconcile', { limit });
      return response.data;
    },

    // Reconcile specific payout
    reconcilePayout: async (orderReference, userId = null) => {
      const params = userId ? { userId: userId } : {};
      const response = await api.post(
        `/payouts/admin/payouts/${orderReference}/reconcile`,
        null,
        { params }
      );
      return response.data;
    },

    // Get stuck payouts
    getStuckPayouts: async (limit = 100, hours = 24) => {
      const response = await api.get('/payouts/admin/payouts/stuck', {
        params: { limit, hours }
      });
      return response.data;
    },

    // Force cancel payout
    forceCancelPayout: async (orderReference) => {
      const response = await api.post(`/payouts/admin/payouts/${orderReference}/force-cancel`);
      return response.data;
    },

    // Get payout by reference (admin view with full details)
    getPayoutDetails: async (orderReference) => {
      const response = await api.get(`/payouts/admin/payouts/${orderReference}`);
      return response.data;
    },

    // Get all payouts with filters (admin)
    getAllPayouts: async (filters = {}) => {
      const response = await api.get('/payouts/admin/payouts/all', {
        params: filters
      });
      return response.data;
    },

    // Manual payout approval (for manual processing)
    manualApprovePayout: async (orderReference, notes = '') => {
      const response = await api.post(`/payouts/admin/payouts/${orderReference}/approve`, {
        notes
      });
      return response.data;
    },

    // Manual payout rejection
    manualRejectPayout: async (orderReference, reason = '') => {
      const response = await api.post(`/payouts/admin/payouts/${orderReference}/reject`, {
        reason
      });
      return response.data;
    },
    
    // Update payout exchange rates (admin only)
    updatePayoutExchangeRates: async (rates) => {
      const response = await api.post('/payouts/admin/exchange-rates/update', { rates });
      return response.data;
    }
  }
};

export default payoutService;