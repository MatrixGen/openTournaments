const { PaymentMethod } = require('../models');

const getPaymentMethods = async (req, res, next) => {
  try {
    const paymentMethods = await PaymentMethod.findAll({
      where: { is_active: true },
      attributes: ['id', 'name', 'description', 'logo_url', 'fee_structure', 'requires_redirect']
    });
    
    res.json(paymentMethods);
  } catch (error) {
    next(error);
  }
};
const initiateDeposit = async (req, res, next) => {
  let transaction;
  try {
    const { amount, payment_method_id } = req.body;
    const user_id = req.user.id;

    // Validate input
    if (!amount || amount <= 0) {
      return res.status(400).json({ message: 'Invalid deposit amount' });
    }

    transaction = await sequelize.transaction();

    // Get payment method
    const paymentMethod = await PaymentMethod.findByPk(payment_method_id, { transaction });
    if (!paymentMethod || !paymentMethod.is_active) {
      await transaction.rollback();
      return res.status(400).json({ message: 'Invalid payment method' });
    }

    if (paymentMethod.requires_redirect) {
      // For redirect-based payments (Pesapal, Stripe, etc.)
      // This would be implemented with the actual payment gateway
      const paymentReference = `DEP_${Date.now()}_${user_id}`;
      
      // Create a pending transaction
      await Transaction.create({
        user_id,
        type: 'deposit',
        amount,
        balance_before: req.user.wallet_balance,
        balance_after: req.user.wallet_balance,
        status: 'pending',
        description: `Deposit via ${paymentMethod.name}`,
        transaction_reference: paymentReference
      }, { transaction });

      await transaction.commit();

      // In a real implementation, you would generate a payment URL here
      // For now, we'll simulate it
      res.json({
        requires_redirect: true,
        payment_url: `https://payment-gateway.com/checkout?ref=${paymentReference}&amount=${amount}`,
        message: 'Redirect to payment gateway'
      });
    } else {
      // For instant payment methods (simulated for now)
      const newBalance = parseFloat(req.user.wallet_balance) + parseFloat(amount);
      
      // Update user balance
      await User.update(
        { wallet_balance: newBalance },
        { where: { id: user_id }, transaction }
      );

      // Record the transaction
      await Transaction.create({
        user_id,
        type: 'deposit',
        amount,
        balance_before: req.user.wallet_balance,
        balance_after: newBalance,
        status: 'completed',
        description: `Deposit via ${paymentMethod.name}`
      }, { transaction });

      await transaction.commit();

      res.json({
        requires_redirect: false,
        success: true,
        new_balance: newBalance,
        message: 'Deposit completed successfully'
      });
    }

  } catch (error) {
    if (transaction && !transaction.finished) {
      await transaction.rollback();
    }
    next(error);
  }
};

const getTransactions = async (req, res, next) => {
  try {
    const user_id = req.user.id;
    const { page = 1, limit = 20, type } = req.query;
    const offset = (page - 1) * limit;

    const whereClause = { user_id };
    if (type) {
      whereClause.type = type;
    }

    const transactions = await Transaction.findAll({
      where: whereClause,
      order: [['created_at', 'DESC']],
      limit: parseInt(limit),
      offset: offset,
      attributes: ['id', 'type', 'amount', 'status', 'description', 'created_at']
    });

    const totalCount = await Transaction.count({ where: whereClause });

    res.json({
      transactions,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: totalCount,
        pages: Math.ceil(totalCount / limit)
      }
    });
  } catch (error) {
    next(error);
  }
};


module.exports = {
  getPaymentMethods,
  initiateDeposit,
  getTransactions
};