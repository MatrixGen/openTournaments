const { Match, TournamentParticipant, Dispute, Tournament, User } = require('../models');
const { validationResult } = require('express-validator');
const sequelize = require('../config/database');
const NotificationService = require('../services/notificationService');
const { advanceDoubleEliminationMatch, advanceWinnerToNextRound, advanceBestOfThreeSeries } = require('../services/bracketService');
const autoConfirmService = require('../services/autoConfirmService');
const { uploadSingle } = require('../middleware/uploadMiddleware');

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



const MAX_TIMEOUT = 2_147_483_647; // 32-bit signed int max

// Enhanced in-memory store for match ready status
// Structure: Map<matchId, {
//   participants: Map<userId, { ready: boolean, confirmedActive: boolean, notified: boolean }>,
//   status: 'waiting' | 'one_ready' | 'both_ready' | 'live',
//   handshakeCompleted: boolean
// }>
const matchReadyStatus = new Map();

// Helper to get opponent user ID
async function getOpponentUserId(matchId, currentUserId) {
  const match = await Match.findByPk(matchId, {
    include: [
      {
        model: TournamentParticipant,
        as: 'participant1',
        include: [{ model: User, as: 'user', attributes: ['id'] }]
      },
      {
        model: TournamentParticipant,
        as: 'participant2',
        include: [{ model: User, as: 'user', attributes: ['id'] }]
      }
    ]
  });
  
  if (!match) return null;
  
  const participant1UserId = match.participant1?.user?.id;
  const participant2UserId = match.participant2?.user?.id;
  
  return participant1UserId === currentUserId ? participant2UserId : participant1UserId;
}

// Get both participants' user IDs
async function getBothUserIds(matchId) {
  const match = await Match.findByPk(matchId, {
    include: [
      {
        model: TournamentParticipant,
        as: 'participant1',
        include: [{ model: User, as: 'user', attributes: ['id'] }]
      },
      {
        model: TournamentParticipant,
        as: 'participant2',
        include: [{ model: User, as: 'user', attributes: ['id'] }]
      }
    ]
  });
  
  if (!match) return { participant1UserId: null, participant2UserId: null };
  
  return {
    participant1UserId: match.participant1?.user?.id,
    participant2UserId: match.participant2?.user?.id
  };
}

// Initialize match status in memory
function initializeMatchStatus(matchId) {
  if (!matchReadyStatus.has(matchId)) {
    matchReadyStatus.set(matchId, {
      participants: new Map(),
      status: 'waiting',
      handshakeCompleted: false,
      createdAt: Date.now()
    });
  }
  return matchReadyStatus.get(matchId);
}

// Mark participant as ready (Phase 1)
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

    // 4. Initialize match status
    initializeMatchStatus(parseInt(id));
    const matchStatus = matchReadyStatus.get(parseInt(id));
    
    // 5. Mark user as ready
    matchStatus.participants.set(user_id, {
      ready: true,
      confirmedActive: false,
      notified: false,
      timestamp: Date.now()
    });
    
    // 6. Get opponent's user ID
    const opponentUserId = await getOpponentUserId(parseInt(id), user_id);
    
    // 7. Check current status
    const bothUserIds = await getBothUserIds(parseInt(id));
    const participant1UserId = bothUserIds.participant1UserId;
    const participant2UserId = bothUserIds.participant2UserId;
    
    const participant1Ready = participant1UserId ? 
      (matchStatus.participants.get(participant1UserId)?.ready || false) : false;
    const participant2Ready = participant2UserId ? 
      (matchStatus.participants.get(participant2UserId)?.ready || false) : false;
    
    // 8. Determine new status
    let newStatus = matchStatus.status;
    let notifications = [];
    
    if (participant1Ready && participant2Ready) {
      // Both are ready - move to "both_ready" status
      newStatus = 'both_ready';
      matchStatus.status = newStatus;
      
      // Notify both that match is about to start (Phase 2)
      if (participant1UserId) {
        notifications.push(
          NotificationService.createNotification(
            participant1UserId,
            'Match Starting Soon',
            'Both players are ready! The match will start shortly. Get prepared!',
            'match',
            'match',
            match.id
          )
        );
      }
      
      if (participant2UserId) {
        notifications.push(
          NotificationService.createNotification(
            participant2UserId,
            'Match Starting Soon',
            'Both players are ready! The match will start shortly. Get prepared!',
            'match',
            'match',
            match.id
          )
        );
      }
      
    } else if (participant1Ready || participant2Ready) {
      // Only one is ready - move to "one_ready" status
      newStatus = 'one_ready';
      matchStatus.status = newStatus;
      
      // Notify opponent that player is ready (Phase 1)
      if (opponentUserId) {
        notifications.push(
          NotificationService.createNotification(
            opponentUserId,
            'Opponent Ready',
            'Your opponent is ready and waiting for you. Click "Ready" when you are prepared.',
            'info',
            'match',
             match.id
          )
        );
      }
    }
    
    // 9. Wait for all notifications
    await Promise.all(notifications);
    
    // 10. Return current status
    const readyStatus = {
      isReady: true,
      readyCount: (participant1Ready ? 1 : 0) + (participant2Ready ? 1 : 0),
      totalNeeded: 2,
      matchStatus: match.status,
      handshakeStatus: newStatus,
      isLive: match.status === 'live'
    };
    
    res.json({
      message: 'Marked as ready for match.',
      readyStatus
    });

  } catch (error) {
    next(error);
  }
};

// Confirm active state (Phase 2 - User confirms they're active after both are ready)
const confirmActive = async (req, res, next) => {
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

    // 3. Check match status in memory
    const matchStatus = matchReadyStatus.get(parseInt(id));
    if (!matchStatus || matchStatus.status !== 'both_ready') {
      return res.status(400).json({ 
        message: 'Match is not in the correct state to confirm active. Both players must be ready first.' 
      });
    }

    // 4. Mark user as confirmed active
    matchStatus.participants.set(user_id, {
      ...(matchStatus.participants.get(user_id) || {}),
      confirmedActive: true,
      activeConfirmedAt: Date.now()
    });
    
    // 5. Get both user IDs
    const bothUserIds = await getBothUserIds(parseInt(id));
    const participant1UserId = bothUserIds.participant1UserId;
    const participant2UserId = bothUserIds.participant2UserId;
    
    // 6. Check if both have confirmed active
    const participant1Active = participant1UserId ? 
      (matchStatus.participants.get(participant1UserId)?.confirmedActive || false) : false;
    const participant2Active = participant2UserId ? 
      (matchStatus.participants.get(participant2UserId)?.confirmedActive || false) : false;
    
    let notifications = [];
    
    if (participant1Active && participant2Active) {
      // Both have confirmed active - START THE MATCH! (Phase 3)
      matchStatus.status = 'live';
      matchStatus.handshakeCompleted = true;
      
      // Update match status in database
      await match.update({ status: 'live', live_at: new Date() });
      
      // Send start signal to both players
      if (participant1UserId) {
        notifications.push(
          NotificationService.createNotification(
            participant1UserId,
            'Match is Live!',
            'The match has started! Screen recording will begin automatically.',
            'match',
            'match',
            match.id
          )
        );
      }
      
      if (participant2UserId) {
        notifications.push(
          NotificationService.createNotification(
            participant2UserId,
            'Match is Live!',
            'The match has started! Screen recording will begin automatically.',
            'match',
            'match',
            match.id
          )
        );
      }
      
      // TODO: Trigger recording on both devices
      // You'll need to implement WebSocket or push notification for this
      console.log(`[DEBUG] Match ${id} is now LIVE! Trigger recording for both players.`);
      
    } else {
      // Only one has confirmed active - notify opponent
      const opponentUserId = await getOpponentUserId(parseInt(id), user_id);
      
      if (opponentUserId) {
        notifications.push(
          NotificationService.createNotification(
            opponentUserId,
            'Opponent Confirmed Active',
            'Your opponent has confirmed they are active and ready to start. Please confirm when you are ready.',
            'match',
            'match',
            match.id
          )
        );
      }
    }
    
    // 7. Wait for notifications
    await Promise.all(notifications);
    
    // 8. Return status
    const activeStatus = {
      isActiveConfirmed: true,
      activeConfirmedCount: (participant1Active ? 1 : 0) + (participant2Active ? 1 : 0),
      totalNeeded: 2,
      matchStatus: match.status,
      handshakeStatus: matchStatus.status,
      matchLive: matchStatus.status === 'live'
    };
    
    res.json({
      message: 'Confirmed active status.',
      activeStatus
    });

  } catch (error) {
    next(error);
  }
};

// Mark participant as not ready (cancel ready status)
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

    // 3. Check memory status
    const matchStatus = matchReadyStatus.get(parseInt(id));
    const opponentUserId = await getOpponentUserId(parseInt(id), user_id);
    
    // 4. If match was live, revert
    if (match.status === 'live') {
      await match.update({ status: 'scheduled', live_at: null });
      
      // Notify opponent
      if (opponentUserId) {
        await NotificationService.createNotification(
          opponentUserId,
          'Match Reverted',
          'Your opponent is no longer ready. Match has been reverted to scheduled status.',
          'match',
          'match',
          match.id
        );
      }
    }
    
    // 5. Remove user from ready/active status
    if (matchStatus) {
      matchStatus.participants.delete(user_id);
      
      // Update overall status
      const bothUserIds = await getBothUserIds(parseInt(id));
      const participant1UserId = bothUserIds.participant1UserId;
      const participant2UserId = bothUserIds.participant2UserId;
      
      const participant1Ready = participant1UserId ? 
        (matchStatus.participants.get(participant1UserId)?.ready || false) : false;
      const participant2Ready = participant2UserId ? 
        (matchStatus.participants.get(participant2UserId)?.ready || false) : false;
      
      if (participant1Ready && participant2Ready) {
        matchStatus.status = 'both_ready';
      } else if (participant1Ready || participant2Ready) {
        matchStatus.status = 'one_ready';
      } else {
        matchStatus.status = 'waiting';
        matchStatus.handshakeCompleted = false;
      }
      
      // Notify opponent about status change
      if (opponentUserId && matchStatus.participants.has(opponentUserId)) {
        await NotificationService.createNotification(
          opponentUserId,
          'Opponent Not Ready',
          'Your opponent is no longer ready.',
          'match',
          'match',
          match.id
        );
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

// Get enhanced ready status
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
    const participant1 = await TournamentParticipant.findByPk(match.participant1_id, {
      include: [{ model: User, as: 'user', attributes: ['id', 'username'] }]
    });
    const participant2 = await TournamentParticipant.findByPk(match.participant2_id, {
      include: [{ model: User, as: 'user', attributes: ['id', 'username'] }]
    });
    
    const participant1UserId = participant1?.user?.id;
    const participant2UserId = participant2?.user?.id;

    // 4. Check memory status
    const matchStatus = matchReadyStatus.get(parseInt(id)) || {
      participants: new Map(),
      status: 'waiting',
      handshakeCompleted: false
    };
    
    const participant1Data = participant1UserId ? matchStatus.participants.get(participant1UserId) : null;
    const participant2Data = participant2UserId ? matchStatus.participants.get(participant2UserId) : null;

    const readyStatus = {
      matchId: parseInt(id),
      matchStatus: match.status,
      handshakeStatus: matchStatus.status,
      handshakeCompleted: matchStatus.handshakeCompleted,
      
      participant1: {
        userId: participant1UserId,
        username: participant1?.user?.username,
        isReady: participant1Data?.ready || false,
        isActiveConfirmed: participant1Data?.confirmedActive || false,
        readyAt: participant1Data?.timestamp
      },
      
      participant2: {
        userId: participant2UserId,
        username: participant2?.user?.username,
        isReady: participant2Data?.ready || false,
        isActiveConfirmed: participant2Data?.confirmedActive || false,
        readyAt: participant2Data?.timestamp
      },
      
      totalReady: (participant1Data?.ready ? 1 : 0) + (participant2Data?.ready ? 1 : 0),
      totalActiveConfirmed: (participant1Data?.confirmedActive ? 1 : 0) + (participant2Data?.confirmedActive ? 1 : 0),
      required: 2,
      isLive: match.status === 'live'
    };

    res.json(readyStatus);

  } catch (error) {
    next(error);
  }
};

// Get match details (updated)
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

    // Add enhanced ready status to response
    const matchStatus = matchReadyStatus.get(parseInt(id)) || {
      participants: new Map(),
      status: 'waiting',
      handshakeCompleted: false
    };
    
    const participant1UserId = match.participant1?.user?.id;
    const participant2UserId = match.participant2?.user?.id;
    
    const participant1Data = participant1UserId ? matchStatus.participants.get(participant1UserId) : null;
    const participant2Data = participant2UserId ? matchStatus.participants.get(participant2UserId) : null;

    const response = match.toJSON();
    response.readyStatus = {
      handshakeStatus: matchStatus.status,
      handshakeCompleted: matchStatus.handshakeCompleted,
      participant1Ready: participant1Data?.ready || false,
      participant1ActiveConfirmed: participant1Data?.confirmedActive || false,
      participant2Ready: participant2Data?.ready || false,
      participant2ActiveConfirmed: participant2Data?.confirmedActive || false,
      totalReady: (participant1Data?.ready ? 1 : 0) + (participant2Data?.ready ? 1 : 0),
      totalActiveConfirmed: (participant1Data?.confirmedActive ? 1 : 0) + (participant2Data?.confirmedActive ? 1 : 0),
      required: 2
    };

    res.json(response);
  } catch (error) {
    next(error);
  }
};

// Clean up old match statuses (optional - run periodically)
const cleanupMatchStatuses = () => {
  const now = Date.now();
  const ONE_HOUR = 60 * 60 * 1000;
  
  for (const [matchId, status] of matchReadyStatus.entries()) {
    if (now - status.createdAt > ONE_HOUR) {
      matchReadyStatus.delete(matchId);
    }
  }
};

// Run cleanup every hour
setInterval(cleanupMatchStatuses, 60 * 60 * 1000);

module.exports = {
  reportScore,
  confirmScore,
  disputeScore,
  getMatch,
  markReady,
  markNotReady,
  getReadyStatus,
  confirmActive  // New endpoint
};
