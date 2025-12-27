// controllers/userController.js
const { User, Tournament, TournamentParticipant, Match, Game, Platform, GameMode, Transaction, sequelize } = require('../models');
const { Op, QueryTypes, fn, col, literal } = require('sequelize');

const getProfile = async (req, res, next) => {
  try {
    const user = req.user;
    
    // Get profile fields - assuming they exist in User model or we need to add them
    res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          phone_number: user.phone_number,
          hasPassword: !!user.password_hash,
          avatar_url: user.avatar_url || null,
          is_verified: user.is_verified,
          role: user.role || 'player',
          wallet_balance: parseFloat(user.wallet_balance) || 0,
          created_at: user.created_at,
          updated_at: user.updated_at,
         
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

// Update user profile
const updateProfile = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const {
      username,
      email,
      phone_number,
      display_name,
      bio,
      country,
      city,
      date_of_birth,
      preferred_games,
      gaming_platform,
      social_links
    } = req.body;

    // Build update object
    const updateData = {};
    
    // Basic user info
    if (username) updateData.username = username;
    if (email) updateData.email = email;
    if (phone_number) updateData.phone_number = phone_number;
    
    // Profile info
    if (display_name) updateData.display_name = display_name;
    if (bio !== undefined) updateData.bio = bio;
    if (country) updateData.country = country;
    if (city) updateData.city = city;
    if (date_of_birth) updateData.date_of_birth = date_of_birth;
    if (preferred_games) updateData.preferred_games = JSON.stringify(preferred_games);
    if (gaming_platform) updateData.gaming_platform = gaming_platform;
    if (social_links) updateData.social_links = JSON.stringify(social_links);

    // Update user
    await User.update(updateData, {
      where: { id: userId }
    });

    // Fetch updated user
    const updatedUser = await User.findByPk(userId);

    res.json({
      success: true,
      data: {
        user: {
          id: updatedUser.id,
          username: updatedUser.username,
          email: updatedUser.email,
          phone_number: updatedUser.phone_number,
          avatar_url: updatedUser.avatar_url || null,
          is_verified: updatedUser.is_verified,
          role: updatedUser.role || 'player',
          wallet_balance: parseFloat(updatedUser.wallet_balance) || 0,
          created_at: updatedUser.created_at,
          updated_at: updatedUser.updated_at,
          profile: {
            display_name: updatedUser.display_name || updatedUser.username,
            bio: updatedUser.bio || '',
            country: updatedUser.country || 'Tanzania',
            city: updatedUser.city || '',
            date_of_birth: updatedUser.date_of_birth || null,
            preferred_games: updatedUser.preferred_games ? JSON.parse(updatedUser.preferred_games) : [],
            gaming_platform: updatedUser.gaming_platform || 'PC',
            social_links: updatedUser.social_links ? JSON.parse(updatedUser.social_links) : {}
          }
        },
        message: 'Profile updated successfully'
      }
    });
  } catch (error) {
    next(error);
  }
};

// Get user statistics with proper calculations
const getUserStats = async (req, res, next) => {
  try {
    const userId = req.user.id;
    
    // 1. Get user's tournament participations with tournament info for game data
    const participations = await TournamentParticipant.findAll({
      where: { user_id: userId },
      include: [{
        model: Tournament,
        as: 'tournament',
        include: [{
          model: Game,
          as: 'game'
        }]
      }]
    });

    // Get participation IDs
    const participationIds = participations.map(p => p.id);

    // 2. Calculate matches played
    const matchesPlayed = await Match.count({
      where: {
        [Op.or]: [
          { participant1_id: { [Op.in]: participationIds } },
          { participant2_id: { [Op.in]: participationIds } }
        ],
        status: 'completed'
      }
    });

    // 3. Calculate wins (matches where user's participant is the winner)
    const wins = await Match.count({
      where: {
        winner_id: { [Op.in]: participationIds },
        status: 'completed'
      }
    });

    // 4. Calculate losses
    const losses = matchesPlayed - wins;
    
    // 5. Calculate win rate
    const winRate = matchesPlayed > 0 ? (wins / matchesPlayed) * 100 : 0;

    // 6. Calculate tournament statistics
    const tournamentsJoined = participations.length;
    
    // 7. Calculate tournaments won (where final_standing = 1)
    const tournamentsWon = participations.filter(p => p.final_standing === 1).length;

    // 8. Calculate total earnings (sum of prize_won transactions)
    const totalEarningsResult = await Transaction.findOne({
      where: {
        user_id: userId,
        type: 'prize_won',
        status: 'completed'
      },
      attributes: [
        [fn('SUM', col('amount')), 'total']
      ]
    });
    const totalEarnings = parseFloat(totalEarningsResult?.dataValues.total || 0);

    // 9. Calculate highest win
    const highestWinResult = await Transaction.findOne({
      where: {
        user_id: userId,
        type: 'prize_won',
        status: 'completed'
      },
      attributes: [
        [fn('MAX', col('amount')), 'max_amount']
      ]
    });
    const highestWin = parseFloat(highestWinResult?.dataValues.max_amount || 0);

    // 10. Calculate average position in tournaments
    const positions = participations
      .filter(p => p.final_standing !== null && p.final_standing > 0)
      .map(p => p.final_standing);
    
    const averagePosition = positions.length > 0 
      ? positions.reduce((sum, pos) => sum + pos, 0) / positions.length
      : 0;

    // 11. Calculate best streak (consecutive wins)
    // Get all matches in chronological order
    const allMatches = await Match.findAll({
      where: {
        [Op.or]: [
          { participant1_id: { [Op.in]: participationIds } },
          { participant2_id: { [Op.in]: participationIds } }
        ],
        status: 'completed'
      },
      order: [['created_at', 'ASC']]
    });

    // Calculate best streak
    let currentStreak = 0;
    let bestStreak = 0;
    
    for (const match of allMatches) {
      const isWin = participationIds.includes(match.winner_id);
      if (isWin) {
        currentStreak++;
        bestStreak = Math.max(bestStreak, currentStreak);
      } else {
        currentStreak = 0;
      }
    }

    // 12. Calculate total deposits
    const totalDepositsResult = await Transaction.findOne({
      where: {
        user_id: userId,
        type: 'wallet_deposit',
        status: 'completed'
      },
      attributes: [
        [fn('SUM', col('amount')), 'total']
      ]
    });
    const totalDeposits = parseFloat(totalDepositsResult?.dataValues.total || 0);

    // 13. Calculate total withdrawals
    const totalWithdrawalsResult = await Transaction.findOne({
      where: {
        user_id: userId,
        type: 'wallet_withdrawal',
        status: 'completed'
      },
      attributes: [
        [fn('SUM', col('amount')), 'total']
      ]
    });
    const totalWithdrawals = parseFloat(totalWithdrawalsResult?.dataValues.total || 0);

    // 14. Calculate active tournaments
    const activeTournaments = await TournamentParticipant.count({
      where: { user_id: userId },
      include: [{
        model: Tournament,
        as: 'tournament',
        where: { status: 'active' }
      }]
    });

    // 15. Calculate pending tournaments
    const pendingTournaments = await TournamentParticipant.count({
      where: { user_id: userId },
      include: [{
        model: Tournament,
        as: 'tournament',
        where: { 
          status: { [Op.in]: ['open', 'pending', 'scheduled'] }
        }
      }]
    });

    // 16. Calculate average winning per tournament won
    const averageWinning = tournamentsWon > 0 ? totalEarnings / tournamentsWon : 0;

    // 17. Calculate preferred game (most played)
    const gameCount = {};
    participations.forEach(p => {
      const gameName = p.tournament?.game?.name || 'Unknown';
      gameCount[gameName] = (gameCount[gameName] || 0) + 1;
    });
    
    let preferredGame = 'None';
    let maxCount = 0;
    for (const [game, count] of Object.entries(gameCount)) {
      if (count > maxCount) {
        maxCount = count;
        preferredGame = game;
      }
    }

    // 18. Calculate rank position (based on total earnings)
    const rankQuery = `
      SELECT 
        user_id,
        RANK() OVER (ORDER BY COALESCE(SUM(CASE WHEN type = 'prize_won' THEN amount ELSE 0 END), 0) DESC) as rank_position,
        COALESCE(SUM(CASE WHEN type = 'prize_won' THEN amount ELSE 0 END), 0) as total_earnings
      FROM transactions 
      WHERE status = 'completed'
      GROUP BY user_id
      ORDER BY total_earnings DESC
    `;
    
    const rankings = await sequelize.query(rankQuery, { type: QueryTypes.SELECT });
    const userRank = rankings.find(r => r.user_id === userId);
    const rankPosition = userRank ? userRank.rank_position : 0;

    // 19. Calculate percentile
    const totalUsers = await User.count();
    const percentile = totalUsers > 0 ? Math.round(((totalUsers - rankPosition) / totalUsers) * 100) : 0;

    // 20. Calculate monthly stats
    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    
    // Monthly matches
    const monthlyMatches = await Match.count({
      where: {
        [Op.or]: [
          { participant1_id: { [Op.in]: participationIds } },
          { participant2_id: { [Op.in]: participationIds } }
        ],
        status: 'completed',
        created_at: { [Op.gte]: firstDayOfMonth }
      }
    });

    // Monthly wins
    const monthlyWins = await Match.count({
      where: {
        winner_id: { [Op.in]: participationIds },
        status: 'completed',
        created_at: { [Op.gte]: firstDayOfMonth }
      }
    });

    // Monthly earnings
    const monthlyEarningsResult = await Transaction.findOne({
      where: {
        user_id: userId,
        type: 'prize_won',
        status: 'completed',
        created_at: { [Op.gte]: firstDayOfMonth }
      },
      attributes: [
        [fn('SUM', col('amount')), 'total']
      ]
    });
    const monthlyEarnings = parseFloat(monthlyEarningsResult?.dataValues.total || 0);

    // Return all stats
    res.json({
      success: true,
      data: {
        matches_played: matchesPlayed,
        wins: wins,
        losses: losses,
        win_rate: parseFloat(winRate.toFixed(1)),
        total_earnings: parseFloat(totalEarnings.toFixed(2)),
        highest_win: parseFloat(highestWin.toFixed(2)),
        average_position: parseFloat(averagePosition.toFixed(1)),
        best_streak: bestStreak,
        tournaments_joined: tournamentsJoined,
        tournaments_won: tournamentsWon,
        total_deposits: parseFloat(totalDeposits.toFixed(2)),
        total_withdrawals: parseFloat(totalWithdrawals.toFixed(2)),
        active_tournaments: activeTournaments,
        pending_tournaments: pendingTournaments,
        average_winning: parseFloat(averageWinning.toFixed(2)),
        preferred_game: preferredGame,
        rank_position: rankPosition,
        percentile: percentile,
        monthly_stats: {
          matches: monthlyMatches,
          wins: monthlyWins,
          earnings: parseFloat(monthlyEarnings.toFixed(2))
        }
      }
    });
  } catch (error) {
    console.error('Error getting user stats:', error);
    next(error);
  }
};

// Get user tournaments with pagination
const getUserTournaments = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { 
      page = 1, 
      limit = 10, 
      status, 
      sort_by = 'created_at',
      sort_order = 'DESC'
    } = req.query;

    const offset = (page - 1) * limit;

    // Build where conditions
    const whereConditions = { user_id: userId };
    
    // Build include conditions for tournaments
    const tournamentInclude = {
      model: Tournament,
      as: 'tournament',
      include: [
        { model: Game, as: 'game', attributes: ['id', 'name'] },
        { model: Platform, as: 'platform', attributes: ['id', 'name'] },
        { model: GameMode, as: 'game_mode', attributes: ['id', 'name'] }
      ]
    };

    if (status) {
      tournamentInclude.where = { status };
    }

    // Get total count
    const total = await TournamentParticipant.count({
      where: whereConditions,
      include: status ? [tournamentInclude] : []
    });

    // Get paginated results
    const participations = await TournamentParticipant.findAll({
      where: whereConditions,
      include: [tournamentInclude],
      order: [[{ model: Tournament, as: 'tournament' }, sort_by, sort_order]],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    // Format response
    const tournaments = participations.map(participation => ({
      id: participation.tournament.id,
      name: participation.tournament.name,
      game: participation.tournament.game?.name || 'Unknown',
      platform: participation.tournament.platform?.name || 'Unknown',
      game_mode: participation.tournament.game_mode?.name || 'Unknown',
      status: participation.tournament.status,
      entry_fee: parseFloat(participation.tournament.entry_fee) || 0,
      total_slots: participation.tournament.total_slots,
      current_slots: participation.tournament.current_slots,
      start_time: participation.tournament.start_time,
      created_at: participation.tournament.created_at,
      participant_status: participation.checked_in ? 'checked_in' : 'registered',
      position: participation.final_standing || 'N/A',
      prize_amount: participation.prize_amount ? parseFloat(participation.prize_amount) : null
    }));

    res.json({
      success: true,
      data: {
        tournaments,
        pagination: {
          current_page: parseInt(page),
          total_pages: Math.ceil(total / limit),
          total_items: total,
          items_per_page: parseInt(limit)
        }
      }
    });
  } catch (error) {
    console.error('Error getting user tournaments:', error);
    next(error);
  }
};

// Get user activity log
const getUserActivity = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 20, type } = req.query;
    const offset = (page - 1) * limit;

    // Build query conditions
    const whereConditions = { user_id: userId };
    if (type) {
      whereConditions.type = type;
    }

    // Get transactions
    const { count: transactionCount, rows: transactions } = await Transaction.findAndCountAll({
      where: whereConditions,
      order: [['created_at', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    // Format activities
    const activities = transactions.map(t => {
      let description = '';
      let details = {};

      switch(t.type) {
        case 'wallet_deposit':
          description = `Deposited ${parseFloat(t.amount).toFixed(2)} TZS`;
          details = { transaction_id: t.id, reference: t.payment_reference };
          break;
        case 'wallet_withdrawal':
          description = `Withdrew ${parseFloat(t.amount).toFixed(2)} TZS`;
          details = { transaction_id: t.id, reference: t.payment_reference };
          break;
        case 'tournament_entry':
          description = `Paid ${parseFloat(t.amount).toFixed(2)} TZS tournament entry fee`;
          details = { transaction_id: t.id, tournament_id: t.tournament_id };
          break;
        case 'prize_won':
          description = `Won ${parseFloat(t.amount).toFixed(2)} TZS prize`;
          details = { transaction_id: t.id, tournament_id: t.tournament_id };
          break;
        case 'tournament_refund':
          description = `Refunded ${parseFloat(t.amount).toFixed(2)} TZS`;
          details = { transaction_id: t.id, tournament_id: t.tournament_id };
          break;
        default:
          description = t.description || `Transaction: ${t.type}`;
          details = { transaction_id: t.id };
      }

      return {
        id: t.id,
        type: 'transaction',
        action: t.type,
        amount: parseFloat(t.amount),
        status: t.status,
        description: description,
        timestamp: t.created_at,
        details: details
      };
    });

    res.json({
      success: true,
      data: {
        activities,
        pagination: {
          current_page: parseInt(page),
          total_pages: Math.ceil(transactionCount / limit),
          total_items: transactionCount,
          items_per_page: parseInt(limit)
        }
      }
    });
  } catch (error) {
    console.error('Error getting user activity:', error);
    next(error);
  }
};

// Get wallet balance
const getWalletBalance = async (req, res, next) => {
  try {
    const user = req.user;
    
    // Get recent transactions for context
    const recentTransactions = await Transaction.findAll({
      where: {
        user_id: user.id,
        status: 'completed'
      },
      order: [['created_at', 'DESC']],
      limit: 5
    });

    res.json({
      success: true,
      data: {
        balance: parseFloat(user.wallet_balance) || 0,
        currency: 'TZS',
        recent_transactions: recentTransactions.map(t => ({
          id: t.id,
          type: t.type,
          amount: parseFloat(t.amount),
          status: t.status,
          description: t.description,
          created_at: t.created_at
        }))
      }
    });
  } catch (error) {
    next(error);
  }
};

// Get notification preferences
const getNotificationPreferences = async (req, res, next) => {
  try {
    const user = req.user;
    
    res.json({
      success: true,
      data: {
        email_notifications: user.email_notifications,
        push_notifications: user.push_notifications,
        sms_notifications: user.sms_notifications,
        updated_at: user.updated_at
      }
    });
  } catch (error) {
    next(error);
  }
};

// Update notification preferences
const updateNotificationPreferences = async (req, res, next) => {
  try {
    const { email_notifications, push_notifications, sms_notifications } = req.body;
    const user = req.user;
    
    await user.update({
      email_notifications: email_notifications !== undefined ? email_notifications : user.email_notifications,
      push_notifications: push_notifications !== undefined ? push_notifications : user.push_notifications,
      sms_notifications: sms_notifications !== undefined ? sms_notifications : user.sms_notifications
    });
    
    res.json({
      success: true,
      data: {
        message: 'Notification preferences updated successfully',
        preferences: {
          email_notifications: user.email_notifications,
          push_notifications: user.push_notifications,
          sms_notifications: user.sms_notifications
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getProfile,
  updateProfile,
  getUserStats,
  getUserTournaments,
  getUserActivity,
  updateNotificationPreferences,
  getNotificationPreferences,
  getWalletBalance
};