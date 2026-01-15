// controllers/tournamentController.js
const {
  Tournament,
  TournamentParticipant,
  TournamentPrize,
  Game,
  Platform,
  GameMode,
  User,
  Match,
  Transaction,
} = require("../models");
const { validationResult } = require("express-validator");
const sequelize = require("../config/database");
const { generateBracket,generateNextRound} = require("../services/bracketService");
const NotificationService = require("../services/notificationService");
const AutoDeleteTournamentService = require("../services/autoDeleteTournamentService");
const { Op } = require("sequelize");
const logger = require("../config/logger");
const PaymentController = require("./paymentController");
const WalletService = require("../services/walletService");
const { resolveRequestCurrency } = require("../utils/requestCurrency");

// Constants
const TOURNAMENT_STATUS = {
  OPEN: "open",
  LOCKED: "locked",
  LIVE: "live",
  COMPLETED: "completed",
  CANCELLED: "cancelled",
  WAITING: "waiting",
};

const APP_URL = process.env.APP_URL || "http://localhost:3000";

const PAYMENT_PROCESSING_ENABLED = process.env.PAYMENT_PROCESSING_ENABLED === "true";
const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

// Helper Functions
const handleTransactionError = async (transaction, error) => {
  if (transaction && !transaction.finished) {
    try {
      await transaction.rollback();
      logger.warn("Transaction rolled back due to error", { error: error.message });
    } catch (rollbackError) {
      logger.error("Failed to rollback transaction", { rollbackError: rollbackError.message });
    }
  }
};

const createControllerError = (code, message) => {
  const error = new Error(message);
  error.code = code;
  return error;
};

const validateTournamentOwnership = (tournament, userId) => {
  if (tournament.created_by !== userId) {
    throw createControllerError("FORBIDDEN", "You don't have permission to perform this action");
  }
};

const validateTournamentStatus = (tournament, allowedStatuses, action) => {
  if (!allowedStatuses.includes(tournament.status)) {
    throw createControllerError(
      "INVALID_TOURNAMENT_STATUS",
      `Cannot ${action} tournament with status "${tournament.status}". Allowed: ${allowedStatuses.join(", ")}`
    );
  }
};

const formatCurrency = (amount) => {
  return parseFloat(amount).toFixed(2);
};

// Tournament Controller
class TournamentController {
  /**
   * Create a new tournament
   */
static async createTournament(req, res, next) {
  const transaction = await sequelize.transaction();
  
  try {
    logger.info("Creating tournament", { userId: req.user.id, body: req.body });

    // Validate request
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      logger.warn("Validation failed for tournament creation", { errors: errors.array() });
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
      prize_pool: customPrizePool, // Optional custom prize pool
      start_time,
      rules,
      visibility,
      prize_distribution,
      gamer_tag,
    } = req.body;

    const userId = req.user.id;

    // Convert to numbers for calculations
    const entryFee = parseFloat(entry_fee);
    const totalSlots = parseInt(total_slots);
    
    let updatedFormat = format;
    if (format === 'double_elimination' && totalSlots < 3) {
      updatedFormat = 'best_of_three';
    }

    // Calculate default prize pool (entry_fee × total_slots)
    const defaultPrizePool = entryFee * totalSlots;
    
    // Determine final prize pool
    let finalPrizePool;
    let additionalContribution = 0;
    
    if (customPrizePool !== undefined && customPrizePool !== null) {
      const customPrizePoolNum = parseFloat(customPrizePool);
      
      // Validate custom prize pool is not less than default
      if (customPrizePoolNum < defaultPrizePool) {
        await transaction.rollback();
        return res.status(400).json({
          message: `Custom prize pool (${formatCurrency(customPrizePoolNum)}) cannot be less than the default prize pool (${formatCurrency(defaultPrizePool)})`,
          minimum_prize_pool: defaultPrizePool,
        });
      }
      
      finalPrizePool = customPrizePoolNum;
      additionalContribution = customPrizePoolNum - defaultPrizePool;
    } else {
      // No custom prize pool provided, use default
      finalPrizePool = defaultPrizePool;
      additionalContribution = 0;
    }

    let requestCurrency;
    try {
      requestCurrency = resolveRequestCurrency(req);
    } catch (currencyError) {
      await transaction.rollback();
      if (currencyError.code === "MISSING_CURRENCY" || currencyError.code === "INVALID_CURRENCY") {
        return res.status(400).json({ code: currencyError.code, message: currencyError.message });
      }
      throw currencyError;
    }

    // Check user balance
    const user = await User.findByPk(userId, { transaction });
    if (!user) {
      await transaction.rollback();
      return res.status(404).json({ message: "User not found" });
    }

    console.log('updated format:', updatedFormat);

    const creatorTotalCharge = entryFee + additionalContribution;

    // Tournament row is created before debit only to get tournament.id; debit happens immediately; rollback ensures no persistence on failure.
    // Create tournament with prize_pool
    const tournament = await Tournament.create(
      {
        name,
        game_id,
        platform_id,
        game_mode_id,
        format: updatedFormat,
        entry_fee: entryFee,
        currency: requestCurrency,
        total_slots: totalSlots,
        prize_pool: finalPrizePool, // Store the prize pool
        current_slots: 1,
        status: TOURNAMENT_STATUS.OPEN,
        rules: rules || null,
        visibility: visibility || "public",
        created_by: userId,
        start_time,
      },
      { transaction }
    );

    logger.info("Tournament created", { 
      tournamentId: tournament.id,
      prizePool: finalPrizePool,
      additionalContribution,
    });

    // Process payment if enabled
    let walletResult;
    if (PAYMENT_PROCESSING_ENABLED && creatorTotalCharge > 0) {
      const orderRef = PaymentController.generateOrderReference("TOUR");

      let transactionDescription;
      if (additionalContribution > 0) {
        transactionDescription = `Tournament creation: Entry fee (${formatCurrency(entryFee)}) + Prize pool boost (${formatCurrency(additionalContribution)}) for "${name}"`;
      } else {
        transactionDescription = `Entry fee for tournament: ${name}`;
      }

      try {
        walletResult = await WalletService.debit({
          userId,
          amount: creatorTotalCharge,
          currency: requestCurrency,
          type: "tournament_entry",
          reference: orderRef,
          description: transactionDescription,
          tournamentId: tournament.id,
          metadata: {
            entry_fee: entryFee,
            additional_contribution: additionalContribution,
            total_prize_pool: finalPrizePool,
            default_prize_pool: defaultPrizePool,
          },
          transaction,
        });
      } catch (walletError) {
        if (walletError.code === "INSUFFICIENT_FUNDS") {
          await transaction.rollback();
          return res.status(400).json({
            message: `Insufficient balance. Need ${formatCurrency(creatorTotalCharge)} (Entry: ${formatCurrency(entryFee)} + Prize Boost: ${formatCurrency(additionalContribution)})`,
            required: creatorTotalCharge,
            entry_fee: entryFee,
            additional_contribution: additionalContribution,
          });
        }
        throw walletError;
      }
    }

    // Create prizes
    if (prize_distribution?.length) {
      const totalPercentage = prize_distribution.reduce((sum, prize) => sum + parseFloat(prize.percentage), 0);
      
      if (Math.abs(totalPercentage - 100) > 0.01) {
        await transaction.rollback();
        return res.status(400).json({ 
          message: `Prize distribution must total 100%. Current total: ${totalPercentage}%` 
        });
      }

      const prizePromises = prize_distribution.map((prize) =>
        TournamentPrize.create(
          {
            tournament_id: tournament.id,
            position: prize.position,
            percentage: prize.percentage,
          },
          { transaction }
        )
      );
      
      await Promise.all(prizePromises);
    }

    // Add creator as participant
    await TournamentParticipant.create(
      {
        tournament_id: tournament.id,
        user_id: userId,
        gamer_tag: gamer_tag || user.username,
        checked_in: true,
      },
      { transaction }
    );

    await transaction.commit();
    logger.info("Tournament creation completed", { 
      tournamentId: tournament.id,
      prizePool: finalPrizePool,
    });

    // Fetch complete tournament data
    const completeTournament = await Tournament.findByPk(tournament.id, {
      include: [
        { model: Game, as: "game", attributes: ["name", "logo_url"] },
        { model: Platform, as: "platform", attributes: ["name"] },
        { model: GameMode, as: "game_mode", attributes: ["name"] },
        {
          model: TournamentPrize,
          as: "prizes",
          attributes: ["position", "percentage"],
          order: [["position", "ASC"]],
        },
        {
          model: TournamentParticipant,
          as: "participants",
          include: [
            {
              model: User,
              as: "user",
              attributes: ["id", "username"],
            },
          ],
        },
      ],
    });

    // Schedule auto-delete
    if (start_time) {
      AutoDeleteTournamentService.scheduleAutoDelete(tournament.id, start_time);
      logger.info("Scheduled auto-delete for tournament", { 
        tournamentId: tournament.id, 
        startTime: start_time 
      });
    }

    // Send notification
    let notificationMessage;
    if (additionalContribution > 0) {
      notificationMessage = `You've successfully created and joined the tournament "${name}" with a boosted prize pool of ${formatCurrency(finalPrizePool)}.`;
    } else {
      notificationMessage = `You've successfully created and joined the tournament "${name}".`;
    }
    
    await NotificationService.createNotification(
      userId,
      "Tournament Created",
      notificationMessage,
      "tournament",
      "tournament",
      tournament.id
    ).catch(err => logger.error("Failed to send notification", { error: err.message }));

    const shareUrl = `${APP_URL}/tournament/${tournament.id}/share`;
    const shortShareUrl = `${APP_URL}/t/${Buffer.from(`tournament_${tournament.id}_${Date.now()}`).toString('base64').replace(/[+/=]/g, '').substring(0, 10)}`;

    res.status(201).json({
      message: "Tournament created successfully! You have been added as the first participant.",
      tournament: completeTournament,
      financial_details: {
        entry_fee_paid: entryFee,
        additional_prize_contribution: additionalContribution,
        total_paid: entryFee + additionalContribution,
        prize_pool: finalPrizePool,
        default_prize_pool: defaultPrizePool,
      },
      share_info: {
        share_url: shareUrl,
        short_url: shortShareUrl,
        social_share: {
          facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`,
          twitter: `https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(`Join ${completeTournament.name} Tournament - Prize Pool: ${formatCurrency(finalPrizePool)}`)}`,
          whatsapp: `https://wa.me/?text=${encodeURIComponent(`Join ${completeTournament.name} Tournament - Prize Pool: ${formatCurrency(finalPrizePool)} ${shareUrl}`)}`
        }
      },
      new_balance: PAYMENT_PROCESSING_ENABLED && walletResult ? parseFloat(walletResult.balanceAfter) : undefined,
    });

  } catch (error) {
    await handleTransactionError(transaction, error);
    logger.error("Error creating tournament", { 
      error: error.message, 
      userId: req.user.id,
      stack: error.stack 
    });
    next(error);
  }
}

  /**
   * Get tournament by ID
   */
  static async getTournamentById(req, res, next) {
    try {
      const { id } = req.params;

      const tournament = await Tournament.findByPk(id, {
        include: [
          { model: Game, as: "game", attributes: ["id", "name", "logo_url"] },
          { model: Platform, as: "platform", attributes: ["id", "name"] },
          { model: GameMode, as: "game_mode", attributes: ["id", "name"] },
          { model: User, as: "creator", attributes: ["id", "username"] },
          {
            model: TournamentPrize,
            as: "prizes",
            attributes: ["position", "percentage"],
            order: [["position", "ASC"]],
          },
          {
            model: TournamentParticipant,
            as: "participants",
            include: [
              {
                model: User,
                as: "user",
                attributes: ["id", "username"],
              },
            ],
            order: [["created_at", "ASC"]],
          },
          {
            model: Match,
            as: "matches",
            attributes: ["id", "status", "round_number", "winner_id", "bracket_type"],
            order: [["round_number", "ASC"], ["created_at", "ASC"]],
          },
        ],
      });

      if (!tournament) {
        return res.status(404).json({ message: "Tournament not found" });
      }

      // Check visibility
      if (tournament.visibility === "private" && 
          tournament.created_by !== req.user.id &&
          !tournament.participants.some(p => p.user_id === req.user.id)) {
        return res.status(403).json({ message: "This tournament is private" });
      }

      res.json(tournament);
    } catch (error) {
      logger.error("Error fetching tournament", { 
        tournamentId: req.params.id, 
        error: error.message 
      });
      next(error);
    }
  }

  /**
   * Join a tournament
   */
  static async joinTournament(req, res, next) {
    const transaction = await sequelize.transaction();
    
    try {
      const { id } = req.params;
      const { gamer_tag } = req.body;
      const userId = req.user.id;

      logger.info("Joining tournament", { tournamentId: id, userId });

      // Input validation
      const tournamentId = parseInt(id, 10);
      if (isNaN(tournamentId) || tournamentId <= 0) {
        await transaction.rollback();
        return res.status(400).json({ message: "Invalid tournament ID" });
      }

      if (!gamer_tag || typeof gamer_tag !== 'string' || gamer_tag.trim().length === 0) {
        await transaction.rollback();
        return res.status(400).json({ message: "Valid gamer tag is required" });
      }

      let requestCurrency;
      try {
        requestCurrency = resolveRequestCurrency(req);
      } catch (currencyError) {
        await transaction.rollback();
        if (currencyError.code === "MISSING_CURRENCY" || currencyError.code === "INVALID_CURRENCY") {
          return res.status(400).json({ code: currencyError.code, message: currencyError.message });
        }
        throw currencyError;
      }

      // Fetch tournament with lock
      const tournament = await Tournament.findByPk(tournamentId, {
        transaction,
        lock: transaction.LOCK.UPDATE,
      });

      if (!tournament) {
        await transaction.rollback();
        return res.status(404).json({ message: "Tournament not found" });
      }

      if (!tournament.currency) {
        await transaction.rollback();
        return res.status(400).json({
          code: "MISSING_CURRENCY",
          message: "Tournament currency is missing",
        });
      }

      if (tournament.currency !== requestCurrency) {
        await transaction.rollback();
        return res.status(400).json({
          code: "CURRENCY_MISMATCH",
          message: "Request currency does not match tournament currency",
        });
      }

      // Validate tournament status
      validateTournamentStatus(tournament, [TOURNAMENT_STATUS.OPEN, TOURNAMENT_STATUS.WAITING], "join");

      // Check slot availability
      if (tournament.current_slots >= tournament.total_slots) {
        await transaction.rollback();
        return res.status(400).json({ message: "Tournament is full" });
      }

      // Check duplicate participation
      const existingParticipant = await TournamentParticipant.findOne({
        where: { tournament_id: tournamentId, user_id: userId },
        transaction,
      });

      if (existingParticipant) {
        await transaction.rollback();
        return res.status(400).json({ message: "Already registered for this tournament" });
      }

      // Fetch user
      const user = await User.findByPk(userId, {
        transaction,
        lock: transaction.LOCK.UPDATE,
      });

      if (!user) {
        await transaction.rollback();
        return res.status(404).json({ message: "User not found" });
      }

      // Process payment if enabled
      const entryFee = parseFloat(tournament.entry_fee);
      if (PAYMENT_PROCESSING_ENABLED && entryFee > 0) {
        const orderRef = PaymentController.generateOrderReference("JOIN")

        try {
          const walletResult = await WalletService.debit({
          userId,
          amount: entryFee,
          currency: requestCurrency,
          type: "tournament_entry",
          reference: orderRef,
          description: `Entry fee for tournament: ${tournament.name}`,
            tournamentId: tournament.id,
            transaction,
          });
          user.wallet_balance = walletResult.balanceAfter;
        } catch (walletError) {
        if (walletError.code === "INSUFFICIENT_FUNDS") {
            await transaction.rollback();
            return res.status(400).json({
              message: `Insufficient balance. Required: ${formatCurrency(entryFee)}`,
            });
          }
          throw walletError;
        }
      }

      // Register participant
      const participant = await TournamentParticipant.create(
        {
          tournament_id: tournamentId,
          user_id: userId,
          gamer_tag: gamer_tag.trim().substring(0, 255) || user.username,
          checked_in: true,
        },
        { transaction }
      );

      // Update tournament slots
      const updatedSlots = tournament.current_slots + 1;
      await tournament.update({ current_slots: updatedSlots }, { transaction });

      // Check if tournament should be locked
      let tournamentJustLocked = false;
      if (updatedSlots >= tournament.total_slots) {
        await tournament.update({ status: TOURNAMENT_STATUS.LOCKED }, { transaction });
        tournamentJustLocked = true;
      }

      await transaction.commit();
      logger.info("Successfully joined tournament", { 
        tournamentId, 
        userId, 
        participantId: participant.id 
      });

      // Generate bracket if tournament is full
      if (tournamentJustLocked) {
        try {
          await this.generateTournamentBracket(tournamentId, null, null, true);
          logger.info("Bracket generated for full tournament", { tournamentId });
        } catch (bracketError) {
          logger.error("Failed to generate bracket", {
            tournamentId,
            error: bracketError.message,
          });
          // Don't fail the request - bracket can be regenerated manually
        }
      }

      // Send notifications
      const notificationPromises = [
        NotificationService.createNotification(
          tournament.created_by,
          "New Participant",
          `User ${user.username} has joined your tournament "${tournament.name}".`,
          "tournament",
          "tournament",
          tournament.id
        ),
        NotificationService.createNotification(
          userId,
          "Tournament Joined",
          `You have successfully joined the tournament "${tournament.name}".`,
          "tournament",
          "tournament",
          tournament.id
        ),
      ];

      await Promise.allSettled(notificationPromises);

      const response = {
        message: "Successfully joined the tournament!",
        participant: {
          id: participant.id,
          gamer_tag: participant.gamer_tag,
          user_id: participant.user_id,
        },
        tournament_status: tournament.status,
        current_slots: updatedSlots,
        chat_channel_id: tournament.chat_channel_id,
      };

      if (PAYMENT_PROCESSING_ENABLED) {
        response.new_balance = parseFloat(user.wallet_balance);
        response.entry_fee_deducted = parseFloat(tournament.entry_fee);
      }

      res.json(response);

    } catch (error) {
      await handleTransactionError(transaction, error);
      
      if (error.code === "FORBIDDEN") {
        return res.status(403).json({ message: error.message });
      }
      if (error.code === "INVALID_TOURNAMENT_STATUS") {
        return res.status(400).json({ message: error.message });
      }

      logger.error("Error joining tournament", {
        tournamentId: req.params.id,
        userId: req.user.id,
        error: error.message,
        stack: error.stack,
      });

      res.status(500).json({ 
        message: "An error occurred while joining the tournament" 
      });
    }
  }

/**
 * Get all tournaments with filters
 */
static async getTournaments(req, res, next) {
  try {
    const { 
      page = 1, 
      limit = DEFAULT_PAGE_SIZE,
      status = 'all',  // New: filter by status
      game_id,
      platform_id,
      format,
      sort = 'created_at',
      order = 'DESC',
      min_price,  // New: minimum entry fee
      max_price,  // New: maximum entry fee
      search,     // New: search by name or game
      game_mode_id  // New: filter by game mode
    } = req.query;

    const pageSize = Math.min(parseInt(limit, 10), MAX_PAGE_SIZE);
    const offset = (parseInt(page, 10) - 1) * pageSize;

    // Build where clause with dynamic filters
    const whereClause = {};
    
    // Status filter (support 'all' which returns all except cancelled)
    if (status && status !== 'all') {
      whereClause.status = status;
    } else {
      // Default: show all active tournaments (not cancelled)
      whereClause.status = {
        [Op.ne]: 'cancelled'
      };
    }

    // Apply other filters if provided
    if (game_id) whereClause.game_id = game_id;
    if (platform_id) whereClause.platform_id = platform_id;
    if (format) whereClause.format = format;
    if (game_mode_id) whereClause.game_mode_id = game_mode_id;
    
    // Price range filter
    if (min_price || max_price) {
      whereClause.entry_fee = {};
      if (min_price) whereClause.entry_fee[Op.gte] = parseFloat(min_price);
      if (max_price) whereClause.entry_fee[Op.lte] = parseFloat(max_price);
    }

    // Search filter (by tournament name or game name)
    if (search) {
      whereClause[Op.or] = [
        { name: { [Op.iLike]: `%${search}%` } },
        sequelize.where(
          sequelize.col('game.name'),
          { [Op.iLike]: `%${search}%` }
        )
      ];
    }

    // Define includes
    const include = [
      {
        model: Game,
        as: "game",
        attributes: ["id", "name", "logo_url"],
      },
      {
        model: Platform,
        as: "platform",
        attributes: ["id", "name","icon_url"],
      },
      {
        model: GameMode,
        as: "game_mode",
        attributes: ["id", "name"],
      },
      {
        model: User,
        as: "creator",
        attributes: ["id", "username"],
      },
      {
        model: TournamentParticipant,
        as: "participants",
        attributes: ["id", "checked_in"],
        required: false
      },
      {
        model: TournamentPrize,
        as: "prizes",
        attributes: ["id", "position", "percentage"],
        required: false,
        order: [['position', 'ASC']]
      }
    ];

    // Handle sorting based on frontend requirements
    let orderClause = [];
    
    // Map frontend sort options to database fields
    const sortMapping = {
      'newest': [['created_at', 'DESC']],
      'prize_high': [[sequelize.literal('entry_fee * total_slots'), 'DESC']],
      'prize_low': [[sequelize.literal('entry_fee * total_slots'), 'ASC']],
      'starting_soon': [['start_time', 'ASC']],
      'popular': [[sequelize.literal('current_slots'), 'DESC']],
      'created_at': [['created_at', order.toUpperCase()]],
      'entry_fee': [['entry_fee', order.toUpperCase()]]
    };

    if (sortMapping[sort]) {
      orderClause = sortMapping[sort];
    } else {
      // Default sorting
      orderClause = [['created_at', 'DESC']];
    }

    // Get tournaments with pagination
    const { count, rows } = await Tournament.findAndCountAll({
      where: whereClause,
      include,
      order: orderClause,
      limit: pageSize,
      offset,
      distinct: true,
      subQuery: false // Important for count with includes
    });

    // Transform the data to include calculated fields
    const transformedTournaments = rows.map(tournament => {
      const tournamentData = tournament.toJSON();
      
      // Get current participants count
      const currentParticipants = tournamentData.participants?.length || 0;
      
      // Get prize distribution
      const prizeDistribution = tournamentData.prizes?.map(prize => ({
        position: prize.position,
        amount: parseFloat(prize.amount)
      })) || [];
      
      // Calculate tournament duration (if start_time and estimated duration available)
      let duration = '2h'; // Default
      if (tournamentData.start_time) {
        // You might want to add an estimated_duration field to the tournament model
        // For now, we'll use a default or calculate based on format
        switch (tournamentData.format) {
          case 'single_elimination':
            duration = '3h';
            break;
          case 'double_elimination':
            duration = '4h';
            break;
          case 'round_robin':
            duration = '5h';
            break;
          default:
            duration = '2h';
        }
      }

      // Determine if tournament is featured (based on criteria)
      const isFeatured = tournamentData.prize_pool > 1000 || 
                        tournamentData.total_slots > 50 ||
                        tournamentData.created_by === 1; // Example: creator ID 1 is admin

      // Get status with proper naming for frontend
      let frontendStatus = tournamentData.status;
      if (tournamentData.status === 'open' && tournamentData.start_time) {
        const now = new Date();
        const startTime = new Date(tournamentData.start_time);
        if (startTime > now) {
          frontendStatus = 'upcoming';
        } else if (tournamentData.current_slots > 0) {
          frontendStatus = 'ongoing';
        }
      }

      return {
        id: tournamentData.id,
        name: tournamentData.name,
        description: tournamentData.description || `${tournamentData.game?.name} Tournament`,
        game_type: tournamentData.game?.name,
        game: tournamentData.game,
        platform: tournamentData.platform,
        game_mode: tournamentData.game_mode,
        format: tournamentData.format,
        entry_fee: parseFloat(tournamentData.entry_fee),
        currency: tournamentData.currency,
        total_slots: tournamentData.total_slots,
        current_slots: currentParticipants,
        max_participants: tournamentData.total_slots,
        current_participants: currentParticipants,
        status: frontendStatus,
        visibility: tournamentData.visibility,
        rules: tournamentData.rules,
        creator: tournamentData.creator,
        start_time: tournamentData.start_time,
        end_time: tournamentData.end_time,
        created_at: tournamentData.created_at,
        updated_at: tournamentData.updated_at,
        
        // Calculated fields
        prize_pool: tournamentData.prize_pool,
        duration: duration,
        is_featured: isFeatured,
        participants_count: currentParticipants,
        slots_available: tournamentData.total_slots - currentParticipants,
        is_full: currentParticipants >= tournamentData.total_slots,
        prize_distribution: prizeDistribution,
        
        // For UI display
        game_id: tournamentData.game_id,
        platform_id: tournamentData.platform_id,
        game_mode_id: tournamentData.game_mode_id,
        
        // Additional metadata
        metadata: {
          registration_closes_at: tournamentData.registration_ends_at,
          checkin_starts_at: tournamentData.checkin_starts_at,
          checkin_ends_at: tournamentData.checkin_ends_at,
          bracket_type: tournamentData.format,
          stream_url: tournamentData.stream_url,
          discord_url: tournamentData.discord_url
        }
      };
    });

    // Get statistics for active tournaments
    const activeTournamentsCount = await Tournament.count({
      where: { 
        status: 'open',
        start_time: { [Op.lte]: new Date() }
      }
    });

    // Get upcoming tournaments count
    const upcomingTournamentsCount = await Tournament.count({
      where: { 
        status: 'open',
        start_time: { [Op.gt]: new Date() }
      }
    });

    // Get completed tournaments count
    const completedTournamentsCount = await Tournament.count({
      where: { status: 'completed' }
    });

    // Get cancelled tournaments count
    const cancelledTournamentsCount = await Tournament.count({
      where: { status: 'cancelled' }
    });

    res.json({
      success: true,
      data: {
        tournaments: transformedTournaments,
        pagination: {
          page: parseInt(page, 10),
          limit: pageSize,
          total: count,
          pages: Math.ceil(count / pageSize),
        },
        stats: {
          total: count,
          active: activeTournamentsCount,
          upcoming: upcomingTournamentsCount,
          completed: completedTournamentsCount,
          cancelled: cancelledTournamentsCount,
          featured: transformedTournaments.filter(t => t.is_featured).length
        },
        filters: {
          status: status,
          sort: sort,
          order: order,
          min_price: min_price,
          max_price: max_price,
          search: search
        }
      }
    });
  } catch (error) {
    logger.error("Error fetching tournaments", { error: error.message, stack: error.stack });
    
    // Send error response
    res.status(500).json({
      success: false,
      error: "Failed to fetch tournaments",
      message: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}

  /**
   * Get user's tournaments
   */
  static async getMyTournaments(req, res, next) {
    try {
      const userId = req.user.id;
      const { 
        status, 
        page = 1, 
        limit = DEFAULT_PAGE_SIZE,
        role = "all" // all, creator, participant
      } = req.query;

      const pageSize = Math.min(parseInt(limit, 10), MAX_PAGE_SIZE);
      const offset = (parseInt(page, 10) - 1) * pageSize;

      // Build base where clause
      const baseWhere = {};
      if (status) baseWhere.status = status;

      // Get created tournaments
      let createdTournaments = [];
      if (role === "all" || role === "creator") {
        const createdWhere = { ...baseWhere, created_by: userId };
        createdTournaments = await Tournament.findAll({
          where: createdWhere,
          include: [
            { model: Game, as: "game", attributes: ["name", "logo_url"] },
            { model: Platform, as: "platform", attributes: ["name"] },
            { model: GameMode, as: "game_mode", attributes: ["name"] },
            {
              model: TournamentParticipant,
              as: "participants",
              attributes: ["id", "user_id"],
            },
          ],
        });
      }

      // Get participating tournaments
      let participatingTournaments = [];
      if (role === "all" || role === "participant") {
        participatingTournaments = await Tournament.findAll({
          where: baseWhere,
          include: [
            { model: Game, as: "game", attributes: ["name", "logo_url"] },
            { model: Platform, as: "platform", attributes: ["name"] },
            { model: GameMode, as: "game_mode", attributes: ["name"] },
            {
              model: TournamentParticipant,
              as: "participants",
              where: { user_id: userId },
              required: true,
              attributes: ["id", "user_id"],
            },
          ],
        });
      }

      // Combine and deduplicate
      const allTournaments = [...createdTournaments, ...participatingTournaments];
      const uniqueTournaments = allTournaments.filter(
        (tournament, index, self) =>
          index === self.findIndex((t) => t.id === tournament.id)
      );

      // Sort by created_at
      uniqueTournaments.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

      // Apply pagination
      const paginatedTournaments = uniqueTournaments.slice(offset, offset + pageSize);

      // Add role information
      const tournamentsWithRole = paginatedTournaments.map((tournament) => {
        const isCreator = tournament.created_by === userId;
        const isParticipant = tournament.participants.some(
          (p) => p.user_id === userId
        );

        let role = "participant";
        if (isCreator && isParticipant) role = "creator_and_participant";
        else if (isCreator) role = "creator";

        return {
          ...tournament.toJSON(),
          role,
        };
      });

      res.json({
        tournaments: tournamentsWithRole,
        pagination: {
          page: parseInt(page, 10),
          pageSize,
          totalItems: uniqueTournaments.length,
          totalPages: Math.ceil(uniqueTournaments.length / pageSize),
        },
      });
    } catch (error) {
      logger.error("Error fetching user tournaments", { 
        userId: req.user.id, 
        error: error.message 
      });
      next(error);
    }
  }

  /**
   * Update tournament
   */
  static async updateTournament(req, res, next) {
    const transaction = await sequelize.transaction();
    
    try {
      const { id } = req.params;
      const userId = req.user.id;
      const updateData = req.body;

      logger.info("Updating tournament", { tournamentId: id, userId });

      const tournament = await Tournament.findByPk(id, { transaction });
      if (!tournament) {
        await transaction.rollback();
        return res.status(404).json({ message: "Tournament not found" });
      }

      // Check ownership
      validateTournamentOwnership(tournament, userId);
      
      // Check if editable
      validateTournamentStatus(tournament, [TOURNAMENT_STATUS.OPEN], "edit");

      const oldStartTime = tournament.start_time;

      // Update tournament
      await tournament.update({
        name: updateData.name || tournament.name,
        game_id: updateData.game_id || tournament.game_id,
        platform_id: updateData.platform_id || tournament.platform_id,
        game_mode_id: updateData.game_mode_id || tournament.game_mode_id,
        format: updateData.format || tournament.format,
        entry_fee:tournament.entry_fee,
        total_slots: updateData.total_slots || tournament.total_slots,
        start_time: updateData.start_time || tournament.start_time,
        rules: updateData.rules !== undefined ? updateData.rules : tournament.rules,
        visibility: updateData.visibility || tournament.visibility,
        chat_channel_id: updateData.chat_channel_id || tournament.chat_channel_id,
      }, { transaction });

      /*/ Update prizes if provided
      if (updateData.prize_distribution && updateData.prize_distribution.length > 0) {
        const totalPercentage = updateData.prize_distribution.reduce(
          (sum, prize) => sum + parseFloat(prize.percentage), 0
        );
        
        if (Math.abs(totalPercentage - 100) > 0.01) {
          await transaction.rollback();
          return res.status(400).json({ 
            message: `Prize distribution must total 100%. Current total: ${totalPercentage}%` 
          });
        }

        await TournamentPrize.destroy({
          where: { tournament_id: id },
          transaction,
        });

        const prizePromises = updateData.prize_distribution.map((prize) =>
          TournamentPrize.create(
            {
              tournament_id: id,
              position: prize.position,
              percentage: prize.percentage,
            },
            { transaction }
          )
        );

        await Promise.all(prizePromises);
      }*/

      await transaction.commit();
      logger.info("Tournament updated", { tournamentId: id });

      // Reschedule auto-delete if start_time changed
      if (updateData.start_time && updateData.start_time !== oldStartTime) {
        AutoDeleteTournamentService.cancelScheduledJob(id);
        AutoDeleteTournamentService.scheduleAutoDelete(id, updateData.start_time);
        
        logger.info("Rescheduled auto-delete for tournament", { 
          tournamentId: id, 
          newStartTime: updateData.start_time 
        });
      }

      // Fetch updated tournament
      const updatedTournament = await Tournament.findByPk(id, {
        include: [
          { model: Game, as: "game", attributes: ["name", "logo_url"] },
          { model: Platform, as: "platform", attributes: ["name"] },
          { model: GameMode, as: "game_mode", attributes: ["name"] },
          {
            model: TournamentPrize,
            as: "prizes",
            attributes: ["position", "percentage"],
            order: [["position", "ASC"]],
          },
        ],
      });

      res.json({
        message: "Tournament updated successfully",
        tournament: updatedTournament,
      });

    } catch (error) {
      await handleTransactionError(transaction, error);
      
      if (error.code === "FORBIDDEN") {
        return res.status(403).json({ message: error.message });
      }
      if (error.code === "INVALID_TOURNAMENT_STATUS") {
        return res.status(400).json({ message: error.message });
      }

      logger.error("Error updating tournament", {
        tournamentId: req.params.id,
        userId: req.user.id,
        error: error.message,
      });
      next(error);
    }
  }

  /**
   * Delete tournament
   */
  static async deleteTournament(req, res, next) {
    const transaction = await sequelize.transaction();
    
    try {
      const { id } = req.params;
      const userId = req.user.id;

      logger.info("Deleting tournament", { tournamentId: id, userId });

      let requestCurrency;
      try {
        requestCurrency = resolveRequestCurrency(req);
      } catch (currencyError) {
        await transaction.rollback();
        if (currencyError.code === "MISSING_CURRENCY" || currencyError.code === "INVALID_CURRENCY") {
          return res.status(400).json({ code: currencyError.code, message: currencyError.message });
        }
        throw currencyError;
      }

      const tournament = await Tournament.findByPk(id, {
        include: [
          {
            model: TournamentParticipant,
            as: "participants",
            include: [{ model: User, as: "user" }],
          },
        ],
        transaction,
      });

      if (!tournament) {
        await transaction.rollback();
        return res.status(404).json({ message: "Tournament not found" });
      }

      if (!tournament.currency) {
        await transaction.rollback();
        return res.status(400).json({
          code: "MISSING_CURRENCY",
          message: "Tournament currency is missing",
        });
      }

      if (tournament.currency !== requestCurrency) {
        await transaction.rollback();
        return res.status(400).json({
          code: "CURRENCY_MISMATCH",
          message: "Request currency does not match tournament currency",
        });
      }

      // Check ownership
      validateTournamentOwnership(tournament, userId);
      
      // Check if deletable
      validateTournamentStatus(tournament, [TOURNAMENT_STATUS.OPEN, TOURNAMENT_STATUS.WAITING], "delete");

      // Refund entry fees to participants
      const refundPromises = tournament.participants.map(async (participant) => {
        if (PAYMENT_PROCESSING_ENABLED && tournament.entry_fee > 0) {
          const user = participant.user;
          const entryFee = parseFloat(tournament.entry_fee);
          const orderRef = PaymentController.generateOrderReference("DELT");

          await WalletService.credit({
            userId: user.id,
            amount: entryFee,
            currency: tournament.currency,
            type: "tournament_refund",
            reference: orderRef,
            description: `Refund for deleted tournament: ${tournament.name}`,
            tournamentId: tournament.id,
            transaction,
          });
        }
      });

      await Promise.all(refundPromises);

      // Delete related records
      await TournamentPrize.destroy({
        where: { tournament_id: id },
        transaction,
      });

      await TournamentParticipant.destroy({
        where: { tournament_id: id },
        transaction,
      });

      await Tournament.destroy({ where: { id }, transaction });

      await transaction.commit();
      logger.info("Tournament deleted", { tournamentId: id });

      // Cancel auto-delete job
      AutoDeleteTournamentService.cancelScheduledJob(id);

      // Send notifications
      const notificationPromises = tournament.participants.map((participant) =>
        NotificationService.createNotification(
          participant.user_id,
          "Tournament Cancelled",
          `The tournament "${tournament.name}" has been cancelled. Your entry fee has been refunded.`,
          "tournament",
          "tournament",
          tournament.id
        )
      );

      await Promise.allSettled(notificationPromises);

      res.json({
        message: "Tournament deleted successfully. All entry fees have been refunded.",
      });

    } catch (error) {
      await handleTransactionError(transaction, error);
      
      if (error.code === "FORBIDDEN") {
        return res.status(403).json({ message: error.message });
      }
      if (error.code === "INVALID_TOURNAMENT_STATUS") {
        return res.status(400).json({ message: error.message });
      }

      logger.error("Error deleting tournament", {
        tournamentId: req.params.id,
        userId: req.user.id,
        error: error.message,
        stack: error.stack,
      });
      next(error);
    }
  }

  /**
   * Start tournament
   */
  static async startTournament(req, res, next) {
    const transaction = await sequelize.transaction();
    
    try {
      const { id } = req.params;
      const userId = req.user.id;

      logger.info("Starting tournament", { tournamentId: id, userId });

      const tournament = await Tournament.findByPk(id, {
        transaction,
        lock: transaction.LOCK.UPDATE,
      });

      if (!tournament) {
        await transaction.rollback();
        return res.status(404).json({ message: "Tournament not found" });
      }

      // Check ownership
      validateTournamentOwnership(tournament, userId);
      
      // Check status
      validateTournamentStatus(tournament, [TOURNAMENT_STATUS.OPEN, TOURNAMENT_STATUS.LOCKED], "start");

      // Check if tournament is full
      if (tournament.current_slots !== tournament.total_slots) {
        await transaction.rollback();
        return res.status(400).json({
          message: `Tournament must be full before starting. Current: ${tournament.current_slots}/${tournament.total_slots}`,
        });
      }

      // Check existing matches
      const existingMatch = await Match.findOne({
        where: { tournament_id: id },
        transaction,
      });

      if (!existingMatch) {
        const participants = await TournamentParticipant.findAll({
          where: { tournament_id: id },
          transaction,
        });

        await generateBracket(id, participants, transaction);
      }

      // Update tournament status
      await tournament.update(
        { 
          status: TOURNAMENT_STATUS.LIVE, 
          started_at: new Date() 
        },
        { transaction }
      );

      await transaction.commit();
      logger.info("Tournament started", { tournamentId: id });

      // Send notifications
      const participants = await TournamentParticipant.findAll({
        where: { tournament_id: id },
        include: [{ model: User, as: "user", attributes: ["id"] }],
      });

      const notificationPromises = participants.map((participant) =>
        NotificationService.createNotification(
          participant.user_id,
          "Tournament Started",
          `Tournament "${tournament.name}" has started! Check your bracket.`,
          "tournament",
          "tournament",
          id
        )
      );

      await Promise.allSettled(notificationPromises);

      res.json({
        message: "Tournament started successfully!",
        tournament: {
          id: tournament.id,
          name: tournament.name,
          status: tournament.status,
          current_slots: tournament.current_slots,
          total_slots: tournament.total_slots,
          started_at: tournament.started_at,
        },
      });

    } catch (error) {
      await handleTransactionError(transaction, error);
      
      if (error.code === "FORBIDDEN") {
        return res.status(403).json({ message: error.message });
      }
      if (error.code === "INVALID_TOURNAMENT_STATUS") {
        return res.status(400).json({ message: error.message });
      }

      logger.error("Error starting tournament", {
        tournamentId: req.params.id,
        userId: req.user.id,
        error: error.message,
        stack: error.stack,
      });
      next(error);
    }
  }

  /**
   * Finalize tournament
   */
  static async finalizeTournament(req, res, next) {
    const transaction = await sequelize.transaction();
    
    try {
      const { id } = req.params;
      const userId = req.user.id;

      logger.info("Finalizing tournament", { tournamentId: id, userId });

      const tournament = await Tournament.findByPk(id, {
        include: [
          {
            model: TournamentParticipant,
            as: "participants",
            include: [{ model: User, as: "user" }],
          },
        ],
        transaction,
      });

      if (!tournament) {
        await transaction.rollback();
        return res.status(404).json({ message: "Tournament not found" });
      }

      // Check ownership
      validateTournamentOwnership(tournament, userId);
      
      // Check status
      validateTournamentStatus(tournament, [TOURNAMENT_STATUS.LIVE], "finalize");

      // Check if all matches are completed
      const incompleteMatches = await Match.findAll({
        where: { 
          tournament_id: id,
          status: { [Op.ne]: "completed" }
        },
        transaction,
      });

      if (incompleteMatches.length > 0) {
        await transaction.rollback();
        return res.status(400).json({
          message: "Cannot finalize tournament. Some matches are still in progress.",
        });
      }

      // Update tournament status
      await tournament.update(
        { 
          status: TOURNAMENT_STATUS.COMPLETED,
          ended_at: new Date()
        },
        { transaction }
      );

      // TODO: Implement prize distribution logic
      // This would distribute prizes to winners based on tournament_prizes table

      await transaction.commit();
      logger.info("Tournament finalized", { tournamentId: id });

      res.json({
        message: "Tournament finalized successfully",
        tournament: tournament,
      });

    } catch (error) {
      await handleTransactionError(transaction, error);
      
      if (error.code === "FORBIDDEN") {
        return res.status(403).json({ message: error.message });
      }
      if (error.code === "INVALID_TOURNAMENT_STATUS") {
        return res.status(400).json({ message: error.message });
      }

      logger.error("Error finalizing tournament", {
        tournamentId: req.params.id,
        userId: req.user.id,
        error: error.message,
      });
      next(error);
    }
  }

  /**
   * Get tournament matches
   */
  static async getTournamentMatches(req, res, next) {
    try {
      const { id } = req.params;

      const matches = await Match.findAll({
        where: { tournament_id: id },
        include: [
          {
            model: TournamentParticipant,
            as: "participant1",
            include: [
              { model: User, as: "user", attributes: ["id", "username", "avatar_url"] },
            ],
          },
          {
            model: TournamentParticipant,
            as: "participant2",
            include: [
              { model: User, as: "user", attributes: ["id", "username", "avatar_url"] },
            ],
          },
          {
            model: TournamentParticipant,
            as: "winner",
            include: [
              { model: User, as: "user", attributes: ["id", "username", "avatar_url"] },
            ],
          },
        ],
        order: [
          ["round_number", "ASC"],
          ["created_at", "ASC"],
        ],
      });

      res.json(matches);
    } catch (error) {
      logger.error("Error fetching tournament matches", {
        tournamentId: req.params.id,
        error: error.message,
      });
      next(error);
    }
  }

  /**
   * Get tournament bracket
   */
  static async getTournamentBracket(req, res, next) {
    try {
      const { id } = req.params;

      const tournament = await Tournament.findByPk(id);
      if (!tournament) {
        return res.status(404).json({ message: "Tournament not found" });
      }

      const matches = await Match.findAll({
        where: { tournament_id: id },
        include: [
          {
            model: TournamentParticipant,
            as: "participant1",
            include: [
              { model: User, as: "user", attributes: ["id", "username", "avatar_url"] },
            ],
          },
          {
            model: TournamentParticipant,
            as: "participant2",
            include: [
              { model: User, as: "user", attributes: ["id", "username", "avatar_url"] },
            ],
          },
          {
            model: TournamentParticipant,
            as: "winner",
            include: [
              { model: User, as: "user", attributes: ["id", "username", "avatar_url"] },
            ],
          },
        ],
        order: [
          ["bracket_type", "ASC"],
          ["round_number", "ASC"],
          ["created_at", "ASC"],
        ],
      });

      // Organize matches by bracket type
      const bracket = {
        winners: {},
        losers: {},
        finals: [],
      };

      matches.forEach((match) => {
        if (match.bracket_type === "winners") {
          if (!bracket.winners[match.round_number]) {
            bracket.winners[match.round_number] = [];
          }
          bracket.winners[match.round_number].push(match);
        } else if (match.bracket_type === "losers") {
          if (!bracket.losers[match.round_number]) {
            bracket.losers[match.round_number] = [];
          }
          bracket.losers[match.round_number].push(match);
        } else if (match.bracket_type === "finals") {
          bracket.finals.push(match);
        }
      });

      res.json({
        tournament: {
          id: tournament.id,
          name: tournament.name,
          format: tournament.format,
          status: tournament.status,
          current_round: tournament.current_round,
        },
        bracket,
      });
    } catch (error) {
      logger.error("Error fetching tournament bracket", {
        tournamentId: req.params.id,
        error: error.message,
      });
      next(error);
    }
  }

  /**
   * Generate tournament bracket
   */
  static async generateTournamentBracket(
    tournamentId,
    userId = null,
    transaction = null,
    isInternalCall = false
  ) {
    let localTransaction = transaction;
    let tournament;
    
    try {
      logger.info("Generating tournament bracket", { tournamentId, userId });

      if (!localTransaction) {
        localTransaction = await sequelize.transaction();
      }

      // Normalize tournamentId
      const tournamentIdValue = typeof tournamentId === "object" ? tournamentId.id : tournamentId;

      tournament = await Tournament.findByPk(tournamentIdValue, {
        transaction: localTransaction,
      });

      if (!tournament) {
        if (!transaction) await localTransaction.rollback();
        throw new Error("Tournament not found");
      }

      if (userId && tournament.created_by !== userId) {
        if (!transaction) await localTransaction.rollback();
        throw new Error("Only the tournament creator can generate the bracket");
      }

      validateTournamentStatus(tournament, [TOURNAMENT_STATUS.LOCKED], "generate bracket for");

      const participants = await TournamentParticipant.findAll({
        where: { tournament_id: tournamentIdValue },
        transaction: localTransaction,
      });

      // Generate bracket
      await generateBracket(tournamentIdValue, participants, localTransaction);

      // Update tournament status
      await tournament.update(
        { status: TOURNAMENT_STATUS.LIVE },
        { transaction: localTransaction }
      );

      if (!transaction) await localTransaction.commit();
      
      logger.info("Bracket generated successfully", { tournamentId: tournamentIdValue });

      // Send notifications
      const participantsWithUsers = await TournamentParticipant.findAll({
        where: { tournament_id: tournamentIdValue },
        include: [{ model: User, as: "user" }],
      });

      const notificationPromises = participantsWithUsers.map((participant) =>
        NotificationService.createNotification(
          participant.user_id,
          "Tournament Starting",
          `The tournament "${tournament.name}" bracket has been generated. Tournament is now live!`,
          "tournament",
          "tournament",
          tournament.id
        )
      );

      await Promise.allSettled(notificationPromises);

      if (isInternalCall) {
        return { tournament };
      }

      return { tournament };

    } catch (error) {
      if (!transaction && localTransaction && !localTransaction.finished) {
        await localTransaction.rollback();
      }
      
      logger.error("Error generating tournament bracket", {
        tournamentId,
        error: error.message,
        stack: error.stack,
      });
      
      if (isInternalCall) {
        throw error;
      }
      
      return { error: error.message };
    }
  }

  /**
   * Get tournament management info
   */
  static async getTournamentManagementInfo(req, res, next) {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      const tournament = await Tournament.findByPk(id, {
        include: [
          { model: Game, as: "game", attributes: ["name", "logo_url"] },
          { model: Platform, as: "platform", attributes: ["name"] },
          { model: GameMode, as: "game_mode", attributes: ["name"] },
          {
            model: TournamentParticipant,
            as: "participants",
            include: [
              {
                model: User,
                as: "user",
                attributes: ["id", "username", "email"],
              },
            ],
          },
          {
            model: TournamentPrize,
            as: "prizes",
            attributes: ["position", "percentage"],
            order: [["position", "ASC"]],
          },
          {
            model: Match,
            as: "matches",
            include: [
              {
                model: TournamentParticipant,
                as: "participant1",
                include: [
                  { model: User, as: "user", attributes: ["id", "username"] },
                ],
              },
              {
                model: TournamentParticipant,
                as: "participant2",
                include: [
                  { model: User, as: "user", attributes: ["id", "username"] },
                ],
              },
            ],
            order: [["round_number", "ASC"], ["created_at", "ASC"]],
          },
        ],
      });

      if (!tournament) {
        return res.status(404).json({ message: "Tournament not found" });
      }

      // Check permissions
      if (tournament.created_by !== userId && req.user.role !== "admin") {
        return res.status(403).json({ message: "Access denied" });
      }

      res.json(tournament);
    } catch (error) {
      logger.error("Error fetching tournament management info", {
        tournamentId: req.params.id,
        userId: req.user.id,
        error: error.message,
      });
      next(error);
    }
  }

  /**
   * Advance tournament to next round
   */
  static async advanceTournament(req, res, next) {
    const transaction = await sequelize.transaction();
    
    try {
      const { id } = req.params;
      const userId = req.user.id;

      logger.info("Advancing tournament", { tournamentId: id, userId });

      const tournament = await Tournament.findByPk(id, { transaction });
      if (!tournament) {
        await transaction.rollback();
        return res.status(404).json({ message: "Tournament not found" });
      }

      // Check ownership
      validateTournamentOwnership(tournament, userId);
      
      // Check status
      validateTournamentStatus(tournament, [TOURNAMENT_STATUS.LIVE], "advance");

      // Get current round matches
      const currentRoundMatches = await Match.findAll({
        where: {
          tournament_id: id,
          round_number: tournament.current_round || 1,
        },
        transaction,
      });

      // Check if all matches in current round are completed
      const incompleteMatches = currentRoundMatches.filter(
        (match) => match.status !== "completed"
      );
      
      if (incompleteMatches.length > 0) {
        await transaction.rollback();
        return res.status(400).json({
          message: "Cannot advance tournament. Not all matches in the current round are completed.",
          incompleteMatches: incompleteMatches.map(m => m.id),
        });
      }

      // Generate next round matches
      const nextRoundNumber = (tournament.current_round || 1) + 1;
      // Implement generateNextRound function
       await generateNextRound(tournament, nextRoundNumber, transaction);


      await transaction.commit();
      logger.info("Tournament advanced", { 
        tournamentId: id, 
        newRound: nextRoundNumber 
      });

      res.json({
        message: "Tournament advanced to next round",
        tournament: {
          id: tournament.id,
          name: tournament.name,
          current_round: nextRoundNumber,
        },
      });

    } catch (error) {
      await handleTransactionError(transaction, error);
      
      if (error.code === "FORBIDDEN") {
        return res.status(403).json({ message: error.message });
      }
      if (error.code === "INVALID_TOURNAMENT_STATUS") {
        return res.status(400).json({ message: error.message });
      }

      logger.error("Error advancing tournament", {
        tournamentId: req.params.id,
        userId: req.user.id,
        error: error.message,
      });
      next(error);
    }
  }

  /**
   * Check if user can join tournament
   */
  static async checkJoinEligibility(req, res, next) {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      const tournament = await Tournament.findByPk(id);
      if (!tournament) {
        return res.status(404).json({ message: "Tournament not found" });
      }

      // Check if already participating
      const existingParticipant = await TournamentParticipant.findOne({
        where: { tournament_id: id, user_id: userId },
      });

      const canJoin = 
        !existingParticipant &&
        tournament.status === TOURNAMENT_STATUS.OPEN &&
        tournament.current_slots < tournament.total_slots;

      const eligibility = {
        canJoin,
        reasons: [],
        tournament: {
          id: tournament.id,
          name: tournament.name,
          status: tournament.status,
          current_slots: tournament.current_slots,
          total_slots: tournament.total_slots,
          entry_fee: tournament.entry_fee,
        },
      };

      if (existingParticipant) {
        eligibility.reasons.push("Already registered for this tournament");
      }
      if (tournament.status !== TOURNAMENT_STATUS.OPEN) {
        eligibility.reasons.push(`Tournament is ${tournament.status}`);
      }
      if (tournament.current_slots >= tournament.total_slots) {
        eligibility.reasons.push("Tournament is full");
      }

      if (PAYMENT_PROCESSING_ENABLED) {
        const user = await User.findByPk(userId);
        if (user && parseFloat(user.wallet_balance) < parseFloat(tournament.entry_fee)) {
          eligibility.reasons.push("Insufficient balance");
        }
      }

      res.json(eligibility);
    } catch (error) {
      logger.error("Error checking join eligibility", {
        tournamentId: req.params.id,
        userId: req.user.id,
        error: error.message,
      });
      next(error);
    }
  }

  /**
 * Get tournament share link
 */
static async getTournamentShareLink(req, res, next) {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    logger.info("Generating tournament share link", { tournamentId: id, userId });

    const tournament = await Tournament.findByPk(id, {
      include: [
        {
          model: TournamentParticipant,
          as: "participants",
          attributes: ['user_id'],
          required: false
        }
      ]
    });

    if (!tournament) {
      return res.status(404).json({ 
        success: false, 
        message: "Tournament not found" 
      });
    }

    // Check permissions (creator or participant can share)
    const isCreator = tournament.created_by === userId;
    const isParticipant = tournament.participants.some(p => p.user_id === userId);
    
    if (!isCreator && !isParticipant && tournament.visibility === 'private') {
      return res.status(403).json({ 
        success: false, 
        message: "You don't have permission to share this tournament" 
      });
    }

    // Generate shareable URL
    const sharePath = `/tournament/${id}/share`;
    const shareUrl = `${APP_URL}${sharePath}`;
    
    // Short URL option (using hash for shorter links)
    const shareHash = Buffer.from(`tournament_${id}_${Date.now()}`).toString('base64')
      .replace(/[+/=]/g, '')
      .substring(0, 10);
    
    const shortShareUrl = `${APP_URL}/t/${shareHash}`;

    // Social media metadata
    const shareMetadata = {
      title: `Join ${tournament.name} Tournament`,
      description: `Compete in ${tournament.name} - ${tournament.total_slots} slots available. Entry fee: $${tournament.entry_fee}`,
      image: tournament.game?.logo_url || `${APP_URL}/images/tournament-default.jpg`,
      hashtags: ['GamingTournament', 'Esports', 'CompetitiveGaming'],
    };

    // Optional: Track share in database
    try {
      // You could add a TournamentShare model to track analytics
      // await TournamentShare.create({
      //   tournament_id: id,
      //   shared_by: userId,
      //   share_type: 'link_generated'
      // });
    } catch (trackError) {
      // Don't fail if tracking fails
      logger.warn("Failed to track share", { error: trackError.message });
    }

    res.json({
      success: true,
      data: {
        share_url: shareUrl,
        short_url: shortShareUrl,
        tournament_id: tournament.id,
        tournament_name: tournament.name,
        metadata: shareMetadata,
        social_share: {
          facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`,
          twitter: `https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareMetadata.title)}`,
          whatsapp: `https://wa.me/?text=${encodeURIComponent(shareMetadata.title + ' ' + shareUrl)}`,
          telegram: `https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareMetadata.title)}`
        }
      },
      message: "Share link generated successfully"
    });

  } catch (error) {
    logger.error("Error generating tournament share link", {
      tournamentId: req.params.id,
      userId: req.user.id,
      error: error.message,
      stack: error.stack
    });
    
    res.status(500).json({
      success: false,
      message: "Failed to generate share link",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}

/**
 * Handle shared tournament link (for redirect logic)
 * This endpoint checks auth and redirects appropriately
 */
static async handleSharedTournamentLink(req, res, next) {
  try {
    const { id } = req.params;
    const { redirect } = req.query;
    const authToken = req.headers.authorization?.replace('Bearer ', '');
    
    logger.info("Handling shared tournament link", { 
      tournamentId: id, 
      hasToken: !!authToken 
    });

    const tournament = await Tournament.findByPk(id, {
      attributes: ['id', 'name', 'status', 'visibility', 'created_by'],
      include: [
        {
          model: Game,
          as: "game",
          attributes: ["name", "logo_url"]
        }
      ]
    });

    if (!tournament) {
      return res.status(404).json({
        success: false,
        message: "Tournament not found or has been deleted"
      });
    }

    // Check tournament status
    if (tournament.status === TOURNAMENT_STATUS.CANCELLED) {
      return res.status(410).json({
        success: false,
        message: "This tournament has been cancelled"
      });
    }

    // For API responses (when redirect=false)
    if (redirect === 'false') {
      const response = {
        success: true,
        data: {
          tournament: {
            id: tournament.id,
            name: tournament.name,
            status: tournament.status,
            visibility: tournament.visibility,
            game: tournament.game
          },
          requires_auth: !authToken,
          auth_redirect_url: `${APP_URL}/auth/login?redirect=/tournament/${id}`,
          direct_url: `${APP_URL}/tournament/${id}`
        }
      };

      // If user has a token, verify it
      if (authToken) {
        try {
          // In a real app, verify JWT token here
          // const decoded = jwt.verify(authToken, process.env.JWT_SECRET);
          response.data.is_authenticated = true;
          response.data.user_has_access = true; // Assuming token is valid
        } catch (authError) {
          response.data.is_authenticated = false;
          response.data.requires_auth = true;
        }
      }

      return res.json(response);
    }

    // For web redirects (default behavior)
   
    // Generate HTML page for social media crawlers (SEO)
    const userAgent = req.headers['user-agent'] || '';
    const isSocialMediaBot = /facebookexternalhit|LinkedInBot|Twitterbot|WhatsApp|TelegramBot/i.test(userAgent);

    if (isSocialMediaBot) {
      const html = `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta property="og:title" content="${tournament.name} Tournament">
            <meta property="og:description" content="Join this competitive gaming tournament!">
            <meta property="og:image" content="${tournament.game?.logo_url || `${APP_URL}/images/tournament-default.jpg`}">
            <meta property="og:url" content="${APP_URL}/tournament/${id}/share">
            <meta property="og:type" content="website">
            <meta name="twitter:card" content="summary_large_image">
            <title>${tournament.name} - Gaming Tournament</title>
          </head>
          <body>
            <h1>${tournament.name}</h1>
            <p>Join this exciting gaming tournament!</p>
            <p><a href="${APP_URL}/tournament/${id}">Click here to view tournament details</a></p>
          </body>
          </html>
      `;
      return res.send(html);
    }

    // Regular user redirect logic
    if (authToken) {
      // User has token - redirect to tournament page
      // In production, you'd verify the token first
      const redirectUrl = `${APP_URL}/tournament/${id}`;
      return res.redirect(redirectUrl);
    } else {
      // No token - redirect to login with tournament context
      const loginUrl = `${APP_URL}/auth/login?redirect=/tournament/${id}&tournament_id=${id}`;
      return res.redirect(loginUrl);
    }

  } catch (error) {
    logger.error("Error handling shared tournament link", {
      tournamentId: req.params.id,
      error: error.message,
      stack: error.stack
    });
    
    // Fallback redirect to home page
    res.redirect(APP_URL);
  }
}

}

module.exports = {
  createTournament: TournamentController.createTournament,
  getTournamentById: TournamentController.getTournamentById,
  joinTournament: TournamentController.joinTournament,
  getTournaments: TournamentController.getTournaments,
  getMyTournaments: TournamentController.getMyTournaments,
  updateTournament: TournamentController.updateTournament,
  deleteTournament: TournamentController.deleteTournament,
  startTournament: TournamentController.startTournament,
  finalizeTournament: TournamentController.finalizeTournament,
  getTournamentMatches: TournamentController.getTournamentMatches,
  getTournamentBracket: TournamentController.getTournamentBracket,
  generateTournamentBracket: TournamentController.generateTournamentBracket,
  getTournamentManagementInfo: TournamentController.getTournamentManagementInfo,
  advanceTournament: TournamentController.advanceTournament,
  checkJoinEligibility: TournamentController.checkJoinEligibility,
  handleSharedTournamentLink:TournamentController.handleSharedTournamentLink,
  getTournamentShareLink:TournamentController.getTournamentShareLink
};
