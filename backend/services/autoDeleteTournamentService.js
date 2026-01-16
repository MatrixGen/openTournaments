// services/autoDeleteTournamentService.js

const { Tournament, TournamentParticipant, User } = require('../models');
const sequelize = require('../config/database');
const NotificationService = require('./notificationService');
const { Op } = require('sequelize');
const PaymentController = require('../controllers/paymentController');
const WalletService = require('./walletService');
const CurrencyUtils = require('../utils/currencyUtils');
const { WalletError } = require('../errors/WalletError');

class AutoDeleteTournamentService {
  constructor() {
    this.scheduledJobs = new Map();
  }

  // Convert Date or number into delay (ms)
  static toDelayMs(timeOrDelay) {
    if (typeof timeOrDelay === 'number') return timeOrDelay;
    const diff = new Date(timeOrDelay).getTime() - Date.now();
    return diff > 0 ? diff : 0;
  }

  // Schedule an automatic deletion at a given time
  scheduleAutoDelete(tournamentId, timeOrDelay) {
    const delayMs = AutoDeleteTournamentService.toDelayMs(timeOrDelay);

    // Clear old job if it exists
    if (this.scheduledJobs.has(tournamentId)) {
      clearTimeout(this.scheduledJobs.get(tournamentId));
    }

    const job = setTimeout(async () => {
      await this.autoDeleteTournament(tournamentId);
    }, delayMs);

    this.scheduledJobs.set(tournamentId, job);
  }

  // Automatically delete tournament if open and past start time
  async autoDeleteTournament(tournamentId) {
    let transaction;
    try {
      transaction = await sequelize.transaction();

      const tournament = await Tournament.findByPk(tournamentId, {
        include: [{
          model: TournamentParticipant,
          as: 'participants',
          include: [{ model: User, as: 'user' }]
        }],
        transaction
      });

      if (!tournament) {
        await transaction.rollback();
        return;
      }

      if (tournament.status !== 'open') {
        await transaction.rollback();
        return; // Only delete open tournaments
      }

      const now = new Date();
      const startTime = new Date(tournament.start_time || tournament.start_date);
      if (startTime > now) {
        await transaction.rollback();
        return; // Not yet time to delete
      }

      const notifications = [];

      const tournamentCurrency = tournament.currency?.trim().toUpperCase();
      if (!tournamentCurrency) {
        throw new WalletError('MISSING_CURRENCY', 'Tournament currency is missing');
      }
      if (!CurrencyUtils.isValidCurrency(tournamentCurrency)) {
        throw new WalletError('INVALID_CURRENCY', `Unsupported currency: ${tournamentCurrency}`);
      }

      // Refund participants
      for (const participant of tournament.participants) {
        const user = participant.user;
        if (!user) continue;

        const entryFee = parseFloat(tournament.entry_fee || 0);
        const orderRef = PaymentController.generateOrderReference('TOURN');

        if (entryFee > 0) {
          await WalletService.credit({
            userId: user.id,
            amount: entryFee,
            currency: tournamentCurrency,
            type: 'tournament_refund',
            reference: orderRef,
            description: `Refund for auto-deleted tournament: ${tournament.name}`,
            tournamentId: tournament.id,
            transaction,
          });
        }

        notifications.push({
          user_id: user.id,
          title: 'Tournament Cancelled Automatically',
          message: entryFee > 0
            ? `The tournament "${tournament.name}" has been cancelled automatically because its start time has passed while it was still open. Your entry fee of ${entryFee} has been refunded.`
            : `The tournament "${tournament.name}" has been cancelled automatically because its start time has passed while it was still open.`,
          type: 'tournament',
          relatedEntity: { model: Tournament, id: tournament.id },
        });
      }

      // Delete the tournament
      await Tournament.destroy({ where: { id: tournament.id }, transaction });

      await transaction.commit();

      // Send notifications (outside transaction)
      for (const notif of notifications) {
        await NotificationService.createNotification({
          userId: notif.user_id,
          title: notif.title,
          message: notif.message,
          type: notif.type,
          relatedEntity: notif.relatedEntity,
        });
      }

      console.log(`🗑️ Tournament ${tournament.id} deleted automatically.`);
      this.scheduledJobs.delete(tournament.id);

    } catch (error) {
      if (transaction && !transaction.finished) await transaction.rollback();
      console.error('Error auto-deleting tournament:', error);
    }
  }

  // Cancel scheduled deletion if tournament is closed manually
  cancelScheduledJob(tournamentId) {
    const job = this.scheduledJobs.get(tournamentId);
    if (job) {
      clearTimeout(job);
      this.scheduledJobs.delete(tournamentId);
    }
  }

  // Restore scheduled jobs (after server restart)
  async restoreScheduledJobs() {
    try {
      const openTournaments = await Tournament.findAll({
        where: {
          status: 'open',
          start_time: { [Op.ne]: null }
        }
      });

      for (const tournament of openTournaments) {
        const startTime = new Date(tournament.start_time);
        const delay = startTime - Date.now();

        if (delay <= 0) {
          // Already past time, delete now
          await this.autoDeleteTournament(tournament.id);
        } else {
          // Schedule for future
          this.scheduleAutoDelete(tournament.id, delay);
        }
      }

      console.log(`✅ Auto-delete jobs restored for ${openTournaments.length} tournaments.`);
    } catch (error) {
      console.error('Error restoring auto-delete jobs:', error);
    }
  }
}

module.exports = new AutoDeleteTournamentService();
