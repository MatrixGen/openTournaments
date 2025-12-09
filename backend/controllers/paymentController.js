
const {
  sequelize,
  User,
  Transaction,
  PaymentRecord,
  WebhookLog,
} = require("../models");
const ClickPesaService = require("../services/clickPesaThirdPartyService");
const { Op } = require("sequelize");

class PaymentController {
  /**
   * Generate unique order reference
   */
  static generateOrderReference(prefix = "DEPO") {
    const timestamp = Date.now();
    const random = Math.random()
      .toString(36)
      .replace(/[^a-z0-9]/gi, "")
      .substring(0, 8)
      .toUpperCase();
    return `${prefix}${timestamp}${random}`;
  }

  /**
   * Map ClickPesa status to internal status
   */
  static mapClickPesaStatus(status) {
    if (!status) return "pending";

    const statusMap = {
      PROCESSING: "processing",
      PENDING: "pending",
      SUCCESS: "successful",
      SUCCESSFUL: "successful",
      FAILED: "failed",
      EXPIRED: "expired",
      CANCELLED: "cancelled",
      REFUNDED: "refunded",
      REVERSED: "reversed",
      AUTHORIZED: "authorized",
      INITIATED: "initiated",
    };
    return statusMap[status.toUpperCase()] || "pending";
  }

  /**
   * 1. Initiate Mobile Money Payment for WALLET DEPOSIT
   */
  static async initiateWalletDeposit(req, res) {
    const t = await sequelize.transaction();
    try {
      const { amount, phoneNumber } = req.body;
      const userId = req.user.id;

      if (!amount || isNaN(amount) || amount < 1000) {
        throw new Error("Minimum deposit amount is 1,000 TZS");
      }

      if (amount > 1000000) {
        throw new Error("Maximum deposit amount is 1,000,000 TZS");
      }

      if (!ClickPesaService.validatePhoneNumber(phoneNumber)) {
        throw new Error(
          "Invalid phone number format. Expected: 255XXXXXXXXX (e.g., 255712345678)"
        );
      }

      const formattedPhone = ClickPesaService.formatPhoneNumber(phoneNumber);
      const user = await User.findByPk(userId, {
        transaction: t,
        lock: t.LOCK.UPDATE,
      });

      if (!user) {
        throw new Error("User not found");
      }

      // Check for existing pending deposits
      const pendingDeposit = await PaymentRecord.findOne({
        where: {
          user_id: userId,
          status: { [Op.in]: ["pending", "processing", "initiated"] },
          payment_method: "mobile_money_deposit",
          created_at: {
            [Op.gt]: new Date(Date.now() - 5 * 60 * 1000),
          },
        },
        transaction: t,
      });

      if (pendingDeposit) {
        throw new Error(
          "You have a pending deposit. Please complete or cancel it before starting a new one."
        );
      }

      const orderReference = PaymentController.generateOrderReference("DEPO");

      // Preview payment
      let previewResult = null;
      let senderDetails = null;

      try {
        previewResult = await ClickPesaService.previewUssdPushPayment({
          amount: amount,
          currency: "TZS",
          orderReference: orderReference,
          phoneNumber: formattedPhone,
          fetchSenderDetails: true,
        });

        if (
          !previewResult.activeMethods ||
          previewResult.activeMethods.length === 0
        ) {
          throw new Error("No available payment methods for this phone number");
        }

        senderDetails = previewResult.sender;
        console.log("Payment preview successful:", {
          methods: previewResult.activeMethods,
          sender: senderDetails,
        });
      } catch (previewError) {
        console.warn("Payment preview failed:", previewError.message);
      }

      // Create deposit record
      const paymentRecord = await PaymentRecord.create(
        {
          user_id: userId,
          tournament_id: null,
          order_reference: orderReference,
          payment_reference: null,
          amount: amount,
          currency: "TZS",
          payment_method: "mobile_money_deposit",
          status: "initiated",
          phone_number: formattedPhone,
          metadata: {
            type: "wallet_deposit",
            preview_result: previewResult,
            sender_details: senderDetails,
            deposit_amount: amount,
            current_balance: user.wallet_balance,
            user_email: user.email,
            user_name: user.username,
          },
        },
        { transaction: t }
      );

      // Initiate USSD-PUSH payment
      const paymentResult = await ClickPesaService.initiateUssdPushPayment({
        amount: amount,
        currency: "TZS",
        orderReference: orderReference,
        phoneNumber: formattedPhone,
        enableChecksum: process.env.CLICKPESA_CHECKSUM_KEY ? true : false,
      });

      if (!paymentResult.id) {
        throw new Error(
          "Payment initiation failed: No transaction ID received from ClickPesa"
        );
      }

      // Update payment record
      await paymentRecord.update(
        {
          payment_reference: paymentResult.id,
          status: PaymentController.mapClickPesaStatus(paymentResult.status),
          metadata: {
            ...paymentRecord.metadata,
            initiation_response: paymentResult,
            initiated_at: new Date().toISOString(),
            channel: paymentResult.channel,
            collected_amount: paymentResult.collectedAmount,
            collected_currency: paymentResult.collectedCurrency,
            clickpesa_transaction_id: paymentResult.id,
          },
        },
        { transaction: t }
      );

      // Create transaction record
      await Transaction.create(
        {
          user_id: userId,
          type: "wallet_deposit",
          amount: amount,
          balance_before: user.wallet_balance,
          balance_after: user.wallet_balance,
          status: "pending",
          payment_reference: paymentResult.id,
          order_reference: orderReference,
          gateway_type: "clickpesa_mobile_money",
          gateway_status: paymentResult.status,
          metadata: {
            phone_number: formattedPhone,
            payment_result: paymentResult,
            preview_result: previewResult,
            network: paymentResult.channel,
            user_id: userId,
          },
        },
        { transaction: t }
      );

      await t.commit();

      res.json({
        success: true,
        message: "Wallet deposit initiated successfully",
        data: {
          order_reference: orderReference,
          transaction_id: paymentResult.id,
          status: paymentResult.status,
          channel: paymentResult.channel,
          amount: paymentResult.collectedAmount,
          currency: paymentResult.collectedCurrency,
          instructions:
            "Check your mobile phone to complete the payment via USSD",
          created_at: paymentResult.createdAt,
          expires_in: "5 minutes",
        },
      });
    } catch (err) {
      await t.rollback();
      console.error("Wallet deposit error:", err);
      res.status(400).json({
        success: false,
        error: err.message,
        code: "WALLET_DEPOSIT_FAILED",
      });
    }
  }

  /**
   * 2. Handle payment webhook (for all payment events)
   */
  static async handlePaymentWebhook(req, res) {
    console.log("Webhook received:", {
      url: req.originalUrl,
      event: req.body.event || req.body.eventType,
      timestamp: new Date().toISOString(),
      signature: req.headers["x-clickpesa-signature"],
    });

    let t;
    let payload;

    try {
      const rawBody = req.rawBody || JSON.stringify(req.body);
      const signatureHeader =
        req.headers["x-clickpesa-signature"] ||
        req.headers["x-signature"] ||
        req.headers["signature"];

      if (!signatureHeader) {
        console.error("Missing signature header in webhook");
        return res.status(400).json({
          success: false,
          error: "Missing signature header",
        });
      }

      // Verify webhook signature
      const isValid = ClickPesaService.verifyWebhookSignature(
        rawBody,
        signatureHeader
      );
      if (!isValid) {
        console.error("Invalid webhook signature");
        return res.status(401).json({
          success: false,
          error: "Invalid webhook signature",
        });
      }

      // Parse webhook payload
      payload = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
      const { event, eventType, data } = payload;
      const webhookEvent = event || eventType;

      if (!webhookEvent || !data) {
        throw new Error("Invalid webhook payload: missing event or data");
      }

      // Extract webhook ID
      const webhookId =
        data.id ||
        data.paymentId ||
        data.transactionId ||
        data.paymentReference;

      // Check idempotency
      if (webhookId) {
        const existingWebhook = await WebhookLog.findOne({
          where: {
            webhook_id: webhookId,
            event_type: webhookEvent,
            status: "completed",
          },
        });

        if (existingWebhook) {
          console.log(
            `Webhook already processed: ${webhookId} - ${webhookEvent}`
          );
          return res.json({
            success: true,
            message: "Webhook already processed",
          });
        }
      }

      t = await sequelize.transaction();

      // Log webhook
      await WebhookLog.create(
        {
          webhook_id: webhookId,
          event_type: webhookEvent,
          payload: payload,
          raw_body: rawBody,
          signature_header: signatureHeader,
          processed_at: new Date(),
          status: "processing",
        },
        { transaction: t }
      );

      // Process based on event type
      let result;
      const eventUpper = webhookEvent.toUpperCase();

      switch (eventUpper) {
        case "PAYMENT RECEIVED":
        case "PAYMENT_SUCCESSFUL":
        case "DEPOSIT RECEIVED":
          result = await this.handlePaymentSuccess(data, eventUpper, t);
          break;

        case "PAYMENT FAILED":
        case "PAYMENT_EXPIRED":
          result = await this.handlePaymentFailed(data, t, eventUpper);
          break;

        case "PAYMENT CANCELLED":
          result = await this.handlePaymentCancelled(data, t, eventUpper);
          break;

        case "PAYOUT INITIATED":
          result = await this.handlePayoutInitiated(data, t);
          break;

        case "PAYOUT REFUNDED":
        case "PAYMENT_REFUNDED":
        case "REFUND_PROCESSED":
          result = await this.handlePayoutRefunded(data, t);
          break;

        case "PAYOUT REVERSED":
          result = await this.handlePayoutReversed(data, t);
          break;

        default:
          console.warn(`Unhandled webhook event: ${webhookEvent}`);
          result = { success: true, message: "Event not processed" };
      }

      // Update webhook log
      await WebhookLog.update(
        {
          status: "completed",
          result: result,
        },
        {
          where: {
            webhook_id: webhookId,
            event_type: webhookEvent,
          },
          transaction: t,
        }
      );

      await t.commit();

      res.json({
        success: true,
        message: "Webhook processed successfully",
        event: webhookEvent,
        data: result,
      });
    } catch (err) {
      if (t) await t.rollback();

      console.error("Webhook processing error:", err);

      // Log webhook failure
      if (payload && payload.data) {
        try {
          await WebhookLog.create({
            webhook_id: payload.data.id || payload.data.paymentId,
            event_type: payload.event || payload.eventType,
            payload: payload,
            status: "failed",
            error_message: err.message,
            processed_at: new Date(),
          });
        } catch (logError) {
          console.error("Failed to log webhook error:", logError);
        }
      }

      res.status(500).json({
        success: false,
        error: err.message,
        code: "WEBHOOK_PROCESSING_FAILED",
      });
    }
  }

  /**
   * Handle successful payment/deposit
   */
  static async handlePaymentSuccess(data, eventType, transaction) {
    const orderReference =
      data.orderReference || data.paymentReference || data.id;
    const amount = data.collectedAmount || data.depositAmount || data.amount;
    const currency =
      data.collectedCurrency || data.depositCurrency || data.currency;
    const status = data.status || "SUCCESS";

    // Find payment record
    const paymentRecord = await PaymentRecord.findOne({
      where: {
        [Op.or]: [
          { order_reference: orderReference },
          { payment_reference: orderReference },
        ],
        payment_method: "mobile_money_deposit",
      },
      transaction,
    });

    if (!paymentRecord) {
      console.warn(`Payment record not found: ${orderReference}`);
      return {
        processed: false,
        orderReference,
        status: "record_not_found",
      };
    }

    if (paymentRecord.status === "successful") {
      return {
        processed: false,
        orderReference,
        status: "already_processed",
      };
    }

    // Update payment record
    await paymentRecord.update(
      {
        status: "successful",
        metadata: {
          ...paymentRecord.metadata,
          webhook_data: data,
          event_type: eventType,
          collected_amount: amount,
          collected_currency: currency,
          completed_at: new Date().toISOString(),
          webhook_received_at: new Date().toISOString(),
        },
      },
      { transaction }
    );

    // Update transaction and user wallet
    const dbTransaction = await Transaction.findOne({
      where: {
        [Op.or]: [
          { order_reference: orderReference },
          { payment_reference: orderReference },
        ],
      },
      transaction,
    });

    if (dbTransaction) {
      const user = await User.findByPk(paymentRecord.user_id, {
        transaction,
        lock: transaction.LOCK.UPDATE,
      });

      if (user) {
        const depositAmount = parseFloat(paymentRecord.amount);
        const currentBalance = parseFloat(user.wallet_balance);
        const newBalance = currentBalance + depositAmount;

        // Update user wallet
        await user.update({ wallet_balance: newBalance }, { transaction });

        // Update user phone if available
        if (data.customer && data.customer.phone) {
          await user.update(
            {
              phone: data.customer.phone,
            },
            { transaction }
          );
        }

        // Update transaction record
        await dbTransaction.update(
          {
            type: "wallet_deposit",
            status: "successful",
            balance_after: newBalance,
            gateway_status: status,
            metadata: {
              ...dbTransaction.metadata,
              webhook_confirmation: data,
              event_type: eventType,
              completed_at: new Date().toISOString(),
              previous_balance: currentBalance,
              new_balance: newBalance,
              channel: data.channel,
            },
          },
          { transaction }
        );

        // Large deposit alert
        if (depositAmount > 50000) {
          console.log(
            `Large deposit alert: User ${user.id} deposited ${depositAmount} TZS`
          );
        }

        console.log(
          `Deposit successful for user ${user.id}. Added ${depositAmount} TZS to wallet. New balance: ${newBalance} TZS`
        );

        return {
          processed: true,
          orderReference,
          status: "successful",
          userId: user.id,
          depositAmount: depositAmount,
          newBalance: newBalance,
        };
      }
    }

    return {
      processed: true,
      orderReference,
      status: "successful",
    };
  }

  /**
   * Handle payout initiated (for withdrawals)
   */
  static async handlePayoutInitiated(data, transaction) {
    const orderReference = data.orderReference || data.id;
    console.log(`Payout initiated: ${orderReference}`);

    // TODO: Implement withdrawal status update logic
    return {
      processed: true,
      orderReference,
      status: "payout_initiated",
      message: "Payout initiated notification received",
    };
  }

  /**
   * Handle payout refunded
   */
  static async handlePayoutRefunded(data, transaction) {
    const orderReference = data.orderReference || data.id;
    console.log(`Payout refunded: ${orderReference}`);

    // TODO: Implement refund handling logic
    return {
      processed: true,
      orderReference,
      status: "payout_refunded",
      message: "Payout refunded notification received",
    };
  }

  /**
   * Handle payout reversed
   */
  static async handlePayoutReversed(data, transaction) {
    const orderReference = data.orderReference || data.id;
    console.log(`Payout reversed: ${orderReference}`);

    // TODO: Implement reversal handling logic
    return {
      processed: true,
      orderReference,
      status: "payout_reversed",
      message: "Payout reversed notification received",
    };
  }

  /**
   * Handle payment failed
   */
  static async handlePaymentFailed(
    data,
    transaction,
    eventType = "PAYMENT FAILED"
  ) {
    const orderReference = data.orderReference || data.id;
    const status = data.status || "FAILED";
    const message = data.message || "Payment failed";

    const paymentRecord = await PaymentRecord.findOne({
      where: {
        [Op.or]: [
          { order_reference: orderReference },
          { payment_reference: orderReference },
        ],
      },
      transaction,
    });

    if (paymentRecord) {
      await paymentRecord.update(
        {
          status: "failed",
          metadata: {
            ...paymentRecord.metadata,
            webhook_data: data,
            event_type: eventType,
            failure_message: message,
            failed_at: new Date().toISOString(),
          },
        },
        { transaction }
      );
    }

    const dbTransaction = await Transaction.findOne({
      where: {
        [Op.or]: [
          { order_reference: orderReference },
          { payment_reference: orderReference },
        ],
      },
      transaction,
    });

    if (dbTransaction) {
      await dbTransaction.update(
        {
          status: "failed",
          gateway_status: status,
          metadata: {
            ...dbTransaction.metadata,
            failure_data: data,
            event_type: eventType,
            failure_message: message,
            failed_at: new Date().toISOString(),
          },
        },
        { transaction }
      );
    }

    return {
      processed: true,
      orderReference,
      status: "failed",
      message: message,
    };
  }

  /**
   * Handle payment cancelled
   */
  static async handlePaymentCancelled(
    data,
    transaction,
    eventType = "PAYMENT CANCELLED"
  ) {
    const orderReference = data.orderReference || data.id;
    const status = data.status || "CANCELLED";

    const paymentRecord = await PaymentRecord.findOne({
      where: {
        [Op.or]: [
          { order_reference: orderReference },
          { payment_reference: orderReference },
        ],
      },
      transaction,
    });

    if (paymentRecord) {
      await paymentRecord.update(
        {
          status: "cancelled",
          metadata: {
            ...paymentRecord.metadata,
            webhook_data: data,
            event_type: eventType,
            cancelled_at: new Date().toISOString(),
          },
        },
        { transaction }
      );
    }

    const dbTransaction = await Transaction.findOne({
      where: {
        [Op.or]: [
          { order_reference: orderReference },
          { payment_reference: orderReference },
        ],
      },
      transaction,
    });

    if (dbTransaction) {
      await dbTransaction.update(
        {
          status: "cancelled",
          gateway_status: status,
          metadata: {
            ...dbTransaction.metadata,
            cancellation_data: data,
            event_type: eventType,
            cancelled_at: new Date().toISOString(),
          },
        },
        { transaction }
      );
    }

    return {
      processed: true,
      orderReference,
      status: "cancelled",
    };
  }
  /**
   * 3. Check deposit status (enhanced)
   */
  static async checkDepositStatus(req, res) {
    try {
      const { orderReference } = req.params;
      const userId = req.user.id;
      const { forceReconcile = "false" } = req.query;

      // Find payment record
      const paymentRecord = await PaymentRecord.findOne({
        where: {
          order_reference: orderReference,
          user_id: userId,
        },
      });

      if (!paymentRecord) {
        return res.status(404).json({
          success: false,
          error: "Deposit record not found",
        });
      }

      // Force reconciliation if requested
      if (forceReconcile === "true") {
        const reconciliationResult = await this.reconcilePaymentStatus(
          orderReference,
          userId
        );

        // Refresh payment record
        await paymentRecord.reload();
      }

      // Get updated user info
      const user = await User.findByPk(userId);

      // Format response
      const response = {
        success: true,
        data: {
          deposit_status: paymentRecord.status,
          order_reference: orderReference,
          amount: paymentRecord.amount,
          currency: paymentRecord.currency,
          user_balance: user.wallet_balance,
          phone_number: paymentRecord.phone_number,
          created_at: paymentRecord.created_at,
          updated_at: paymentRecord.updated_at,
          metadata: {
            payment_method: paymentRecord.payment_method,
            // Include reconciliation info if available
            ...(paymentRecord.metadata?.last_status_check && {
              last_status_check: paymentRecord.metadata.last_status_check,
              clickpesa_status: paymentRecord.metadata.clickpesa_status,
            }),
          },
        },
      };

      // Add reconciliation suggestion for old pending payments
      const paymentAge =
        Date.now() - new Date(paymentRecord.created_at).getTime();
      if (paymentRecord.status === "pending" && paymentAge > 5 * 60 * 1000) {
        response.data.reconciliation_suggestion = {
          message:
            "Payment has been pending for a while. Consider force reconciliation.",
          endpoint: `${req.baseUrl}/deposit/${orderReference}/status?forceReconcile=true`,
          age_minutes: Math.round(paymentAge / (60 * 1000)),
        };
      }

      res.json(response);
    } catch (err) {
      console.error("Check deposit status error:", err);
      res.status(400).json({
        success: false,
        error: err.message,
        code: "DEPOSIT_STATUS_CHECK_FAILED",
      });
    }
  }

  /**
   * Helper to update wallet for successful deposit
   */
  static async updateWalletForDeposit(paymentRecord) {
    const t = await sequelize.transaction();

    try {
      const user = await User.findByPk(paymentRecord.user_id, {
        transaction: t,
        lock: t.LOCK.UPDATE,
      });

      if (!user) {
        await t.rollback();
        return { success: false, error: "User not found" };
      }

      const depositAmount = parseFloat(paymentRecord.amount);
      const currentBalance = parseFloat(user.wallet_balance);
      const newBalance = currentBalance + depositAmount;

      await user.update({ wallet_balance: newBalance }, { transaction: t });

      await paymentRecord.update(
        {
          status: "successful",
          metadata: {
            ...paymentRecord.metadata,
            deposit_completed: new Date().toISOString(),
            previous_balance: currentBalance,
            new_balance: newBalance,
            manually_updated: true,
          },
        },
        { transaction: t }
      );

      await Transaction.update(
        {
          status: "successful",
          balance_after: newBalance,
        },
        {
          where: { order_reference: paymentRecord.order_reference },
          transaction: t,
        }
      );

      await t.commit();
      return { success: true, newBalance };
    } catch (error) {
      await t.rollback();
      console.error("Update wallet for deposit error:", error);
      return { success: false, error: error.message };
    }
  }

  /**
   * 4. Get user deposit history
   */
  static async getDepositHistory(req, res) {
    try {
      const userId = req.user.id;
      const {
        page = 1,
        limit = 20,
        status,
        start_date,
        end_date,
        min_amount,
        max_amount,
      } = req.query;

      const offset = (page - 1) * limit;
      const whereClause = {
        user_id: userId,
        payment_method: "mobile_money_deposit",
      };

      if (status) whereClause.status = status;

      if (start_date || end_date) {
        whereClause.created_at = {};
        if (start_date) whereClause.created_at[Op.gte] = new Date(start_date);
        if (end_date) whereClause.created_at[Op.lte] = new Date(end_date);
      }

      if (min_amount || max_amount) {
        whereClause.amount = {};
        if (min_amount) whereClause.amount[Op.gte] = parseFloat(min_amount);
        if (max_amount) whereClause.amount[Op.lte] = parseFloat(max_amount);
      }

      const { count, rows: deposits } = await PaymentRecord.findAndCountAll({
        where: whereClause,
        order: [["created_at", "DESC"]],
        limit: parseInt(limit),
        offset: parseInt(offset),
        attributes: [
          "id",
          "order_reference",
          "amount",
          "currency",
          "status",
          "customer_phone",
          "payment_reference",
          "created_at",
          "updated_at",
          "metadata",
        ],
      });

      const formattedDeposits = deposits.map((deposit) => ({
        id: deposit.id,
        order_reference: deposit.order_reference,
        amount: deposit.amount,
        currency: deposit.currency,
        status: deposit.status,
        phone_number: deposit.customer_phone,
        payment_reference: deposit.payment_reference,
        created_at: deposit.created_at,
        updated_at: deposit.updated_at,
        metadata: deposit.metadata,
      }));

      res.json({
        success: true,
        data: {
          deposits: formattedDeposits,
          total: count,
          page: parseInt(page),
          pages: Math.ceil(count / limit),
          limit: parseInt(limit),
        },
      });
    } catch (err) {
      console.error("Get deposit history error:", err);
      res.status(400).json({
        success: false,
        error: err.message,
        code: "DEPOSIT_HISTORY_FAILED",
      });
    }
  }

  /**
   * 5. Validate phone number
   */
  static async validatePhoneNumber(req, res) {
    try {
      const { phoneNumber } = req.body;

      if (!phoneNumber) {
        return res.status(400).json({
          success: false,
          error: "Phone number is required",
        });
      }

      const formattedPhone = ClickPesaService.formatPhoneNumber(phoneNumber);
      const isValid = ClickPesaService.validatePhoneNumber(formattedPhone);

      if (!isValid) {
        return res.json({
          success: true,
          data: {
            valid: false,
            formatted: formattedPhone,
            available_methods: [],
            sender_details: null,
            message: "Invalid phone number format. Expected: 255XXXXXXXXX",
          },
        });
      }

      try {
        const reference = PaymentController.generateOrderReference();
        const preview = await ClickPesaService.previewUssdPushPayment({
          amount: "1000",
          currency: "TZS",
          orderReference: reference,
          phoneNumber: formattedPhone,
          fetchSenderDetails: true,
        });

        return res.json({
          success: true,
          data: {
            valid: true,
            formatted: formattedPhone,
            available_methods: preview.activeMethods || [],
            sender_details: preview.sender || null,
            message: "Phone number is valid and has available payment methods",
          },
        });
      } catch (previewError) {
        return res.json({
          success: true,
          data: {
            valid: true,
            formatted: formattedPhone,
            available_methods: [],
            sender_details: null,
            message:
              "Phone number is valid but may not have active payment methods",
          },
        });
      }
    } catch (err) {
      console.error("Validate phone number error:", err);
      res.status(400).json({
        success: false,
        error: err.message,
        code: "PHONE_VALIDATION_FAILED",
      });
    }
  }

  /**
   * 6. Get user wallet balance
   */
  static async getWalletBalance(req, res) {
    try {
      const userId = req.user.id;
      const user = await User.findByPk(userId, {
        attributes: ["id", "wallet_balance", "username", "email"],
      });

      if (!user) {
        return res.status(404).json({
          success: false,
          error: "User not found",
        });
      }

      const recentDeposits = await PaymentRecord.count({
        where: {
          user_id: userId,
          status: "successful",
          created_at: {
            [Op.gte]: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          },
        },
      });

      res.json({
        success: true,
        data: {
          balance: user.wallet_balance,
          currency: "TZS",
          user_id: user.id,
          username: user.username,
          email: user.email,
          recent_deposits: recentDeposits,
        },
      });
    } catch (err) {
      console.error("Get wallet balance error:", err);
      res.status(400).json({
        success: false,
        error: err.message,
        code: "WALLET_BALANCE_FAILED",
      });
    }
  }

  /**
   * 7. Cancel pending deposit
   */
  static async cancelPendingDeposit(req, res) {
    const t = await sequelize.transaction();
    try {
      const { orderReference } = req.params;
      const userId = req.user.id;

      const paymentRecord = await PaymentRecord.findOne({
        where: {
          order_reference: orderReference,
          user_id: userId,
          status: { [Op.in]: ["pending", "processing", "initiated"] },
          payment_method: "mobile_money_deposit",
        },
        transaction: t,
      });

      if (!paymentRecord) {
        throw new Error("Pending deposit not found or already completed");
      }

      await paymentRecord.update(
        {
          status: "cancelled",
          metadata: {
            ...paymentRecord.metadata,
            cancelled_by_user: true,
            cancelled_at: new Date().toISOString(),
          },
        },
        { transaction: t }
      );

      await Transaction.update(
        {
          status: "cancelled",
          metadata: {
            ...paymentRecord.metadata,
            user_cancelled: true,
            cancelled_at: new Date().toISOString(),
          },
        },
        {
          where: { order_reference: orderReference },
          transaction: t,
        }
      );

      await t.commit();

      res.json({
        success: true,
        message: "Deposit cancelled successfully",
        data: {
          order_reference: orderReference,
          status: "cancelled",
        },
      });
    } catch (err) {
      await t.rollback();
      console.error("Cancel deposit error:", err);
      res.status(400).json({
        success: false,
        error: err.message,
        code: "CANCEL_DEPOSIT_FAILED",
      });
    }
  }

  /**
   * 8. Get deposit statistics
   */
  static async getDepositStats(req, res) {
    try {
      const userId = req.user.id;

      const totalDeposits = await PaymentRecord.sum("amount", {
        where: {
          user_id: userId,
          status: "successful",
          payment_method: "mobile_money_deposit",
        },
      });

      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const thisMonthDeposits = await PaymentRecord.sum("amount", {
        where: {
          user_id: userId,
          status: "successful",
          payment_method: "mobile_money_deposit",
          created_at: {
            [Op.gte]: startOfMonth,
          },
        },
      });

      const last30Days = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const recentDepositsCount = await PaymentRecord.count({
        where: {
          user_id: userId,
          status: "successful",
          payment_method: "mobile_money_deposit",
          created_at: {
            [Op.gte]: last30Days,
          },
        },
      });

      const averageDeposit = totalDeposits
        ? totalDeposits /
          (await PaymentRecord.count({
            where: {
              user_id: userId,
              status: "successful",
              payment_method: "mobile_money_deposit",
            },
          }))
        : 0;

      res.json({
        success: true,
        data: {
          total_deposits: totalDeposits || 0,
          this_month_deposits: thisMonthDeposits || 0,
          recent_deposits_count: recentDepositsCount,
          average_deposit: Math.round(averageDeposit),
          currency: "TZS",
        },
      });
    } catch (err) {
      console.error("Get deposit stats error:", err);
      res.status(400).json({
        success: false,
        error: err.message,
        code: "DEPOSIT_STATS_FAILED",
      });
    }
  }

  /**
   * Manually check and update payment status from ClickPesa
   * Can be called via cron job or user request
   */
  static async reconcilePaymentStatus(orderReference, userId = null) {
    const t = await sequelize.transaction();
    try {
      // Build where clause
      const whereClause = {
        [Op.or]: [
          { order_reference: orderReference },
          { payment_reference: orderReference },
        ],
      };

      if (userId) {
        whereClause.user_id = userId;
      }

      // Find payment record
      const paymentRecord = await PaymentRecord.findOne({
        where: {
          ...whereClause,
          status: { [Op.in]: ["pending", "processing", "initiated"] },
          created_at: {
            [Op.gt]: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
          },
        },
        transaction: t,
        lock: t.LOCK.UPDATE,
      });

      if (!paymentRecord) {
        await t.rollback();
        return {
          success: false,
          error: "Payment record not found or already finalized",
        };
      }

      // Query ClickPesa for latest status
      let clickpesaData = null;
      try {
        clickpesaData = await ClickPesaService.queryPaymentStatus(
          paymentRecord.order_reference
        );
        console.log('clickpesa data :',clickpesaData);
        
      } catch (error) {
        console.error("ClickPesa API error:", error.message);

        // If payment is older than 10 minutes and we can't reach ClickPesa,
        // mark as expired if still pending
        const paymentAge =
          Date.now() - new Date(paymentRecord.created_at).getTime();
        if (paymentAge > 10 * 60 * 1000) {
          // 10 minutes
          await paymentRecord.update(
            {
              status: "expired",
              metadata: {
                ...paymentRecord.metadata,
                last_status_check: new Date().toISOString(),
                reconciliation_note:
                  "Marked as expired after failed status check",
                clickpesa_unreachable: true,
              },
            },
            { transaction: t }
          );

          await Transaction.update(
            {
              status: "expired",
              gateway_status: "EXPIRED",
              metadata: {
                ...paymentRecord.metadata,
                reconciled_at: new Date().toISOString(),
              },
            },
            {
              where: { order_reference: paymentRecord.order_reference },
              transaction: t,
            }
          );

          await t.commit();
          return {
            success: true,
            reconciled: true,
            new_status: "expired",
            reason: "Payment expired after failed status check",
          };
        }

        await t.rollback();
        return {
          success: false,
          error: "Failed to query ClickPesa API",
        };
      }

      // Check if we got valid data
      if (!clickpesaData || clickpesaData.length === 0) {
        // No data from ClickPesa - payment might not exist there
        const paymentAge =
          Date.now() - new Date(paymentRecord.created_at).getTime();
        if (paymentAge > 5 * 60 * 1000) {
          // 5 minutes
          await paymentRecord.update(
            {
              status: "failed",
              metadata: {
                ...paymentRecord.metadata,
                last_status_check: new Date().toISOString(),
                reconciliation_note:
                  "Payment not found in ClickPesa after timeout",
              },
            },
            { transaction: t }
          );

          await Transaction.update(
            {
              status: "failed",
              gateway_status: "NOT_FOUND",
              metadata: {
                ...paymentRecord.metadata,
                reconciled_at: new Date().toISOString(),
              },
            },
            {
              where: { order_reference: paymentRecord.order_reference },
              transaction: t,
            }
          );

          await t.commit();
          return {
            success: true,
            reconciled: true,
            new_status: "failed",
            reason: "Payment not found in ClickPesa after timeout",
          };
        }

        await t.rollback();
        return {
          success: true,
          reconciled: false,
          reason: "Payment still within timeout period",
        };
      }

      const latestTransaction = clickpesaData[0];
      const remoteStatus = latestTransaction.status;
      const mappedStatus = this.mapClickPesaStatus(remoteStatus);

      // If status hasn't changed, do nothing
      if (paymentRecord.status === mappedStatus) {
        await t.commit();
        return {
          success: true,
          reconciled: false,
          current_status: mappedStatus,
          reason: "Status unchanged",
        };
      }

      // Update local records based on ClickPesa status
      await paymentRecord.update(
        {
          status: mappedStatus,
          metadata: {
            ...paymentRecord.metadata,
            last_status_check: new Date().toISOString(),
            clickpesa_status: remoteStatus,
            clickpesa_data: latestTransaction,
            reconciled_at: new Date().toISOString(),
          },
        },
        { transaction: t }
      );

      // Update transaction record
      await Transaction.update(
        {
          status: mappedStatus,
          gateway_status: remoteStatus,
          metadata: {
            ...paymentRecord.metadata,
            reconciled_at: new Date().toISOString(),
            clickpesa_response: latestTransaction,
          },
        },
        {
          where: { order_reference: paymentRecord.order_reference },
          transaction: t,
        }
      );

      // If successful, update wallet
      if (mappedStatus === "successful") {
        const user = await User.findByPk(paymentRecord.user_id, {
          transaction: t,
          lock: t.LOCK.UPDATE,
        });

        if (user) {
          const depositAmount = parseFloat(paymentRecord.amount);
          const currentBalance = parseFloat(user.wallet_balance);
          const newBalance = currentBalance + depositAmount;

          await user.update({ wallet_balance: newBalance }, { transaction: t });

          // Update transaction with balance info
          await Transaction.update(
            {
              balance_before: currentBalance,
              balance_after: newBalance,
            },
            {
              where: { order_reference: paymentRecord.order_reference },
              transaction: t,
            }
          );

          console.log(
            `Reconciliation: User ${user.id} wallet updated. Added ${depositAmount}. New balance: ${newBalance}`
          );
        }
      }

      await t.commit();

      return {
        success: true,
        reconciled: true,
        previous_status: paymentRecord._previousDataValues.status,
        new_status: mappedStatus,
        clickpesa_status: remoteStatus,
        order_reference: paymentRecord.order_reference,
        user_id: paymentRecord.user_id,
      };
    } catch (error) {
      await t.rollback();
      console.error("Payment reconciliation error:", error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Batch reconciliation for stuck payments
   */
  static async reconcileStuckPayments(limit = 50) {
    try {
      const stuckPayments = await PaymentRecord.findAll({
        where: {
          status: { [Op.in]: ["pending", "processing", "initiated"] },
          created_at: {
            [Op.lt]: new Date(Date.now() - 5 * 60 * 1000), // Older than 5 minutes
            [Op.gt]: new Date(Date.now() - 24 * 60 * 60 * 1000), // Within last 24 hours
          },
          payment_method: "mobile_money_deposit",
        },
        limit: limit,
        order: [["created_at", "ASC"]],
      });

      const results = [];
      for (const payment of stuckPayments) {
        const result = await this.reconcilePaymentStatus(
          payment.order_reference
        );
        results.push({
          order_reference: payment.order_reference,
          ...result,
        });

        // Small delay to avoid rate limiting
        await new Promise((resolve) => setTimeout(resolve, 100));
      }

      const successful = results.filter((r) => r.success);
      const failed = results.filter((r) => !r.success);
      const reconciled = results.filter((r) => r.reconciled);

      return {
        total: results.length,
        successful: successful.length,
        failed: failed.length,
        reconciled: reconciled.length,
        details: results,
      };
    } catch (error) {
      console.error("Batch reconciliation error:", error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Admin: Force reconcile specific payment
   */
  static async adminReconcilePayment(req, res) {
    try {
      const { orderReference } = req.params;
      const { user_id } = req.query;

      const result = await this.reconcilePaymentStatus(orderReference, user_id);

      if (!result.success) {
        return res.status(400).json(result);
      }

      res.json({
        success: true,
        message: "Payment reconciliation completed",
        ...result,
      });
    } catch (err) {
      console.error("Admin reconcile error:", err);
      res.status(500).json({
        success: false,
        error: err.message,
        code: "ADMIN_RECONCILE_FAILED",
      });
    }
  }

  /**
   * Admin: Batch reconcile stuck payments
   */
  static async adminBatchReconcile(req, res) {
    try {
      const { limit = 50 } = req.query;

      const result = await this.reconcileStuckPayments(parseInt(limit));

      res.json({
        success: true,
        message: "Batch reconciliation completed",
        ...result,
      });
    } catch (err) {
      console.error("Admin batch reconcile error:", err);
      res.status(500).json({
        success: false,
        error: err.message,
        code: "BATCH_RECONCILE_FAILED",
      });
    }
  }
  /**
   * User-initiated payment reconciliation
   */
  static async userReconcilePaymentStatus(req, res) {
    try {
      const { orderReference } = req.params;
      const userId = req.user.id;

      const result = await PaymentController.reconcilePaymentStatus(
        orderReference,
        userId
      );

      if (!result.success) {
        return res.status(400).json(result);
      }

      res.json({
        success: true,
        message: result.reconciled
          ? "Payment status updated successfully"
          : "Payment status is already up to date",
        ...result,
      });
    } catch (err) {
      console.error("Reconcile payment status error:", err);
      res.status(400).json({
        success: false,
        error: err.message,
        code: "RECONCILIATION_FAILED",
      });
    }
  }

  /**
   * Get stuck payments (for admin dashboard)
   */
  static async getStuckPayments(limit = 100, hours = 24) {
    try {
      const cutoffDate = new Date(Date.now() - hours * 60 * 60 * 1000);

      const stuckPayments = await PaymentRecord.findAll({
        where: {
          status: { [Op.in]: ["pending", "processing", "initiated"] },
          created_at: {
            [Op.lt]: new Date(Date.now() - 5 * 60 * 1000), // Older than 5 minutes
            [Op.gt]: cutoffDate, // Within specified hours
          },
          payment_method: "mobile_money_deposit",
        },
        limit: limit,
        order: [["created_at", "ASC"]],
        include: [
          {
            model: User,
            attributes: ["id", "username", "email", "phone"],
          },
        ],
        attributes: [
          "id",
          "order_reference",
          "payment_reference",
          "amount",
          "currency",
          "status",
          "phone_number",
          "created_at",
          "updated_at",
          "metadata",
        ],
      });

      const formattedPayments = stuckPayments.map((payment) => ({
        id: payment.id,
        order_reference: payment.order_reference,
        payment_reference: payment.payment_reference,
        amount: payment.amount,
        currency: payment.currency,
        status: payment.status,
        phone_number: payment.phone_number,
        created_at: payment.created_at,
        age_minutes: Math.round(
          (Date.now() - new Date(payment.created_at).getTime()) / (60 * 1000)
        ),
        user: payment.User
          ? {
              id: payment.User.id,
              username: payment.User.username,
              email: payment.User.email,
              phone: payment.User.phone,
            }
          : null,
        metadata: payment.metadata,
      }));

      const summary = {
        total: formattedPayments.length,
        by_status: formattedPayments.reduce((acc, payment) => {
          acc[payment.status] = (acc[payment.status] || 0) + 1;
          return acc;
        }, {}),
        by_age_group: formattedPayments.reduce((acc, payment) => {
          const ageGroup =
            payment.age_minutes < 10
              ? "5-10 min"
              : payment.age_minutes < 30
              ? "10-30 min"
              : payment.age_minutes < 60
              ? "30-60 min"
              : "60+ min";
          acc[ageGroup] = (acc[ageGroup] || 0) + 1;
          return acc;
        }, {}),
      };

      return {
        summary,
        payments: formattedPayments,
      };
    } catch (error) {
      console.error("Get stuck payments error:", error);
      throw error;
    }
  }

  /**
   * Test webhook endpoint (for development)
   */
  static async testWebhook(req, res) {
    const testPayloads = [
      {
        event: "PAYMENT RECEIVED",
        data: {
          paymentId: "PAY123456",
          orderReference: "TEST123",
          collectedAmount: "10000.00",
          collectedCurrency: "TZS",
          status: "SUCCESS",
          customer: { name: "Test User", phone: "255700000000" },
        },
      },
      {
        event: "DEPOSIT RECEIVED",
        data: {
          id: "DEP17C9LPL",
          status: "SUCCESS",
          paymentReference: "TEST456",
          depositAmount: "2000",
          depositCurrency: "TZS",
          channel: "CRDB COLLECTION",
        },
      },
      {
        eventType: "PAYMENT FAILED",
        data: {
          id: "0969231256LCP2C95",
          status: "FAILED",
          orderReference: "TEST789",
          message: "Insufficient balance",
        },
      },
    ];

    console.log("Test webhook payloads ready");
    res.json({
      success: true,
      message: "Use these payloads for testing",
      testPayloads: testPayloads,
    });
  }
}

module.exports = PaymentController;
