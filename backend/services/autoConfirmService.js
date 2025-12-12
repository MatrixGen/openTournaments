const { Match, TournamentParticipant, User, Tournament } = require('../models');
const sequelize = require('../config/database');
const NotificationService = require('./notificationService');
const { Op } = require('sequelize');

class AutoConfirmService {
  constructor() {
    this.scheduledJobs = new Map();
  }

  // Convert Date or number into delay (ms)
  static toDelayMs(timeOrDelay) {
    if (typeof timeOrDelay === 'number') return timeOrDelay;
    const diff = new Date(timeOrDelay).getTime() - Date.now();
    return diff > 0 ? diff : 0;
  }

  // Schedule warning notification
  scheduleWarningNotification(matchId, timeOrDelay) {
    const delayMs = AutoConfirmService.toDelayMs(timeOrDelay);

    // Clear existing job if any
    if (this.scheduledJobs.has(`warning_${matchId}`)) {
      clearTimeout(this.scheduledJobs.get(`warning_${matchId}`));
    }

    const job = setTimeout(async () => {
      await this.sendWarningNotification(matchId);
    }, delayMs);

    this.scheduledJobs.set(`warning_${matchId}`, job);
  }

  // Schedule auto-confirmation
  scheduleAutoConfirmation(matchId, timeOrDelay) {
    const delayMs = AutoConfirmService.toDelayMs(timeOrDelay);

    // Clear existing job if any
    if (this.scheduledJobs.has(`confirm_${matchId}`)) {
      clearTimeout(this.scheduledJobs.get(`confirm_${matchId}`));
    }

    const job = setTimeout(async () => {
      await this.autoConfirmMatch(matchId);
    }, delayMs);

    this.scheduledJobs.set(`confirm_${matchId}`, job);
  }

  // Send warning notification
  async sendWarningNotification(matchId) {
    let transaction;
    try {
      transaction = await sequelize.transaction();

      const match = await Match.findByPk(matchId, {
        include: [
          {
            model: TournamentParticipant,
            as: 'participant1',
            include: [{ model: User, as: 'user' }]
          },
          {
            model: TournamentParticipant,
            as: 'participant2',
            include: [{ model: User, as: 'user' }]
          },
          {
            model: Tournament,
            as: 'tournament'
          }
        ],
        transaction
      });

      if (!match || match.status !== 'awaiting_confirmation') {
        await transaction.rollback();
        return;
      }

      // Identify opponent
      const opponent =
        match.reported_by_user_id === match.participant1.user.id
          ? match.participant2.user
          : match.participant1.user;

      if (!opponent) {
        await transaction.rollback();
        return;
      }

      await NotificationService.createNotification(
        opponent.id,
        'Score Confirmation Reminder',
        `Your opponent reported a score for your match in "${match.tournament.name}". You have 5 minutes to confirm or dispute the result before it's automatically confirmed.`,
        'warning',
        'match',
        matchId
      );

      await match.update({ warning_sent_at: new Date() }, { transaction });
      await transaction.commit();

      console.log(`⚠️ Warning notification sent for match ${matchId}`);
    } catch (error) {
      if (transaction && !transaction.finished) await transaction.rollback();
      console.error('Error sending warning notification:', error);
    }
  }

  // Automatically confirm match
  async autoConfirmMatch(matchId) {
    let transaction;
    try {
      transaction = await sequelize.transaction();

      const match = await Match.findByPk(matchId, {
        include: [
          {
            model: TournamentParticipant,
            as: 'participant1',
            include: [{ model: User, as: 'user' }]
          },
          {
            model: TournamentParticipant,
            as: 'participant2',
            include: [{ model: User, as: 'user' }]
          },
          {
            model: Tournament,
            as: 'tournament'
          }
        ],
        transaction
      });

      if (!match || match.status !== 'awaiting_confirmation') {
        await transaction.rollback();
        return;
      }

      let winner_id = null;
      if (match.participant1_score > match.participant2_score)
        winner_id = match.participant1_id;
      else if (match.participant1_score < match.participant2_score)
        winner_id = match.participant2_id;
      else {
        await transaction.rollback();
        return; // tie not auto-confirmed
      }

      await match.update(
        {
          status: 'completed',
          confirmed_at: new Date(),
          winner_id,
          auto_confirm_at: null
        },
        { transaction }
      );

      const participants = [match.participant1.user, match.participant2.user];
      for (const participant of participants) {
        await NotificationService.createNotification(
          participant.id,
          'Score Auto-Confirmed',
          `The score for your match in "${match.tournament.name}" has been automatically confirmed because no action was taken by the opponent.`,
          'info',
          'match',
          matchId
        );
      }

      // Advance next round
      const { advanceWinnerToNextRound, advanceDoubleEliminationMatch } = require('./bracketService');
      
      const tournament = match.tournament;
      
      if (tournament.format === 'single_elimination' || tournament.format === 'round_robin') {
        // Use the deterministic winner advancement function
        await advanceWinnerToNextRound(match, winner_id, transaction);
      } else if (tournament.format === 'double_elimination') {
        await advanceDoubleEliminationMatch(match, winner_id, transaction);
      }

      await transaction.commit();

      console.log(`✅ Match ${matchId} auto-confirmed`);

      this.scheduledJobs.delete(`warning_${matchId}`);
      this.scheduledJobs.delete(`confirm_${matchId}`);
    } catch (error) {
      if (transaction && !transaction.finished) await transaction.rollback();
      console.error('Error auto-confirming match:', error);
    }
  }

  cancelScheduledJobs(matchId) {
    const warningJob = this.scheduledJobs.get(`warning_${matchId}`);
    const confirmJob = this.scheduledJobs.get(`confirm_${matchId}`);

    if (warningJob) {
      clearTimeout(warningJob);
      this.scheduledJobs.delete(`warning_${matchId}`);
    }
    if (confirmJob) {
      clearTimeout(confirmJob);
      this.scheduledJobs.delete(`confirm_${matchId}`);
    }
  }

  async restoreScheduledJobs() {
    try {
      const pendingMatches = await Match.findAll({
        where: {
          status: 'awaiting_confirmation',
          auto_confirm_at: { [Op.ne]: null }
        }
      });

      for (const match of pendingMatches) {
        const timeUntilAutoConfirm = new Date(match.auto_confirm_at) - Date.now();
        if (timeUntilAutoConfirm > 0) {
          this.scheduleAutoConfirmation(match.id, timeUntilAutoConfirm);
          const warningTime = timeUntilAutoConfirm - 5 * 60 * 1000;
          if (warningTime > 0 && !match.warning_sent_at)
            this.scheduleWarningNotification(match.id, warningTime);
        } else {
          await this.autoConfirmMatch(match.id);
        }
      }
    } catch (error) {
      console.error('Error restoring scheduled jobs:', error);
    }
  }
}

module.exports = new AutoConfirmService();