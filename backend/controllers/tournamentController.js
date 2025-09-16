// controllers/tournamentController.js
const { Tournament,TournamentParticipant, TournamentPrize, Game, Platform, GameMode,User } = require('../models');
const { validationResult } = require('express-validator');
const sequelize = require('../config/database');
const { generateTournamentBracket } = require('../services/bracketService');

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

    const user_id = req.user.id; // From auth middleware

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
    const { id } = req.params; // Tournament ID from URL
    const user_id = req.user.id; // From auth middleware

    transaction = await sequelize.transaction();

    // 1. Get the tournament with available slots
    const tournament = await Tournament.findByPk(id, {
      include: [
        { model: Game, as: 'game' },
        { model: Platform, as: 'platform' },
        { model: GameMode, as: 'game_mode' }
      ],
      transaction
    });

    if (!tournament) {
      await transaction.rollback();
      return res.status(404).json({ message: 'Tournament not found.' });
    }

    // 2. Check if tournament is open for joining
    if (tournament.status !== 'open') {
      await transaction.rollback();
      return res.status(400).json({ message: 'Tournament is not open for joining.' });
    }

    // 3. Check if tournament is already full
    if (tournament.current_slots >= tournament.total_slots) {
      await transaction.rollback();
      return res.status(400).json({ message: 'Tournament is already full.' });
    }

    // 4. Check if user is already a participant
    const existingParticipant = await TournamentParticipant.findOne({
      where: {
        tournament_id: id,
        user_id: user_id
      },
      transaction
    });

    if (existingParticipant) {
      await transaction.rollback();
      return res.status(400).json({ message: 'You are already registered for this tournament.' });
    }

    // 5. Check if user has enough balance (SIMULATED FOR NOW)
    const user = await User.findByPk(user_id, { transaction });
    const paymentProcessingEnabled = process.env.PAYMENT_PROCESSING_ENABLED === 'true';
    
    if (paymentProcessingEnabled && user.wallet_balance < tournament.entry_fee) {
      await transaction.rollback();
      return res.status(400).json({ message: 'Insufficient balance to join this tournament.' });
    }

    // 6. Deduct entry fee (SIMULATED FOR NOW)
    if (paymentProcessingEnabled) {
      const newBalance = user.wallet_balance - tournament.entry_fee;
      await user.update({ wallet_balance: newBalance }, { transaction });
    }

    // 7. Record the transaction (SIMULATED FOR NOW)
    if (paymentProcessingEnabled) {
      await Transaction.create({
        user_id: user_id,
        type: 'tournament_entry',
        amount: tournament.entry_fee,
        balance_before: user.wallet_balance,
        balance_after: user.wallet_balance - tournament.entry_fee,
        status: 'completed',
        description: `Entry fee for tournament: ${tournament.name}`
      }, { transaction });
    }

    // 8. Add user to tournament participants
    const participant = await TournamentParticipant.create({
      tournament_id: id,
      user_id: user_id,
      gamer_tag: user.username
    }, { transaction });

    // 9. Update tournament slot count
    const updatedSlots = tournament.current_slots + 1;
    await tournament.update({ current_slots: updatedSlots }, { transaction });

    // 10. Check if tournament is now full - GENERATE BRACKET
    if (updatedSlots >= tournament.total_slots) {
      await tournament.update({ status: 'locked' }, { transaction });
      
      // GENERATE THE BRACKET/MATCHES HERE
      await generateTournamentBracket(tournament.id, transaction);
    }

    await transaction.commit();

    res.json({
      message: 'Successfully joined the tournament!',
      participant: participant,
      // Only show new balance if payment processing is enabled
      ...(paymentProcessingEnabled && { new_balance: user.wallet_balance - tournament.entry_fee })
    });

  } catch (error) {
    if (transaction && !transaction.finished) {
      await transaction.rollback();
    }
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