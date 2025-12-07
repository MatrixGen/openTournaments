// services/clickPesaService.js
const crypto = require('crypto');
const axios = require('axios');

class ClickPesaService {
    constructor() {
        this.apiKey = process.env.CLICKPESA_API_KEY;
        this.apiSecret = process.env.CLICKPESA_API_SECRET;
        this.merchantId = process.env.CLICKPESA_MERCHANT_ID;
        this.webhookSecret = process.env.CLICKPESA_WEBHOOK_SECRET;
        this.baseURL = process.env.NODE_ENV === 'production' 
            ? 'https://api.clickpesa.com' 
            : 'https://api-sandbox.clickpesa.com';
        
        this.client = axios.create({
            baseURL: this.baseURL,
            timeout: 30000,
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            }
        });

        // Add request interceptor for auth
        this.client.interceptors.request.use(config => {
            const timestamp = Date.now().toString();
            const signature = this.generateRequestSignature(
                config.method?.toUpperCase() || 'GET',
                config.url,
                timestamp,
                config.data || {}
            );

            config.headers['X-ClickPesa-API-Key'] = this.apiKey;
            config.headers['X-ClickPesa-Timestamp'] = timestamp;
            config.headers['X-ClickPesa-Signature'] = signature;

            return config;
        });

        // Add response interceptor for error handling
        this.client.interceptors.response.use(
            response => response.data,
            error => {
                console.error('ClickPesa API Error:', {
                    url: error.config?.url,
                    method: error.config?.method,
                    status: error.response?.status,
                    data: error.response?.data,
                    message: error.message
                });
                
                return Promise.reject(error.response?.data || error);
            }
        );
    }

    /**
     * Generate HMAC SHA256 signature for requests
     */
    generateRequestSignature(method, endpoint, timestamp, body = {}) {
        const stringToSign = `${method}${endpoint}${timestamp}${JSON.stringify(body)}`;
        return crypto
            .createHmac('sha256', this.apiSecret)
            .update(stringToSign)
            .digest('hex');
    }

    /**
     * Verify webhook signature
     */
    verifyWebhookSignature(payload, signature, timestamp) {
        if (!this.webhookSecret) {
            console.warn('Webhook secret not configured');
            return false;
        }

        // For ClickPesa, webhook signature is HMAC SHA256 of payload
        const expectedSignature = crypto
            .createHmac('sha256', this.webhookSecret)
            .update(JSON.stringify(payload))
            .digest('hex');

        // Optional: Check timestamp to prevent replay attacks
        if (timestamp) {
            const webhookTime = new Date(timestamp).getTime();
            const currentTime = Date.now();
            const fiveMinutes = 5 * 60 * 1000;
            
            if (Math.abs(currentTime - webhookTime) > fiveMinutes) {
                console.warn('Webhook timestamp outside acceptable range');
                return false;
            }
        }

        return crypto.timingSafeEqual(
            Buffer.from(expectedSignature, 'hex'),
            Buffer.from(signature, 'hex')
        );
    }

    /**
     * 1. Initiate Payment (Checkout)
     * https://docs.clickpesa.com/api-reference/#tag/Checkout
     */
    async initiatePayment(paymentData) {
        try {
            const requiredFields = ['amount', 'currency', 'merchant_reference', 'customer_phone'];
            const missingFields = requiredFields.filter(field => !paymentData[field]);

            if (missingFields.length > 0) {
                throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
            }

            // Convert amount to string (ClickPesa expects string)
            if (typeof paymentData.amount !== 'string') {
                paymentData.amount = paymentData.amount.toString();
            }

            // Set default values if not provided
            const payload = {
                merchant_id: this.merchantId,
                amount: paymentData.amount,
                currency: paymentData.currency,
                merchant_reference: paymentData.merchant_reference,
                customer_email: paymentData.customer_email,
                customer_name: paymentData.customer_name,
                customer_phone: paymentData.customer_phone,
                description: paymentData.description || 'Tournament Entry Fee',
                account_number: paymentData.account_number || paymentData.customer_phone,
                network_code: paymentData.network_code || 'MPESA', // Default to MPESA
                callback_url: paymentData.callback_url,
                redirect_url: paymentData.redirect_url,
                metadata: paymentData.metadata || {},
                ...(paymentData.expires_in && { expires_in: paymentData.expires_in }) // Optional expiry
            };

            const response = await this.client.post('/v1/checkout/requests', payload);
            
            return {
                id: response.data.id,
                payment_url: response.data.payment_url,
                status: response.data.status,
                expires_at: response.data.expires_at,
                merchant_reference: response.data.merchant_reference,
                amount: response.data.amount,
                currency: response.data.currency,
                raw_response: response.data
            };

        } catch (error) {
            console.error('ClickPesa initiatePayment error:', error);
            throw new Error(`Payment initiation failed: ${error.message || JSON.stringify(error)}`);
        }
    }

    /**
     * 2. Verify Payment Status
     * https://docs.clickpesa.com/api-reference/#tag/Checkout/paths/~1v1~1checkout~1requests~1{id}/get
     */
    async checkPaymentStatus(paymentId) {
        try {
            if (!paymentId) {
                throw new Error('Payment ID is required');
            }

            const response = await this.client.get(`/v1/checkout/requests/${paymentId}`);

            return {
                id: response.data.id,
                status: response.data.status,
                merchant_reference: response.data.merchant_reference,
                amount: response.data.amount,
                currency: response.data.currency,
                customer_phone: response.data.customer_phone,
                created_at: response.data.created_at,
                updated_at: response.data.updated_at,
                expires_at: response.data.expires_at,
                transaction_id: response.data.transaction_id,
                raw_response: response.data
            };

        } catch (error) {
            console.error('ClickPesa checkPaymentStatus error:', error);
            
            // If payment not found, return a specific status
            if (error.status === 404) {
                return { status: 'not_found', id: paymentId };
            }

            throw new Error(`Payment status check failed: ${error.message || JSON.stringify(error)}`);
        }
    }

    /**
     * 3. Initiate Disbursement (Payout)
     * https://docs.clickpesa.com/api-reference/#tag/Disbursements
     */
    async disburseFunds(disbursementData) {
        try {
            const requiredFields = ['amount', 'currency', 'merchant_reference', 'recipient_phone'];
            const missingFields = requiredFields.filter(field => !disbursementData[field]);

            if (missingFields.length > 0) {
                throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
            }

            // Convert amount to string
            if (typeof disbursementData.amount !== 'string') {
                disbursementData.amount = disbursementData.amount.toString();
            }

            const payload = {
                merchant_id: this.merchantId,
                amount: disbursementData.amount,
                currency: disbursementData.currency,
                merchant_reference: disbursementData.merchant_reference,
                recipient_name: disbursementData.recipient_name,
                recipient_phone: disbursementData.recipient_phone,
                network_code: disbursementData.network_code || 'MPESA',
                reason: disbursementData.reason || 'Prize disbursement',
                description: disbursementData.description,
                account_number: disbursementData.account_number || disbursementData.recipient_phone,
                callback_url: disbursementData.callback_url,
                metadata: disbursementData.metadata || {}
            };

            const response = await this.client.post('/v1/disbursements', payload);

            return {
                id: response.data.id,
                status: response.data.status,
                merchant_reference: response.data.merchant_reference,
                amount: response.data.amount,
                currency: response.data.currency,
                recipient_phone: response.data.recipient_phone,
                created_at: response.data.created_at,
                raw_response: response.data
            };

        } catch (error) {
            console.error('ClickPesa disburseFunds error:', error);
            
            // Check for specific error conditions
            if (error.status === 400) {
                if (error.error_code === 'INSUFFICIENT_FUNDS') {
                    throw new Error('Insufficient funds in merchant account');
                } else if (error.error_code === 'DAILY_LIMIT_EXCEEDED') {
                    throw new Error('Daily disbursement limit exceeded');
                }
            }

            throw new Error(`Disbursement failed: ${error.message || JSON.stringify(error)}`);
        }
    }

    /**
     * 4. Verify Disbursement Status
     * https://docs.clickpesa.com/api-reference/#tag/Disbursements/paths/~1v1~1disbursements~1{id}/get
     */
    async checkDisbursementStatus(disbursementId) {
        try {
            if (!disbursementId) {
                throw new Error('Disbursement ID is required');
            }

            const response = await this.client.get(`/v1/disbursements/${disbursementId}`);

            return {
                id: response.data.id,
                status: response.data.status,
                merchant_reference: response.data.merchant_reference,
                amount: response.data.amount,
                currency: response.data.currency,
                recipient_phone: response.data.recipient_phone,
                transaction_id: response.data.transaction_id,
                created_at: response.data.created_at,
                updated_at: response.data.updated_at,
                raw_response: response.data
            };

        } catch (error) {
            console.error('ClickPesa checkDisbursementStatus error:', error);
            
            if (error.status === 404) {
                return { status: 'not_found', id: disbursementId };
            }

            throw new Error(`Disbursement status check failed: ${error.message || JSON.stringify(error)}`);
        }
    }

    /**
     * 5. Get Account Balance
     * https://docs.clickpesa.com/api-reference/#tag/Account
     */
    async getAccountBalance() {
        try {
            const response = await this.client.get('/v1/account/balance');

            return {
                available_balance: response.data.available_balance,
                currency: response.data.currency,
                pending_balance: response.data.pending_balance,
                total_balance: response.data.total_balance,
                last_updated: response.data.last_updated
            };

        } catch (error) {
            console.error('ClickPesa getAccountBalance error:', error);
            throw new Error(`Balance check failed: ${error.message || JSON.stringify(error)}`);
        }
    }

    /**
     * 6. List Transactions
     * https://docs.clickpesa.com/api-reference/#tag/Transactions
     */
    async listTransactions(filters = {}) {
        try {
            const params = {
                page: filters.page || 1,
                limit: filters.limit || 20,
                ...(filters.start_date && { start_date: filters.start_date }),
                ...(filters.end_date && { end_date: filters.end_date }),
                ...(filters.status && { status: filters.status }),
                ...(filters.type && { type: filters.type }),
                ...(filters.merchant_reference && { merchant_reference: filters.merchant_reference })
            };

            const response = await this.client.get('/v1/transactions', { params });

            return {
                transactions: response.data.transactions,
                pagination: {
                    current_page: response.data.current_page,
                    total_pages: response.data.total_pages,
                    total_items: response.data.total_items,
                    has_next: response.data.has_next,
                    has_previous: response.data.has_previous
                }
            };

        } catch (error) {
            console.error('ClickPesa listTransactions error:', error);
            throw new Error(`Transaction list failed: ${error.message || JSON.stringify(error)}`);
        }
    }

    /**
     * 7. Refund Payment
     * https://docs.clickpesa.com/api-reference/#tag/Refunds
     */
    async refundPayment(refundData) {
        try {
            const requiredFields = ['original_transaction_id', 'amount', 'reason'];
            const missingFields = requiredFields.filter(field => !refundData[field]);

            if (missingFields.length > 0) {
                throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
            }

            const payload = {
                merchant_id: this.merchantId,
                original_transaction_id: refundData.original_transaction_id,
                amount: refundData.amount.toString(),
                currency: refundData.currency || 'TZS',
                reason: refundData.reason,
                description: refundData.description,
                callback_url: refundData.callback_url,
                metadata: refundData.metadata || {}
            };

            const response = await this.client.post('/v1/refunds', payload);

            return {
                id: response.data.id,
                status: response.data.status,
                refund_reference: response.data.refund_reference,
                amount: response.data.amount,
                currency: response.data.currency,
                original_transaction_id: response.data.original_transaction_id,
                created_at: response.data.created_at,
                raw_response: response.data
            };

        } catch (error) {
            console.error('ClickPesa refundPayment error:', error);
            
            if (error.status === 400) {
                if (error.error_code === 'ALREADY_REFUNDED') {
                    throw new Error('This transaction has already been refunded');
                } else if (error.error_code === 'REFUND_NOT_ALLOWED') {
                    throw new Error('Refund not allowed for this transaction');
                }
            }

            throw new Error(`Refund failed: ${error.message || JSON.stringify(error)}`);
        }
    }

    /**
     * 8. Validate Mobile Number
     * https://docs.clickpesa.com/api-reference/#tag/Validation
     */
    async validateMobileNumber(phoneNumber, networkCode = 'MPESA') {
        try {
            if (!phoneNumber) {
                throw new Error('Phone number is required');
            }

            const response = await this.client.post('/v1/validation/mobile', {
                phone_number: phoneNumber,
                network_code: networkCode
            });

            return {
                is_valid: response.data.is_valid,
                phone_number: response.data.phone_number,
                network_code: response.data.network_code,
                operator: response.data.operator,
                raw_response: response.data
            };

        } catch (error) {
            console.error('ClickPesa validateMobileNumber error:', error);
            throw new Error(`Mobile number validation failed: ${error.message || JSON.stringify(error)}`);
        }
    }

    /**
     * 9. Handle Payment Webhook
     * (This is called from the controller, but we can provide a helper)
     */
    async processWebhookEvent(webhookData) {
        try {
            const eventType = webhookData.event_type;
            const eventData = webhookData.data;

            switch (eventType) {
                case 'checkout.request.successful':
                    return {
                        type: 'payment_success',
                        data: eventData,
                        message: 'Payment completed successfully'
                    };

                case 'checkout.request.failed':
                    return {
                        type: 'payment_failed',
                        data: eventData,
                        message: 'Payment failed'
                    };

                case 'checkout.request.expired':
                    return {
                        type: 'payment_expired',
                        data: eventData,
                        message: 'Payment expired'
                    };

                case 'disbursement.successful':
                    return {
                        type: 'disbursement_success',
                        data: eventData,
                        message: 'Disbursement completed successfully'
                    };

                case 'disbursement.failed':
                    return {
                        type: 'disbursement_failed',
                        data: eventData,
                        message: 'Disbursement failed'
                    };

                case 'refund.successful':
                    return {
                        type: 'refund_success',
                        data: eventData,
                        message: 'Refund completed successfully'
                    };

                default:
                    console.warn(`Unhandled webhook event type: ${eventType}`);
                    return {
                        type: 'unknown',
                        data: webhookData,
                        message: 'Unhandled event type'
                    };
            }

        } catch (error) {
            console.error('ClickPesa processWebhookEvent error:', error);
            throw new Error(`Webhook processing failed: ${error.message || JSON.stringify(error)}`);
        }
    }

    /**
     * 10. Generate Payment Link (Static QR)
     */
    async generatePaymentLink(linkData) {
        try {
            const payload = {
                merchant_id: this.merchantId,
                amount: linkData.amount.toString(),
                currency: linkData.currency || 'TZS',
                merchant_reference: linkData.merchant_reference,
                description: linkData.description || 'Payment Link',
                customer_email: linkData.customer_email,
                customer_name: linkData.customer_name,
                customer_phone: linkData.customer_phone,
                expires_in: linkData.expires_in || 86400, // 24 hours
                metadata: linkData.metadata || {}
            };

            const response = await this.client.post('/v1/payment-links', payload);

            return {
                id: response.data.id,
                payment_url: response.data.payment_url,
                qr_code_url: response.data.qr_code_url,
                merchant_reference: response.data.merchant_reference,
                amount: response.data.amount,
                currency: response.data.currency,
                expires_at: response.data.expires_at,
                raw_response: response.data
            };

        } catch (error) {
            console.error('ClickPesa generatePaymentLink error:', error);
            throw new Error(`Payment link generation failed: ${error.message || JSON.stringify(error)}`);
        }
    }
}

// Singleton instance
module.exports = new ClickPesaService();