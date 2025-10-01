const axios = require('axios');
const crypto = require('crypto');
const axiosRetry = require('axios-retry').default;
;

// (Optional) DB model to log webhooks for replay protection
// const { WebhookLog } = require('../models'); 

class ClickPesaService {
  constructor() {
    this.baseURL = process.env.CLICKPESA_BASE_URL || 'https://api.clickpesa.com';
    this.apiKey = process.env.CLICKPESA_API_KEY;
    this.webhookSecret = process.env.CLICKPESA_WEBHOOK_SECRET;

    this.client = axios.create({
      baseURL: this.baseURL,
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      },
      timeout: 30000
    });

    // Retry failed requests (3 times, exponential backoff)
    axiosRetry(this.client, {
      retries: 3,
      retryDelay: axiosRetry.exponentialDelay,
      retryCondition: (error) =>
        axiosRetry.isNetworkError(error) ||
        axiosRetry.isRetryableError(error) ||
        error.response?.status >= 500
    });
  }

  // Generate unique reference for idempotency
  generateReference(prefix = 'txn') {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
  }

  // Verify webhook signature + prevent replay attacks
  async verifyWebhookSignature(payload, signature) {
    const computedSignature = crypto
      .createHmac('sha256', this.webhookSecret)
      .update(JSON.stringify(payload))
      .digest('hex');

    if (computedSignature !== signature) {
      return false;
    }

    // 🚨 Optional: replay protection (enable if you have WebhookLog model)
    /*
    const webhookId = payload.id;
    const alreadyProcessed = await WebhookLog.findOne({ where: { webhook_id: webhookId } });
    if (alreadyProcessed) return false;

    await WebhookLog.create({ webhook_id: webhookId, received_at: new Date() });
    */

    return true;
  }

  // Validate payment data before sending
  validatePaymentData(data) {
    if (!data.amount || data.amount <= 0) throw new Error('Invalid payment amount');
    if (!data.customerEmail && !data.customerPhone)
      throw new Error('Customer email or phone required');
  }

  // Initiate payment checkout
  async initiateCheckout(paymentData) {
    try {
      this.validatePaymentData(paymentData);

      const response = await this.client.post('/api/v1/payments/checkout', {
        amount: paymentData.amount,
        currency: paymentData.currency || 'TZS',
        customer: {
          email: paymentData.customerEmail,
          phone: paymentData.customerPhone,
          name: paymentData.customerName
        },
        reference: paymentData.reference || this.generateReference(),
        callback_url: `${process.env.BACKEND_URL}/api/payments/webhook`,
        cancel_url: paymentData.cancelUrl,
        success_url: paymentData.successUrl,
        metadata: paymentData.metadata || {}
      });

      return {
        success: true,
        data: response.data,
        checkoutUrl: response.data.data?.checkout_url,
        paymentId: response.data.data?.id
      };
    } catch (error) {
      console.error('ClickPesa checkout error:', {
        status: error.response?.status,
        data: error.response?.data,
        message: error.message
      });
      return { success: false, error: error.response?.data || error.message };
    }
  }

  // Check payment status
  async checkPaymentStatus(paymentId) {
    try {
      const response = await this.client.get(`/api/v1/payments/${paymentId}`);
      return { success: true, data: response.data };
    } catch (error) {
      console.error('ClickPesa checkPaymentStatus error:', {
        status: error.response?.status,
        data: error.response?.data,
        message: error.message
      });
      return { success: false, error: error.response?.data || error.message };
    }
  }

  // Initiate payout
  async initiatePayout(payoutData) {
    try {
      if (!payoutData.amount || payoutData.amount <= 0) {
        throw new Error('Invalid payout amount');
      }

      const response = await this.client.post('/api/v1/payouts', {
        amount: payoutData.amount,
        currency: payoutData.currency || 'TZS',
        recipient: {
          type: payoutData.recipientType || 'mobile', // mobile, bank
          contact: payoutData.recipientContact,
          name: payoutData.recipientName
        },
        reference: payoutData.reference || this.generateReference('payout'),
        description: payoutData.description,
        metadata: payoutData.metadata || {}
      });

      return {
        success: true,
        data: response.data,
        payoutId: response.data.data?.id
      };
    } catch (error) {
      console.error('ClickPesa payout error:', {
        status: error.response?.status,
        data: error.response?.data,
        message: error.message
      });
      return { success: false, error: error.response?.data || error.message };
    }
  }

  // Check payout status
  async checkPayoutStatus(payoutId) {
    try {
      const response = await this.client.get(`/api/v1/payouts/${payoutId}`);
      return { success: true, data: response.data };
    } catch (error) {
      console.error('ClickPesa checkPayoutStatus error:', {
        status: error.response?.status,
        data: error.response?.data,
        message: error.message
      });
      return { success: false, error: error.response?.data || error.message };
    }
  }
}

module.exports = new ClickPesaService();
