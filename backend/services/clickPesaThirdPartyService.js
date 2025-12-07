// services/ClickPesaThirdPartyService.js
const crypto = require("crypto");
const axios = require("axios");

class ClickPesaThirdPartyService {
  constructor() {
    // Third-Party API credentials
    this.clientId = process.env.CLICKPESA_CLIENT_ID;
    this.apiKey = process.env.CLICKPESA_API_KEY;
    this.checksumKey = process.env.CLICKPESA_CHECKSUM_KEY; // For webhook and request signing
    this.merchantId = process.env.CLICKPESA_MERCHANT_ID;

    // URLs
    this.baseURL =
      process.env.CLICKPESA_BASE_URL ||
      (process.env.NODE_ENV === "production"
        ? "https://api.clickpesa.com"
        : "https://api-sandbox.clickpesa.com");

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
        config.headers.Authorization = token;
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
        console.error("ClickPesa API Error:", errorData);

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
   * 1. Generate Authorization Token
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
   * Generate checksum for payload (HMAC-SHA256)
   * Sort keys alphabetically, concatenate values
   */
  generateChecksum(payload) {
    if (!this.checksumKey) {
      console.warn("Checksum key not configured");
      return null;
    }

    // Sort keys alphabetically
    const sortedKeys = Object.keys(payload).sort();

    // Concatenate values (stringify objects)
    const concatenatedString = sortedKeys
      .map((key) => {
        const value = payload[key];
        if (value === null || value === undefined) {
          return "";
        }
        if (typeof value === "object") {
          // Stringify without spaces to match ClickPesa's implementation
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
   * Verify webhook signature using raw request body
   * @param {Buffer|string} rawBody - Raw request body
   * @param {string} signatureHeader - Signature from header
   * @returns {boolean} True if signature is valid
   */
  verifyWebhookSignature(rawBody, signatureHeader) {
    if (!this.checksumKey) {
      console.warn("Webhook secret not configured");
      return false;
    }

    // Convert rawBody to string if it's a Buffer
    const rawBodyString = Buffer.isBuffer(rawBody)
      ? rawBody.toString("utf8")
      : rawBody;

    // Generate HMAC-SHA256 of raw body
    const expectedSignature = crypto
      .createHmac("sha256", this.checksumKey)
      .update(rawBodyString)
      .digest("hex");

    // Use timingSafeEqual to prevent timing attacks
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
    // Remove any non-digit characters
    const cleaned = phoneNumber.replace(/\D/g, "");

    // Check if it starts with 255 and has 12 digits total
    const regex = /^255[0-9]{9}$/;
    return regex.test(cleaned);
  }

  /**
   * Format phone number to ClickPesa format
   */
  formatPhoneNumber(phoneNumber) {
    const isValid = this.validatePhoneNumber(phoneNumber)

    if(isValid) return phoneNumber;
    // Remove any non-digit characters
    const cleaned = phoneNumber.replace(/\D/g, "");

    // If it starts with 0, replace with 255
    if (cleaned.startsWith("0")) {
      return "255" + cleaned.substring(1);
    }

    // If it starts with +, remove it
    if (cleaned.startsWith("+")) {
      return cleaned.substring(1);
    }

    return "255" + cleaned;
  }

  /**
   * 2. Preview USSD-PUSH Payment
   * POST /third-parties/payments/preview-ussd-push-request
   */
  async previewUssdPushPayment(data) {
    try {
      // Format phone number
      const formattedPhone = this.formatPhoneNumber(data.phoneNumber);
      // Validate phone format
      if (!this.validatePhoneNumber(formattedPhone)) {
        throw new Error(
          `Invalid phone number format. Expected: 255XXXXXXXXX, Got: ${formattedPhone}`
        );
      }

      const payload = {
        amount: String(data.amount),
        currency: data.currency || "TZS",
        orderReference: data.orderReference,
        phoneNumber: formattedPhone,
        fetchSenderDetails: data.fetchSenderDetails || false,
      };

      // Add checksum if enabled
      if (this.checksumKey && data.enableChecksum !== false) {
        payload.checksum = this.generateChecksum(payload);
      }

      const response = await this.client.post(
        "/third-parties/payments/preview-ussd-push-request",
        payload
      );
      
      return response;
    } catch (error) {
      console.error("Preview USSD-PUSH error:", error);
      throw new Error(
        `Preview USSD-PUSH failed: ${error.message || JSON.stringify(error)}`
      );
    }
  }

  /**
   * 3. Initiate USSD-PUSH Payment
   * POST /third-parties/payments/initiate-ussd-push-request
   */
  async initiateUssdPushPayment(data) {
    try {
      // Format phone number
      const formattedPhone = this.formatPhoneNumber(data.phoneNumber);

      // Validate phone format
      if (!this.validatePhoneNumber(formattedPhone)) {
        throw new Error(
          `Invalid phone number format. Expected: 255XXXXXXXXX, Got: ${formattedPhone}`
        );
      }

      const payload = {
        amount: String(data.amount),
        currency: data.currency || "TZS",
        orderReference: data.orderReference,
        phoneNumber: formattedPhone,
      };

      // Add checksum if enabled
      if (this.checksumKey && data.enableChecksum !== false) {
        payload.checksum = this.generateChecksum(payload);
      }

      const response = await this.client.post(
        "/third-parties/payments/initiate-ussd-push-request",
        payload
      );

      return response;
    } catch (error) {
      console.error("Initiate USSD-PUSH error:", error);

      // Handle specific error codes
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
   * 4. Query Payment Status
   * GET /third-parties/payments/{orderReference}
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

      // If payment not found, return empty array instead of throwing
      if (error.status === 404) {
        return [];
      }

      throw new Error(
        `Payment status query failed: ${error.message || JSON.stringify(error)}`
      );
    }
  }

  /**
   * 5. Retrieve Banks List
   * GET /third-parties/list/banks
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
   * 6. Preview Bank Payout
   * POST /third-parties/payouts/preview-bank-payout
   */
  async previewBankPayout(data) {
    try {
      const payload = {
        amount: Number(data.amount),
        accountNumber: data.accountNumber,
        currency: data.currency || "TZS",
        orderReference: data.orderReference,
        bic: data.bic,
        transferType: data.transferType || "ACH",
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
        "/third-parties/payouts/preview-bank-payout",
        payload
      );

      return response;
    } catch (error) {
      console.error("Preview bank payout error:", error);

      // Handle specific error codes
      if (error.code === "INSUFFICIENT_FUNDS") {
        throw new Error("Insufficient funds in merchant account");
      } else if (error.code === "INVALID_BANK_DETAILS") {
        throw new Error("Invalid bank account details");
      }

      throw new Error(
        `Bank payout preview failed: ${error.message || JSON.stringify(error)}`
      );
    }
  }

  /**
   * 7. Create Bank Payout
   * POST /third-parties/payouts/create-bank-payout
   */
  async createBankPayout(data) {
    try {
      const payload = {
        amount: Number(data.amount),
        accountNumber: data.accountNumber,
        accountName: data.accountName,
        currency: data.currency || "TZS",
        orderReference: data.orderReference,
        bic: data.bic,
        transferType: data.transferType || "ACH",
      };

      // Add checksum if enabled
      if (this.checksumKey && data.enableChecksum !== false) {
        payload.checksum = this.generateChecksum(payload);
      }

      const response = await this.client.post(
        "/third-parties/payouts/create-bank-payout",
        payload
      );

      return response;
    } catch (error) {
      console.error("Create bank payout error:", error);

      // Handle specific error codes
      if (error.code === "INSUFFICIENT_FUNDS") {
        throw new Error("Insufficient funds in merchant account");
      } else if (error.code === "DAILY_LIMIT_EXCEEDED") {
        throw new Error("Daily payout limit exceeded");
      } else if (error.code === "INVALID_BANK_DETAILS") {
        throw new Error("Invalid bank account details");
      }

      throw new Error(
        `Bank payout creation failed: ${error.message || JSON.stringify(error)}`
      );
    }
  }

  /**
   * 8. Query Payout Status
   * GET /third-parties/payouts/{orderReference}
   */
  async queryPayoutStatus(orderReference) {
    try {
      if (!orderReference) {
        throw new Error("orderReference is required");
      }

      const response = await this.client.get(
        `/third-parties/payouts/${encodeURIComponent(orderReference)}`
      );

      return response;
    } catch (error) {
      console.error("Query payout status error:", error);

      // If payout not found, return empty array instead of throwing
      if (error.status === 404) {
        return [];
      }

      throw new Error(
        `Payout status query failed: ${error.message || JSON.stringify(error)}`
      );
    }
  }

  /**
   * 9. Create Order Control Number (BillPay)
   * POST /third-parties/billpay/create-order-control-number
   */
  async createOrderControlNumber(data) {
    try {
      const payload = {
        billDescription: data.billDescription,
        billPaymentMode: data.billPaymentMode || "EXACT",
      };

      // Add optional fields
      if (data.billAmount !== undefined) {
        payload.billAmount = Number(data.billAmount);
      }

      if (data.billReference) {
        payload.billReference = data.billReference;
      }

      // Add checksum if enabled
      if (this.checksumKey && data.enableChecksum !== false) {
        payload.checksum = this.generateChecksum(payload);
      }

      const response = await this.client.post(
        "/third-parties/billpay/create-order-control-number",
        payload
      );

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
   * 10. Query All Payments (for reconciliation)
   * GET /third-parties/payments/all
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
      return response;
    } catch (error) {
      console.error("Query all payments error:", error);
      throw new Error(
        `Payments query failed: ${error.message || JSON.stringify(error)}`
      );
    }
  }
}

// Singleton instance
module.exports = new ClickPesaThirdPartyService();
