const { Match, Tournament, TournamentParticipant, User } = require('../models');
const sequelize = require('../config/database');
const NotificationService = require('./notificationService');
const matchHandshakeStore = require('./matchHandshakeStore');
const { acquireLock, releaseLock } = require('./redisLock');
const {
  advanceWinnerToNextRound,
  advanceDoubleEliminationMatch,
  advanceBestOfThreeSeries
} = require('./bracketService');
const { Op } = require('sequelize');

const LOCK_TTL_MS = 60 * 1000;

const getEnvNumber = (key, fallback) => {
  const value = Number(process.env[key]);
  return Number.isFinite(value) ? value : fallback;
};

const SCHEDULED_NO_SHOW_HOURS = getEnvNumber('SCHEDULED_NO_SHOW_HOURS', 2);
const LIVE_REPORT_WINDOW_MINUTES = getEnvNumber('LIVE_REPORT_WINDOW_MINUTES', 60);
const DEADLINE_SCAN_INTERVAL_SECONDS = getEnvNumber('DEADLINE_SCAN_INTERVAL_SECONDS', 60);

const isAfter = (date, cutoff) => date && date.getTime() <= cutoff;

const getParticipantUsers = async (match, transaction) => {
  const [participant1, participant2] = await Promise.all([
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
  ]);

  return {
    participant1,
    participant2,
    participant1UserId: participant1?.user?.id || null,
    participant2UserId: participant2?.user?.id || null,
  };
};

const determineScheduledOutcome = (snapshot, participant1, participant2) => {
  if (!participant1 || !participant2) {
    return { outcome: 'no_contest' };
  }

  const p1Ready = snapshot.participant1.isReady;
  const p2Ready = snapshot.participant2.isReady;
  const p1Active = snapshot.participant1.isActiveConfirmed;
  const p2Active = snapshot.participant2.isActiveConfirmed;

  if (!p1Ready && !p2Ready) {
    return { outcome: 'no_contest' };
  }

  if (p1Ready && !p2Ready) {
    return {
      outcome: 'forfeit',
      winnerParticipantId: participant1.id,
      forfeitParticipantId: participant2.id,
      forfeitUserId: participant2.user?.id || null,
    };
  }

  if (p2Ready && !p1Ready) {
    return {
      outcome: 'forfeit',
      winnerParticipantId: participant2.id,
      forfeitParticipantId: participant1.id,
      forfeitUserId: participant1.user?.id || null,
    };
  }

  if (p1Ready && p2Ready) {
    if (p1Active && !p2Active) {
      return {
        outcome: 'forfeit',
        winnerParticipantId: participant1.id,
        forfeitParticipantId: participant2.id,
        forfeitUserId: participant2.user?.id || null,
      };
    }

    if (p2Active && !p1Active) {
      return {
        outcome: 'forfeit',
        winnerParticipantId: participant2.id,
        forfeitParticipantId: participant1.id,
        forfeitUserId: participant1.user?.id || null,
      };
    }
  }

  return { outcome: 'no_contest' };
};

const determineLiveOutcome = (snapshot, participant1, participant2) => {
  if (!participant1 || !participant2) {
    return { outcome: 'no_contest' };
  }

  const p1Active = snapshot.participant1.isActiveConfirmed;
  const p2Active = snapshot.participant2.isActiveConfirmed;

  if (p1Active && !p2Active) {
    return {
      outcome: 'forfeit',
      winnerParticipantId: participant1.id,
      forfeitParticipantId: participant2.id,
      forfeitUserId: participant2.user?.id || null,
    };
  }

  if (p2Active && !p1Active) {
    return {
      outcome: 'forfeit',
      winnerParticipantId: participant2.id,
      forfeitParticipantId: participant1.id,
      forfeitUserId: participant1.user?.id || null,
    };
  }

  return { outcome: 'no_contest' };
};

const notifyScheduledOutcome = async (matchId, tournamentName, winnerUserId, loserUserId) => {
  if (winnerUserId) {
    await NotificationService.createNotification(
      winnerUserId,
      'Match Forfeited',
      `Your opponent did not show up for the match in "${tournamentName}". You win by forfeit.`,
      'match',
      'match',
      matchId
    );
  }

  if (loserUserId) {
    await NotificationService.createNotification(
      loserUserId,
      'Match Forfeited',
      `You forfeited the match in "${tournamentName}" for not being ready/active before the deadline.`,
      'match',
      'match',
      matchId
    );
  }
};

const notifyNoContest = async (matchId, tournamentName, userIds, reason) => {
  const message =
    reason === 'timeout_live_no_score'
      ? `The match in "${tournamentName}" timed out without a score report and was marked no contest.`
      : `The match in "${tournamentName}" was marked no contest due to a no-show.`;

  for (const userId of userIds) {
    await NotificationService.createNotification(
      userId,
      'Match No Contest',
      message,
      'match',
      'match',
      matchId
    );
  }
};

class MatchDeadlineService {
  constructor() {
    this.workerHandle = null;
    this.isScanning = false;
  }

  startDeadlineWorker() {
    if (this.workerHandle) return;

    console.log(
      `[DeadlineWorker] Starting with interval ${DEADLINE_SCAN_INTERVAL_SECONDS}s`
    );
    this.workerHandle = setInterval(
      () => this.scanAndResolveExpiredMatches(),
      DEADLINE_SCAN_INTERVAL_SECONDS * 1000
    );
    this.scanAndResolveExpiredMatches();
  }

  async scanAndResolveExpiredMatches() {
    if (this.isScanning) return;
    this.isScanning = true;

    try {
      await this.scanScheduledNoShowMatches();
      await this.scanLiveNoScoreMatches();
    } catch (error) {
      console.error('[DeadlineWorker] Scan error:', error?.message || error);
    } finally {
      this.isScanning = false;
    }
  }

  async scanScheduledNoShowMatches() {
    const cutoff = Date.now() - SCHEDULED_NO_SHOW_HOURS * 60 * 60 * 1000;

    const candidates = await Match.findAll({
      where: {
        status: 'scheduled',
        resolved_at: null,
      },
      include: [
        {
          model: Tournament,
          as: 'tournament',
          attributes: ['id', 'start_time', 'format', 'name'],
          where: {
            start_time: { [Op.lte]: new Date(cutoff) },
          },
          required: true,
        },
      ],
      attributes: ['id', 'tournament_id', 'participant1_id', 'participant2_id', 'status', 'resolved_at'],
    });

    for (const match of candidates) {
      await this.resolveScheduledNoShowMatch(match.id);
    }
  }

  async scanLiveNoScoreMatches() {
    const cutoff = Date.now() - LIVE_REPORT_WINDOW_MINUTES * 60 * 1000;

    const candidates = await Match.findAll({
      where: {
        status: 'live',
        resolved_at: null,
        live_at: {
          [Op.ne]: null,
          [Op.lte]: new Date(cutoff),
        },
      },
      attributes: ['id', 'tournament_id', 'participant1_id', 'participant2_id', 'status', 'resolved_at', 'live_at'],
    });

    for (const match of candidates) {
      await this.resolveLiveNoScoreMatch(match.id);
    }
  }

  async resolveScheduledNoShowMatch(matchId) {
    const lockKey = `lock:match:resolve:${matchId}`;
    const lockToken = await acquireLock(lockKey, LOCK_TTL_MS);
    if (!lockToken) return;

    try {
      console.log(`[DeadlineWorker] Resolving scheduled no-show match ${matchId}`);
      const transaction = await sequelize.transaction();

      try {
        const match = await Match.findByPk(matchId, {
          transaction,
          lock: transaction.LOCK.UPDATE,
        });

        if (!match || match.resolved_at || match.status !== 'scheduled') {
          await transaction.rollback();
          return;
        }

        const tournament = await Tournament.findByPk(match.tournament_id, {
          transaction,
          attributes: ['id', 'starts_at', 'format', 'name'],
        });

        if (!tournament || !tournament.start_time) {
          await transaction.rollback();
          return;
        }

        const cutoff = Date.now() - SCHEDULED_NO_SHOW_HOURS * 60 * 60 * 1000;
        if (!isAfter(tournament.start_time, cutoff)) {
          await transaction.rollback();
          return;
        }

        const participants = await getParticipantUsers(match, transaction);
        const handshakeSnapshot = await matchHandshakeStore.getHandshakeSnapshot(
          match.id,
          participants.participant1UserId,
          participants.participant2UserId
        );

        const outcome = determineScheduledOutcome(
          handshakeSnapshot,
          participants.participant1,
          participants.participant2
        );

        const resolvedAt = new Date();
        let winnerParticipantId = null;
        let forfeitUserId = null;
        let forfeitParticipantId = null;

        if (outcome.outcome === 'forfeit') {
          winnerParticipantId = outcome.winnerParticipantId;
          forfeitUserId = outcome.forfeitUserId;
          forfeitParticipantId = outcome.forfeitParticipantId;

          await Match.update(
            {
              status: 'forfeited',
              winner_id: winnerParticipantId,
              resolved_reason: 'timeout_scheduled_no_show',
              resolved_at: resolvedAt,
              resolved_by: 'system',
              forfeit_user_id: forfeitUserId,
              forfeit_participant_id: forfeitParticipantId,
            },
            { where: { id: matchId }, transaction }
          );

          if (tournament.format === 'single_elimination' || tournament.format === 'round_robin') {
            await advanceWinnerToNextRound(match, winnerParticipantId, transaction);
          } else if (tournament.format === 'double_elimination') {
            await advanceDoubleEliminationMatch(match, winnerParticipantId, transaction);
          } else if (tournament.format === 'best_of_three') {
            await advanceBestOfThreeSeries(match, winnerParticipantId, transaction);
          }
        } else {
          await Match.update(
            {
              status: 'no_contest',
              resolved_reason: 'timeout_scheduled_no_show',
              resolved_at: resolvedAt,
              resolved_by: 'system',
              forfeit_user_id: null,
              forfeit_participant_id: null,
            },
            { where: { id: matchId }, transaction }
          );
        }

        await transaction.commit();

        const tournamentName = tournament.name || 'a tournament';
        const participantUserIds = [
          participants.participant1UserId,
          participants.participant2UserId,
        ].filter(Boolean);

        if (outcome.outcome === 'forfeit') {
          const winnerUserId =
            forfeitParticipantId === participants.participant1?.id
              ? participants.participant2UserId
              : participants.participant1UserId;
          await notifyScheduledOutcome(matchId, tournamentName, winnerUserId, forfeitUserId);
        } else {
          await notifyNoContest(matchId, tournamentName, participantUserIds, 'timeout_scheduled_no_show');
        }

        console.log(
          `[DeadlineWorker] Scheduled match ${matchId} resolved: ${outcome.outcome}`
        );
      } catch (error) {
        await transaction.rollback();
        console.error(
          `[DeadlineWorker] Scheduled match ${matchId} resolve error:`,
          error?.message || error
        );
      }
    } finally {
      await releaseLock(lockKey, lockToken);
    }
  }

  async resolveLiveNoScoreMatch(matchId) {
    const lockKey = `lock:match:resolve:${matchId}`;
    const lockToken = await acquireLock(lockKey, LOCK_TTL_MS);
    if (!lockToken) return;

    try {
      console.log(`[DeadlineWorker] Resolving live no-score match ${matchId}`);
      const transaction = await sequelize.transaction();

      try {
        const match = await Match.findByPk(matchId, {
          transaction,
          lock: transaction.LOCK.UPDATE,
        });

        if (!match || match.resolved_at || match.status !== 'live') {
          await transaction.rollback();
          return;
        }

        if (!match.live_at) {
          console.warn(`[DeadlineWorker] Match ${matchId} live_at missing, skipping.`);
          await transaction.rollback();
          return;
        }

        const cutoff = Date.now() - LIVE_REPORT_WINDOW_MINUTES * 60 * 1000;
        if (!isAfter(match.live_at, cutoff)) {
          await transaction.rollback();
          return;
        }

        const tournament = await Tournament.findByPk(match.tournament_id, {
          transaction,
          attributes: ['id', 'format', 'name'],
        });

        const participants = await getParticipantUsers(match, transaction);
        const handshakeSnapshot = await matchHandshakeStore.getHandshakeSnapshot(
          match.id,
          participants.participant1UserId,
          participants.participant2UserId
        );

        const outcome = determineLiveOutcome(
          handshakeSnapshot,
          participants.participant1,
          participants.participant2
        );

        const resolvedAt = new Date();
        let forfeitUserId = null;
        let forfeitParticipantId = null;

        if (outcome.outcome === 'forfeit') {
          forfeitUserId = outcome.forfeitUserId;
          forfeitParticipantId = outcome.forfeitParticipantId;

          await Match.update(
            {
              status: 'forfeited',
              winner_id: outcome.winnerParticipantId,
              resolved_reason: 'timeout_live_no_score',
              resolved_at: resolvedAt,
              resolved_by: 'system',
              forfeit_user_id: forfeitUserId,
              forfeit_participant_id: forfeitParticipantId,
            },
            { where: { id: matchId }, transaction }
          );

          if (tournament?.format === 'single_elimination' || tournament?.format === 'round_robin') {
            await advanceWinnerToNextRound(match, outcome.winnerParticipantId, transaction);
          } else if (tournament?.format === 'double_elimination') {
            await advanceDoubleEliminationMatch(match, outcome.winnerParticipantId, transaction);
          } else if (tournament?.format === 'best_of_three') {
            await advanceBestOfThreeSeries(match, outcome.winnerParticipantId, transaction);
          }
        } else {
          await Match.update(
            {
              status: 'no_contest',
              resolved_reason: 'timeout_live_no_score',
              resolved_at: resolvedAt,
              resolved_by: 'system',
              forfeit_user_id: null,
              forfeit_participant_id: null,
            },
            { where: { id: matchId }, transaction }
          );
        }

        await transaction.commit();

        const tournamentName = tournament?.name || 'a tournament';
        const participantUserIds = [
          participants.participant1UserId,
          participants.participant2UserId,
        ].filter(Boolean);

        if (outcome.outcome === 'forfeit') {
          const winnerUserId =
            forfeitParticipantId === participants.participant1?.id
              ? participants.participant2UserId
              : participants.participant1UserId;

          await NotificationService.createNotification(
            winnerUserId,
            'Match Forfeited',
            `Your opponent did not report a score in time for "${tournamentName}". You win by forfeit.`,
            'match',
            'match',
            matchId
          );
          if (forfeitUserId) {
            await NotificationService.createNotification(
              forfeitUserId,
              'Match Forfeited',
              `You forfeited the match in "${tournamentName}" for not reporting a score in time.`,
              'match',
              'match',
              matchId
            );
          }
        } else {
          await notifyNoContest(matchId, tournamentName, participantUserIds, 'timeout_live_no_score');
        }

        console.log(
          `[DeadlineWorker] Live match ${matchId} resolved: ${outcome.outcome}`
        );
      } catch (error) {
        await transaction.rollback();
        console.error(
          `[DeadlineWorker] Live match ${matchId} resolve error:`,
          error?.message || error
        );
      }
    } finally {
      await releaseLock(lockKey, lockToken);
    }
  }
}

module.exports = new MatchDeadlineService();
