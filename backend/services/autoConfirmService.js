// services/autoConfirmService.js — safer + idempotent
// Goals:
// - NO duplicate warning/auto-confirm on restarts
// - Safe in crash loops / multi-instance (best-effort without Redis locks)
// - Avoids crashing if a user is missing (NotificationService should still be defensive)
// - Uses atomic/conditional DB updates to ensure "only once" execution

const { Match, TournamentParticipant, User, Tournament } = require('../models');
const sequelize = require('../config/database');
const NotificationService = require('./notificationService');
const { Op } = require('sequelize');

class AutoConfirmService {
  constructor() {
    this.scheduledJobs = new Map(); // key -> timeout handle
  }

  /* =========================
     Time helpers
     ========================= */

  static toDelayMs(timeOrDelay) {
    if (typeof timeOrDelay === 'number') return Math.max(0, timeOrDelay);
    const diff = new Date(timeOrDelay).getTime() - Date.now();
    return diff > 0 ? diff : 0;
  }

  _setJob(key, fn, delayMs) {
    // Clear existing
    const prev = this.scheduledJobs.get(key);
    if (prev) clearTimeout(prev);

    const job = setTimeout(async () => {
      try {
        await fn();
      } catch (err) {
        console.error(`[AutoConfirm] job ${key} failed:`, err?.message || err);
      } finally {
        // Always cleanup when the timer fires
        this.scheduledJobs.delete(key);
      }
    }, delayMs);

    this.scheduledJobs.set(key, job);
  }

  /* =========================
     Scheduling API
     ========================= */

  scheduleWarningNotification(matchId, timeOrDelay) {
    const delayMs = AutoConfirmService.toDelayMs(timeOrDelay);
    this._setJob(`warning_${matchId}`, () => this.sendWarningNotification(matchId), delayMs);
  }

  scheduleAutoConfirmation(matchId, timeOrDelay) {
    const delayMs = AutoConfirmService.toDelayMs(timeOrDelay);
    this._setJob(`confirm_${matchId}`, () => this.autoConfirmMatch(matchId), delayMs);
  }

  cancelScheduledJobs(matchId) {
    for (const key of [`warning_${matchId}`, `confirm_${matchId}`]) {
      const job = this.scheduledJobs.get(key);
      if (job) clearTimeout(job);
      this.scheduledJobs.delete(key);
    }
  }

  /* =========================
     Core actions
     ========================= */

  /**
   * Idempotent: will send at most once (guarded by warning_sent_at conditional update)
   */
  async sendWarningNotification(matchId) {
    let transaction;
    try {
      transaction = await sequelize.transaction();

      // Atomic guard: only one caller can "claim" sending the warning.
      // If warning_sent_at already set OR match not awaiting_confirmation -> updatedCount = 0
      const now = new Date();
      const [updatedCount] = await Match.update(
        { warning_sent_at: now },
        {
          where: {
            id: matchId,
            status: 'awaiting_confirmation',
            warning_sent_at: null,
          },
          transaction,
        }
      );

      if (updatedCount === 0) {
        await transaction.rollback();
        return; // already sent or match moved on
      }

      // Load match after we have claimed the warning
      const match = await Match.findByPk(matchId, {
        include: [
          {
            model: TournamentParticipant,
            as: 'participant1',
            include: [{ model: User, as: 'user', attributes: ['id', 'username'] }],
          },
          {
            model: TournamentParticipant,
            as: 'participant2',
            include: [{ model: User, as: 'user', attributes: ['id', 'username'] }],
          },
          { model: Tournament, as: 'tournament', attributes: ['id', 'name'] },
        ],
        transaction,
        lock: transaction.LOCK.UPDATE, // avoid weird races while we are mid-tx
      });

      if (!match) {
        await transaction.rollback();
        return;
      }

      // Identify opponent: opponent is the non-reporter
      const p1UserId = match.participant1?.user?.id;
      const p2UserId = match.participant2?.user?.id;

      const opponentId =
        match.reported_by_user_id === p1UserId ? p2UserId :
        match.reported_by_user_id === p2UserId ? p1UserId :
        null;

      if (!opponentId) {
        // Can't determine opponent; keep warning_sent_at set to prevent loops
        await transaction.commit();
        return;
      }

      await transaction.commit();

      // Send notification outside transaction (avoid holding DB locks during external work)
      await NotificationService.createNotification({
        userId: opponentId,
        title: 'Score Confirmation Reminder',
        message: `Your opponent reported a score for your match in "${match.tournament?.name || 'a tournament'}". You have 5 minutes to confirm or dispute before it’s automatically confirmed.`,
        type: 'warning',
        relatedEntity: { model: Match, id: matchId },
      });

      console.log(`⚠️ Warning notification sent for match ${matchId}`);
    } catch (error) {
      if (transaction && !transaction.finished) await transaction.rollback();
      console.error('[AutoConfirm] sendWarningNotification error:', error?.message || error);
    }
  }

  /**
   * Idempotent: completes at most once (guarded by conditional update on status)
   */
  async autoConfirmMatch(matchId) {
    let transaction;
    try {
      transaction = await sequelize.transaction();

      // Lock only the match row; includes can create outer joins that Postgres won't lock.
      const match = await Match.findByPk(matchId, {
        transaction,
        lock: transaction.LOCK.UPDATE,
      });

      if (!match || match.status !== 'awaiting_confirmation') {
        await transaction.rollback();
        return;
      }

      // Optional: if auto_confirm_at exists and it's still in the future, don’t run early
      if (match.auto_confirm_at && new Date(match.auto_confirm_at).getTime() > Date.now()) {
        await transaction.rollback();
        return;
      }

      // Fetch related entities after the lock to avoid FOR UPDATE on outer joins
      const [participant1, participant2, tournament] = await Promise.all([
        match.participant1_id
          ? TournamentParticipant.findByPk(match.participant1_id, {
              transaction,
              include: [{ model: User, as: 'user', attributes: ['id', 'username'] }],
            })
          : null,
        match.participant2_id
          ? TournamentParticipant.findByPk(match.participant2_id, {
              transaction,
              include: [{ model: User, as: 'user', attributes: ['id', 'username'] }],
            })
          : null,
        Tournament.findByPk(match.tournament_id, {
          transaction,
          attributes: ['id', 'name', 'format'],
        }),
      ]);

      match.participant1 = participant1;
      match.participant2 = participant2;
      match.tournament = tournament;

      // Determine winner
      let winner_id = null;
      if (match.participant1_score > match.participant2_score) winner_id = match.participant1_id;
      else if (match.participant2_score > match.participant1_score) winner_id = match.participant2_id;
      else {
        // tie: do not auto-confirm
        await transaction.rollback();
        return;
      }

      // Conditional update for idempotency across instances:
      // only one process can flip awaiting_confirmation -> completed
      const [updatedCount] = await Match.update(
        {
          status: 'completed',
          confirmed_at: new Date(),
          winner_id,
          auto_confirm_at: null,
        },
        {
          where: { id: matchId, status: 'awaiting_confirmation' },
          transaction,
        }
      );

      if (updatedCount === 0) {
        await transaction.rollback();
        return;
      }

      // Advance bracket inside same transaction for consistency
      const { advanceWinnerToNextRound, advanceDoubleEliminationMatch, advanceBestOfThreeSeries } =
        require('./bracketService');

      const format = match.tournament?.format;

      if (format === 'single_elimination' || format === 'round_robin') {
        await advanceWinnerToNextRound(match, winner_id, transaction);
      } else if (format === 'double_elimination') {
        await advanceDoubleEliminationMatch(match, winner_id, transaction);
      } else if (format === 'best_of_three') {
        await advanceBestOfThreeSeries(match, winner_id, transaction);
      }

      await transaction.commit();

      // Send notifications AFTER commit (safe; DB state is final)
      const p1User = match.participant1?.user;
      const p2User = match.participant2?.user;
      const tournamentName = match.tournament?.name || 'a tournament';

      const recipients = [p1User?.id, p2User?.id].filter(Boolean);

      for (const userId of recipients) {
        await NotificationService.createNotification({
          userId,
          title: 'Score Auto-Confirmed',
          message: `The score for your match in "${tournamentName}" was automatically confirmed because no action was taken in time.`,
          type: 'info',
          relatedEntity: { model: Match, id: matchId },
        });
      }

      console.log(`✅ Match ${matchId} auto-confirmed`);

      // Cleanup timers for this match
      this.cancelScheduledJobs(matchId);
    } catch (error) {
      if (transaction && !transaction.finished) await transaction.rollback();
      console.error('[AutoConfirm] autoConfirmMatch error:', error?.message || error);
    }
  }

  /* =========================
     Restore jobs after restart
     ========================= */

  async restoreScheduledJobs() {
    try {
      const pendingMatches = await Match.findAll({
        where: {
          status: 'awaiting_confirmation',
          auto_confirm_at: { [Op.ne]: null },
        },
        attributes: ['id', 'auto_confirm_at', 'warning_sent_at', 'status'],
      });

      for (const match of pendingMatches) {
        const autoConfirmAtMs = new Date(match.auto_confirm_at).getTime();
        const nowMs = Date.now();

        // Auto-confirm
        const confirmDelay = autoConfirmAtMs - nowMs;
        if (confirmDelay > 0) {
          this.scheduleAutoConfirmation(match.id, confirmDelay);
        } else {
          // If overdue, run immediately (idempotent)
          await this.autoConfirmMatch(match.id);
          continue;
        }

        // Warning exactly 5 minutes before auto-confirm
        const warningAtMs = autoConfirmAtMs - 5 * 60 * 1000;
        const warningDelay = warningAtMs - nowMs;

        if (warningDelay > 0 && !match.warning_sent_at) {
          this.scheduleWarningNotification(match.id, warningDelay);
        }
      }
    } catch (error) {
      console.error('[AutoConfirm] restoreScheduledJobs error:', error?.message || error);
    }
  }
}

module.exports = new AutoConfirmService();
