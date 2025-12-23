// services/ClickPesaService.js
const crypto = require('crypto');
const axios = require('axios');

class ClickPesaService {
  constructor() {
    // API credentials
    this.clientId = process.env.CLICKPESA_CLIENT_ID;
    this.apiKey = process.env.CLICKPESA_API_KEY;
    this.checksumKey = process.env.CLICKPESA_CHECKSUM_KEY || process.env.CLICKPESA_API_SECRET;
    
    // URLs
    this.baseURL = process.env.CLICKPESA_BASE_URL ||
      (process.env.NODE_ENV === 'production'
        ? 'https://api.clickpesa.com'
        : 'https://api-sandbox.clickpesa.com');

    // Currency configuration
    this.baseCurrency = process.env.BASE_CURRENCY || 'USD'; // Your app's base currency
    this.payoutCurrency = 'TZS'; // ClickPesa only accepts TZS for payouts
    this.exchangeRateCache = {
      rates: null,
      lastUpdated: null,
      ttl: 5 * 60 * 1000, // Cache TTL: 5 minutes (300,000 ms)
    };

    this.token = null;
    this.tokenExpiry = null;

    // Axios client with interceptors
    this.client = axios.create({
      baseURL: this.baseURL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    });

    // Request interceptor for auth token
    this.client.interceptors.request.use(async (config) => {
      // Skip auth for token generation endpoint
      if (!config.url.includes('/third-parties/generate-token')) {
        const token = await this.getValidToken();
        config.headers.Authorization = `${token}`;
      }
      return config;
    });

    // Response interceptor
    this.client.interceptors.response.use(
      (response) => response.data,
      (error) => {
        const errorData = {
          url: error.config?.url,
          method: error.config?.method,
          status: error.response?.status,
          data: error.response?.data,
          message: error.message,
        };
        console.error('ClickPesa API Error:', errorData);

        // Return structured error
        return Promise.reject({
          status: error.response?.status || 500,
          message: error.response?.data?.message || error.message,
          code: error.response?.data?.error_code,
          data: error.response?.data,
        });
      }
    );
  }

  /**
   * Get valid token with automatic refresh
   * Token expires in 1 hour (use 55 minutes for safety)
   */
  async getValidToken() {
    if (this.token && this.tokenExpiry && Date.now() < this.tokenExpiry) {
      return this.token;
    }

    return await this.generateToken();
  }

  /**
   * Generate Authorization Token
   * POST /third-parties/generate-token
   */
  async generateToken() {
    try {
      if (!this.clientId || !this.apiKey) {
        throw new Error('ClickPesa credentials not configured');
      }

      const response = await this.client.post(
        '/third-parties/generate-token',
        {},
        {
          headers: {
            'client-id': this.clientId,
            'api-key': this.apiKey,
          },
        }
      );

      if (response.success && response.token) {
        this.token = response.token;
        this.tokenExpiry = Date.now() + 55 * 60 * 1000; // 55 minutes
        return response.token;
      }

      throw new Error('Token generation failed: Invalid response');
    } catch (error) {
      console.error('Token generation error:', error);
      throw new Error(`Token generation failed: ${error.message || 'Unknown error'}`);
    }
  }

  /**
   * Get exchange rates from ClickPesa API
   * GET /third-parties/exchange-rates/all
   */
  async getExchangeRates(forceRefresh = false) {
    try {
      // Return cached rates if still valid and not forced to refresh
      if (
        !forceRefresh &&
        this.exchangeRateCache.rates &&
        this.exchangeRateCache.lastUpdated &&
        Date.now() - this.exchangeRateCache.lastUpdated < this.exchangeRateCache.ttl
      ) {
        return this.exchangeRateCache.rates;
      }

      console.log('Fetching fresh exchange rates from ClickPesa...');
      const response = await this.client.get('/third-parties/exchange-rates/all');

      if (Array.isArray(response)) {
        // Store rates in a structured format for easy access
        const ratesMap = {};
        response.forEach(rate => {
          const key = `${rate.source}_${rate.target}`;
          ratesMap[key] = {
            rate: rate.rate,
            date: new Date(rate.date),
            inverse: 1 / rate.rate, // Pre-calculate inverse for bidirectional conversions
          };
        });

        this.exchangeRateCache.rates = ratesMap;
        this.exchangeRateCache.lastUpdated = Date.now();

        console.log('Exchange rates updated:', Object.keys(ratesMap).length, 'rate pairs loaded');
        return ratesMap;
      }

      throw new Error('Invalid exchange rates response format');
    } catch (error) {
      console.error('Exchange rates fetch error:', error);
      
      // If we have cached rates, return them even if expired (fail gracefully)
      if (this.exchangeRateCache.rates) {
        console.warn('Using stale exchange rates due to API error');
        return this.exchangeRateCache.rates;
      }
      
      throw new Error(
        `Failed to fetch exchange rates: ${error.message || 'Unknown error'}`
      );
    }
  }

  /**
   * Convert amount from one currency to another using ClickPesa rates
   * @param {number} amount - Amount to convert
   * @param {string} fromCurrency - Source currency code (USD, TZS, etc.)
   * @param {string} toCurrency - Target currency code
   * @param {boolean} roundToNearest - Round to nearest whole number (for TZS)
   * @returns {Object} - Converted amount and metadata
   */
  async convertCurrency(amount, fromCurrency, toCurrency, roundToNearest = true) {
    try {
      // Validate inputs
      if (typeof amount !== 'number' || amount <= 0) {
        throw new Error('Invalid amount. Must be a positive number.');
      }

      if (fromCurrency.toUpperCase() === toCurrency.toUpperCase()) {
        return {
          originalAmount: amount,
          convertedAmount: amount,
          rate: 1,
          fromCurrency,
          toCurrency,
          isConverted: false,
          timestamp: new Date().toISOString(),
        };
      }

      // Get fresh exchange rates
      const rates = await this.getExchangeRates();

      // Try direct rate first (e.g., USD_TZS)
      const directKey = `${fromCurrency.toUpperCase()}_${toCurrency.toUpperCase()}`;
      
      if (rates[directKey]) {
        let converted = amount * rates[directKey].rate;
        
        if (roundToNearest && toCurrency.toUpperCase() === 'TZS') {
          // Round TZS to nearest whole number (no decimals in TZS)
          converted = Math.round(converted);
        }

        return {
          originalAmount: amount,
          convertedAmount: parseFloat(converted.toFixed(6)), // Keep precision for accounting
          rate: rates[directKey].rate,
          fromCurrency,
          toCurrency,
          isConverted: true,
          timestamp: rates[directKey].date.toISOString(),
          rateDate: rates[directKey].date.toISOString(),
        };
      }

      // Try inverse rate (e.g., TZS_USD when we need USD_TZS)
      const inverseKey = `${toCurrency.toUpperCase()}_${fromCurrency.toUpperCase()}`;
      
      if (rates[inverseKey]) {
        let converted = amount / rates[inverseKey].rate; // Use inverse conversion
        
        if (roundToNearest && toCurrency.toUpperCase() === 'TZS') {
          converted = Math.round(converted);
        }

        return {
          originalAmount: amount,
          convertedAmount: parseFloat(converted.toFixed(6)),
          rate: 1 / rates[inverseKey].rate,
          fromCurrency,
          toCurrency,
          isConverted: true,
          timestamp: rates[inverseKey].date.toISOString(),
          rateDate: rates[inverseKey].date.toISOString(),
          note: 'Converted using inverse rate',
        };
      }

      // Try using USD as pivot currency if available
      const fromToUSD = rates[`${fromCurrency.toUpperCase()}_USD`];
      const usdToTarget = rates[`USD_${toCurrency.toUpperCase()}`];
      
      if (fromToUSD && usdToTarget) {
        // Convert fromCurrency -> USD -> toCurrency
        const usdAmount = amount * fromToUSD.rate;
        let converted = usdAmount * usdToTarget.rate;
        
        if (roundToNearest && toCurrency.toUpperCase() === 'TZS') {
          converted = Math.round(converted);
        }

        return {
          originalAmount: amount,
          convertedAmount: parseFloat(converted.toFixed(6)),
          rate: fromToUSD.rate * usdToTarget.rate,
          fromCurrency,
          toCurrency,
          isConverted: true,
          timestamp: new Date().toISOString(),
          rateDate: fromToUSD.date.toISOString(),
          note: 'Converted via USD pivot',
        };
      }

      throw new Error(`No exchange rate found for ${fromCurrency} to ${toCurrency}`);
    } catch (error) {
      console.error('Currency conversion error:', error);
      throw new Error(`Currency conversion failed: ${error.message}`);
    }
  }

  /**
   * Convert USD amount to TZS for ClickPesa payout
   * This is the primary method for payout conversion
   */
  async convertUSDToTZS(usdAmount) {
    return this.convertCurrency(usdAmount, 'USD', 'TZS', true);
  }

  /**
   * Convert TZS amount to USD (for reconciliation, reporting, etc.)
   */
  async convertTZSToUSD(tzsAmount) {
    return this.convertCurrency(tzsAmount, 'TZS', 'USD', false);
  }

  /**
   * Get current USD to TZS rate with metadata
   */
  async getUSDtoTZSRate() {
    const rates = await this.getExchangeRates();
    const rateKey = 'USD_TZS';
    
    if (!rates[rateKey]) {
      throw new Error('USD to TZS exchange rate not available');
    }

    return {
      rate: rates[rateKey].rate,
      date: rates[rateKey].date,
      source: 'USD',
      target: 'TZS',
      inverseRate: rates[rateKey].inverse,
    };
  }

  /**
   * Normalize payout amount based on currency
   * Converts from USD (or other currencies) to TZS for ClickPesa payouts
   */
  async normalizePayoutAmount(payoutData) {
    const { amount, currency = this.baseCurrency } = payoutData;
    
    if (!amount || typeof amount !== 'number' || amount <= 0) {
      throw new Error('Invalid payout amount. Must be a positive number.');
    }

    const normalized = { ...payoutData };

    // If currency is already TZS, ensure it's a whole number
    if (currency.toUpperCase() === 'TZS') {
      normalized.amount = Math.round(amount);
      normalized.currency = 'TZS';
      normalized.originalAmount = amount;
      normalized.originalCurrency = 'TZS';
      return normalized;
    }

    // If currency is USD, convert to TZS
    if (currency.toUpperCase() === 'USD') {
      const conversion = await this.convertUSDToTZS(amount);
      
      normalized.amount = conversion.convertedAmount;
      normalized.currency = 'TZS';
      normalized.originalAmount = amount;
      normalized.originalCurrency = 'USD';
      normalized.conversionRate = conversion.rate;
      normalized.conversionTimestamp = conversion.timestamp;
      normalized.convertedFrom = 'USD';
      
      return normalized;
    }

    // For other currencies, attempt conversion via USD
    try {
      const conversion = await this.convertCurrency(amount, currency, 'TZS', true);
      
      normalized.amount = conversion.convertedAmount;
      normalized.currency = 'TZS';
      normalized.originalAmount = amount;
      normalized.originalCurrency = currency;
      normalized.conversionRate = conversion.rate;
      normalized.conversionTimestamp = conversion.timestamp;
      normalized.convertedFrom = currency;
      
      return normalized;
    } catch (error) {
      throw new Error(
        `Cannot convert ${currency} to TZS for payout. Please use USD or TZS.`
      );
    }
  }

  /**
   * Calculate payout amount with fee consideration
   * @param {Object} options - Options for payout calculation
   * @returns {Object} - Calculated amounts and fees
   */
  async calculatePayoutWithFees(options) {
    const {
      amount,
      currency = this.baseCurrency,
      feeBearer = 'MERCHANT', // MERCHANT or CUSTOMER
      payoutMethod = 'MOBILE_MONEY',
    } = options;

    // Normalize amount to TZS
    const normalized = await this.normalizePayoutAmount({ amount, currency });
    
    let calculatedAmount = normalized.amount;
    let feeAmount = 0;

    // Note: These fees are examples. You should configure them based on your ClickPesa agreement
    const feeRates = {
      'MOBILE_MONEY': {
        fixed: 100, // TZS fixed fee
        percentage: 0.5, // 0.5% fee
      },
      'BANK_PAYOUT': {
        fixed: 500, // TZS fixed fee
        percentage: 1.0, // 1.0% fee
      },
    };

    const feeConfig = feeRates[payoutMethod] || feeRates['MOBILE_MONEY'];
    
    // Calculate fee
    feeAmount = Math.round(
      feeConfig.fixed + (normalized.amount * feeConfig.percentage / 100)
    );

    let finalPayoutAmount = calculatedAmount;
    let totalDebitAmount = normalized.originalAmount;

    if (feeBearer === 'CUSTOMER') {
      // Customer pays the fee - payout amount remains same
      totalDebitAmount = await this.convertTZSToUSD(calculatedAmount + feeAmount);
    } else {
      // Merchant pays the fee - payout amount reduced by fee
      finalPayoutAmount = Math.max(0, calculatedAmount - feeAmount);
    }

    return {
      payoutAmountTZS: finalPayoutAmount,
      originalAmount: normalized.originalAmount,
      originalCurrency: normalized.originalCurrency,
      convertedAmount: normalized.amount,
      conversionRate: normalized.conversionRate,
      feeBearer,
      feeAmountTZS: feeAmount,
      totalDebitAmount: totalDebitAmount.convertedAmount || totalDebitAmount,
      totalDebitCurrency: 'USD',
      payoutMethod,
      conversionInfo: {
        rate: normalized.conversionRate,
        timestamp: normalized.conversionTimestamp,
        fromCurrency: normalized.originalCurrency,
        toCurrency: 'TZS',
      },
    };
  }

  /**
   * Generate checksum for payout requests (HMAC-SHA256)
   * Format: amount + phoneNumber + currency + orderReference + apiSecret
   */
  generateChecksum(payload) {
    if (!this.checksumKey) {
      console.warn('Checksum key not configured');
      return null;
    }

    // Sort keys alphabetically for consistency
    const sortedKeys = Object.keys(payload).sort();

    // Concatenate values in specific order
    const concatenatedString = sortedKeys
      .map((key) => {
        const value = payload[key];
        if (value === null || value === undefined) {
          return '';
        }
        if (typeof value === 'object') {
          // Stringify without spaces
          return JSON.stringify(value).replace(/\s+/g, '');
        }
        return String(value);
      })
      .join('');

    // Generate HMAC-SHA256
    const hmac = crypto.createHmac('sha256', this.checksumKey);
    hmac.update(concatenatedString);
    return hmac.digest('hex');
  }

  /**
   * Verify webhook signature using raw request body
   */
  verifyWebhookSignature(rawBody, signatureHeader) {
    if (!this.checksumKey) {
      console.warn('Webhook secret not configured');
      return false;
    }

    // Convert rawBody to string if it's a Buffer
    const rawBodyString = Buffer.isBuffer(rawBody)
      ? rawBody.toString('utf8')
      : rawBody;

    // Generate HMAC-SHA256 of raw body
    const expectedSignature = crypto
      .createHmac('sha256', this.checksumKey)
      .update(rawBodyString)
      .digest('hex');

    // Use timingSafeEqual to prevent timing attacks
    try {
      return crypto.timingSafeEqual(
        Buffer.from(expectedSignature, 'hex'),
        Buffer.from(signatureHeader, 'hex')
      );
    } catch (err) {
      console.error('Signature comparison error:', err);
      return false;
    }
  }

  /**
   * Format phone number to ClickPesa format (255XXXXXXXXX)
   */
  formatPhoneNumber(phoneNumber) {
    // Remove any non-digit characters
    const cleaned = phoneNumber.replace(/\D/g, '');

    // If it starts with 0, replace with 255
    if (cleaned.startsWith('0')) {
      return '255' + cleaned.substring(1);
    }

    // If it starts with +, remove it
    if (cleaned.startsWith('+')) {
      return cleaned.substring(1);
    }

    // If it's 9 digits, prepend 255
    if (cleaned.length === 9) {
      return '255' + cleaned;
    }

    return cleaned;
  }

  /**
   * Validate phone number format (255XXXXXXXXX)
   */
  validatePhoneNumber(phoneNumber) {
    const cleaned = phoneNumber.replace(/\D/g, '');
    const regex = /^255[0-9]{9}$/;
    return regex.test(cleaned);
  }

  /**
   * 1. Preview Mobile Money Payout (with currency conversion)
   */
  async previewMobileMoneyPayout(data) {
    try {
      // Normalize payout amount (convert to TZS if needed)
      const normalizedData = await this.normalizePayoutAmount({
        amount: data.amount,
        currency: data.currency || this.baseCurrency,
      });

      // Format phone number
      const formattedPhone = this.formatPhoneNumber(data.phoneNumber);
      
      // Validate phone format
      if (!this.validatePhoneNumber(formattedPhone)) {
        throw new Error(
          `Invalid phone number format. Expected: 255XXXXXXXXX, Got: ${formattedPhone}`
        );
      }

      const payload = {
        amount: normalizedData.amount,
        phoneNumber: formattedPhone,
        currency: 'TZS', // Always TZS for ClickPesa
        orderReference: data.orderReference,
        // Add conversion metadata if conversion happened
        ...(normalizedData.originalCurrency !== 'TZS' && {
          originalAmount: normalizedData.originalAmount,
          originalCurrency: normalizedData.originalCurrency,
        }),
      };

      // Add checksum if enabled
      if (this.checksumKey && data.enableChecksum !== false) {
        payload.checksum = this.generateChecksum(payload);
      }

      const response = await this.client.post(
        '/third-parties/payouts/preview-mobile-money-payout',
        payload
      );

      // Add conversion info to response
      if (normalizedData.originalCurrency !== 'TZS') {
        response.conversionInfo = {
          originalAmount: normalizedData.originalAmount,
          originalCurrency: normalizedData.originalCurrency,
          convertedAmount: normalizedData.amount,
          convertedCurrency: 'TZS',
          exchangeRate: normalizedData.conversionRate,
          rateDate: normalizedData.conversionTimestamp,
        };
      }

      return response;
    } catch (error) {
      console.error('Preview mobile money payout error:', error);
      
      // Handle specific error codes
      if (error.code === 'INSUFFICIENT_FUNDS') {
        throw new Error('Insufficient funds in merchant account');
      } else if (error.code === 'INVALID_PHONE_NUMBER') {
        throw new Error('Invalid phone number format or network');
      }

      throw new Error(
        `Mobile money payout preview failed: ${error.message || JSON.stringify(error)}`
      );
    }
  }

  /**
   * 2. Create Mobile Money Payout (with currency conversion)
   */
  async createMobileMoneyPayout(data, options = {}) {
    try {
      // Calculate payout with fees if needed
      let payoutData = { ...data };
      let feeCalculation = null;

      if (options.calculateFees) {
        feeCalculation = await this.calculatePayoutWithFees({
          amount: data.amount,
          currency: data.currency || this.baseCurrency,
          feeBearer: options.feeBearer || 'MERCHANT',
          payoutMethod: 'MOBILE_MONEY',
        });
        
        // Update amount based on fee calculation
        if (options.feeBearer === 'MERCHANT') {
          payoutData.amount = feeCalculation.originalAmount;
        } else {
          payoutData.amount = feeCalculation.totalDebitAmount;
        }
      }

      // Normalize payout amount (convert to TZS if needed)
      const normalizedData = await this.normalizePayoutAmount({
        amount: payoutData.amount,
        currency: payoutData.currency || this.baseCurrency,
      });

      // Format phone number
      const formattedPhone = this.formatPhoneNumber(data.phoneNumber);
      
      // Validate phone format
      if (!this.validatePhoneNumber(formattedPhone)) {
        throw new Error(
          `Invalid phone number format. Expected: 255XXXXXXXXX, Got: ${formattedPhone}`
        );
      }

      const payload = {
        amount: normalizedData.amount,
        phoneNumber: formattedPhone,
        currency: 'TZS', // Always TZS for ClickPesa
        orderReference: data.orderReference,
        ...options, // Include optional fields like payoutFeeBearer, notes
        // Add conversion metadata if conversion happened
        ...(normalizedData.originalCurrency !== 'TZS' && {
          originalAmount: normalizedData.originalAmount,
          originalCurrency: normalizedData.originalCurrency,
        }),
      };

      // Add checksum if enabled
      if (this.checksumKey && data.enableChecksum !== false) {
        payload.checksum = this.generateChecksum(payload);
      }

      const response = await this.client.post(
        '/third-parties/payouts/create-mobile-money-payout',
        payload
      );

      // Add conversion and fee info to response
      const enhancedResponse = { ...response };
      
      if (normalizedData.originalCurrency !== 'TZS') {
        enhancedResponse.conversionInfo = {
          originalAmount: normalizedData.originalAmount,
          originalCurrency: normalizedData.originalCurrency,
          convertedAmount: normalizedData.amount,
          convertedCurrency: 'TZS',
          exchangeRate: normalizedData.conversionRate,
          rateDate: normalizedData.conversionTimestamp,
        };
      }

      if (feeCalculation) {
        enhancedResponse.feeInfo = {
          feeBearer: options.feeBearer || 'MERCHANT',
          feeAmountTZS: feeCalculation.feeAmountTZS,
          payoutAmountTZS: feeCalculation.payoutAmountTZS,
          totalDebitAmount: feeCalculation.totalDebitAmount,
          totalDebitCurrency: feeCalculation.totalDebitCurrency,
        };
      }

      return enhancedResponse;
    } catch (error) {
      console.error('Create mobile money payout error:', error);
      
      // Handle specific error codes
      if (error.code === 'INSUFFICIENT_FUNDS') {
        throw new Error('Insufficient funds in merchant account');
      } else if (error.code === 'DAILY_LIMIT_EXCEEDED') {
        throw new Error('Daily payout limit exceeded');
      } else if (error.code === 'INVALID_PHONE_NUMBER') {
        throw new Error('Invalid phone number format or network');
      }

      throw new Error(
        `Mobile money payout creation failed: ${error.message || JSON.stringify(error)}`
      );
    }
  }

  /**
   * 3. Get Payout by Order Reference (with currency conversion back to USD)
   */
  async getPayoutByOrderReference(orderReference) {
    try {
      if (!orderReference) {
        throw new Error('orderReference is required');
      }

      const response = await this.client.get(
        `/third-parties/payouts/${encodeURIComponent(orderReference)}`
      );

      // Convert TZS amount back to USD for reporting
      if (response && response.currency === 'TZS' && response.amount) {
        const conversion = await this.convertTZSToUSD(response.amount);
        
        response.amountInBaseCurrency = conversion.convertedAmount;
        response.baseCurrency = this.baseCurrency;
        response.exchangeRate = conversion.rate;
        response.conversionDate = conversion.timestamp;
      }

      return response;
    } catch (error) {
      console.error('Get payout by reference error:', error);

      // If payout not found, return empty array instead of throwing
      if (error.status === 404) {
        return [];
      }

      throw new Error(
        `Payout query failed: ${error.message || JSON.stringify(error)}`
      );
    }
  }

  /**
   * 4. Get All Payouts with Pagination (with currency conversion)
   */
  async getAllPayouts(filters = {}) {
    try {
      const params = {
        ...(filters.startDate && { startDate: filters.startDate }),
        ...(filters.endDate && { endDate: filters.endDate }),
        ...(filters.status && { status: filters.status }),
        ...(filters.currency && { currency: filters.currency }),
        ...(filters.channel && { channel: filters.channel }),
        ...(filters.channelProvider && { channelProvider: filters.channelProvider }),
        ...(filters.orderReference && { orderReference: filters.orderReference }),
        ...(filters.clientId && { clientId: filters.clientId }),
        ...(filters.orderBy && { orderBy: filters.orderBy }),
        skip: filters.skip || 0,
        limit: filters.limit || 20,
        page: filters.page || 1,
      };

      // Remove undefined parameters
      Object.keys(params).forEach(key => 
        params[key] === undefined && delete params[key]
      );

      const response = await this.client.get(
        '/third-parties/payouts/all',
        { params }
      );

      // Convert TZS amounts back to USD for reporting
      if (response && Array.isArray(response.payouts) && this.baseCurrency === 'USD') {
        const exchangeRate = await this.getUSDtoTZSRate();
        
        response.payouts = response.payouts.map(payout => {
          if (payout.currency === 'TZS' && payout.amount) {
            const usdAmount = payout.amount / exchangeRate.rate;
            return {
              ...payout,
              amountInBaseCurrency: parseFloat(usdAmount.toFixed(2)),
              baseCurrency: 'USD',
              exchangeRate: exchangeRate.rate,
              exchangeRateDate: exchangeRate.date,
            };
          }
          return payout;
        });

        response.conversionSummary = {
          baseCurrency: 'USD',
          exchangeRate: exchangeRate.rate,
          rateDate: exchangeRate.date,
          totalConverted: response.payouts.filter(p => p.amountInBaseCurrency).length,
        };
      }

      return response;
    } catch (error) {
      console.error('Get all payouts error:', error);
      throw new Error(
        `Payouts query failed: ${error.message || JSON.stringify(error)}`
      );
    }
  }

  /**
   * 5. Preview Bank Payout (with currency conversion)
   */
  async previewBankPayout(data) {
    try {
      // Normalize payout amount (convert to TZS if needed)
      const normalizedData = await this.normalizePayoutAmount({
        amount: data.amount,
        currency: data.currency || this.baseCurrency,
      });

      const payload = {
        amount: normalizedData.amount,
        accountNumber: data.accountNumber,
        currency: 'TZS', // Always TZS for ClickPesa
        orderReference: data.orderReference,
        bic: data.bic,
        transferType: data.transferType || 'ACH',
        // Add conversion metadata if conversion happened
        ...(normalizedData.originalCurrency !== 'TZS' && {
          originalAmount: normalizedData.originalAmount,
          originalCurrency: normalizedData.originalCurrency,
        }),
      };

      // Optional fields
      if (data.accountCurrency) {
        payload.accountCurrency = data.accountCurrency;
      }

      // Add checksum if enabled
      if (this.checksumKey && data.enableChecksum !== false) {
        payload.checksum = this.generateChecksum(payload);
      }

      const response = await this.client.post(
        '/third-parties/payouts/preview-bank-payout',
        payload
      );

      // Add conversion info to response
      if (normalizedData.originalCurrency !== 'TZS') {
        response.conversionInfo = {
          originalAmount: normalizedData.originalAmount,
          originalCurrency: normalizedData.originalCurrency,
          convertedAmount: normalizedData.amount,
          convertedCurrency: 'TZS',
          exchangeRate: normalizedData.conversionRate,
          rateDate: normalizedData.conversionTimestamp,
        };
      }

      return response;
    } catch (error) {
      console.error('Preview bank payout error:', error);
      
      // Handle specific error codes
      if (error.code === 'INSUFFICIENT_FUNDS') {
        throw new Error('Insufficient funds in merchant account');
      } else if (error.code === 'INVALID_BANK_DETAILS') {
        throw new Error('Invalid bank account details');
      }

      throw new Error(
        `Bank payout preview failed: ${error.message || JSON.stringify(error)}`
      );
    }
  }

  /**
   * 6. Create Bank Payout (with currency conversion)
   */
  async createBankPayout(data) {
    try {
      // Normalize payout amount (convert to TZS if needed)
      const normalizedData = await this.normalizePayoutAmount({
        amount: data.amount,
        currency: data.currency || this.baseCurrency,
      });

      const payload = {
        amount: normalizedData.amount,
        accountNumber: data.accountNumber,
        accountName: data.accountName,
        currency: 'TZS', // Always TZS for ClickPesa
        orderReference: data.orderReference,
        bic: data.bic,
        transferType: data.transferType || 'ACH',
        // Add conversion metadata if conversion happened
        ...(normalizedData.originalCurrency !== 'TZS' && {
          originalAmount: normalizedData.originalAmount,
          originalCurrency: normalizedData.originalCurrency,
        }),
      };

      // Add checksum if enabled
      if (this.checksumKey && data.enableChecksum !== false) {
        payload.checksum = this.generateChecksum(payload);
      }

      const response = await this.client.post(
        '/third-parties/payouts/create-bank-payout',
        payload
      );

      // Add conversion info to response
      if (normalizedData.originalCurrency !== 'TZS') {
        response.conversionInfo = {
          originalAmount: normalizedData.originalAmount,
          originalCurrency: normalizedData.originalCurrency,
          convertedAmount: normalizedData.amount,
          convertedCurrency: 'TZS',
          exchangeRate: normalizedData.conversionRate,
          rateDate: normalizedData.conversionTimestamp,
        };
      }

      return response;
    } catch (error) {
      console.error('Create bank payout error:', error);
      
      // Handle specific error codes
      if (error.code === 'INSUFFICIENT_FUNDS') {
        throw new Error('Insufficient funds in merchant account');
      } else if (error.code === 'DAILY_LIMIT_EXCEEDED') {
        throw new Error('Daily payout limit exceeded');
      } else if (error.code === 'INVALID_BANK_DETAILS') {
        throw new Error('Invalid bank account details');
      }

      throw new Error(
        `Bank payout creation failed: ${error.message || JSON.stringify(error)}`
      );
    }
  }

  /**
   * Generate unique order reference
   */
  generateOrderReference(prefix = 'PAYOUT') {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `${prefix}_${timestamp}_${random}`;
  }

  /**
   * Force refresh exchange rates cache
   */
  async refreshExchangeRates() {
    return this.getExchangeRates(true);
  }

  /**
   * Get exchange rate cache status
   */
  getExchangeRateCacheStatus() {
    return {
      hasRates: !!this.exchangeRateCache.rates,
      lastUpdated: this.exchangeRateCache.lastUpdated 
        ? new Date(this.exchangeRateCache.lastUpdated).toISOString() 
        : null,
      isStale: this.exchangeRateCache.lastUpdated 
        ? Date.now() - this.exchangeRateCache.lastUpdated > this.exchangeRateCache.ttl
        : true,
      ttl: this.exchangeRateCache.ttl,
      ratePairs: this.exchangeRateCache.rates ? Object.keys(this.exchangeRateCache.rates).length : 0,
    };
  }

  /**
   * Validate if sufficient funds available for payout
   * @param {number} usdAmount - Amount in USD to check
   * @param {number} availableBalanceUSD - Available balance in USD
   * @returns {Object} - Validation result
   */
  async validatePayoutAmount(usdAmount, availableBalanceUSD) {
    try {
      // Convert USD to TZS to get actual payout amount
      const conversion = await this.convertUSDToTZS(usdAmount);
      
      // You might want to add fee calculation here if applicable
      const isSufficient = availableBalanceUSD >= usdAmount;
      
      return {
        isSufficient,
        requestedUSD: usdAmount,
        requestedTZS: conversion.convertedAmount,
        availableUSD: availableBalanceUSD,
        exchangeRate: conversion.rate,
        deficitUSD: isSufficient ? 0 : usdAmount - availableBalanceUSD,
        canProceed: isSufficient,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      console.error('Payout amount validation error:', error);
      throw new Error(`Payout validation failed: ${error.message}`);
    }
  }

  /**
   * Calculate maximum payout amount based on available balance
   * @param {number} availableBalanceUSD - Available balance in USD
   * @param {number} [feePercentage=0] - Optional fee percentage
   * @returns {Object} - Maximum payout amounts
   */
  async calculateMaxPayout(availableBalanceUSD, feePercentage = 0) {
    try {
      // Calculate net amount after fees
      const netAmountUSD = availableBalanceUSD * (1 - feePercentage / 100);
      
      // Convert to TZS
      const conversion = await this.convertUSDToTZS(netAmountUSD);
      
      return {
        maxUSD: parseFloat(netAmountUSD.toFixed(2)),
        maxTZS: conversion.convertedAmount,
        availableBalanceUSD,
        feePercentage,
        exchangeRate: conversion.rate,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      console.error('Max payout calculation error:', error);
      throw new Error(`Max payout calculation failed: ${error.message}`);
    }
  }
}

// Singleton instance
module.exports = new ClickPesaService();