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
    const timestamp = Date.now(); // numeric
    const random = Math.random()
      .toString(36)
      .replace(/[^a-z0-9]/gi, "")
      .substring(0, 8)
      .toUpperCase(); // safe alphanumeric
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

      // Validate amount
      if (!amount || isNaN(amount) || amount < 1000) {
        throw new Error("Minimum deposit amount is 1,000 TZS");
      }

      if (amount > 1000000) {
        throw new Error("Maximum deposit amount is 1,000,000 TZS");
      }

      // Validate phone number format
      if (!ClickPesaService.validatePhoneNumber(phoneNumber)) {
        throw new Error(
          "Invalid phone number format. Expected: 255XXXXXXXXX (e.g., 255712345678)"
        );
      }

      // Format phone number
      const formattedPhone = ClickPesaService.formatPhoneNumber(phoneNumber);

      // Get user with lock
      const user = await User.findByPk(userId, {
        transaction: t,
        lock: t.LOCK.UPDATE,
      });

      if (!user) {
        throw new Error("User not found");
      }

      // Check for existing pending deposits (prevent duplicates)
      const pendingDeposit = await PaymentRecord.findOne({
        where: {
          user_id: userId,
          status: { [Op.in]: ["pending", "processing", "initiated"] },
          payment_method: "mobile_money_deposit",
          created_at: {
            [Op.gt]: new Date(Date.now() - 5 * 60 * 1000), // Last 5 minutes
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

      // 1. Preview payment (optional but recommended)
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

        // Check if payment methods are available
        if (
          !previewResult.activeMethods ||
          previewResult.activeMethods.length === 0
        ) {
          throw new Error("No available payment methods for this phone number");
        }

        // Store sender details for verification
        senderDetails = previewResult.sender;

        console.log("Payment preview successful:", {
          methods: previewResult.activeMethods,
          sender: senderDetails,
        });
      } catch (previewError) {
        console.warn("Payment preview failed:", previewError.message);
        // Continue without preview, but log the error
      }

      // 2. Create deposit record
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

      // 3. Initiate USSD-PUSH payment
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

      // 4. Update payment record with ClickPesa response
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

      // 5. Create transaction record for deposit
      await Transaction.create(
        {
          user_id: userId,
          type: "wallet_deposit",
          amount: amount,
          balance_before: user.wallet_balance,
          balance_after: user.wallet_balance, // Will be updated when webhook confirms
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
          expires_in: "5 minutes", // USSD sessions typically expire
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
    let t;

    try {
      // Store the raw body for signature verification
      const rawBody = req.rawBody || JSON.stringify(req.body);

      // Get signature header
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

      // Verify webhook signature using raw body
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
      const payload =
        typeof req.body === "string" ? JSON.parse(req.body) : req.body;
      const { event, eventType, data } = payload;

      // Determine event type
      const webhookEvent = event || eventType;
      if (!webhookEvent || !data) {
        throw new Error("Invalid webhook payload: missing event or data");
      }

      // Check for idempotency - prevent duplicate processing
      const webhookId = data.id || data.paymentId || data.transactionId;
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

      // Log webhook for idempotency
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
      switch (webhookEvent.toUpperCase()) {
        case "PAYMENT RECEIVED":
        case "PAYMENT_SUCCESSFUL":
        case "DEPOSIT RECEIVED":
          result = await this.handleDepositSuccess(data, t);
          break;

        case "PAYMENT FAILED":
        case "PAYMENT_EXPIRED":
          result = await this.handlePaymentFailed(data, t);
          break;

        case "PAYMENT CANCELLED":
          result = await this.handlePaymentCancelled(data, t);
          break;

        default:
          console.warn(`Unhandled webhook event: ${webhookEvent}`);
          result = { success: true, message: "Event not processed" };
      }

      // Update webhook log status
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
            webhook_id: payload.data.id,
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
   * Handle successful deposit
   */
  static async handleDepositSuccess(data, transaction) {
    const {
      orderReference,
      status,
      collectedAmount,
      collectedCurrency,
      customer,
    } = data;

    // Find deposit record
    const paymentRecord = await PaymentRecord.findOne({
      where: {
        order_reference: orderReference,
        payment_method: "mobile_money_deposit",
      },
      transaction,
    });

    if (!paymentRecord) {
      throw new Error(`Deposit record not found: ${orderReference}`);
    }

    // If already successful, skip
    if (paymentRecord.status === "successful") {
      return {
        processed: false,
        orderReference,
        status: "already_processed",
      };
    }

    // Update deposit record
    await paymentRecord.update(
      {
        status: "successful",
        metadata: {
          ...paymentRecord.metadata,
          webhook_data: data,
          customer_details: customer,
          collected_amount: collectedAmount,
          collected_currency: collectedCurrency,
          completed_at: new Date().toISOString(),
          webhook_received_at: new Date().toISOString(),
        },
      },
      { transaction }
    );

    // Update transaction and user wallet
    const dbTransaction = await Transaction.findOne({
      where: { order_reference: orderReference },
      transaction,
    });

    if (dbTransaction) {
      const user = await User.findByPk(paymentRecord.user_id, {
        transaction,
        lock: transaction.LOCK.UPDATE,
      });

      if (user) {
        // Add deposit amount to wallet balance
        const depositAmount = parseFloat(paymentRecord.amount);
        const currentBalance = parseFloat(user.wallet_balance);
        const newBalance = currentBalance + depositAmount;

        // Update user wallet
        await user.update({ wallet_balance: newBalance }, { transaction });

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
              completed_at: new Date().toISOString(),
              previous_balance: currentBalance,
              new_balance: newBalance,
              customer_details: customer,
            },
          },
          { transaction }
        );

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
   * Handle failed payment
   */
  static async handlePaymentFailed(data, transaction) {
    const { orderReference, status, message } = data;

    const paymentRecord = await PaymentRecord.findOne({
      where: { order_reference: orderReference },
      transaction,
    });

    if (paymentRecord) {
      await paymentRecord.update(
        {
          status: "failed",
          metadata: {
            ...paymentRecord.metadata,
            webhook_data: data,
            failure_message: message || "Payment failed",
            failed_at: new Date().toISOString(),
          },
        },
        { transaction }
      );
    }

    const dbTransaction = await Transaction.findOne({
      where: { order_reference: orderReference },
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
    };
  }

  /**
   * Handle cancelled payment
   */
  static async handlePaymentCancelled(data, transaction) {
    const { orderReference, status } = data;

    const paymentRecord = await PaymentRecord.findOne({
      where: { order_reference: orderReference },
      transaction,
    });

    if (paymentRecord) {
      await paymentRecord.update(
        {
          status: "cancelled",
          metadata: {
            ...paymentRecord.metadata,
            webhook_data: data,
            cancelled_at: new Date().toISOString(),
          },
        },
        { transaction }
      );
    }

    const dbTransaction = await Transaction.findOne({
      where: { order_reference: orderReference },
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
   * 3. Check deposit status
   */
  static async checkDepositStatus(req, res) {
    try {
      const { orderReference } = req.params;
      const userId = req.user.id;

      // Check local database first
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

      // Query ClickPesa for latest status
      let clickpesaStatus = null;
      try {
        clickpesaStatus = await ClickPesaService.queryPaymentStatus(
          orderReference
        );
      } catch (clickpesaError) {
        console.warn("ClickPesa status query failed:", clickpesaError.message);
        // Continue with local status
      }

      // Update local status if ClickPesa has newer info
      if (clickpesaStatus && clickpesaStatus.length > 0) {
        const latestStatus = clickpesaStatus[0].status;
        const mappedStatus = this.mapClickPesaStatus(latestStatus);

        if (paymentRecord.status !== mappedStatus) {
          await paymentRecord.update({
            status: mappedStatus,
            metadata: {
              ...paymentRecord.metadata,
              last_status_check: new Date().toISOString(),
              clickpesa_status: latestStatus,
              clickpesa_data: clickpesaStatus[0],
            },
          });

          // If status changed to successful, update user wallet
          if (mappedStatus === "successful") {
            await this.updateWalletForDeposit(paymentRecord);
          }
        }
      }

      // Get updated user balance
      const user = await User.findByPk(userId);

      res.json({
        success: true,
        data: {
          deposit_status: paymentRecord.status,
          clickpesa_status: clickpesaStatus,
          order_reference: orderReference,
          amount: paymentRecord.amount,
          currency: paymentRecord.currency,
          user_balance: user.wallet_balance,
          phone_number: paymentRecord.phone_number,
          created_at: paymentRecord.created_at,
          updated_at: paymentRecord.updated_at,
        },
      });
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

      // Update user wallet
      await user.update({ wallet_balance: newBalance }, { transaction: t });

      // Update payment record
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

      // Update transaction
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

      // Apply filters
      if (status) {
        whereClause.status = status;
      }

      if (start_date || end_date) {
        whereClause.created_at = {};
        if (start_date) {
          whereClause.created_at[Op.gte] = new Date(start_date);
        }
        if (end_date) {
          whereClause.created_at[Op.lte] = new Date(end_date);
        }
      }

      if (min_amount || max_amount) {
        whereClause.amount = {};
        if (min_amount) {
          whereClause.amount[Op.gte] = parseFloat(min_amount);
        }
        if (max_amount) {
          whereClause.amount[Op.lte] = parseFloat(max_amount);
        }
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
          "phone_number",
          "payment_reference",
          "created_at",
          "updated_at",
          "metadata",
        ],
      });

      // Format response
      const formattedDeposits = deposits.map((deposit) => ({
        id: deposit.id,
        order_reference: deposit.order_reference,
        amount: deposit.amount,
        currency: deposit.currency,
        status: deposit.status,
        phone_number: deposit.phone_number,
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

      // Get recent deposits count
      const recentDeposits = await PaymentRecord.count({
        where: {
          user_id: userId,
          status: "successful",
          created_at: {
            [Op.gte]: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last 7 days
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

      // Find pending deposit
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

      // Update status to cancelled
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

      // Update transaction record
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

      // Total successful deposits
      const totalDeposits = await PaymentRecord.sum("amount", {
        where: {
          user_id: userId,
          status: "successful",
          payment_method: "mobile_money_deposit",
        },
      });

      // This month's deposits
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

      // Last 30 days successful count
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

      // Average deposit amount
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
}

module.exports = PaymentController;
