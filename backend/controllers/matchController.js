const { Match, TournamentParticipant, Dispute, Tournament, User } = require('../models');
const { validationResult } = require('express-validator');
const sequelize = require('../config/database');
const { distributePrizes } = require('../services/prizeService');
const NotificationService = require('../services/notificationService');
const { advanceDoubleEliminationMatch, advanceWinnerToNextRound, advanceBestOfThreeSeries } = require('../services/bracketService');
const autoConfirmService = require('../services/autoConfirmService');
const { uploadSingle } = require('../middleware/uploadMiddleware');

const MAX_TIMEOUT = 2_147_483_647; // 32-bit signed int max

// In-memory store for match ready status (will reset on server restart)
// For production, you might want to use Redis or a database table
const matchReadyStatus = new Map(); // Map<matchId, Set<userId>>

// Ensure safe timeout
function safeDelay(ms) {
  if (ms > MAX_TIMEOUT) return MAX_TIMEOUT;
  if (ms < 0) return 0;
  return ms;
}

// Report score for a match
const reportScore = async (req, res, next) => {
  let transaction;
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { id } = req.params;
    const { player1_score, player2_score } = req.body;
    const user_id = req.user.id;

    transaction = await sequelize.transaction();

    // 1. Find match
    const match = await Match.findByPk(id, { transaction });
    if (!match) {
      await transaction.rollback();
      return res.status(404).json({ message: 'Match not found.' });
    }

    // 2. Verify participant
    const participant = await TournamentParticipant.findOne({
      where: { tournament_id: match.tournament_id, user_id },
      transaction,
    });
    if (!participant || (participant.id !== match.participant1_id && participant.id !== match.participant2_id)) {
      await transaction.rollback();
      return res.status(403).json({ message: 'You are not a participant of this match.' });
    }

    // 3. Check if match status is 'live' (both participants must have toggled ready)
    if (match.status !== 'live') {
      await transaction.rollback();
      
      // Check if both participants are ready (in our in-memory store)
      const readyUsers = matchReadyStatus.get(parseInt(id));
      if (!readyUsers || readyUsers.size < 2) {
        return res.status(400).json({ 
          message: 'Match is not live. Both participants must mark themselves as ready before reporting scores.',
          readyParticipants: readyUsers ? readyUsers.size : 0,
          required: 2
        });
      }
      
      // If we get here, both are ready in memory but match status isn't 'live'
      // This shouldn't happen, but just in case, update the match status
      await match.update({ status: 'live' }, { transaction });
    }

    // 4. Verify match allows score reporting (should be 'live' now)
    if (match.status !== 'live') {
      await transaction.rollback();
      return res.status(400).json({ message: 'Match is not in a state that allows score reporting.' });
    }

    // 5. Handle file upload
    const evidence_url = req.file ? `/uploads/${req.file.filename}` : null;

    // 6. Set auto-confirm and warning deadlines
    const now = new Date();
    const autoConfirmAt = new Date(now.getTime() + 15 * 60 * 1000); // 15 min
    const warningAt = new Date(now.getTime() + 10 * 60 * 1000);      // 10 min

    // 7. Update match
    await match.update({
      participant1_score: player1_score,
      participant2_score: player2_score,
      reported_by_user_id: user_id,
      reported_at: now,
      evidence_url,
      status: 'awaiting_confirmation',
      auto_confirm_at: autoConfirmAt,
      warning_sent_at: null,
    }, { transaction });

    // 8. Clear ready status from memory
    matchReadyStatus.delete(parseInt(id));

    await transaction.commit();

    // 9. Schedule warning & auto-confirm with safe delays
    const warningDelay = safeDelay(warningAt - Date.now());
    const confirmDelay = safeDelay(autoConfirmAt - Date.now());

    autoConfirmService.scheduleWarningNotification(match.id, warningDelay);
    autoConfirmService.scheduleAutoConfirmation(match.id, confirmDelay);

    // 10. Identify opponent
    const opponentId = match.participant1_id === participant.id
      ? (await TournamentParticipant.findByPk(match.participant2_id))?.user_id
      : (await TournamentParticipant.findByPk(match.participant1_id))?.user_id;

    // 11. Notify opponent
    if (opponentId) {
      await NotificationService.createNotification(
        opponentId,
        'Score Reported',
        'Your opponent has reported a score for your match. Please confirm or dispute the result.',
        'match',
        'match',
        match.id
      );
    }

    // 12. Respond
    res.json({
      message: 'Score reported successfully. Waiting for opponent confirmation.',
      match,
    });

  } catch (error) {
    if (transaction && !transaction.finished) await transaction.rollback();
    next(error);
  }
};

// Mark participant as ready for match
const markReady = async (req, res, next) => {
  try {
    const { id } = req.params;
    const user_id = req.user.id;

    // 1. Find match
    const match = await Match.findByPk(id);
    if (!match) {
      return res.status(404).json({ message: 'Match not found.' });
    }

    // 2. Verify participant
    const participant = await TournamentParticipant.findOne({
      where: { tournament_id: match.tournament_id, user_id },
    });
    
    if (!participant || (participant.id !== match.participant1_id && participant.id !== match.participant2_id)) {
      return res.status(403).json({ message: 'You are not a participant of this match.' });
    }

    // 3. Check if match is in a state that allows marking ready
    if (match.status !== 'scheduled' && match.status !== 'live') {
      return res.status(400).json({ 
        message: 'Cannot mark ready. Match status is: ' + match.status 
      });
    }

    // 4. Initialize or get the ready set for this match
    if (!matchReadyStatus.has(parseInt(id))) {
      matchReadyStatus.set(parseInt(id), new Set());
    }
    
    const readyUsers = matchReadyStatus.get(parseInt(id));
    
    // 5. Add user to ready set
    readyUsers.add(user_id);
    
    // 6. Check if both participants are ready
    const participant1 = await TournamentParticipant.findByPk(match.participant1_id);
    const participant2 = await TournamentParticipant.findByPk(match.participant2_id);
    
    const participant1UserId = participant1?.user_id;
    const participant2UserId = participant2?.user_id;
    
    const bothReady = participant1UserId && participant2UserId && 
                     readyUsers.has(participant1UserId) && 
                     readyUsers.has(participant2UserId);
    
    // 7. If both ready, update match status to 'live'
    if (bothReady && match.status === 'scheduled') {
      await match.update({ status: 'live' });
      
      // Notify both participants
      if (participant1UserId) {
        await NotificationService.createNotification(
          participant1UserId,
          'Match is Live',
          'Both participants are ready. The match is now live! You can start playing.',
          'match',
          'match',
          match.id
        );
      }
      
      if (participant2UserId) {
        await NotificationService.createNotification(
          participant2UserId,
          'Match is Live',
          'Both participants are ready. The match is now live! You can start playing.',
          'match',
          'match',
          match.id
        );
      }
    }
    
    // 8. Return current ready status
    const readyStatus = {
      isReady: true,
      readyCount: readyUsers.size,
      totalNeeded: 2,
      matchStatus: match.status,
      isLive: bothReady
    };
    
    res.json({
      message: 'Marked as ready for match.',
      readyStatus
    });

  } catch (error) {
    next(error);
  }
};

// Mark participant as not ready (untoggle)
const markNotReady = async (req, res, next) => {
  try {
    const { id } = req.params;
    const user_id = req.user.id;

    // 1. Find match
    const match = await Match.findByPk(id);
    if (!match) {
      return res.status(404).json({ message: 'Match not found.' });
    }

    // 2. Verify participant
    const participant = await TournamentParticipant.findOne({
      where: { tournament_id: match.tournament_id, user_id },
    });
    
    if (!participant || (participant.id !== match.participant1_id && participant.id !== match.participant2_id)) {
      return res.status(403).json({ message: 'You are not a participant of this match.' });
    }

    // 3. Check if match is live - if so, we need to revert status
    if (match.status === 'live') {
      // Get opponent's user ID
      const opponentId = match.participant1_id === participant.id
        ? (await TournamentParticipant.findByPk(match.participant2_id))?.user_id
        : (await TournamentParticipant.findByPk(match.participant1_id))?.user_id;
      
      // Update match status back to scheduled
      await match.update({ status: 'scheduled' });
      
      // Notify opponent
      if (opponentId) {
        await NotificationService.createNotification(
          opponentId,
          'Match No Longer Live',
          'Your opponent is no longer ready. The match has been reverted to scheduled status.',
          'match',
          'match',
          match.id
        );
      }
    }

    // 4. Remove user from ready set if exists
    if (matchReadyStatus.has(parseInt(id))) {
      const readyUsers = matchReadyStatus.get(parseInt(id));
      readyUsers.delete(user_id);
      
      // If set becomes empty, delete the entry
      if (readyUsers.size === 0) {
        matchReadyStatus.delete(parseInt(id));
      }
    }

    res.json({
      message: 'Marked as not ready for match.',
      matchStatus: match.status
    });

  } catch (error) {
    next(error);
  }
};

// Get match ready status
const getReadyStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const user_id = req.user.id;

    // 1. Find match
    const match = await Match.findByPk(id);
    if (!match) {
      return res.status(404).json({ message: 'Match not found.' });
    }

    // 2. Verify participant
    const participant = await TournamentParticipant.findOne({
      where: { tournament_id: match.tournament_id, user_id },
    });
    
    if (!participant || (participant.id !== match.participant1_id && participant.id !== match.participant2_id)) {
      return res.status(403).json({ message: 'You are not a participant of this match.' });
    }

    // 3. Get participant user IDs
    const participant1 = await TournamentParticipant.findByPk(match.participant1_id);
    const participant2 = await TournamentParticipant.findByPk(match.participant2_id);
    
    const participant1UserId = participant1?.user_id;
    const participant2UserId = participant2?.user_id;

    // 4. Check ready status
    const readyUsers = matchReadyStatus.get(parseInt(id)) || new Set();
    
    const readyStatus = {
      matchId: parseInt(id),
      matchStatus: match.status,
      participant1: {
        userId: participant1UserId,
        isReady: participant1UserId ? readyUsers.has(participant1UserId) : false
      },
      participant2: {
        userId: participant2UserId,
        isReady: participant2UserId ? readyUsers.has(participant2UserId) : false
      },
      totalReady: readyUsers.size,
      required: 2,
      isLive: match.status === 'live'
    };

    res.json(readyStatus);

  } catch (error) {
    next(error);
  }
};

// Confirm a reported score
const confirmScore = async (req, res, next) => {
  let transaction;
  try {
    const { id } = req.params;
    const user_id = req.user.id;

    console.debug(`[DEBUG] confirmScore called for match ${id} by user ${user_id}`);

    transaction = await sequelize.transaction();

    // 1. Find the match
    const match = await Match.findByPk(id, { transaction });
    if (!match) {
      return res.status(404).json({ message: 'Match not found.' });
    }

    // 2. Verify the user is a participant of this match
    const participant = await TournamentParticipant.findOne({
      where: { tournament_id: match.tournament_id, user_id },
      transaction
    });

    if (!participant) {
      return res.status(403).json({ message: 'You are not a participant of this match.' });
    }

    const isParticipant1 = participant.id === match.participant1_id;
    const isParticipant2 = participant.id === match.participant2_id;

    if (!isParticipant1 && !isParticipant2) {
      return res.status(403).json({ message: 'You are not a participant of this match.' });
    }

    // 3. Ensure confirmer is not the reporter
    if (match.reported_by_user_id === user_id) {
      return res.status(400).json({ message: 'You cannot confirm your own reported score.' });
    }

    // 4. Check match status
    if (match.status !== 'awaiting_confirmation') {
      return res.status(400).json({ message: 'Match is not awaiting confirmation.' });
    }

    // 5. Determine winner
    let winner_id = null;
    if (match.participant1_score > match.participant2_score) {
      winner_id = match.participant1_id;
    } else if (match.participant2_score > match.participant1_score) {
      winner_id = match.participant2_id;
    } else {
      return res.status(400).json({ message: 'Ties are not allowed. Please dispute the score if there is an issue.' });
    }

    console.debug(`[DEBUG] Match ${id}: winner determined -> participant ${winner_id}`);

    // 6. Advance winner depending on tournament format
    const tournament = await Tournament.findByPk(match.tournament_id, { transaction });
    if (!tournament) {
      return res.status(404).json({ message: 'Tournament not found.' });
    }

    if (tournament.format === 'single_elimination' || tournament.format === 'round_robin') {
      await advanceWinnerToNextRound(match, winner_id, transaction); 
    } else if (tournament.format === 'double_elimination') {
      await advanceDoubleEliminationMatch(match, winner_id, transaction);
    } else if (tournament.format === 'best_of_three') {
      await advanceBestOfThreeSeries(match, winner_id, transaction);
    }

    // 7. Update match
    await match.update({
      status: 'completed',
      confirmed_by_user_id: user_id,
      confirmed_at: new Date(),
      winner_id
    }, { transaction });

    await transaction.commit();

    console.debug(`[DEBUG] Match ${id} completed. Winner: ${winner_id}`);
    autoConfirmService.cancelScheduledJobs(match.id);
    
    // Clear ready status from memory
    matchReadyStatus.delete(parseInt(id));
    
    res.json({
      message: 'Score confirmed successfully. Match completed.',
      match
    });

  } catch (error) {
    if (transaction && !transaction.finished) {
      await transaction.rollback();
    }
    console.error('[ERROR] confirmScore failed:', error);
    next(error);
  }
};

// Dispute a reported score
const disputeScore = async (req, res, next) => {
  let transaction;
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { id } = req.params;
    const { reason } = req.body;
    const user_id = req.user.id;

    transaction = await sequelize.transaction();

    // 1. Find match
    const match = await Match.findByPk(id, { transaction });
    if (!match) {
      await transaction.rollback();
      return res.status(404).json({ message: 'Match not found.' });
    }

    // 2. Verify participant
    const participant = await TournamentParticipant.findOne({
      where: { tournament_id: match.tournament_id, user_id },
      transaction,
    });
    if (!participant || (participant.id !== match.participant1_id && participant.id !== match.participant2_id)) {
      await transaction.rollback();
      return res.status(403).json({ message: 'You are not a participant of this match.' });
    }

    // 3. Verify match status
    if (match.status !== 'awaiting_confirmation') {
      await transaction.rollback();
      return res.status(400).json({ message: 'Match is not awaiting confirmation.' });
    }

    // 4. Handle file upload
    let evidence_url = req.file ? `/uploads/${req.file.filename}` : null;

    // 5. Create dispute
    const dispute = await Dispute.create({
      match_id: id,
      raised_by_user_id: user_id,
      reason,
      evidence_url: evidence_url || null,
      status: 'open',
    }, { transaction });

    // 6. Update match status
    await match.update({ status: 'disputed' }, { transaction });

    await transaction.commit();

    // 7. Cancel scheduled auto-confirm/warning jobs
    autoConfirmService.cancelScheduledJobs(match.id);
    
    // Clear ready status from memory
    matchReadyStatus.delete(parseInt(id));

    // 8. TODO: Notify admins
    console.log(`Dispute created for match ${id}. Notify admins.`);

    res.json({
      message: 'Dispute raised successfully. Admins will review it shortly.',
      dispute,
    });

  } catch (error) {
    if (transaction && !transaction.finished) await transaction.rollback();
    next(error);
  }
};

// Get match details
const getMatch = async (req, res, next) => {
  try {
    const { id } = req.params;

    const match = await Match.findByPk(id, {
      include: [
        {
          model: TournamentParticipant,
          as: 'participant1',
          include: [{ model: User, as: 'user', attributes: ['id', 'username'] }]
        },
        {
          model: TournamentParticipant,
          as: 'participant2',
          include: [{ model: User, as: 'user', attributes: ['id', 'username'] }]
        },
        {
          model: Tournament,
          as: 'tournament',
          attributes: ['id', 'name', 'game_id']
        }
      ]
    });

    if (!match) {
      return res.status(404).json({ message: 'Match not found.' });
    }

    // Add ready status to response
    const readyUsers = matchReadyStatus.get(parseInt(id)) || new Set();
    const participant1UserId = match.participant1?.user?.id;
    const participant2UserId = match.participant2?.user?.id;
    
    const response = match.toJSON();
    response.readyStatus = {
      participant1Ready: participant1UserId ? readyUsers.has(participant1UserId) : false,
      participant2Ready: participant2UserId ? readyUsers.has(participant2UserId) : false,
      totalReady: readyUsers.size,
      required: 2
    };

    res.json(response);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  reportScore,
  confirmScore,
  disputeScore,
  getMatch,
  markReady,
  markNotReady,
  getReadyStatus
};