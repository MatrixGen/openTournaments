// controllers/tournamentController.js
const { Tournament,TournamentParticipant, TournamentPrize, Game, Platform, GameMode,User,Match ,Transaction} = require('../models');
const { validationResult } = require('express-validator');
const sequelize = require('../config/database');
const { generateBracket } = require('../services/bracketService');
const NotificationService = require('../services/notificationService');

const createTournament = async (req, res, next) => {
  let transaction;
  try {
    //console.log("[DEBUG] createTournament called", { body: req.body, user: req.user });

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      //console.warn("[DEBUG] Validation failed", errors.array());
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
      prize_distribution,
      gamer_tag
    } = req.body;

    const user_id = req.user.id;

    transaction = await sequelize.transaction();

    // 1. Check balance
    const user = await User.findByPk(user_id, { transaction });
    if (!user) {
     // console.error("[DEBUG] User not found", { user_id });
      await transaction.rollback();
      return res.status(404).json({ message: "User not found" });
    }
    //console.log("[DEBUG] User fetched", { user_id, wallet_balance: user.wallet_balance });

    if (user.wallet_balance < entry_fee) {
    //  console.warn("[DEBUG] Insufficient balance", { needed: entry_fee, available: user.wallet_balance });
      await transaction.rollback();
      return res.status(400).json({ 
        message: `Insufficient balance. Need ${entry_fee}, have ${user.wallet_balance}` 
      });
    }

    // 2. Create tournament
    const newTournament = await Tournament.create({
      name,
      game_id,
      platform_id,
      game_mode_id,
      format,
      entry_fee,
      total_slots,
      current_slots: 1,
      status: 'open',
      rules: rules || null,
      visibility: visibility || 'public',
      created_by: user_id,
      start_time
    }, { transaction });

    //console.log("[DEBUG] Tournament created", { id: newTournament.id });

    // 3. Prizes
    if (prize_distribution?.length) {
      const prizePromises = prize_distribution.map(prize => {
        //console.log("[DEBUG] Creating prize", prize);
        return TournamentPrize.create({
          tournament_id: newTournament.id,
          position: prize.position,
          percentage: prize.percentage
        }, { transaction });
      });
      await Promise.all(prizePromises);
      //console.log("[DEBUG] Prizes created");
    }

    // 4. Deduct balance
    const newBalance = user.wallet_balance - entry_fee;
    await user.update({ wallet_balance: newBalance }, { transaction });
    //console.log("[DEBUG] User balance updated", { before: user.wallet_balance, after: newBalance });

    // 5. Transaction record
    await Transaction.create({
      user_id,
      type: 'tournament_entry',
      amount: entry_fee,
      balance_before: user.wallet_balance,
      balance_after: newBalance,
      status: 'completed',
      description: `Entry fee for tournament: ${name}`
    }, { transaction });
    //console.log("[DEBUG] Transaction recorded");

    // 6. Creator as participant
    const participant = await TournamentParticipant.create({
      tournament_id: newTournament.id,
      user_id,
      gamer_tag: gamer_tag || user.username
    }, { transaction });
    //console.log("[DEBUG] Creator added as participant", { participant_id: participant.id });

    // 7. Commit
    await transaction.commit();
    //console.log("[DEBUG] Transaction committed successfully");

    // 8. Fetch complete tournament
    const completeTournament = await Tournament.findByPk(newTournament.id, {
      include: [
        { model: Game, as: 'game', attributes: ['name'] },
        { model: Platform, as: 'platform', attributes: ['name'] },
        { model: GameMode, as: 'game_mode', attributes: ['name'] },
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
    //console.log("[DEBUG] Tournament fully fetched for response", { id: completeTournament.id });

    // 9. Notification
    await NotificationService.createNotification(
      user_id,
      'Tournament Created',
      `You've successfully created and joined the tournament "${name}".`,
      'tournament',
      'tournament',
      newTournament.id
    );
    //console.log("[DEBUG] Notification sent");

    res.status(201).json({
      message: 'Tournament created successfully! You have been added as the first participant.',
      tournament: completeTournament,
      new_balance: newBalance
    });

  } catch (error) {
    if (transaction && !transaction.finished) {
      await transaction.rollback();
      console.error("[DEBUG] Transaction rolled back due to error");
    }
    console.error("[DEBUG] Error in createTournament", error);
    next(error);
  }
};

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

const { Op } = require('sequelize');

const joinTournament = async (req, res, next) => {
  let transaction;
  let tournament;
  let user;
  let participant;
  let updatedSlots;
  let newBalance;
  let tournamentJustLocked = false;

  const paymentProcessingEnabled = process.env.PAYMENT_PROCESSING_ENABLED === 'true';

  try {
    const { id } = req.params;
    const user_id = req.user.id;
    const { gamer_tag } = req.body;

    // Input validation - safe checks that won't break existing code
    if (!id || (typeof id !== 'string' && typeof id !== 'number')) {
      return res.status(400).json({ message: 'Invalid tournament ID.' });
    }

    if (!gamer_tag || typeof gamer_tag !== 'string' || gamer_tag.trim().length === 0) {
      return res.status(400).json({ message: 'Valid gamer tag is required.' });
    }

    // Safe numeric validation
    const tournamentId = parseInt(id, 10);
    if (isNaN(tournamentId) || tournamentId <= 0) {
      return res.status(400).json({ message: 'Invalid tournament ID format.' });
    }

    transaction = await sequelize.transaction();

    try {
      // 1. Get tournament with safer locking
      tournament = await Tournament.findByPk(tournamentId, {
        include: [
          { model: Game, as: 'game' },
          { model: Platform, as: 'platform' },
          { model: GameMode, as: 'game_mode' }
        ],
        transaction,
        lock: transaction.LOCK.UPDATE // More specific lock type
      });

      if (!tournament) {
        await transaction.rollback();
        return res.status(404).json({ message: 'Tournament not found.' });
      }

      // 2. Validate tournament status with more specific checks
      if (!['open', 'waiting'].includes(tournament.status)) {
        await transaction.rollback();
        return res.status(400).json({ 
          message: `Tournament cannot be joined. Current status: ${tournament.status}.` 
        });
      }

      // 3. Check slot availability with boundary check
      if (tournament.current_slots >= tournament.total_slots) {
        await transaction.rollback();
        return res.status(400).json({ message: 'Tournament is already full.' });
      }

      // 4. Check duplicate participation
      const existingParticipant = await TournamentParticipant.findOne({
        where: { tournament_id: tournamentId, user_id },
        transaction
      });

      if (existingParticipant) {
        await transaction.rollback();
        return res.status(400).json({ message: 'You are already registered for this tournament.' });
      }

      // 5. Fetch user with safer locking
      user = await User.findByPk(user_id, { 
        transaction, 
        lock: transaction.LOCK.UPDATE 
      });

      if (!user) {
        await transaction.rollback();
        return res.status(404).json({ message: 'User not found.' });
      }

      
      newBalance = parseFloat(user.wallet_balance);

      // Safer float handling with rounding
      if (paymentProcessingEnabled) {
        const entryFee = parseFloat(tournament.entry_fee);
        const currentBalance = parseFloat(user.wallet_balance);
        
        // Validate numeric values
        if (isNaN(entryFee) || isNaN(currentBalance)) {
          await transaction.rollback();
          return res.status(500).json({ message: 'Invalid numeric values in payment processing.' });
        }

        if (currentBalance < entryFee) {
          await transaction.rollback();
          return res.status(400).json({ 
            message: `Insufficient balance. Required: ${entryFee.toFixed(2)}, Available: ${currentBalance.toFixed(2)}.` 
          });
        }

        // Safer calculation with rounding
        newBalance = Math.round((currentBalance - entryFee) * 100) / 100;

        // Deduct entry fee
        await user.update({ wallet_balance: newBalance }, { transaction });

        // Record transaction with validation
        await Transaction.create({
          user_id,
          type: 'tournament_entry',
          amount: entryFee,
          balance_before: currentBalance,
          balance_after: newBalance,
          status: 'completed',
          description: `Entry fee for tournament: ${tournament.name}`,
          tournament_id: tournament.id
        }, { transaction });
      }

      // 6. Register participant with validation
      const safeGamerTag = gamer_tag.trim().substring(0, 255); // Prevent overflow
      participant = await TournamentParticipant.create({
        tournament_id: tournamentId,
        user_id,
        gamer_tag: safeGamerTag || user.username,
        checked_in: true
      }, { transaction });

      // 7. Update slots with boundary check
      updatedSlots = tournament.current_slots + 1;
      if (updatedSlots > tournament.total_slots) {
        await transaction.rollback();
        return res.status(400).json({ message: 'Tournament slot count exceeded.' });
      }

      await tournament.update({ current_slots: updatedSlots }, { transaction });

      // 8. Lock tournament if full with additional check
      if (updatedSlots >= tournament.total_slots) {
        await tournament.update({ status: 'locked' }, { transaction });
        tournamentJustLocked = true;
      }

      await transaction.commit();

    } catch (innerError) {
      await transaction.rollback();
      throw innerError; // Re-throw to outer catch
    }

    // ========== AFTER COMMIT (safe zone) ==========

    // Bracket generation with timeout and better error handling
    if (tournamentJustLocked) {
      try {
        // Add timeout to prevent hanging
        const bracketPromise = generateTournamentBracket(tournament.id);
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Bracket generation timeout')), 30000);
        });
        
        await Promise.race([bracketPromise, timeoutPromise]);
      } catch (bracketErr) {
        /*console.error('Bracket generation failed:', {
          error: bracketErr.message,
          tournamentId: tournament.id,
          timestamp: new Date().toISOString()
        });*/
        // Don't fail the entire request - bracket can be generated manually later
      }
    }

    // Notifications with better error handling
    try {
      const notificationPromises = [];
      
      notificationPromises.push(
        NotificationService.createNotification(
          tournament.created_by,
          'New Participant',
          `User ${user.username} has joined your tournament "${tournament.name}".`,
          'tournament',
          'tournament',
          tournament.id
        ).catch(err => console.error('Creator notification failed:', err))
      );

      notificationPromises.push(
        NotificationService.createNotification(
          user_id,
          'Tournament Joined',
          `You have successfully joined the tournament "${tournament.name}".`,
          'tournament',
          'tournament',
          tournament.id
        ).catch(err => console.error('User notification failed:', err))
      );

      await Promise.allSettled(notificationPromises);
    } catch (notifyErr) {
     // console.error("Notification system error:", notifyErr);
    }

    // Safe response construction
    const response = {
      message: 'Successfully joined the tournament!',
      participant: {
        id: participant.id,
        gamer_tag: participant.gamer_tag,
        user_id: participant.user_id
      },
      tournament_status: tournamentJustLocked ? 'locked' : tournament.status,
      current_slots: updatedSlots,
      chat_channel_id:tournament.chat_channel_id
    };

    if (paymentProcessingEnabled) {
      response.new_balance = newBalance;
      response.entry_fee_deducted = parseFloat(tournament.entry_fee);
    }

    res.json(response);

  } catch (error) {
    // Safer transaction rollback check
    if (transaction && typeof transaction.rollback === 'function') {
      try {
        await transaction.rollback();
      } catch (rollbackError) {
        //console.error('Transaction rollback failed:', rollbackError);
      }
    }

    // Specific error handling
    if (error.name === 'SequelizeTimeoutError') {
      return res.status(408).json({ message: 'Request timeout. Please try again.' });
    }

    if (error.name === 'SequelizeDatabaseError') {
      return res.status(500).json({ message: 'Database error occurred.' });
    }

    if (error.name === 'SequelizeValidationError') {
      return res.status(400).json({ 
        message: 'Validation failed.',
        errors: error.errors?.map(err => err.message) 
      });
    }

    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(400).json({ message: 'Duplicate entry detected.' });
    }

    // Generic error (don't leak details)
   /* console.error('Tournament join error:', {
      error: error.message,
      userId: req.user?.id,
      tournamentId: req.params?.id,
      timestamp: new Date().toISOString()
    });*/

    res.status(500).json({ message: 'An error occurred while joining the tournament.' });
  }
};

/*const joinTournament = async (req, res, next) => {
  let transaction;
  let tournament;
  let user;
  let participant;
  let updatedSlots;
  let newBalance;
  let tournamentJustLocked = false;
  const paymentProcessingEnabled = process.env.PAYMENT_PROCESSING_ENABLED === 'true';

  console.log("===== [JOIN TOURNAMENT START] =====");

  try {
    const { id } = req.params;
    const user_id = req.user.id;
    const { gamer_tag } = req.body;

    console.log("Step 1: Input received", { id, user_id, gamer_tag });

    if (!id || (typeof id !== 'string' && typeof id !== 'number')) {
      console.log("❌ Invalid tournament ID input");
      return res.status(400).json({ message: 'Invalid tournament ID.' });
    }

    if (!gamer_tag || typeof gamer_tag !== 'string' || gamer_tag.trim().length === 0) {
      console.log("❌ Invalid gamer_tag input");
      return res.status(400).json({ message: 'Valid gamer tag is required.' });
    }

    const tournamentId = parseInt(id, 10);
    if (isNaN(tournamentId) || tournamentId <= 0) {
      console.log("❌ Tournament ID not a valid number", { tournamentId });
      return res.status(400).json({ message: 'Invalid tournament ID format.' });
    }

    console.log("Step 2: Starting DB transaction");
    transaction = await sequelize.transaction();

    try {
      console.log("Step 3: Fetching tournament", { tournamentId });
      tournament = await Tournament.findByPk(tournamentId, {
        include: [
          { model: Game, as: 'game' },
          { model: Platform, as: 'platform' },
          { model: GameMode, as: 'game_mode' }
        ],
        transaction,
        lock: transaction.LOCK.UPDATE
      });

      if (!tournament) {
        console.log("❌ Tournament not found");
        await transaction.rollback();
        return res.status(404).json({ message: 'Tournament not found.' });
      }
      console.log("✅ Tournament found", { status: tournament.status, slots: tournament.current_slots });

      if (!['open', 'waiting'].includes(tournament.status)) {
        console.log("❌ Tournament not joinable", { status: tournament.status });
        await transaction.rollback();
        return res.status(400).json({ 
          message: `Tournament cannot be joined. Current status: ${tournament.status}.` 
        });
      }

      if (tournament.current_slots >= tournament.total_slots) {
        console.log("❌ Tournament is already full");
        await transaction.rollback();
        return res.status(400).json({ message: 'Tournament is already full.' });
      }

      console.log("Step 4: Checking duplicate participation");
      const existingParticipant = await TournamentParticipant.findOne({
        where: { tournament_id: tournamentId, user_id },
        transaction
      });

      if (existingParticipant) {
        console.log("❌ User already registered");
        await transaction.rollback();
        return res.status(400).json({ message: 'You are already registered for this tournament.' });
      }

      console.log("Step 5: Fetching user", { user_id });
      user = await User.findByPk(user_id, { 
        transaction, 
        lock: transaction.LOCK.UPDATE 
      });

      if (!user) {
        console.log("❌ User not found in DB");
        await transaction.rollback();
        return res.status(404).json({ message: 'User not found.' });
      }
      console.log("✅ User fetched", { wallet_balance: user.wallet_balance });

      
      newBalance = parseFloat(user.wallet_balance);

      if (paymentProcessingEnabled) {
        console.log("Step 6: Payment processing enabled");

        const entryFee = parseFloat(tournament.entry_fee);
        const currentBalance = parseFloat(user.wallet_balance);

        console.log("Checking balance", { entryFee, currentBalance });

        if (isNaN(entryFee) || isNaN(currentBalance)) {
          console.log("❌ Invalid numeric values", { entryFee, currentBalance });
          await transaction.rollback();
          return res.status(500).json({ message: 'Invalid numeric values in payment processing.' });
        }

        if (currentBalance < entryFee) {
          console.log("❌ Insufficient balance", { required: entryFee, available: currentBalance });
          await transaction.rollback();
          return res.status(400).json({ 
            message: `Insufficient balance. Required: ${entryFee.toFixed(2)}, Available: ${currentBalance.toFixed(2)}.` 
          });
        }

        newBalance = Math.round((currentBalance - entryFee) * 100) / 100;
        console.log("✅ Balance check passed", { newBalance });

        await user.update({ wallet_balance: newBalance }, { transaction });
        console.log("✅ Balance updated in DB");

        await Transaction.create({
          user_id,
          type: 'tournament_entry',
          amount: entryFee,
          balance_before: currentBalance,
          balance_after: newBalance,
          status: 'completed',
          description: `Entry fee for tournament: ${tournament.name}`,
          tournament_id: tournament.id
        }, { transaction });
        console.log("✅ Transaction record created");
      }

      console.log("Step 7: Registering participant");
      const safeGamerTag = gamer_tag.trim().substring(0, 255);
      participant = await TournamentParticipant.create({
        tournament_id: tournamentId,
        user_id,
        gamer_tag: safeGamerTag || user.username,
        checked_in: true
      }, { transaction });
      console.log("✅ Participant registered", { participantId: participant.id });

      updatedSlots = tournament.current_slots + 1;
      if (updatedSlots > tournament.total_slots) {
        console.log("❌ Tournament slot overflow", { updatedSlots, total: tournament.total_slots });
        await transaction.rollback();
        return res.status(400).json({ message: 'Tournament slot count exceeded.' });
      }

      await tournament.update({ current_slots: updatedSlots }, { transaction });
      console.log("✅ Tournament slot updated", { updatedSlots });

      if (updatedSlots >= tournament.total_slots) {
        await tournament.update({ status: 'locked' }, { transaction });
        tournamentJustLocked = true;
        console.log("✅ Tournament locked because it is full");
      }

      await transaction.commit();
      console.log("✅ Transaction committed");

    } catch (innerError) {
      console.error("❌ Inner error during transaction:", innerError);
      await transaction.rollback();
      throw innerError;
    }

    if (tournamentJustLocked) {
      console.log("Step 8: Generating tournament bracket");
      try {
        const bracketPromise = generateTournamentBracket(tournament.id);
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Bracket generation timeout')), 30000);
        });
        
        await Promise.race([bracketPromise, timeoutPromise]);
        console.log("✅ Bracket generation done");
      } catch (bracketErr) {
        console.error("❌ Bracket generation failed", { error: bracketErr.message });
      }
    }

    console.log("Step 9: Sending notifications");
    try {
      const notificationPromises = [];

      notificationPromises.push(
        NotificationService.createNotification(
          tournament.created_by,
          'New Participant',
          `User ${user.username} has joined your tournament "${tournament.name}".`,
          'tournament',
          'tournament',
          tournament.id
        ).catch(err => console.error('❌ Creator notification failed:', err))
      );

      notificationPromises.push(
        NotificationService.createNotification(
          user_id,
          'Tournament Joined',
          `You have successfully joined the tournament "${tournament.name}".`,
          'tournament',
          'tournament',
          tournament.id
        ).catch(err => console.error('❌ User notification failed:', err))
      );

      await Promise.allSettled(notificationPromises);
      console.log("✅ Notifications sent");
    } catch (notifyErr) {
      console.error("❌ Notification system error:", notifyErr);
    }

    const response = {
      message: 'Successfully joined the tournament!',
      participant: {
        id: participant.id,
        gamer_tag: participant.gamer_tag,
        user_id: participant.user_id
      },
      tournament_status: tournamentJustLocked ? 'locked' : tournament.status,
      current_slots: updatedSlots
    };

    if (paymentProcessingEnabled) {
      response.new_balance = newBalance;
      response.entry_fee_deducted = parseFloat(tournament.entry_fee);
    }

    console.log("===== [JOIN TOURNAMENT SUCCESS] =====", response);
    res.json(response);

  } catch (error) {
    console.error("❌ Outer error in joinTournament:", error.message);

    if (transaction && typeof transaction.rollback === 'function') {
      try {
        await transaction.rollback();
        console.log("✅ Transaction rolled back in outer catch");
      } catch (rollbackError) {
        console.error("❌ Rollback failed in outer catch:", rollbackError);
      }
    }

    if (error.name === 'SequelizeTimeoutError') {
      return res.status(408).json({ message: 'Request timeout. Please try again.' });
    }
    if (error.name === 'SequelizeDatabaseError') {
      return res.status(500).json({ message: 'Database error occurred.' });
    }
    if (error.name === 'SequelizeValidationError') {
      return res.status(400).json({ 
        message: 'Validation failed.',
        errors: error.errors?.map(err => err.message) 
      });
    }
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(400).json({ message: 'Duplicate entry detected.' });
    }

    res.status(500).json({ message: 'An error occurred while joining the tournament.' });
  }
};*/


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
const getMyTournaments = async (req, res, next) => {
  try {
    const user_id = req.user.id;
    const { status, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    // Get tournaments created by the user
    const createdWhereClause = { created_by: user_id };
    if (status) {
      createdWhereClause.status = status;
    }

    const createdTournaments = await Tournament.findAll({
      where: createdWhereClause,
      include: [
        { model: Game, as: 'game', attributes: ['name', 'logo_url'] },
        { model: Platform, as: 'platform', attributes: ['name'] },
        { model: GameMode, as: 'game_mode', attributes: ['name'] },
        { 
          model: TournamentParticipant, 
          as: 'participants',
          attributes: ['id']
        }
      ],
      order: [['created_at', 'DESC']]
    });

    // Get tournaments where the user is a participant
    const participatingTournaments = await Tournament.findAll({
      include: [
        { model: Game, as: 'game', attributes: ['name', 'logo_url'] },
        { model: Platform, as: 'platform', attributes: ['name'] },
        { model: GameMode, as: 'game_mode', attributes: ['name'] },
        { 
          model: TournamentParticipant, 
          as: 'participants',
          where: { user_id: user_id },
          required: true,
          attributes: ['id']
        }
      ],
      order: [['created_at', 'DESC']]
    });

    // Combine and deduplicate tournaments
    const allTournaments = [...createdTournaments, ...participatingTournaments];
    const uniqueTournaments = allTournaments.filter((tournament, index, self) => 
      index === self.findIndex(t => t.id === tournament.id)
    );

    // Apply pagination
    const paginatedTournaments = uniqueTournaments.slice(offset, offset + parseInt(limit));

    // Add participation role to each tournament
    const tournamentsWithRole = paginatedTournaments.map(tournament => {
      const isCreator = tournament.created_by === user_id;
      const isParticipant = tournament.participants.some(p => p.user_id === user_id);
      
      let role = 'participant';
      if (isCreator && isParticipant) role = 'creator_and_participant';
      else if (isCreator) role = 'creator';
      
      return {
        ...tournament.toJSON(),
        role: role
      };
    });

    res.json({
      tournaments: tournamentsWithRole,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: uniqueTournaments.length,
        pages: Math.ceil(uniqueTournaments.length / limit)
      }
    });
  } catch (error) {
    next(error);
  }
};

/*const getMyTournaments = async (req, res, next) => {
  try {
    const user_id = req.user.id;
    const { status, page = 1, limit = 20 } = req.query;

    // Parse integers safely
    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 20;
    const offset = (pageNum - 1) * limitNum;

    console.log(`[DEBUG] User ID: ${user_id}, Status filter: ${status}, Page: ${pageNum}, Limit: ${limitNum}`);

    // Get tournaments created by the user
    const createdWhereClause = { created_by: user_id };
    if (status) {
      createdWhereClause.status = status;
    }

    const createdTournaments = await Tournament.findAll({
      where: createdWhereClause,
      include: [
        { model: Game, as: 'game', attributes: ['name', 'logo_url'] },
        { model: Platform, as: 'platform', attributes: ['name'] },
        { model: GameMode, as: 'game_mode', attributes: ['name'] },
        { 
          model: TournamentParticipant, 
          as: 'participants',
          attributes: ['id', 'user_id'] 
        }
      ],
      order: [['created_at', 'DESC']]
    });

    console.log(`[DEBUG] Created tournaments fetched: ${createdTournaments.length}`);
    console.log('[DEBUG] Sample created tournament participants:', createdTournaments[0]?.participants || []);

    // Get tournaments where the user is a participant
    const participatingTournaments = await Tournament.findAll({
      include: [
        { model: Game, as: 'game', attributes: ['name', 'logo_url'] },
        { model: Platform, as: 'platform', attributes: ['name'] },
        { model: GameMode, as: 'game_mode', attributes: ['name'] },
        { 
          model: TournamentParticipant, 
          as: 'participants',
          where: { user_id: user_id },
          required: true,
          attributes: ['id', 'user_id']
        }
      ],
      order: [['created_at', 'DESC']]
    });

    console.log(`[DEBUG] Participating tournaments fetched: ${participatingTournaments.length}`);
    console.log('[DEBUG] Sample participating tournament participants:', participatingTournaments[0]?.participants || []);

    // Combine and deduplicate tournaments
    const allTournaments = [...createdTournaments, ...participatingTournaments];
    console.log(`[DEBUG] Combined tournaments count: ${allTournaments.length}`);

    const uniqueTournaments = allTournaments.filter((tournament, index, self) => 
      index === self.findIndex(t => t.id === tournament.id)
    );
    console.log(`[DEBUG] Unique tournaments after deduplication: ${uniqueTournaments.length}`);

    // Apply pagination
    const paginatedTournaments = uniqueTournaments.slice(offset, offset + limitNum);
    console.log(`[DEBUG] Paginated tournaments count: ${paginatedTournaments.length}`);

    // Add participation role to each tournament
    const tournamentsWithRole = paginatedTournaments.map(tournament => {
      const isCreator = tournament.created_by === user_id;
      const isParticipant = tournament.participants.some(p => p.user_id === user_id);

      let role = 'participant';
      if (isCreator && isParticipant) role = 'creator_and_participant';
      else if (isCreator) role = 'creator';

      return {
        ...tournament.toJSON(),
        role: role
      };
    });

    console.log('[DEBUG] Tournaments with roles:', tournamentsWithRole.map(t => ({ id: t.id, role: t.role })));

    res.json({
      tournaments: tournamentsWithRole,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: uniqueTournaments.length,
        pages: Math.ceil(uniqueTournaments.length / limitNum)
      }
    });

  } catch (error) {
    console.error('[DEBUG] Error in getMyTournaments:', error);
    next(error);
  }
};*/


const updateTournament = async (req, res, next) => {
  let transaction;
  try {
    const { id } = req.params;
    const user_id = req.user.id;
    const {
      name, game_id, platform_id, game_mode_id, format,
      entry_fee, total_slots, start_time, rules, visibility,
      prize_distribution,chat_channel_id
    } = req.body;

    transaction = await sequelize.transaction();

    // Find the tournament
    const tournament = await Tournament.findByPk(id, { transaction });
    if (!tournament) {
      await transaction.rollback();
      return res.status(404).json({ message: 'Tournament not found.' });
    }

    // Check if user owns the tournament
    if (tournament.created_by !== user_id) {
      await transaction.rollback();
      return res.status(403).json({ message: 'You can only edit your own tournaments.' });
    }

    // Check if tournament can still be edited
    if (tournament.status !== 'open') {
      await transaction.rollback();
      return res.status(400).json({ message: 'Tournament can no longer be edited.' });
    }

    // Update tournament
    await tournament.update({
      name: name || tournament.name,
      game_id: game_id || tournament.game_id,
      platform_id: platform_id || tournament.platform_id,
      game_mode_id: game_mode_id || tournament.game_mode_id,
      format: format || tournament.format,
      entry_fee: entry_fee || tournament.entry_fee,
      total_slots: total_slots || tournament.total_slots,
      start_time: start_time || tournament.start_time,
      rules: rules !== undefined ? rules : tournament.rules,
      visibility: visibility || tournament.visibility,
      chat_channel_id : chat_channel_id ||tournament.chat_channel_id ||null

    }, { transaction });

    // Update prize distribution if provided
    if (prize_distribution && prize_distribution.length > 0) {
      // Delete existing prizes
      await TournamentPrize.destroy({
        where: { tournament_id: id },
        transaction
      });

      // Create new prizes
      const prizePromises = prize_distribution.map(prize => {
        return TournamentPrize.create({
          tournament_id: id,
          position: prize.position,
          percentage: prize.percentage
        }, { transaction });
      });

      await Promise.all(prizePromises);
    }

    await transaction.commit();

    // Get updated tournament with associations
    const updatedTournament = await Tournament.findByPk(id, {
      include: [
        { model: Game, as: 'game', attributes: ['name'] },
        { model: Platform, as: 'platform', attributes: ['name'] },
        { model: GameMode, as: 'game_mode', attributes: ['name'] },
        { model: TournamentPrize, as: 'prizes', attributes: ['position', 'percentage'] }
      ]
    });

    res.json({
      message: 'Tournament updated successfully',
      tournament: updatedTournament
    });

  } catch (error) {
    if (transaction && !transaction.finished) {
      await transaction.rollback();
    }
    next(error);
  }
};

const deleteTournament = async (req, res, next) => {
  let transaction;
  try {
    const { id } = req.params;
    const user_id = req.user.id;

    console.debug(`[DEBUG] Delete request for tournament ${id} by user ${user_id}`);

    transaction = await sequelize.transaction();

    // 1. Fetch tournament with participants
    const tournament = await Tournament.findByPk(id, {
      include: [{
        model: TournamentParticipant,
        as: 'participants',
        include: [{
          model: User,
          as: 'user'
        }]
      }],
      transaction
    });

    if (!tournament) {
      await transaction.rollback();
      return res.status(404).json({ message: 'Tournament not found.' });
    }

    console.debug(`[DEBUG] Tournament fetched: ${tournament.id}, status: ${tournament.status}, created_by: ${tournament.created_by}`);

    // 2. Verify permissions
    if (tournament.created_by !== user_id) {
      await transaction.rollback();
      return res.status(403).json({ message: 'You can only delete your own tournaments.' });
    }

    // 3. Only open tournaments can be deleted
    if (tournament.status !== 'open') {
      await transaction.rollback();
      return res.status(400).json({ message: 'Only open tournaments can be deleted.' });
    }

    // Array to hold notifications for after commit
    const notifications = [];

    // 4. Refund entry fee to participants
    for (const participant of tournament.participants) {
      const user = participant.user;
      if (!user) continue;

      const walletBalance = parseFloat(user.wallet_balance || 0);
      const entryFee = parseFloat(tournament.entry_fee || 0);
      const newBalance = walletBalance + entryFee;

      console.debug(`[DEBUG] Refunding user ${user.id}: ${walletBalance} + ${entryFee} = ${newBalance}`);

      // Update balance
      await User.update(
        { wallet_balance: newBalance },
        { where: { id: user.id }, transaction }
      );

      // Record refund transaction
      await Transaction.create({
        user_id: user.id,
        type: 'refund',
        amount: entryFee,
        balance_before: walletBalance,
        balance_after: newBalance,
        status: 'completed',
        description: `Refund for deleted tournament: ${tournament.name}`
      }, { transaction });

      // Save notification for later
      notifications.push({
        user_id: user.id,
        title: 'Tournament Cancelled',
        message: `The tournament "${tournament.name}" has been cancelled by the creator. Your entry fee of ${entryFee} has been refunded.`,
        type: 'tournament',
        referenceType: 'tournament',
        referenceId: tournament.id
      });
    }

    // 5. Delete prizes, participants, and tournament
    await TournamentPrize.destroy({ where: { tournament_id: id }, transaction });
    await TournamentParticipant.destroy({ where: { tournament_id: id }, transaction });
    await Tournament.destroy({ where: { id }, transaction });

    await transaction.commit();
    console.debug(`[DEBUG] Tournament ${id} deleted successfully.`);

    // 6. Send notifications OUTSIDE the transaction
    for (const note of notifications) {
      await NotificationService.createNotification(
        note.user_id,
        note.title,
        note.message,
        note.type,
        note.referenceType,
        note.referenceId
      );
      console.debug(`[DEBUG] Notification sent to user ${note.user_id}`);
    }

    res.json({
      message: 'Tournament deleted successfully. All entry fees have been refunded to participants.'
    });

  } catch (error) {
    if (transaction && !transaction.finished) {
      await transaction.rollback();
    }
    console.error('[ERROR] deleteTournament failed:', error);
    next(error);
  }
};


/*const startTournament = async (req, res, next) => {
  let transaction;
  let tournament;

  try {
    const { id } = req.params;
    const user_id = req.user.id;

    // Input validation
    if (!id || (typeof id !== 'string' && typeof id !== 'number')) {
      return res.status(400).json({ message: 'Invalid tournament ID.' });
    }

    const tournamentId = parseInt(id, 10);
    if (isNaN(tournamentId) || tournamentId <= 0) {
      return res.status(400).json({ message: 'Invalid tournament ID format.' });
    }

    transaction = await sequelize.transaction();

    try {
      // Find the tournament with lock
      tournament = await Tournament.findByPk(tournamentId, { 
        transaction,
        lock: transaction.LOCK.UPDATE
      });

      if (!tournament) {
        await transaction.rollback();
        return res.status(404).json({ message: 'Tournament not found.' });
      }

      // Check if user owns the tournament
      if (tournament.created_by !== user_id) {
        await transaction.rollback();
        return res.status(403).json({ message: 'Only the tournament creator can start it.' });
      }

      // Check if tournament can be started with more specific validation
      const validStartStates = ['open', 'locked'];
      if (!validStartStates.includes(tournament.status)) {
        await transaction.rollback();
        return res.status(400).json({ 
          message: `Tournament cannot be started from ${tournament.status} state. Must be 'open' or 'locked'.` 
        });
      }

      // Check if tournament has enough participants with boundary check
      if (tournament.current_slots < 2) {
        await transaction.rollback();
        return res.status(400).json({ 
          message: `Tournament needs at least 2 participants to start. Current: ${tournament.current_slots}.` 
        });
      }

      // Check if bracket already exists to avoid regeneration
      const existingBracket = await TournamentBracket.findOne({
        where: { tournament_id: tournamentId },
        transaction
      });

      // Generate initial bracket if not already generated (inside transaction)
      if (!existingBracket) {
        try {
          // Assuming generateTournamentBracket can accept transaction parameter
          await generateTournamentBracket(tournamentId, transaction);
        } catch (bracketError) {
          await transaction.rollback();
          console.error('Bracket generation failed:', bracketError);
          return res.status(500).json({ 
            message: 'Failed to generate tournament bracket. Please try again.' 
          });
        }
      }

      // Update tournament status
      await tournament.update({
        status: 'live',
        started_at: new Date() // Add timestamp for when tournament started
      }, { transaction });

      await transaction.commit();

    } catch (innerError) {
      await transaction.rollback();
      throw innerError;
    }

    // ========== AFTER COMMIT (safe operations) ==========

    // Notify participants that tournament has started
    try {
      const participants = await TournamentParticipant.findAll({
        where: { tournament_id: tournamentId },
        include: [{ model: User, attributes: ['id'] }]
      });

      const notificationPromises = participants.map(participant =>
        NotificationService.createNotification(
          participant.user_id,
          'Tournament Started',
          `Tournament "${tournament.name}" has started! Check your bracket.`,
          'tournament',
          'tournament',
          tournamentId
        ).catch(err => console.error(`Notification failed for user ${participant.user_id}:`, err))
      );

      await Promise.allSettled(notificationPromises);
    } catch (notifyErr) {
      console.error('Participant notification failed:', notifyErr);
    }

    // Safe response - don't send entire tournament object, just necessary fields
    res.json({
      message: 'Tournament started successfully!',
      tournament: {
        id: tournament.id,
        name: tournament.name,
        status: tournament.status,
        current_slots: tournament.current_slots,
        started_at: tournament.started_at
      },
      bracket_generated: !existingBracket // Indicate if new bracket was created
    });

  } catch (error) {
    // Safe transaction rollback
    if (transaction && typeof transaction.rollback === 'function') {
      try {
        await transaction.rollback();
      } catch (rollbackError) {
        console.error('Transaction rollback failed:', rollbackError);
      }
    }

    // Specific error handling
    if (error.name === 'SequelizeTimeoutError') {
      return res.status(408).json({ message: 'Request timeout. Please try again.' });
    }

    if (error.name === 'SequelizeDatabaseError') {
      return res.status(500).json({ message: 'Database error occurred.' });
    }

    if (error.name === 'SequelizeValidationError') {
      return res.status(400).json({ 
        message: 'Validation failed.',
        errors: error.errors?.map(err => err.message) 
      });
    }

    // Generic error handling
    console.error('Tournament start error:', {
      error: error.message,
      userId: req.user?.id,
      tournamentId: req.params?.id,
      timestamp: new Date().toISOString()
    });

    res.status(500).json({ message: 'An error occurred while starting the tournament.' });
  }
};*/
/*const startTournament = async (req, res, next) => {
  let transaction;
  let tournament;

  console.log('===== [START TOURNAMENT START] =====');

  try {
    const { id } = req.params;
    const user_id = req.user.id;

    console.log('Step 1: Input received', { id, user_id });

    // Input validation
    if (!id || (typeof id !== 'string' && typeof id !== 'number')) {
      return res.status(400).json({ message: 'Invalid tournament ID.' });
    }

    const tournamentId = parseInt(id, 10);
    if (isNaN(tournamentId) || tournamentId <= 0) {
      return res.status(400).json({ message: 'Invalid tournament ID format.' });
    }

    console.log('Step 2: Starting DB transaction');
    transaction = await sequelize.transaction();

    try {
      // Step 3: Fetch tournament with lock
      console.log('Step 3: Fetching tournament', { tournamentId });
      tournament = await Tournament.findByPk(tournamentId, {
        transaction,
        lock: transaction.LOCK.UPDATE
      });

      if (!tournament) {
        console.log('❌ Tournament not found');
        await transaction.rollback();
        return res.status(404).json({ message: 'Tournament not found.' });
      }
      console.log('✅ Tournament fetched', {
        status: tournament.status,
        current_slots: tournament.current_slots,
        total_slots: tournament.total_slots
      });

      // Step 4: Check ownership
      if (tournament.created_by !== user_id) {
        console.log('❌ User is not the tournament creator');
        await transaction.rollback();
        return res.status(403).json({ message: 'Only the tournament creator can start it.' });
      }

      // Step 5: Check tournament status
      const validStartStates = ['open', 'locked'];
      if (!validStartStates.includes(tournament.status)) {
        console.log('❌ Invalid tournament state for starting', { state: tournament.status });
        await transaction.rollback();
        return res.status(400).json({ 
          message: `Tournament cannot be started from ${tournament.status} state. Must be 'open' or 'locked'.` 
        });
      }

      // Step 6: Tournament must be FULL to start
      if (tournament.current_slots !== tournament.total_slots) {
        console.log('❌ Tournament not full yet', { current: tournament.current_slots, total: tournament.total_slots });
        await transaction.rollback();
        return res.status(400).json({ 
          message: `Tournament must be full to start. Current: ${tournament.current_slots}, Required: ${tournament.total_slots}.` 
        });
      }

      // Step 7: Check if matches already exist
      console.log('Step 7: Checking for existing matches');
      const existingMatches = await Match.findOne({
        where: { tournament_id: tournamentId },
        transaction
      });

      if (!existingMatches) {
        console.log('No existing matches found, generating bracket...');
        const participants = await TournamentParticipant.findAll({
          where: { tournament_id: tournamentId },
          transaction
        });

        await generateBracket(tournamentId, participants, transaction);
        console.log('✅ Bracket generated successfully');
      } else {
        console.log('✅ Matches already exist, skipping bracket generation');
      }

      // Step 8: Update tournament status
      await tournament.update({
        status: 'live',
        started_at: new Date()
      }, { transaction });

      await transaction.commit();
      console.log('✅ Transaction committed');

    } catch (innerError) {
      console.log('❌ Inner transaction error', innerError);
      if (transaction && typeof transaction.rollback === 'function') {
        try {
          await transaction.rollback();
          console.log('✅ Transaction rolled back');
        } catch (rollbackError) {
          console.error('❌ Transaction rollback failed:', rollbackError);
        }
      }
      throw innerError;
    }

    // AFTER COMMIT: Notifications
    try {
      console.log('Step 9: Sending notifications to participants');
      const participants = await TournamentParticipant.findAll({
        where: { tournament_id: tournamentId },
        include: [
          {
            model: User,
            as: 'user', 
            attributes: ['id', 'username']
          }
        ]
      });


      const notificationPromises = participants.map(p =>
        NotificationService.createNotification(
          p.user_id,
          'Tournament Started',
          `Tournament "${tournament.name}" has started! Check your bracket.`,
          'tournament',
          'tournament',
          tournamentId
        ).catch(err => console.error(`Notification failed for user ${p.user_id}:`, err))
      );

      await Promise.allSettled(notificationPromises);
      console.log('✅ Notifications sent');
    } catch (notifyErr) {
      console.error('❌ Participant notification failed:', notifyErr);
    }

    res.json({
      message: 'Tournament started successfully!',
      tournament: {
        id: tournament.id,
        name: tournament.name,
        status: tournament.status,
        current_slots: tournament.current_slots,
        total_slots: tournament.total_slots,
        started_at: tournament.started_at
      },
      //bracket_generated: !existingMatches
    });

  } catch (error) {
    console.error('❌ Outer error in startTournament:', {
      error: error.message,
      userId: req.user?.id,
      tournamentId: req.params?.id,
      timestamp: new Date().toISOString()
    });

    if (transaction && typeof transaction.rollback === 'function') {
      try {
        await transaction.rollback();
        console.log('✅ Outer rollback succeeded');
      } catch (rollbackError) {
        console.error('❌ Outer rollback failed', rollbackError);
      }
    }

    res.status(500).json({ message: 'An error occurred while starting the tournament.' });
  }
};*/

const startTournament = async (req, res) => {
  let transaction;

  console.log('===== [START TOURNAMENT] =====');

  try {
    const { id } = req.params;
    const userId = req.user?.id;

    // Step 1: Validate input
    if (!id || isNaN(parseInt(id, 10)) || parseInt(id, 10) <= 0) {
      return res.status(400).json({ message: 'Invalid tournament ID.' });
    }
    const tournamentId = parseInt(id, 10);

    // Step 2: Start transaction
    transaction = await sequelize.transaction();

    // Step 3: Fetch tournament with lock
    const tournament = await Tournament.findByPk(tournamentId, {
      transaction,
      lock: transaction.LOCK.UPDATE
    });

    if (!tournament) {
      await transaction.rollback();
      return res.status(404).json({ message: 'Tournament not found.' });
    }

    // Step 4: Ensure user is creator
    if (tournament.created_by !== userId) {
      await transaction.rollback();
      return res.status(403).json({ message: 'Only the tournament creator can start it.' });
    }

    // Step 5: Validate status
    if (!['open', 'locked'].includes(tournament.status)) {
      await transaction.rollback();
      return res.status(400).json({
        message: `Tournament cannot be started from state "${tournament.status}".`
      });
    }

    // Step 6: Ensure tournament is full
    if (tournament.current_slots !== tournament.total_slots) {
      await transaction.rollback();
      return res.status(400).json({
        message: `Tournament must be full before starting. Current: ${tournament.current_slots}, Required: ${tournament.total_slots}.`
      });
    }

    // Step 7: Check existing matches
    const existingMatch = await Match.findOne({
      where: { tournament_id: tournamentId },
      transaction
    });

    if (!existingMatch) {
      const participants = await TournamentParticipant.findAll({
        where: { tournament_id: tournamentId },
        transaction
      });

      await generateBracket(tournamentId, participants, transaction);
    }

    // Step 8: Update tournament status
    await tournament.update(
      { status: 'live', started_at: new Date() },
      { transaction }
    );

    await transaction.commit();

    // Step 9: Notifications (outside transaction)
    try {
      const participants = await TournamentParticipant.findAll({
        where: { tournament_id: tournamentId },
        include: [
          { model: User, as: 'user', attributes: ['id', 'username'] }
        ]
      });

      const notifications = participants.map(p =>
        NotificationService.createNotification(
          p.user_id,
          'Tournament Started',
          `Tournament "${tournament.name}" has started! Check your bracket.`,
          'tournament',
          'tournament',
          tournamentId
        ).catch(err => {
          console.error(`❌ Failed notification for user ${p.user_id}:`, err.message);
        })
      );

      await Promise.allSettled(notifications);
    } catch (notifyErr) {
      console.error('❌ Notification step failed:', notifyErr.message);
    }

    // ✅ Success response
    return res.json({
      message: 'Tournament started successfully!',
      tournament: {
        id: tournament.id,
        name: tournament.name,
        status: tournament.status,
        current_slots: tournament.current_slots,
        total_slots: tournament.total_slots,
        started_at: tournament.started_at
      }
    });
  } catch (error) {
    console.error('❌ startTournament error:', {
      error: error.message,
      userId: req.user?.id,
      tournamentId: req.params?.id,
      timestamp: new Date().toISOString()
    });

    if (transaction) {
      try {
        await transaction.rollback();
      } catch (rollbackError) {
        console.error('❌ Failed to rollback transaction:', rollbackError.message);
      }
    }

    return res.status(500).json({
      message: 'An unexpected error occurred while starting the tournament.'
    });
  }
};

module.exports = { startTournament };


const finalizeTournament = async (req, res, next) => {
  let transaction;
  try {
    const { id } = req.params;
    const user_id = req.user.id;

    transaction = await sequelize.transaction();

    // Find the tournament
    const tournament = await Tournament.findByPk(id, {
      include: [{
        model: TournamentParticipant,
        as: 'participants',
        include: [{
          model: User,
          as: 'user'
        }]
      }],
      transaction
    });
    
    if (!tournament) {
      await transaction.rollback();
      return res.status(404).json({ message: 'Tournament not found.' });
    }

    // Check if user owns the tournament
    if (tournament.created_by !== user_id) {
      await transaction.rollback();
      return res.status(403).json({ message: 'Only the tournament creator can finalize it.' });
    }

    // Check if tournament can be finalized
    if (tournament.status !== 'live') {
      await transaction.rollback();
      return res.status(400).json({ message: 'Only live tournaments can be finalized.' });
    }

    // Update tournament status
    await tournament.update({
      status: 'completed'
    }, { transaction });

    // TODO: Implement prize distribution logic
    // This would distribute prizes to winners based on tournament_prizes table

    await transaction.commit();

    res.json({
      message: 'Tournament finalized successfully',
      tournament: tournament
    });

  } catch (error) {
    if (transaction && !transaction.finished) {
      await transaction.rollback();
    }
    next(error);
  }
};

const getTournamentMatches = async (req, res, next) => {
  try {
    const { id } = req.params;

    const matches = await Match.findAll({
      where: { tournament_id: id },
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
      ],
      order: [['round_number', 'ASC'], ['created_at', 'ASC']]
    });

    res.json(matches);
  } catch (error) {
    next(error);
  }
};

const getTournamentBracket = async (req, res, next) => {
  try {
    const { id } = req.params;

    const tournament = await Tournament.findByPk(id);
    if (!tournament) {
      return res.status(404).json({ message: 'Tournament not found.' });
    }

    const matches = await Match.findAll({
      where: { tournament_id: id },
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
          model: TournamentParticipant,
          as: 'winner',
          include: [{ model: User, as: 'user', attributes: ['id', 'username'] }]
        }
      ],
      order: [
        ['bracket_type', 'ASC'],
        ['round_number', 'ASC'],
        ['created_at', 'ASC']
      ]
    });

    // Group matches by bracket type and round
    const bracket = {
      winners: {},
      losers: {},
      finals: []
    };

    matches.forEach(match => {
      if (match.bracket_type === 'winners') {
        if (!bracket.winners[match.round_number]) {
          bracket.winners[match.round_number] = [];
        }
        bracket.winners[match.round_number].push(match);
      } else if (match.bracket_type === 'losers') {
        if (!bracket.losers[match.round_number]) {
          bracket.losers[match.round_number] = [];
        }
        bracket.losers[match.round_number].push(match);
      } else if (match.bracket_type === 'finals') {
        bracket.finals.push(match);
      }
    });

    res.json({
      tournament: {
        id: tournament.id,
        name: tournament.name,
        format: tournament.format,
        status: tournament.status,
        current_round: tournament.current_round
      },
      bracket
    });
  } catch (error) {
    next(error);
  }
};

const generateTournamentBracket = async (
  tournamentId,
  userId = null,
  transaction = null,
  isMiddlewareCall = false
) => {
  let localTransaction = transaction;
  let tournament;
  let participants = [];

  try {
    console.log('[DEBUG] generateTournamentBracket called', { tournamentId, userId });

    if (!localTransaction) {
      localTransaction = await sequelize.transaction();
      console.log('[DEBUG] Transaction started inside bracket generator');
    }

    // Normalize tournamentId (handle object case)
    const tournamentIdValue = typeof tournamentId === 'object' ? tournamentId.id : tournamentId;

    tournament = await Tournament.findByPk(tournamentIdValue, { transaction: localTransaction });
    console.log('[DEBUG] Tournament fetched:', tournament?.id, tournament?.status);

    if (!tournament) {
      if (!transaction) await localTransaction.rollback();
      const msg = 'Tournament not found.';
      console.log('[DEBUG] Error:', msg);
      if (isMiddlewareCall) throw new Error(msg);
      return { error: msg };
    }

    if (userId && tournament.created_by !== userId) {
      if (!transaction) await localTransaction.rollback();
      const msg = 'Only the tournament creator can generate the bracket.';
      console.log('[DEBUG] Error:', msg);
      if (isMiddlewareCall) throw new Error(msg);
      return { error: msg };
    }

    if (tournament.status !== 'locked') {
      if (!transaction) await localTransaction.rollback();
      const msg = 'Tournament must be locked before generating bracket.';
      console.log('[DEBUG] Error:', msg);
      if (isMiddlewareCall) throw new Error(msg);
      return { error: msg };
    }

    // Get participants inside transaction
    participants = await TournamentParticipant.findAll({
      where: { tournament_id: tournamentIdValue },
      transaction: localTransaction
    });
    console.log('[DEBUG] Participants fetched:', participants.length);

    // Generate matches inside transaction
    await generateBracket(tournamentIdValue, participants, localTransaction);
    console.log('[DEBUG] Bracket generated');

    // Update status -> live
    await tournament.update({ status: 'live' }, { transaction: localTransaction });
    console.log('[DEBUG] Tournament status updated to live');

    if (!transaction) await localTransaction.commit();
    console.log('[DEBUG] Transaction committed');

  } catch (err) {
    console.error('[DEBUG] Error in generateTournamentBracket:', err);
    if (!transaction && localTransaction && !localTransaction.finished) {
      await localTransaction.rollback();
      console.log('[DEBUG] Transaction rolled back');
    }
    if (isMiddlewareCall) throw err;
    return { error: err.message };
  }

  // ✅ Notifications after commit (no DB locks here)
  try {
    const participantsWithUsers = await TournamentParticipant.findAll({
      where: { tournament_id: tournament.id },
      include: [{ model: User, as: 'user' }]
    });

    for (const part of participantsWithUsers) {
      await NotificationService.createNotification(
        part.user_id,
        'Tournament Starting',
        `The tournament "${tournament.name}" is now full and live. The bracket has been generated.`,
        'tournament',
        'tournament',
        tournament.id
      );
    }
  } catch (notifyError) {
    console.error('[DEBUG] Notification sending failed:', notifyError);
    // Don’t break the flow if notifications fail
  }

  return { tournament };
};


const getTournamentManagementInfo = async (req, res, next) => {
  try {
    const { id } = req.params;
    const user_id = req.user.id;

    const tournament = await Tournament.findByPk(id, {
      include: [
        { model: Game, as: 'game', attributes: ['name', 'logo_url'] },
        { model: Platform, as: 'platform', attributes: ['name'] },
        { model: GameMode, as: 'game_mode', attributes: ['name'] },
        { 
          model: TournamentParticipant, 
          as: 'participants',
          include: [{ model: User, as: 'user', attributes: ['id', 'username', 'email'] }]
        },
        { model: TournamentPrize, as: 'prizes', attributes: ['position', 'percentage'] },
        {
          model: Match,
          as: 'matches',
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
        }
      ]
    });

    if (!tournament) {
      return res.status(404).json({ message: 'Tournament not found.' });
    }

    // Check if user owns the tournament or is admin
    if (tournament.created_by !== user_id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied.' });
    }

    res.json(tournament);
  } catch (error) {
    next(error);
  }
};

const advanceTournament = async (req, res, next) => {
  let transaction;
  try {
    const { id } = req.params;
    const user_id = req.user.id;

    transaction = await sequelize.transaction();

    const tournament = await Tournament.findByPk(id, { transaction });
    if (!tournament) {
      await transaction.rollback();
      return res.status(404).json({ message: 'Tournament not found.' });
    }

    // Check if user owns the tournament
    if (tournament.created_by !== user_id) {
      await transaction.rollback();
      return res.status(403).json({ message: 'Only the tournament creator can advance the tournament.' });
    }

    // Check if tournament is live
    if (tournament.status !== 'live') {
      await transaction.rollback();
      return res.status(400).json({ message: 'Tournament is not live.' });
    }

    // Get current round matches
    const currentRoundMatches = await Match.findAll({
      where: { 
        tournament_id: id,
        round_number: tournament.current_round || 1
      },
      transaction
    });

    // Check if all matches in current round are completed
    const incompleteMatches = currentRoundMatches.filter(match => match.status !== 'completed');
    if (incompleteMatches.length > 0) {
      await transaction.rollback();
      return res.status(400).json({ message: 'Not all matches in the current round are completed.' });
    }

    // Generate next round matches
    const nextRoundNumber = (tournament.current_round || 1) + 1;
    await generateNextRound(tournament, nextRoundNumber, transaction);

    // Update tournament current round
    await tournament.update({ current_round: nextRoundNumber }, { transaction });

    await transaction.commit();

    res.json({
      message: 'Tournament advanced to next round',
      tournament: tournament
    });

  } catch (error) {
    if (transaction && !transaction.finished) {
      await transaction.rollback();
    }
    next(error);
  }
};


module.exports = {
  createTournament,
  getTournaments,
  joinTournament, 
  getTournamentById,
  getMyTournaments,
  updateTournament,
  deleteTournament,
  startTournament,
  finalizeTournament,
  getTournamentMatches,
  getTournamentBracket,
  generateTournamentBracket,
  getTournamentManagementInfo,
  advanceTournament

};