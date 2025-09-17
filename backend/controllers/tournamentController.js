// controllers/tournamentController.js
const { Tournament,TournamentParticipant, TournamentPrize, Game, Platform, GameMode,User } = require('../models');
const { validationResult } = require('express-validator');
const sequelize = require('../config/database');
const { generateTournamentBracket } = require('../services/bracketService');
const NotificationService = require('../services/notificationService');

const createTournament = async (req, res, next) => {
  let transaction;
  try {
    transaction = await sequelize.transaction(); // Start a database transaction

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      await transaction.rollback();
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      name,
      game_id,
      platform_id,
      game_mode_id,
      format,
      entry_fee,
      total_slots,
      start_time,
      rules,
      visibility,
      prize_distribution
    } = req.body;

    const user_id = req.user.id; 

    // 1. Create the Tournament
    const newTournament = await Tournament.create({
      name,
      game_id,
      platform_id,
      game_mode_id,
      format,
      entry_fee,
      total_slots,
      current_slots: 0, // Starts with 0 participants
      status: 'open',
      rules: rules || null,
      visibility: visibility || 'public',
      created_by: user_id,
      start_time
    }, { transaction });

    // 2. Create the Prize Distribution entries
    const prizePromises = prize_distribution.map(prize => {
      return TournamentPrize.create({
        tournament_id: newTournament.id,
        position: prize.position,
        percentage: prize.percentage
      }, { transaction });
    });

    await Promise.all(prizePromises);

    // 3. If everything succeeded, commit the transaction
    await transaction.commit();

    // 4. Fetch the complete tournament data to return (without transaction)
    const completeTournament = await Tournament.findByPk(newTournament.id, {
      include: [
        { 
          model: Game, 
          as: 'game', 
          attributes: ['name'] 
        },
        { 
          model: Platform, 
          as: 'platform', 
          attributes: ['name'] 
        },
        { 
          model: GameMode, 
          as: 'game_mode', 
          attributes: ['name'] 
        },
        { 
          model: TournamentPrize, 
          as: 'prizes', 
          attributes: ['position', 'percentage'] 
        }
      ]
    });

    res.status(201).json({
      message: 'Tournament created successfully!',
      tournament: completeTournament
    });

  } catch (error) {
    // 5. If anything fails, check if transaction exists and hasn't been committed yet
    if (transaction && !transaction.finished) {
      await transaction.rollback();
    }
    next(error);
  }
};

// Add other functions later: getTournaments, getTournamentById, etc.

const getTournamentById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const tournament = await Tournament.findByPk(id, {
      include: [
        { model: Game, as: 'game', attributes: ['id', 'name', 'logo_url'] },
        { model: Platform, as: 'platform', attributes: ['id', 'name'] },
        { model: GameMode, as: 'game_mode', attributes: ['id', 'name'] },
        { model: User, as: 'creator', attributes: ['id', 'username'] },
        { model: TournamentPrize, as: 'prizes', attributes: ['position', 'percentage'] },
        { 
          model: TournamentParticipant, 
          as: 'participants',
          include: [{
            model: User,
            as: 'user',
            attributes: ['id', 'username']
          }]
        }
      ]
    });

    if (!tournament) {
      return res.status(404).json({ message: 'Tournament not found.' });
    }

    res.json(tournament);
  } catch (error) {
    next(error);
  }
};

const joinTournament = async (req, res, next) => {
  let transaction;
  try {
    const { id } = req.params; // Tournament ID
    const user_id = req.user.id; // From auth middleware

    transaction = await sequelize.transaction();

    // 1. Get tournament
    const tournament = await Tournament.findByPk(id, {
      include: [
        { model: Game, as: 'game' },
        { model: Platform, as: 'platform' },
        { model: GameMode, as: 'game_mode' }
      ],
      transaction,
      lock: transaction.LOCK.UPDATE // prevents race conditions
    });

    if (!tournament) {
      await transaction.rollback();
      return res.status(404).json({ message: 'Tournament not found.' });
    }

    // 2. Check status
    if (tournament.status !== 'open') {
      await transaction.rollback();
      return res.status(400).json({ message: 'Tournament is not open for joining.' });
    }

    // 3. Check slots
    if (tournament.current_slots >= tournament.total_slots) {
      await transaction.rollback();
      return res.status(400).json({ message: 'Tournament is already full.' });
    }

    // 4. Check duplicate participation
    const existingParticipant = await TournamentParticipant.findOne({
      where: { tournament_id: id, user_id },
      transaction
    });
    if (existingParticipant) {
      await transaction.rollback();
      return res.status(400).json({ message: 'You are already registered for this tournament.' });
    }

    // 5. Payment check
    const user = await User.findByPk(user_id, { transaction, lock: transaction.LOCK.UPDATE });
    const paymentProcessingEnabled = process.env.PAYMENT_PROCESSING_ENABLED === 'true';

    if (paymentProcessingEnabled && user.wallet_balance < tournament.entry_fee) {
      await transaction.rollback();
      return res.status(400).json({ message: 'Insufficient balance to join this tournament.' });
    }

    let newBalance = user.wallet_balance;

    // 6. Deduct entry fee + log transaction
    if (paymentProcessingEnabled) {
      newBalance = user.wallet_balance - tournament.entry_fee;

      await user.update({ wallet_balance: newBalance }, { transaction });

      await Transaction.create({
        user_id,
        type: 'tournament_entry',
        amount: tournament.entry_fee,
        balance_before: user.wallet_balance,
        balance_after: newBalance,
        status: 'completed',
        description: `Entry fee for tournament: ${tournament.name}`
      }, { transaction });
    }

    // 7. Add participant
    const participant = await TournamentParticipant.create({
      tournament_id: id,
      user_id,
      gamer_tag: user.username
    }, { transaction });

    // 8. Update slots
    const updatedSlots = tournament.current_slots + 1;
    await tournament.update({ current_slots: updatedSlots }, { transaction });

    // 9. Lock tournament if full
    if (updatedSlots >= tournament.total_slots) {
      await tournament.update({ status: 'locked' }, { transaction });
      await generateTournamentBracket(tournament.id, transaction);
    }

    await transaction.commit();

    // 10. Notification (AFTER commit, outside transaction)
    try {
      await NotificationService.createNotification(
        tournament.created_by,
        'New Participant',
        `User ${user.username} has joined your tournament "${tournament.name}"`,
        'tournament',
        'tournament',
        tournament.id
      );
    } catch (notifyError) {
      console.error("Notification failed:", notifyError);
      // don’t crash the request if notification fails
    }

    res.json({
      message: 'Successfully joined the tournament!',
      participant,
      ...(paymentProcessingEnabled && { new_balance: newBalance })
    });

  } catch (error) {
    if (transaction) await transaction.rollback();
    next(error);
  }
};

const getTournaments = async (req, res, next) => {
  try {
    const tournaments = await Tournament.findAll({
      where: { status: 'open' },
      include: [
        { 
          model: Game, 
          as: 'game', 
          attributes: ['name', 'logo_url'] 
        },
        { 
          model: Platform, 
          as: 'platform', 
          attributes: ['name'] 
        },
        { 
          model: GameMode, 
          as: 'game_mode', 
          attributes: ['name'] 
        }
      ],
      order: [['created_at', 'DESC']]
    });
    res.json(tournaments);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createTournament,
  getTournaments,
  joinTournament, 
  getTournamentById

};