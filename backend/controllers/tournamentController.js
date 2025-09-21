// controllers/tournamentController.js
const { Tournament,TournamentParticipant, TournamentPrize, Game, Platform, GameMode,User,Match ,Transaction} = require('../models');
const { validationResult } = require('express-validator');
const sequelize = require('../config/database');
const { generateBracket } = require('../services/bracketService');
const NotificationService = require('../services/notificationService');

const createTournament = async (req, res, next) => {
  let transaction;
  try {
    console.log("[DEBUG] createTournament called", { body: req.body, user: req.user });

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.warn("[DEBUG] Validation failed", errors.array());
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
      console.error("[DEBUG] User not found", { user_id });
      await transaction.rollback();
      return res.status(404).json({ message: "User not found" });
    }
    console.log("[DEBUG] User fetched", { user_id, wallet_balance: user.wallet_balance });

    if (user.wallet_balance < entry_fee) {
      console.warn("[DEBUG] Insufficient balance", { needed: entry_fee, available: user.wallet_balance });
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

    console.log("[DEBUG] Tournament created", { id: newTournament.id });

    // 3. Prizes
    if (prize_distribution?.length) {
      const prizePromises = prize_distribution.map(prize => {
        console.log("[DEBUG] Creating prize", prize);
        return TournamentPrize.create({
          tournament_id: newTournament.id,
          position: prize.position,
          percentage: prize.percentage
        }, { transaction });
      });
      await Promise.all(prizePromises);
      console.log("[DEBUG] Prizes created");
    }

    // 4. Deduct balance
    const newBalance = user.wallet_balance - entry_fee;
    await user.update({ wallet_balance: newBalance }, { transaction });
    console.log("[DEBUG] User balance updated", { before: user.wallet_balance, after: newBalance });

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
    console.log("[DEBUG] Transaction recorded");

    // 6. Creator as participant
    const participant = await TournamentParticipant.create({
      tournament_id: newTournament.id,
      user_id,
      gamer_tag: gamer_tag || user.username
    }, { transaction });
    console.log("[DEBUG] Creator added as participant", { participant_id: participant.id });

    // 7. Commit
    await transaction.commit();
    console.log("[DEBUG] Transaction committed successfully");

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
    console.log("[DEBUG] Tournament fully fetched for response", { id: completeTournament.id });

    // 9. Notification
    await NotificationService.createNotification(
      user_id,
      'Tournament Created',
      `You've successfully created and joined the tournament "${name}".`,
      'tournament',
      'tournament',
      newTournament.id
    );
    console.log("[DEBUG] Notification sent");

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
    const { gamer_tag } = req.body;

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
      gamer_tag: gamer_tag || user.username
  
    }, { transaction });

    // 8. Update slots
    const updatedSlots = tournament.current_slots + 1;
    await tournament.update({ current_slots: updatedSlots }, { transaction });

    // 9. Lock tournament if full
    if (updatedSlots >= tournament.total_slots) {
      await tournament.update({ status: 'locked' }, { transaction });
      await generateTournamentBracket(tournament.id, null, transaction);
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

const updateTournament = async (req, res, next) => {
  let transaction;
  try {
    const { id } = req.params;
    const user_id = req.user.id;
    const {
      name, game_id, platform_id, game_mode_id, format,
      entry_fee, total_slots, start_time, rules, visibility,
      prize_distribution
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
      visibility: visibility || tournament.visibility
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


const startTournament = async (req, res, next) => {
  let transaction;
  try {
    const { id } = req.params;
    const user_id = req.user.id;

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
      return res.status(403).json({ message: 'Only the tournament creator can start it.' });
    }

    // Check if tournament can be started
    if (tournament.status !== 'open' && tournament.status !== 'locked') {
      await transaction.rollback();
      return res.status(400).json({ message: 'Tournament cannot be started in its current state.' });
    }

    // Check if tournament has enough participants
    if (tournament.current_slots < 2) {
      await transaction.rollback();
      return res.status(400).json({ message: 'Tournament needs at least 2 participants to start.' });
    }

    // Update tournament status
    await tournament.update({
      status: 'live'
    }, { transaction });

    // TODO: Generate initial bracket if not already generated

    await transaction.commit();

    res.json({
      message: 'Tournament started successfully',
      tournament: tournament
    });

  } catch (error) {
    if (transaction && !transaction.finished) {
      await transaction.rollback();
    }
    next(error);
  }
};

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
      order: [['round_number', 'ASC'], ['created_at', 'ASC']]
    });

    // Group matches by round
    const rounds = {};
    matches.forEach(match => {
      if (!rounds[match.round_number]) {
        rounds[match.round_number] = [];
      }
      rounds[match.round_number].push(match);
    });

    res.json({
      tournament: {
        id: tournament.id,
        name: tournament.name,
        format: tournament.format,
        status: tournament.status
      },
      rounds: rounds
    });
  } catch (error) {
    next(error);
  }
};

const generateTournamentBracket = async (tournamentId, userId = null, transaction = null, isMiddlewareCall = false) => {
  let localTransaction = transaction;
  try {
    console.log('[DEBUG] generateTournamentBracketDebug called', { tournamentId, userId });

    if (!localTransaction) {
      localTransaction = await sequelize.transaction();
      console.log('[DEBUG] Transaction started inside bracket generator');
    }

    // Ensure we have a tournament ID, not a tournament object
    const tournamentIdValue = typeof tournamentId === 'object' ? tournamentId.id : tournamentId;
    
    const tournament = await Tournament.findByPk(tournamentIdValue, { transaction: localTransaction });
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

    const participants = await TournamentParticipant.findAll({
      where: { tournament_id: tournamentIdValue },
      transaction: localTransaction
    });
    console.log('[DEBUG] Participants fetched:', participants.length);

    await generateBracket(tournamentIdValue, participants, localTransaction);
    console.log('[DEBUG] Bracket generated');

    await tournament.update({ status: 'live' }, { transaction: localTransaction });
    console.log('[DEBUG] Tournament status updated to live');

    if (!transaction) await localTransaction.commit();
    console.log('[DEBUG] Transaction committed');

    return { tournament };

  } catch (err) {
    console.error('[DEBUG] Error in generateTournamentBracketDebug:', err);
    if (!transaction && localTransaction && !localTransaction.finished) {
      await localTransaction.rollback();
      console.log('[DEBUG] Transaction rolled back');
    }
    if (isMiddlewareCall) throw err;
    return { error: err.message };
  }
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