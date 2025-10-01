// controllers/PaymentController.js

const { sequelize, User, Transaction, Tournament, PaymentRecord } = require('../models');
const ClickPesaService = require('../services/clickPesaService');
const { Op } = require('sequelize');

class PaymentController {
    /**
     * 1. Initiate payment for tournament entry
     */
    static async initiatePayment(req, res) {
        const t = await sequelize.transaction();
        try {
            const { tournamentId } = req.body;
            const userId = req.user.id;

            const user = await User.findByPk(userId, { transaction: t });
            if (!user) throw new Error('User not found');

            const tournament = await Tournament.findByPk(tournamentId, { transaction: t });
            if (!tournament) throw new Error('Tournament not found');

            const entryFee = tournament.entry_fee;
            if (user.wallet_balance < entryFee) throw new Error('Insufficient wallet balance');

            // Create ClickPesa transaction request
            const paymentPayload = {
                amount: entryFee,
                currency: 'TZS',
                reference: `TOURN-${tournamentId}-${Date.now()}`,
                customer_email: user.email,
                customer_name: `${user.first_name} ${user.last_name}`,
                metadata: { userId, tournamentId }
            };

            const clickpesaResponse = await ClickPesaService.initiatePayment(paymentPayload);
            if (!clickpesaResponse?.id) throw new Error('ClickPesa initiation failed');

            // Record transaction (wallet balance stays the same until webhook confirms)
            await Transaction.create({
                user_id: userId,
                type: 'payment',
                amount: entryFee,
                balance_before: user.wallet_balance,
                balance_after: user.wallet_balance,
                status: 'pending',
                payment_reference: clickpesaResponse.id,
                gateway_type: 'clickpesa',
                gateway_status: clickpesaResponse.status,
                metadata: JSON.stringify(paymentPayload)
            }, { transaction: t });

            await PaymentRecord.create({
                user_id: userId,
                tournament_id: tournamentId,
                payment_reference: clickpesaResponse.id,
                status: 'initiated',
                metadata: JSON.stringify(clickpesaResponse)
            }, { transaction: t });

            await t.commit();
            res.json({
                success: true,
                message: 'ClickPesa payment initiated',
                data: clickpesaResponse
            });

        } catch (err) {
            await t.rollback();
            res.status(400).json({ success: false, error: err.message });
        }
    }

    /**
     * 2. Handle webhook from ClickPesa
     */
    static async handleWebhook(req, res) {
        try {
            const signature = req.headers['x-clickpesa-signature'];
            const payload = req.body;

            if (!ClickPesaService.verifyWebhookSignature(payload, signature)) {
                return res.status(401).json({ success: false, error: 'Invalid webhook signature' });
            }

            const { id, status, metadata } = payload;
            const { userId, tournamentId } = metadata;

            const paymentRecord = await PaymentRecord.findOne({ where: { payment_reference: id } });
            if (!paymentRecord) {
                return res.status(404).json({ success: false, error: 'Payment record not found' });
            }

            await sequelize.transaction(async (t) => {
                await paymentRecord.update({ status, metadata: JSON.stringify(payload) }, { transaction: t });

                const transaction = await Transaction.findOne({ where: { payment_reference: id }, transaction: t });
                if (!transaction) throw new Error('Transaction not found');

                if (status === 'successful') {
                    const user = await User.findByPk(userId, { transaction: t });
                    const tournament = await Tournament.findByPk(tournamentId, { transaction: t });

                    if (!user || !tournament) throw new Error('User or Tournament not found');

                    // Deduct entry fee only now (safe, avoids double subtraction)
                    const newBalance = user.wallet_balance - tournament.entry_fee;

                    await user.update({ wallet_balance: newBalance }, { transaction: t });
                    await transaction.update({
                        status: 'successful',
                        balance_after: newBalance,
                        gateway_status: status
                    }, { transaction: t });
                } else if (status === 'failed') {
                    await transaction.update({ status: 'failed', gateway_status: status }, { transaction: t });
                }
            });

            res.json({ success: true, message: 'Webhook processed' });

        } catch (err) {
            res.status(500).json({ success: false, error: err.message });
        }
    }

    /**
     * 3. Disburse tournament prize
     */
    static async disbursePrize(req, res) {
        const t = await sequelize.transaction();
        try {
            const { tournamentId, winnerId, amount } = req.body;

            const winner = await User.findByPk(winnerId, { transaction: t });
            if (!winner) throw new Error('Winner not found');

            const disbursement = await ClickPesaService.disburseFunds({
                amount,
                currency: 'TZS',
                reference: `PRIZE-${tournamentId}-${winnerId}-${Date.now()}`,
                recipient_name: `${winner.first_name} ${winner.last_name}`,
                recipient_account: winner.phone_number
            });

            if (!disbursement?.id) throw new Error('ClickPesa disbursement failed');

            await Transaction.create({
                user_id: winnerId,
                type: 'prize',
                amount,
                balance_before: winner.wallet_balance,
                balance_after: winner.wallet_balance + amount,
                status: 'successful',
                payment_reference: disbursement.id,
                gateway_type: 'clickpesa',
                gateway_status: disbursement.status,
                metadata: JSON.stringify(disbursement)
            }, { transaction: t });

            await winner.update({ wallet_balance: winner.wallet_balance + amount }, { transaction: t });

            await t.commit();
            res.json({
                success: true,
                message: 'Prize disbursed successfully',
                data: disbursement
            });

        } catch (err) {
            await t.rollback();
            res.status(400).json({ success: false, error: err.message });
        }
    }

    /**
     * 4. Check payment status
     */
    static async checkPaymentStatus(req, res) {
        try {
            const { paymentId } = req.params;
            const status = await ClickPesaService.checkPaymentStatus(paymentId);

            res.json({ success: true, data: status });
        } catch (err) {
            res.status(400).json({ success: false, error: err.message });
        }
    }
}

module.exports = PaymentController;
