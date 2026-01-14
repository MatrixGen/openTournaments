// src/config/currencyConfig.js

// Helper function to get stored currency from localStorage
const getStoredCurrency = () => {
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem('selectedCurrency');
    if (stored) {
      const currency = SUPPORTED_CURRENCIES.find(c => c.code === stored);
      if (currency) return currency;
    }
  }
  // Default to USD if nothing is stored
  return {
    code: 'USD',
    symbol: '$',
    name: 'US Dollar',
    locale: 'en-US',
    countryCode: 'US',
    phonePrefix: '+1',
    phoneLength: 10,
  };
};

// Define supported currencies as a separate constant to avoid circular reference
const SUPPORTED_CURRENCIES = [
  {
    code: 'USD',
    symbol: '$',
    name: 'US Dollar',
    locale: 'en-US',
    countryCode: 'US',
    phonePrefix: '+1',
    phoneLength: 10,
  },
  {
    code: 'TZS',
    symbol: 'TSh',
    name: 'Tanzanian Shilling',
    locale: 'sw-TZ',
    countryCode: 'TZ',
    phonePrefix: '+255',
    phoneLength: 9,
  },
];

// Currency-specific settings
const CURRENCY_SETTINGS = {
  USD: {
    minDeposit: 1,
    maxDeposit: 500,
    step: 1,
    decimals: 2,
    mobileMoneySupported: true,
    defaultQuickAmounts: [5, 10, 25, 50, 100, 250],
    
    minMobileMoneyWithdrawal: 1,
    maxMobileMoneyWithdrawal: 500,
    minBankWithdrawal: 50,
    maxBankWithdrawal: 1000,
    withdrawalStep: 0.2,
    withdrawalFees: {
      mobileMoney: 0.5,
      bankTransfer: 1.5,
      creditCard: 2.0,
    },
    withdrawalProcessingTimes: {
      mobileMoney: "1-24 hours",
      bankTransfer: "1-3 business days",
      creditCard: "3-5 business days",
    },
    
    requireBIC: true,
    requireIBAN: false,
    
    dailyDepositLimit: 1000,
    dailyWithdrawalLimit: 500,
    
    depositFee: 0,
    depositFeeType: 'percentage',
    withdrawalFeePercentage: 1.5,
    
    paymentMethods: ['credit_card', 'debit_card', 'bank_transfer', 'mobile_money'],
    
    supportedBanks: [
     // { name: 'Bank of America', code: 'BOFA' },
     // { name: 'Chase', code: 'CHAS' },
     // { name: 'Wells Fargo', code: 'WF' },
    ],
    
    mobileMoneyProviders: [
     // { name: 'Venmo', code: 'VENMO' },
     // { name: 'Cash App', code: 'CASHAPP' },
     // { name: 'Zelle', code: 'ZELLE' },
    ],
  },
  TZS: {
    minDeposit: 1000,
    maxDeposit: 1000000,
    step: 100,
    decimals: 0,
    mobileMoneySupported: true,
    defaultQuickAmounts: [1000, 5000, 10000, 25000, 50000, 100000],
    
    minMobileMoneyWithdrawal: 1000,
    maxMobileMoneyWithdrawal: 5000000,
    minBankWithdrawal: 10000,
    maxBankWithdrawal: 5000000,
    withdrawalStep: 100,
    withdrawalFees: {
      mobileMoney: 100,
      bankTransfer: 500,
    },
    withdrawalProcessingTimes: {
      mobileMoney: "1-24 hours",
      bankTransfer: "1-3 business days",
    },
    
    requireBIC: false,
    requireIBAN: false,
    
    dailyDepositLimit: 2000000,
    dailyWithdrawalLimit: 2000000,
    
    depositFee: 0,
    depositFeeType: 'percentage',
    withdrawalFeePercentage: 1.5,
    
    paymentMethods: ['mobile_money', 'bank_transfer'],
    
    supportedBanks: [
      { name: 'CRDB Bank', code: 'CRDB' },
      { name: 'NMB Bank', code: 'NMB' },
      { name: 'Stanbic Bank', code: 'STANBIC' },
    ],
    
    mobileMoneyProviders: [
      { name: 'M-Pesa', code: 'MPESA' },
      { name: 'Tigo Pesa', code: 'TIGO' },
      { name: 'Airtel Money', code: 'AIRTEL' },
    ],
  },
};

// Main CURRENCY_CONFIG export
export const CURRENCY_CONFIG = {
  // PRIMARY is dynamically set based on localStorage
  PRIMARY: getStoredCurrency(),
  
  // Supported currencies
  SUPPORTED: SUPPORTED_CURRENCIES,
  
  // Currency-specific settings
  SETTINGS: CURRENCY_SETTINGS,
};

// ========== EXCHANGE RATE MANAGEMENT ==========

// Default fallback exchange rates
const DEFAULT_EXCHANGE_RATES = {
  USD: {
    USD: 1,
    TZS: 2400,  // 1 USD = 2400 TZS
  },
  TZS: {
    USD: 0.0004167, // 1 TZS = 0.0004167 USD
    TZS: 1,
  },
};

// Cache for exchange rates
let EXCHANGE_RATES = { ...DEFAULT_EXCHANGE_RATES };
let exchangeRateCache = {
  timestamp: 0,
  ttl: 5 * 60 * 1000, // 5 minutes cache
};

// Service reference for backend calls
let paymentServiceInstance = null;

// Initialize the payment service reference
export const setPaymentService = (paymentService) => {
  paymentServiceInstance = paymentService;
};

// Check if a currency pair is supported by backend
const isRouteSupported = (fromCurrency, toCurrency) => {
  // Based on your note: "only USD TZS is supported for a given route"
  // This means backend only provides rates for USD↔TZS conversions
  const supportedPairs = [
    ['USD', 'TZS'],
    ['TZS', 'USD'],
  ];
  
  return supportedPairs.some(
    ([from, to]) => from === fromCurrency && to === toCurrency
  );
};

// Fetch exchange rate from backend for supported routes
const fetchRateFromBackend = async (fromCurrency, toCurrency) => {
  if (!paymentServiceInstance) {
    console.warn('Payment service not initialized, using fallback rates');
    return DEFAULT_EXCHANGE_RATES[fromCurrency]?.[toCurrency];
  }
  
  if (!isRouteSupported(fromCurrency, toCurrency)) {
    // Use fallback for non-supported routes
    return DEFAULT_EXCHANGE_RATES[fromCurrency]?.[toCurrency];
  }
  
  try {
    // Use the paymentService to convert 1 unit to get the rate
    const result = await paymentServiceInstance.convertCurrency(1, fromCurrency, toCurrency);
    console.log(result);
    
    if (result && (result.convertedAmount || result.rate)) {
      const rate = result.convertedAmount || result.rate;
      
      // Update the cache
      if (!EXCHANGE_RATES[fromCurrency]) {
        EXCHANGE_RATES[fromCurrency] = {};
      }
      EXCHANGE_RATES[fromCurrency][toCurrency] = rate;
      
      // Also update the inverse rate
      if (!EXCHANGE_RATES[toCurrency]) {
        EXCHANGE_RATES[toCurrency] = {};
      }
      EXCHANGE_RATES[toCurrency][fromCurrency] = 1 / rate;
      
      // Update cache timestamp
      exchangeRateCache.timestamp = Date.now();
      
      // Store in localStorage for offline use
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem('exchangeRates', JSON.stringify({
            rates: EXCHANGE_RATES,
            timestamp: exchangeRateCache.timestamp,
          }));
        } catch (e) {
          console.warn('Failed to store exchange rates in localStorage:', e);
        }
      }
      
      return rate;
    }
  } catch (error) {
    console.warn(`Failed to fetch exchange rate for ${fromCurrency}→${toCurrency} from backend:`, error);
  }
  
  // Fallback to default rates
  return DEFAULT_EXCHANGE_RATES[fromCurrency]?.[toCurrency];
};

// Load cached rates from localStorage
const loadCachedRates = () => {
  if (typeof window === 'undefined') return;
  
  try {
    const cached = localStorage.getItem('exchangeRates');
    if (cached) {
      const { rates, timestamp } = JSON.parse(cached);
      const now = Date.now();
      
      // Use cache if it's less than 1 hour old
      if (now - timestamp < 60 * 60 * 1000) {
        EXCHANGE_RATES = rates;
        exchangeRateCache.timestamp = timestamp;
        return true;
      }
    }
  } catch (e) {
    console.warn('Failed to load cached exchange rates:', e);
  }
  return false;
};

// Get exchange rate with backend fallback
const getRateWithFallback = (fromCurrency, toCurrency) => {
  // Check cache first
  if (EXCHANGE_RATES[fromCurrency] && EXCHANGE_RATES[fromCurrency][toCurrency] !== undefined) {
    return EXCHANGE_RATES[fromCurrency][toCurrency];
  }
  
  // Calculate via USD if direct rate not available
  if (EXCHANGE_RATES[fromCurrency]?.USD && EXCHANGE_RATES.USD[toCurrency]) {
    return EXCHANGE_RATES[fromCurrency].USD * EXCHANGE_RATES.USD[toCurrency];
  }
  
  // Ultimate fallback
  return DEFAULT_EXCHANGE_RATES[fromCurrency]?.[toCurrency] || 1;
};

// Initialize exchange rates on module load
loadCachedRates();

// ========== HELPER FUNCTIONS ==========

// Get current currency object from localStorage
export const getCurrentCurrency = () => {
  return getStoredCurrency();
};

// Get current currency code
export const getCurrentCurrencyCode = () => {
  return getCurrentCurrency().code;
};

// Get configuration for a specific currency
export const getCurrencyConfig = (currencyCode = getCurrentCurrencyCode()) => {
  return CURRENCY_CONFIG.SETTINGS[currencyCode] || CURRENCY_CONFIG.SETTINGS.USD;
};

// Format amount with currency symbol
// Enhanced formatCurrency function with currency conversion awareness
export const formatCurrency = (amount, currencyCode = null) => {
  const currentCurrency = getCurrentCurrency();
  
  // If no currency code provided, just format with current currency
  if (!currencyCode) {
    const config = getCurrencyConfig(currentCurrency.code);
    
    const formattedAmount = new Intl.NumberFormat(currentCurrency.locale, {
      minimumFractionDigits: config.decimals,
      maximumFractionDigits: config.decimals,
    }).format(amount);
    
    // Some currencies put symbol after the amount
    const symbolPosition = currentCurrency.locale.includes('en-US') ? 'before' : 'after';
    
    return symbolPosition === 'before' 
      ? `${currentCurrency.symbol}${formattedAmount}`
      : `${formattedAmount} ${currentCurrency.symbol}`;
  }
  
  // If provided currency code matches current currency, no conversion needed
  if (currencyCode === currentCurrency.code) {
    const currency = getCurrencyByCode(currencyCode) || currentCurrency;
    const config = getCurrencyConfig(currency.code);
    
    const formattedAmount = new Intl.NumberFormat(currency.locale, {
      minimumFractionDigits: config.decimals,
      maximumFractionDigits: config.decimals,
    }).format(amount);
    
    const symbolPosition = currency.locale.includes('en-US') ? 'before' : 'after';
    
    return symbolPosition === 'before' 
      ? `${currency.symbol}${formattedAmount}`
      : `${formattedAmount} ${currency.symbol}`;
  }
  
  // Different currency provided, need to convert to current currency
  const fromCurrencyCode = currencyCode;
  const toCurrencyCode = currentCurrency.code;
  
  // Get exchange rate (will use cached or fallback rates)
  const conversion = convertCurrency(amount, fromCurrencyCode, toCurrencyCode);
  
  const config = getCurrencyConfig(currentCurrency.code);
  
  const formattedAmount = new Intl.NumberFormat(currentCurrency.locale, {
    minimumFractionDigits: config.decimals,
    maximumFractionDigits: config.decimals,
  }).format(conversion.convertedAmount);
  
  const symbolPosition = currentCurrency.locale.includes('en-US') ? 'before' : 'after';
  
  return symbolPosition === 'before' 
    ? `${currentCurrency.symbol}${formattedAmount}`
    : `${formattedAmount} ${currentCurrency.symbol}`;
};

// Enhanced convertCurrency function with backend support
export const convertCurrency = (amount, fromCurrency, toCurrency) => {
  // If same currency, no conversion needed
  if (fromCurrency === toCurrency) {
    return {
      originalAmount: amount,
      convertedAmount: amount,
      fromCurrency,
      toCurrency,
      rate: 1,
      note: "Same currency, no conversion applied"
    };
  }
  
  // Get rate from cache or calculate
  const rate = getExchangeRate(fromCurrency, toCurrency);
  const convertedAmount = amount * rate;
  
  return {
    originalAmount: amount,
    convertedAmount,
    fromCurrency,
    toCurrency,
    rate,
    note: "Conversion applied"
  };
};

// Async version for fetching from backend when needed
export const convertCurrencyWithBackend = async (amount, fromCurrency, toCurrency) => {
  if (fromCurrency === toCurrency) {
    return {
      originalAmount: amount,
      convertedAmount: amount,
      fromCurrency,
      toCurrency,
      rate: 1,
      source: 'same_currency'
    };
  }
  
  // Check if we need to fetch from backend
  const now = Date.now();
  const needsRefresh = now - exchangeRateCache.timestamp > exchangeRateCache.ttl;
  const isSupportedRoute = isRouteSupported(fromCurrency, toCurrency);
  
  let rate;
  let source = 'cache';
  
  if (isSupportedRoute && (needsRefresh || !EXCHANGE_RATES[fromCurrency]?.[toCurrency])) {
    // Fetch from backend for supported routes
    rate = await fetchRateFromBackend(fromCurrency, toCurrency);
    source = 'backend';
  } else {
    // Use cached rate
    rate = getExchangeRate(fromCurrency, toCurrency);
  }
  
  const convertedAmount = amount * rate;
  
  return {
    originalAmount: amount,
    convertedAmount,
    fromCurrency,
    toCurrency,
    rate,
    source
  };
};

export const getExchangeRate = (fromCurrency, toCurrency) => {
  if (fromCurrency === toCurrency) return 1;
  
  return getRateWithFallback(fromCurrency, toCurrency);
};

// Async version for getting exchange rate with backend support
export const getExchangeRateWithBackend = async (fromCurrency, toCurrency) => {
  if (fromCurrency === toCurrency) return 1;
  
  const now = Date.now();
  const needsRefresh = now - exchangeRateCache.timestamp > exchangeRateCache.ttl;
  const isSupportedRoute = isRouteSupported(fromCurrency, toCurrency);
  
  if (isSupportedRoute && (needsRefresh || !EXCHANGE_RATES[fromCurrency]?.[toCurrency])) {
    const rate = await fetchRateFromBackend(fromCurrency, toCurrency);
    return rate;
  }
  
  return getExchangeRate(fromCurrency, toCurrency);
};

// Optional: Add a function to format with conversion explicitly
export const formatCurrencyWithConversion = (amount, fromCurrencyCode, showOriginal = false) => {
  const currentCurrency = getCurrentCurrency();
  
  if (fromCurrencyCode === currentCurrency.code) {
    return formatCurrency(amount);
  }
  
  const conversion = convertCurrency(amount, fromCurrencyCode, currentCurrency.code);
  
  const formattedConverted = formatCurrency(conversion.convertedAmount);
  
  if (showOriginal) {
    const formattedOriginal = formatCurrency(amount, fromCurrencyCode);
    return `${formattedConverted} (≈${formattedOriginal})`;
  }
  
  return formattedConverted;
};

// Helper to check if conversion is needed
export const shouldConvertCurrency = (currencyCode) => {
  if (!currencyCode) return false;
  return currencyCode !== getCurrentCurrencyCode();
};

// Get quick amounts for current currency
export const getQuickAmounts = (currencyCode = null) => {
  const currency = currencyCode || getCurrentCurrencyCode();
  return getCurrencyConfig(currency).defaultQuickAmounts;
};

// Check if mobile money is supported for currency
export const isMobileMoneySupported = (currencyCode = null) => {
  const currency = currencyCode || getCurrentCurrencyCode();
  return getCurrencyConfig(currency).mobileMoneySupported;
};

// ========== DEPOSIT FUNCTIONS ==========

export const getDepositSettings = (currencyCode = null) => {
  const currency = currencyCode || getCurrentCurrencyCode();
  const config = getCurrencyConfig(currency);
  
  return {
    minDeposit: config.minDeposit,
    maxDeposit: config.maxDeposit,
    step: config.step,
    decimals: config.decimals,
    dailyLimit: config.dailyDepositLimit || config.maxDeposit * 2,
    depositFee: config.depositFee || 0,
    depositFeeType: config.depositFeeType || 'percentage',
    paymentMethods: config.paymentMethods || [],
  };
};

export const getMinDeposit = (currencyCode = null) => {
  const settings = getDepositSettings(currencyCode);
  return settings.minDeposit;
};

export const getMaxDeposit = (currencyCode = null) => {
  const settings = getDepositSettings(currencyCode);
  return settings.maxDeposit;
};

export const getDepositStep = (currencyCode = null) => {
  const settings = getDepositSettings(currencyCode);
  return settings.step;
};

export const getDepositDailyLimit = (currencyCode = null) => {
  const settings = getDepositSettings(currencyCode);
  return settings.dailyLimit;
};

export const calculateDepositFee = (amount, currencyCode = null) => {
  const settings = getDepositSettings(currencyCode);
  if (settings.depositFeeType === 'percentage') {
    return (amount * settings.depositFee) / 100;
  }
  return settings.depositFee;
};

export const getDepositFeePercentage = (currencyCode = null) => {
  const settings = getDepositSettings(currencyCode);
  return settings.depositFee;
};

// ========== WITHDRAWAL FUNCTIONS ==========

export const getWithdrawalSettings = (currencyCode = null) => {
  const currency = currencyCode || getCurrentCurrencyCode();
  const config = getCurrencyConfig(currency);
  
  return {
    minMobileMoneyWithdrawal: config.minMobileMoneyWithdrawal,
    maxMobileMoneyWithdrawal: config.maxMobileMoneyWithdrawal,
    minBankWithdrawal: config.minBankWithdrawal,
    maxBankWithdrawal: config.maxBankWithdrawal,
    withdrawalStep: config.withdrawalStep,
    withdrawalFees: config.withdrawalFees,
    withdrawalProcessingTimes: config.withdrawalProcessingTimes,
    requireBIC: config.requireBIC,
    requireIBAN: config.requireIBAN,
    dailyLimit: config.dailyWithdrawalLimit || config.maxBankWithdrawal,
    withdrawalFeePercentage: config.withdrawalFeePercentage || 1.5,
  };
};

export const getWithdrawalFee = (method = 'mobileMoney', currencyCode = null) => {
  const settings = getWithdrawalSettings(currencyCode);
  return settings.withdrawalFees[method] || 0;
};

export const getProcessingTime = (method = 'mobileMoney', currencyCode = null) => {
  const settings = getWithdrawalSettings(currencyCode);
  return settings.withdrawalProcessingTimes[method] || "1-3 business days";
};

export const getMinMobileMoneyWithdrawal = (currencyCode = null) => {
  const settings = getWithdrawalSettings(currencyCode);
  return settings.minMobileMoneyWithdrawal;
};

export const getMaxMobileMoneyWithdrawal = (currencyCode = null) => {
  const settings = getWithdrawalSettings(currencyCode);
  return settings.maxMobileMoneyWithdrawal;
};

export const getMinBankWithdrawal = (currencyCode = null) => {
  const settings = getWithdrawalSettings(currencyCode);
  return settings.minBankWithdrawal;
};

export const getMaxBankWithdrawal = (currencyCode = null) => {
  const settings = getWithdrawalSettings(currencyCode);
  return settings.maxBankWithdrawal;
};

export const getWithdrawalStep = (currencyCode = null) => {
  const settings = getWithdrawalSettings(currencyCode);
  return settings.withdrawalStep;
};

export const calculateWithdrawalFee = (amount, method = 'mobileMoney', currencyCode = null) => {
  const settings = getWithdrawalSettings(currencyCode);
  const fixedFee = settings.withdrawalFees[method] || 0;
  const percentageFee = (amount * settings.withdrawalFeePercentage) / 100;
  return fixedFee + percentageFee;
};

export const calculateNetWithdrawalAmount = (amount, method = 'mobileMoney', currencyCode = null) => {
  const fee = calculateWithdrawalFee(amount, method, currencyCode);
  return amount - fee;
};

// ========== PHONE NUMBER FUNCTIONS ==========

export const getPhonePrefix = (currencyCode = null) => {
  const currency = currencyCode 
    ? CURRENCY_CONFIG.SUPPORTED.find(c => c.code === currencyCode) 
    : getCurrentCurrency();
  return currency.phonePrefix;
};

export const getPhoneLength = (currencyCode = null) => {
  const currency = currencyCode 
    ? CURRENCY_CONFIG.SUPPORTED.find(c => c.code === currencyCode) 
    : getCurrentCurrency();
  return currency.phoneLength;
};

export const formatPhoneForDisplay = (phoneNumber, currencyCode = null) => {
  const prefix = getPhonePrefix(currencyCode);
  const length = getPhoneLength(currencyCode);
  
  if (!phoneNumber) return '';
  
  // Remove all non-digits
  const digits = phoneNumber.replace(/\D/g, '');
  
  // If it already starts with the prefix, use as is
  if (digits.startsWith(prefix.replace('+', ''))) {
    return `+${digits}`;
  }
  
  // Otherwise, add the prefix
  return `${prefix}${digits.slice(-length)}`;
};

export const validatePhoneNumber = (phoneNumber, currencyCode = null) => {
  const length = getPhoneLength(currencyCode);
  const digits = phoneNumber.replace(/\D/g, '');
  
  // Basic validation - check length
  if (digits.length < length) {
    return {
      valid: false,
      message: `Phone number must be at least ${length} digits`
    };
  }
  
  // Check if it's a valid number format
  // You could add more specific validation per country here
  
  return {
    valid: true,
    formatted: formatPhoneForDisplay(digits, currencyCode)
  };
};

// ========== BANK DETAILS FUNCTIONS ==========

export const isBICRequired = (currencyCode = null) => {
  const settings = getWithdrawalSettings(currencyCode);
  return settings.requireBIC;
};

export const isIBANRequired = (currencyCode = null) => {
  const settings = getWithdrawalSettings(currencyCode);
  return settings.requireIBAN;
};

export const getSupportedBanks = (currencyCode = null) => {
  const currency = currencyCode || getCurrentCurrencyCode();
  const config = getCurrencyConfig(currency);
  return config.supportedBanks || [];
};

export const getMobileMoneyProviders = (currencyCode = null) => {
  const currency = currencyCode || getCurrentCurrencyCode();
  const config = getCurrencyConfig(currency);
  return config.mobileMoneyProviders || [];
};

// ========== LIMIT FUNCTIONS ==========

export const getDailyDepositLimit = (currencyCode = null) => {
  const settings = getDepositSettings(currencyCode);
  return settings.dailyLimit;
};

export const getDailyWithdrawalLimit = (currencyCode = null) => {
  const settings = getWithdrawalSettings(currencyCode);
  return settings.dailyLimit;
};

export const checkDepositLimit = (amount, currencyCode = null) => {
  const limit = getDailyDepositLimit(currencyCode);
  return amount <= limit;
};

export const checkWithdrawalLimit = (amount, currencyCode = null) => {
  const limit = getDailyWithdrawalLimit(currencyCode);
  return amount <= limit;
};

// ========== CURRENCY SWITCHING ==========

export const switchCurrency = (currencyCode) => {
  const currency = CURRENCY_CONFIG.SUPPORTED.find(c => c.code === currencyCode);
  if (currency) {
    // Update in-memory config
    CURRENCY_CONFIG.PRIMARY = currency;
    
    // Persist to localStorage
    if (typeof window !== 'undefined') {
      localStorage.setItem('selectedCurrency', currencyCode);
    }
    
    return true;
  }
  return false;
};

export const getAllCurrencies = () => {
  return CURRENCY_CONFIG.SUPPORTED;
};

export const getCurrencyByCode = (currencyCode) => {
  return CURRENCY_CONFIG.SUPPORTED.find(c => c.code === currencyCode);
};

// ========== VALIDATION FUNCTIONS ==========

export const validateDepositAmount = (amount, currencyCode = null) => {
  const settings = getDepositSettings(currencyCode);
  
  if (amount < settings.minDeposit) {
    return {
      valid: false,
      message: `Minimum deposit is ${formatCurrency(settings.minDeposit, currencyCode)}`
    };
  }
  
  if (amount > settings.maxDeposit) {
    return {
      valid: false,
      message: `Maximum deposit is ${formatCurrency(settings.maxDeposit, currencyCode)}`
    };
  }
  
  if (amount % settings.step !== 0) {
    return {
      valid: false,
      message: `Amount must be in multiples of ${formatCurrency(settings.step, currencyCode)}`
    };
  }
  
  return { valid: true };
};

export const validateWithdrawalAmount = (amount, method = 'mobileMoney', currencyCode = null) => {
  const settings = getWithdrawalSettings(currencyCode);
  
  const minAmount = method === 'bank_transfer' 
    ? settings.minBankWithdrawal 
    : settings.minMobileMoneyWithdrawal;
  
  const maxAmount = method === 'bank_transfer' 
    ? settings.maxBankWithdrawal 
    : settings.maxMobileMoneyWithdrawal;
  
  if (amount < minAmount) {
    return {
      valid: false,
      message: `Minimum withdrawal is ${formatCurrency(minAmount, currencyCode)}`
    };
  }
  
  if (amount > maxAmount) {
    return {
      valid: false,
      message: `Maximum withdrawal is ${formatCurrency(maxAmount, currencyCode)}`
    };
  }
  
  if (amount % settings.withdrawalStep !== 0) {
    return {
      valid: false,
      message: `Amount must be in multiples of ${formatCurrency(settings.withdrawalStep, currencyCode)}`
    };
  }
  
  return { valid: true };
};

// ========== NEW FUNCTIONS FOR BACKEND INTEGRATION ==========

// Refresh exchange rates from backend
export const refreshExchangeRates = async () => {
  const now = Date.now();
  exchangeRateCache.timestamp = now;
  
  // Try to update supported routes
  if (paymentServiceInstance) {
    try {
      // Update USD↔TZS rates
      await fetchRateFromBackend('USD', 'TZS');
      // Update TZS↔USD rates (inverse will be automatically calculated)
      await fetchRateFromBackend('TZS', 'USD');
    } catch (error) {
      console.warn('Failed to refresh exchange rates:', error);
    }
  }
 
  return EXCHANGE_RATES;
};

// Get current exchange rates cache info
export const getExchangeRateInfo = () => {
  return {
    rates: EXCHANGE_RATES,
    timestamp: exchangeRateCache.timestamp,
    ttl: exchangeRateCache.ttl,
    isFresh: Date.now() - exchangeRateCache.timestamp < exchangeRateCache.ttl,
  };
};

// ========== EXPORT DEFAULT ==========

export default {
  // Core functions
  getCurrentCurrency,
  getCurrencyConfig,
  getCurrentCurrencyCode,
  formatCurrency,
  getQuickAmounts,
  isMobileMoneySupported,
  
  // Deposit functions
  getDepositSettings,
  getMinDeposit,
  getMaxDeposit,
  getDepositStep,
  getDepositDailyLimit,
  calculateDepositFee,
  getDepositFeePercentage,
  
  // Withdrawal functions
  getWithdrawalSettings,
  getWithdrawalFee,
  getProcessingTime,
  getMinMobileMoneyWithdrawal,
  getMaxMobileMoneyWithdrawal,
  getMinBankWithdrawal,
  getMaxBankWithdrawal,
  getWithdrawalStep,
  calculateWithdrawalFee,
  calculateNetWithdrawalAmount,
  
  // Phone functions
  getPhonePrefix,
  getPhoneLength,
  formatPhoneForDisplay,
  validatePhoneNumber,
  
  // Bank functions
  isBICRequired,
  isIBANRequired,
  getSupportedBanks,
  getMobileMoneyProviders,
  
  // Limit functions
  getDailyDepositLimit,
  getDailyWithdrawalLimit,
  checkDepositLimit,
  checkWithdrawalLimit,
  
  // Currency switching
  switchCurrency,
  getAllCurrencies,
  getCurrencyByCode,
  
  // Validation
  validateDepositAmount,
  validateWithdrawalAmount,
  
  // Conversion (original synchronous functions)
  convertCurrency,
  getExchangeRate,
  
  // New backend-aware functions
  convertCurrencyWithBackend,
  getExchangeRateWithBackend,
  refreshExchangeRates,
  getExchangeRateInfo,
  setPaymentService,
  
  // Constants
  CURRENCY_CONFIG,
};
