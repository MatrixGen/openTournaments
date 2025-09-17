const { Tournament, User, Match, Dispute } = require('../models');
const { validationResult } = require('express-validator');
const sequelize = require('../config/database');

// Get all disputes for admin review
const getDisputes = async (req, res, next) => {
  try {
    const disputes = await Dispute.findAll({
      include: [
        {
          model: Match,
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
            }
          ]
        },
        {
          model: User,
          as: 'raised_by',
          attributes: ['id', 'username']
        }
      ],
      order: [['created_at', 'DESC']]
    });

    res.json(disputes);
  } catch (error) {
    next(error);
  }
};

// Resolve a dispute
const resolveDispute = async (req, res, next) => {
  let transaction;
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const { resolution, winner_id } = req.body;
    const admin_id = req.user.id;

    transaction = await sequelize.transaction();

    const dispute = await Dispute.findByPk(id, { transaction });
    if (!dispute) {
      await transaction.rollback();
      return res.status(404).json({ message: 'Dispute not found.' });
    }

    // Update dispute status
    await dispute.update({
      status: 'resolved',
      resolution_details: resolution,
      resolved_by_admin_id: admin_id,
      closed_at: new Date()
    }, { transaction });

    // Update the match with the admin's decision
    if (winner_id) {
      const match = await Match.findByPk(dispute.match_id, { transaction });
      await match.update({
        status: 'completed',
        winner_id: winner_id,
        confirmed_by_user_id: admin_id,
        confirmed_at: new Date()
      }, { transaction });

      // Advance the winner to the next round
      await advanceWinnerToNextRound(match.tournament_id, winner_id, match.round_number, transaction);
    }

    await transaction.commit();

    res.json({
      message: 'Dispute resolved successfully.',
      dispute: dispute
    });

  } catch (error) {
    if (transaction && !transaction.finished) {
      await transaction.rollback();
    }
    next(error);
  }
};

// Get all tournaments for admin management
const getTournaments = async (req, res, next) => {
  try {
    const tournaments = await Tournament.findAll({
      include: [
        { model: Game, as: 'game' },
        { model: Platform, as: 'platform' },
        { model: User, as: 'creator' }
      ],
      order: [['created_at', 'DESC']]
    });

    res.json(tournaments);
  } catch (error) {
    next(error);
  }
};

// Update tournament status (cancel, lock, etc.)
const updateTournamentStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const tournament = await Tournament.findByPk(id);
    if (!tournament) {
      return res.status(404).json({ message: 'Tournament not found.' });
    }

    await tournament.update({ status });

    res.json({
      message: 'Tournament status updated successfully.',
      tournament: tournament
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getDisputes,
  resolveDispute,
  getTournaments,
  updateTournamentStatus
};