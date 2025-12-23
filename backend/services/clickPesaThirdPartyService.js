// services/ClickPesaThirdPartyService.js
const crypto = require("crypto");
const axios = require("axios");

class ClickPesaThirdPartyService {
  constructor() {
    // Third-Party API credentials
    this.clientId = process.env.CLICKPESA_CLIENT_ID;
    this.apiKey = process.env.CLICKPESA_API_KEY;
    this.checksumKey = process.env.CLICKPESA_CHECKSUM_KEY; // For webhook and request signing

    // URLs
    this.baseURL =
      process.env.CLICKPESA_BASE_URL ||
      (process.env.NODE_ENV === "production"
        ? "https://api.clickpesa.com"
        : "https://api-sandbox.clickpesa.com");

    // Currency configuration
    this.baseCurrency = process.env.BASE_CURRENCY || "USD"; // Your app's base currency
    this.paymentCurrency = "TZS"; // ClickPesa only accepts TZS for mobile money payments
    this.exchangeRateCache = {
      rates: null,
      lastUpdated: null,
      ttl: 5 * 60 * 1000, // Cache TTL: 5 minutes (300,000 ms)
    };

    this.token = null;
    this.tokenExpiry = null;

    this.client = axios.create({
      baseURL: this.baseURL,
      timeout: 30000,
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
    });

    // Request interceptor for auth token
    this.client.interceptors.request.use(async (config) => {
      // Skip auth for token generation endpoint
      if (!config.url.includes("/third-parties/generate-token")) {
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
        console.error("ClickPesa Third-Party API Error:", errorData);

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
        throw new Error("ClickPesa credentials not configured");
      }

      const response = await this.client.post(
        "/third-parties/generate-token",
        {},
        {
          headers: {
            "client-id": this.clientId,
            "api-key": this.apiKey,
          },
        }
      );

      if (response.success && response.token) {
        this.token = response.token;
        this.tokenExpiry = Date.now() + 55 * 60 * 1000; // 55 minutes
        return response.token;
      }

      throw new Error("Token generation failed: Invalid response");
    } catch (error) {
      console.error("Token generation error:", error);
      throw new Error(
        `Token generation failed: ${error.message || "Unknown error"}`
      );
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

      console.log("Fetching fresh exchange rates from ClickPesa...");
      const response = await this.client.get("/third-parties/exchange-rates/all");

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

        console.log("Exchange rates updated:", Object.keys(ratesMap).length, "rate pairs loaded");
        return ratesMap;
      }

      throw new Error("Invalid exchange rates response format");
    } catch (error) {
      console.error("Exchange rates fetch error:", error);
      
      // If we have cached rates, return them even if expired (fail gracefully)
      if (this.exchangeRateCache.rates) {
        console.warn("Using stale exchange rates due to API error");
        return this.exchangeRateCache.rates;
      }
      
      throw new Error(
        `Failed to fetch exchange rates: ${error.message || "Unknown error"}`
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
      if (typeof amount !== "number" || amount <= 0) {
        throw new Error("Invalid amount. Must be a positive number.");
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
        
        if (roundToNearest && toCurrency.toUpperCase() === "TZS") {
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
        
        if (roundToNearest && toCurrency.toUpperCase() === "TZS") {
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
          note: "Converted using inverse rate",
        };
      }

      // Try using USD as pivot currency if available
      const fromToUSD = rates[`${fromCurrency.toUpperCase()}_USD`];
      const usdToTarget = rates[`USD_${toCurrency.toUpperCase()}`];
      
      if (fromToUSD && usdToTarget) {
        // Convert fromCurrency -> USD -> toCurrency
        const usdAmount = amount * fromToUSD.rate;
        let converted = usdAmount * usdToTarget.rate;
        
        if (roundToNearest && toCurrency.toUpperCase() === "TZS") {
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
          note: "Converted via USD pivot",
        };
      }

      throw new Error(`No exchange rate found for ${fromCurrency} to ${toCurrency}`);
    } catch (error) {
      console.error("Currency conversion error:", error);
      throw new Error(`Currency conversion failed: ${error.message}`);
    }
  }

  /**
   * Convert USD amount to TZS for ClickPesa payment
   * This is the primary method for payment conversion
   */
  async convertUSDToTZS(usdAmount) {
    return this.convertCurrency(usdAmount, "USD", "TZS", true);
  }

  /**
   * Convert TZS amount to USD (for reporting, analytics, etc.)
   */
  async convertTZSToUSD(tzsAmount) {
    return this.convertCurrency(tzsAmount, "TZS", "USD", false);
  }

  /**
   * Get current USD to TZS rate with metadata
   */
  async getUSDtoTZSRate() {
    const rates = await this.getExchangeRates();
    const rateKey = "USD_TZS";
    
    if (!rates[rateKey]) {
      throw new Error("USD to TZS exchange rate not available");
    }

    return {
      rate: rates[rateKey].rate,
      date: rates[rateKey].date,
      source: "USD",
      target: "TZS",
      inverseRate: rates[rateKey].inverse,
    };
  }

  /**
   * Validate and normalize payment amount based on currency
   * @param {Object} paymentData - Payment data with amount and currency
   * @returns {Object} - Normalized payment data for ClickPesa API
   */
  async normalizePaymentAmount(paymentData) {
    const { amount, currency = this.baseCurrency } = paymentData;
    
    if (!amount || typeof amount !== "number") {
      throw new Error("Invalid payment amount");
    }

    const normalized = { ...paymentData };

    // If currency is already TZS, ensure it's a whole number
    if (currency.toUpperCase() === "TZS") {
      normalized.amount = Math.round(amount);
      normalized.currency = "TZS";
      normalized.originalAmount = amount;
      normalized.originalCurrency = "TZS";
      return normalized;
    }

    // If currency is USD (or other), convert to TZS
    if (currency.toUpperCase() === "USD") {
      const conversion = await this.convertUSDToTZS(amount);
      
      normalized.amount = conversion.convertedAmount;
      normalized.currency = "TZS";
      normalized.originalAmount = amount;
      normalized.originalCurrency = "USD";
      normalized.conversionRate = conversion.rate;
      normalized.conversionTimestamp = conversion.timestamp;
      normalized.convertedFrom = "USD";
      
      return normalized;
    }

    // For other currencies, attempt conversion via USD
    try {
      const conversion = await this.convertCurrency(amount, currency, "TZS", true);
      
      normalized.amount = conversion.convertedAmount;
      normalized.currency = "TZS";
      normalized.originalAmount = amount;
      normalized.originalCurrency = currency;
      normalized.conversionRate = conversion.rate;
      normalized.conversionTimestamp = conversion.timestamp;
      normalized.convertedFrom = currency;
      
      return normalized;
    } catch (error) {
      throw new Error(
        `Cannot convert ${currency} to TZS for payment. Please use USD or TZS.`
      );
    }
  }

  /**
   * Generate checksum for payload (HMAC-SHA256)
   */
  generateChecksum(payload) {
    if (!this.checksumKey) {
      console.warn("Checksum key not configured");
      return null;
    }

    // Sort keys alphabetically
    const sortedKeys = Object.keys(payload).sort();

    // Concatenate values
    const concatenatedString = sortedKeys
      .map((key) => {
        const value = payload[key];
        if (value === null || value === undefined) {
          return "";
        }
        if (typeof value === "object") {
          return JSON.stringify(value).replace(/\s+/g, "");
        }
        return String(value);
      })
      .join("");

    // Generate HMAC-SHA256
    const hmac = crypto.createHmac("sha256", this.checksumKey);
    hmac.update(concatenatedString);
    return hmac.digest("hex");
  }

  /**
   * Verify webhook signature
   */
  verifyWebhookSignature(rawBody, signatureHeader) {
    if (!this.checksumKey) {
      console.warn("Webhook secret not configured");
      return false;
    }

    const rawBodyString = Buffer.isBuffer(rawBody)
      ? rawBody.toString("utf8")
      : rawBody;

    const expectedSignature = crypto
      .createHmac("sha256", this.checksumKey)
      .update(rawBodyString)
      .digest("hex");

    try {
      return crypto.timingSafeEqual(
        Buffer.from(expectedSignature, "hex"),
        Buffer.from(signatureHeader, "hex")
      );
    } catch (err) {
      console.error("Signature comparison error:", err);
      return false;
    }
  }

  /**
   * Validate phone number format (255XXXXXXXXX)
   */
  validatePhoneNumber(phoneNumber) {
    const cleaned = phoneNumber.replace(/\D/g, "");
    const regex = /^255[0-9]{9}$/;
    return regex.test(cleaned);
  }

  /**
   * Format phone number to ClickPesa format
   */
  formatPhoneNumber(phoneNumber) {
    const cleaned = phoneNumber.replace(/\D/g, "");

    if (cleaned.startsWith("0")) {
      return "255" + cleaned.substring(1);
    }

    if (cleaned.startsWith("+")) {
      return cleaned.substring(1);
    }

    if (cleaned.length === 9) {
      return "255" + cleaned;
    }

    return cleaned;
  }

  /**
   * 1. Preview USSD-PUSH Payment (with currency conversion)
   */
  async previewUssdPushPayment(data) {
    try {
      // Normalize payment amount (convert to TZS if needed)
      const normalizedData = await this.normalizePaymentAmount({
        amount: data.amount,
        currency: data.currency || this.baseCurrency,
      });

      const formattedPhone = this.formatPhoneNumber(data.phoneNumber);
      
      if (!this.validatePhoneNumber(formattedPhone)) {
        throw new Error(
          `Invalid phone number format. Expected: 255XXXXXXXXX, Got: ${formattedPhone}`
        );
      }

      const payload = {
        amount: String(normalizedData.amount), // ClickPesa expects string
        currency: "TZS", // Always TZS for ClickPesa
        orderReference: data.orderReference,
        phoneNumber: formattedPhone,
        fetchSenderDetails: data.fetchSenderDetails || false,
        // Add conversion metadata if conversion happened
        ...(normalizedData.originalCurrency !== "TZS" && {
          originalAmount: String(normalizedData.originalAmount),
          originalCurrency: normalizedData.originalCurrency,
          exchangeRate: String(normalizedData.conversionRate),
        }),
      };

      if (this.checksumKey && data.enableChecksum !== false) {
        payload.checksum = this.generateChecksum(payload);
      }

      const response = await this.client.post(
        "/third-parties/payments/preview-ussd-push-request",
        payload
      );

      // Add conversion info to response
      if (normalizedData.originalCurrency !== "TZS") {
        response.conversionInfo = {
          originalAmount: normalizedData.originalAmount,
          originalCurrency: normalizedData.originalCurrency,
          convertedAmount: normalizedData.amount,
          convertedCurrency: "TZS",
          exchangeRate: normalizedData.conversionRate,
          rateDate: normalizedData.conversionTimestamp,
        };
      }

      return response;
    } catch (error) {
      console.error("Preview USSD-PUSH error:", error);
      throw new Error(
        `Preview USSD-PUSH failed: ${error.message || JSON.stringify(error)}`
      );
    }
  }

  /**
   * 2. Initiate USSD-PUSH Payment (with currency conversion)
   */
  async initiateUssdPushPayment(data) {
    try {
      // Normalize payment amount (convert to TZS if needed)
      const normalizedData = await this.normalizePaymentAmount({
        amount: data.amount,
        currency: data.currency || this.baseCurrency,
      });

      const formattedPhone = this.formatPhoneNumber(data.phoneNumber);

      if (!this.validatePhoneNumber(formattedPhone)) {
        throw new Error(
          `Invalid phone number format. Expected: 255XXXXXXXXX, Got: ${formattedPhone}`
        );
      }

      const payload = {
        amount: String(normalizedData.amount),
        currency: "TZS", // Always TZS for ClickPesa
        orderReference: data.orderReference,
        phoneNumber: formattedPhone,
        // Add conversion metadata if conversion happened
        ...(normalizedData.originalCurrency !== "TZS" && {
          originalAmount: String(normalizedData.originalAmount),
          originalCurrency: normalizedData.originalCurrency,
          exchangeRate: String(normalizedData.conversionRate),
        }),
      };

      if (this.checksumKey && data.enableChecksum !== false) {
        payload.checksum = this.generateChecksum(payload);
      }

      const response = await this.client.post(
        "/third-parties/payments/initiate-ussd-push-request",
        payload
      );

      // Add conversion info to response
      if (normalizedData.originalCurrency !== "TZS") {
        response.conversionInfo = {
          originalAmount: normalizedData.originalAmount,
          originalCurrency: normalizedData.originalCurrency,
          convertedAmount: normalizedData.amount,
          convertedCurrency: "TZS",
          exchangeRate: normalizedData.conversionRate,
          rateDate: normalizedData.conversionTimestamp,
        };
      }

      return response;
    } catch (error) {
      console.error("Initiate USSD-PUSH error:", error);

      if (error.code === "INSUFFICIENT_FUNDS") {
        throw new Error("Insufficient funds in merchant account");
      } else if (error.code === "INVALID_PHONE_NUMBER") {
        throw new Error("Invalid phone number format or network");
      }

      throw new Error(
        `USSD-PUSH payment failed: ${error.message || JSON.stringify(error)}`
      );
    }
  }

  /**
   * 3. Query Payment Status
   */
  async queryPaymentStatus(orderReference) {
    try {
      if (!orderReference) {
        throw new Error("orderReference is required");
      }

      const response = await this.client.get(
        `/third-parties/payments/${encodeURIComponent(orderReference)}`
      );

      return response;
    } catch (error) {
      console.error("Query payment status error:", error);

      if (error.status === 404) {
        return [];
      }

      throw new Error(
        `Payment status query failed: ${error.message || JSON.stringify(error)}`
      );
    }
  }

  /**
   * 4. Retrieve Banks List
   */
  async getBanksList() {
    try {
      const response = await this.client.get("/third-parties/list/banks");
      return response;
    } catch (error) {
      console.error("Get banks list error:", error);
      throw new Error(
        `Banks list retrieval failed: ${error.message || JSON.stringify(error)}`
      );
    }
  }

  /**
   * 5. Create Order Control Number (BillPay)
   */
  async createOrderControlNumber(data) {
    try {
      // If bill amount is specified and not in TZS, convert it
      if (data.billAmount !== undefined && data.currency && data.currency !== "TZS") {
        const conversion = await this.convertCurrency(
          data.billAmount, 
          data.currency, 
          "TZS", 
          true
        );
        
        data.billAmount = conversion.convertedAmount;
        // Add conversion metadata
        data.conversionInfo = {
          originalAmount: conversion.originalAmount,
          originalCurrency: conversion.fromCurrency,
          exchangeRate: conversion.rate,
        };
      }

      const payload = {
        billDescription: data.billDescription,
        billPaymentMode: data.billPaymentMode || "EXACT",
      };

      if (data.billAmount !== undefined) {
        payload.billAmount = Number(data.billAmount);
      }

      if (data.billReference) {
        payload.billReference = data.billReference;
      }

      if (this.checksumKey && data.enableChecksum !== false) {
        payload.checksum = this.generateChecksum(payload);
      }

      const response = await this.client.post(
        "/third-parties/billpay/create-order-control-number",
        payload
      );

      // Add conversion info to response if applicable
      if (data.conversionInfo) {
        response.conversionInfo = data.conversionInfo;
      }

      return response;
    } catch (error) {
      console.error("Create order control number error:", error);
      throw new Error(
        `Order control number creation failed: ${
          error.message || JSON.stringify(error)
        }`
      );
    }
  }

  /**
   * 6. Query All Payments (for reconciliation)
   */
  async queryAllPayments(filters = {}) {
    try {
      const params = {
        ...(filters.startDate && { startDate: filters.startDate }),
        ...(filters.endDate && { endDate: filters.endDate }),
        ...(filters.status && { status: filters.status }),
        ...(filters.collectedCurrency && {
          collectedCurrency: filters.collectedCurrency,
        }),
        ...(filters.channel && { channel: filters.channel }),
        ...(filters.orderReference && {
          orderReference: filters.orderReference,
        }),
        ...(filters.clientId && { clientId: filters.clientId }),
        ...(filters.sortBy && { sortBy: filters.sortBy }),
        ...(filters.orderBy && { orderBy: filters.orderBy }),
        skip: filters.skip || 0,
        limit: filters.limit || 50,
      };

      const response = await this.client.get("/third-parties/payments/all", {
        params,
      });

      // If base currency is USD, convert TZS amounts to USD for reporting
      if (this.baseCurrency === "USD" && Array.isArray(response.payments)) {
        const exchangeRate = await this.getUSDtoTZSRate();
        
        response.payments = response.payments.map(payment => {
          if (payment.currency === "TZS" && payment.amount) {
            const usdAmount = payment.amount / exchangeRate.rate;
            return {
              ...payment,
              amountInBaseCurrency: parseFloat(usdAmount.toFixed(2)),
              baseCurrency: "USD",
              exchangeRate: exchangeRate.rate,
              exchangeRateDate: exchangeRate.date,
            };
          }
          return payment;
        });

        response.conversionSummary = {
          baseCurrency: "USD",
          exchangeRate: exchangeRate.rate,
          rateDate: exchangeRate.date,
          totalConverted: response.payments.filter(p => p.amountInBaseCurrency).length,
        };
      }

      return response;
    } catch (error) {
      console.error("Query all payments error:", error);
      throw new Error(
        `Payments query failed: ${error.message || JSON.stringify(error)}`
      );
    }
  }

  /**
   * Generate unique order reference for payments
   */
  generatePaymentReference(prefix = "PAYMENT") {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, "0");
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
}

// Singleton instance
module.exports = new ClickPesaThirdPartyService();