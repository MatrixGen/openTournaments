const { Match, TournamentParticipant, Dispute, Tournament,User } = require('../models');
const { validationResult } = require('express-validator');
const sequelize = require('../config/database');
const { distributePrizes } = require('../services/prizeService');
const NotificationService = require('../services/notificationService');
const { generateNextRound, advanceDoubleEliminationMatch } = require('../services/bracketService');

// Report score for a match
const reportScore = async (req, res, next) => {
  let transaction;
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const { player1_score, player2_score, evidence_url } = req.body;
    const user_id = req.user.id;

    transaction = await sequelize.transaction();

    // 1. Find the match
    const match = await Match.findByPk(id, { transaction });
    if (!match) {
      await transaction.rollback();
      return res.status(404).json({ message: 'Match not found.' });
    }

    // 2. Verify the user is a participant
    const participant = await TournamentParticipant.findOne({
      where: {
        tournament_id: match.tournament_id,
        user_id
      },
      transaction
    });

    if (!participant || (participant.id !== match.participant1_id && participant.id !== match.participant2_id)) {
      await transaction.rollback();
      return res.status(403).json({ message: 'You are not a participant of this match.' });
    }

    // 3. Verify match status
    if (!['scheduled', 'awaiting_confirmation'].includes(match.status)) {
      await transaction.rollback();
      return res.status(400).json({ message: 'Match is not in a state that allows score reporting.' });
    }

    // 4. Update match
    await match.update({
      participant1_score: player1_score,
      participant2_score: player2_score,
      reported_score: `${player1_score}-${player2_score}`,
      reported_by_user_id: user_id,
      reported_at: new Date(),
      evidence_url: evidence_url || null,
      status: 'awaiting_confirmation'
    }, { transaction });

    await transaction.commit();

    // 5. Identify opponent AFTER commit (no transaction here)
    let opponentId;
    if (match.participant1_id === participant.id) {
      const opponent = await TournamentParticipant.findByPk(match.participant2_id);
      opponentId = opponent?.user_id;
    } else {
      const opponent = await TournamentParticipant.findByPk(match.participant1_id);
      opponentId = opponent?.user_id;
    }

    // 6. Send notification (safe, outside transaction)
    if (opponentId) {
      try {
        await NotificationService.createNotification(
          opponentId,
          'Score Reported',
          `Your opponent has reported a score for your match. Please confirm or dispute the result.`,
          'match',
          'match',
          match.id
        );
      } catch (notifyError) {
        console.error("Notification failed:", notifyError);
      }
    }

    // 7. Return response
    res.json({
      message: 'Score reported successfully. Waiting for opponent confirmation.',
      match
    });

  } catch (error) {
    if (transaction && !transaction.finished) {
      await transaction.rollback();
    }
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

    // 2. Fetch tournament (needed for format)
    const tournament = await Tournament.findByPk(match.tournament_id, { transaction });
    if (!tournament) {
      return res.status(404).json({ message: 'Tournament not found.' });
    }

    // 3. Verify the user is a participant of this match
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

    // 4. Ensure confirmer is not the reporter
    if (match.reported_by_user_id === user_id) {
      return res.status(400).json({ message: 'You cannot confirm your own reported score.' });
    }

    // 5. Check match status
    if (match.status !== 'awaiting_confirmation') {
      return res.status(400).json({ message: 'Match is not awaiting confirmation.' });
    }

    // 6. Determine winner
    let winner_id = null;
    if (match.participant1_score > match.participant2_score) {
      winner_id = match.participant1_id;
    } else if (match.participant2_score > match.participant1_score) {
      winner_id = match.participant2_id;
    } else {
      return res.status(400).json({ message: 'Ties are not allowed. Please dispute the score if there is an issue.' });
    }

    console.debug(`[DEBUG] Match ${id}: winner determined -> participant ${winner_id}`);

    // 7. Advance winner depending on tournament format
    if (tournament.format === 'single_elimination' || tournament.format === 'round_robin') {
      await advanceWinnerToNextRound(match.tournament_id, winner_id, match.round_number, transaction);
    } else if (tournament.format === 'double_elimination') {
      await advanceDoubleEliminationMatch(match, winner_id, transaction);
    }

    // 8. Update match
    await match.update({
      status: 'completed',
      confirmed_by_user_id: user_id,
      confirmed_at: new Date(),
      winner_id
    }, { transaction });

    await transaction.commit();

    console.debug(`[DEBUG] Match ${id} completed. Winner: ${winner_id}`);

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


// Add this function to handle bracket advancement
const advanceWinnerToNextRound = async (tournamentId, winnerParticipantId, currentRoundNumber, transaction) => {
  try {
    const nextRoundNumber = currentRoundNumber + 1;
    
    // Check if there's a next round
    const nextRoundMatches = await Match.findAll({
      where: {
        tournament_id: tournamentId,
        round_number: nextRoundNumber
      },
      transaction
    });

    if (nextRoundMatches.length === 0) {
      // This is the final match - tournament is complete
      await completeTournament(tournamentId, winnerParticipantId, transaction);
      return;
    }

    // Find the next available slot in the next round
    for (const nextMatch of nextRoundMatches) {
      if (!nextMatch.participant1_id) {
        await nextMatch.update({ participant1_id: winnerParticipantId }, { transaction });
        console.log(`Advanced winner to next round: Match ${nextMatch.id}, Participant 1`);
        return;
      } else if (!nextMatch.participant2_id) {
        await nextMatch.update({ participant2_id: winnerParticipantId }, { transaction });
        console.log(`Advanced winner to next round: Match ${nextMatch.id}, Participant 2`);
        return;
      }
    }

    // If we get here, all next round matches are full (shouldn't happen in a properly structured bracket)
    throw new Error('No available slots in the next round');

  } catch (error) {
    throw error;
  }
};

// Add this function to handle tournament completion
const completeTournament = async (tournamentId, winnerParticipantId, transaction) => {
  try {
    // Update tournament status
    await Tournament.update(
      { status: 'completed' },
      { where: { id: tournamentId }, transaction }
    );

    // Update the winner's final standing
    await TournamentParticipant.update(
      { final_standing: 1 },
      { where: { id: winnerParticipantId }, transaction }
    );

    // Distribute prizes
    await distributePrizes(tournamentId, transaction);
    
    console.log(`Tournament ${tournamentId} completed. Winner: ${winnerParticipantId}`);
    
    // TODO: Notify all participants about tournament completion
    
  } catch (error) {
    throw error;
  }
};

// Dispute a reported score
const disputeScore = async (req, res, next) => {
  let transaction;
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const { reason, evidence_url } = req.body;
    const user_id = req.user.id;

    transaction = await sequelize.transaction();

    // 1. Find the match
    const match = await Match.findByPk(id, { transaction });
    if (!match) {
      await transaction.rollback();
      return res.status(404).json({ message: 'Match not found.' });
    }

    // 2. Verify the user is a participant
    const participant = await TournamentParticipant.findOne({
      where: {
        tournament_id: match.tournament_id,
        user_id: user_id
      },
      transaction
    });

    if (!participant || (participant.id !== match.participant1_id && participant.id !== match.participant2_id)) {
      await transaction.rollback();
      return res.status(403).json({ message: 'You are not a participant of this match.' });
    }

    // 3. Verify match status is 'awaiting_confirmation'
    if (match.status !== 'awaiting_confirmation') {
      await transaction.rollback();
      return res.status(400).json({ message: 'Match is not awaiting confirmation.' });
    }

    // 4. Create a dispute record
    const dispute = await Dispute.create({
      match_id: id,
      raised_by_user_id: user_id,
      reason: reason,
      evidence_url: evidence_url || null,
      status: 'open'
    }, { transaction });

    // 5. Update match status to 'disputed'
    await match.update({
      status: 'disputed'
    }, { transaction });

    // 6. TODO: Notify admins
    console.log(`Dispute created for match ${id}. Notify admins.`);

    await transaction.commit();

    res.json({
      message: 'Dispute raised successfully. Admins will review it shortly.',
      dispute: dispute
    });

  } catch (error) {
    if (transaction && !transaction.finished) {
      await transaction.rollback();
    }
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

    res.json(match);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  reportScore,
  confirmScore,
  disputeScore,
  getMatch
};