// controllers/publicProfileController.js
const { User, Tournament, Match, TournamentParticipant, Follow, FriendRequest, Game, GameMode, Platform, Activity, UserStat } = require('../models');
const { Op, Sequelize } = require('sequelize');
// const { ActivityService } = require('../services/activityService');

class PublicProfileController {
  // Get public profile data
  async getPublicProfile(req, res) {
    try {
      const { userId } = req.params;
      const currentUserId = req.user?.id; // logged in user (optional)
      
      const user = await User.findByPk(userId, {
        attributes: {
          exclude: [
            'email', 
            'password_hash',
            'wallet_balance',
            'verification_token',
            'reset_token',
            'phone_verification_code',
            'google_id',
            'phone_number'
          ]
        },
        include: [
          {
            model: UserStat,
            as: 'stats',
            attributes: ['win_rate', 'matches_played', 'matches_won', 'tournaments_won', 'average_position', 'best_win_streak', 'level']
          }
        ]
      });
      
      if (!user) {
        return res.status(404).json({
          success: false,
          error: 'User not found'
        });
      }
      
      // Check if profile is private (you can add privacy settings later)
      if (user.profile_privacy === 'private' && currentUserId !== user.id) {
        return res.status(403).json({
          success: false,
          error: 'This profile is private'
        });
      }
      
      // Helper functions defined locally to fix "PublicProfileController" issue
      const getMatchesPlayedCount = async (userId) => {
        const participations = await TournamentParticipant.findAll({
          where: { user_id: userId },
          attributes: ['id']
        });
        
        const participantIds = participations.map(p => p.id);
        
        if (participantIds.length === 0) return 0;
        
        const matchCount = await Match.count({
          where: {
            [Op.or]: [
              { participant1_id: { [Op.in]: participantIds } },
              { participant2_id: { [Op.in]: participantIds } }
            ]
          }
        });
        
        return matchCount;
      };

      const getMatchesWonCount = async (userId) => {
        const participations = await TournamentParticipant.findAll({
          where: { user_id: userId },
          attributes: ['id']
        });
        
        const participantIds = participations.map(p => p.id);
        
        if (participantIds.length === 0) return 0;
        
        const winsCount = await Match.count({
          where: {
            winner_id: { [Op.in]: participantIds }
          }
        });
        
        return winsCount;
      };

      const isFollowing = async (followerId, followingId) => {
        const follow = await Follow.findOne({
          where: {
            follower_id: followerId,
            following_id: followingId
          }
        });
        
        return !!follow;
      };

      const getFriendsCount = async (userId) => {
        const userFollows = await Follow.findAll({
          where: { follower_id: userId },
          attributes: ['following_id']
        });
        
        const followingIds = userFollows.map(f => f.following_id);
        
        if (followingIds.length === 0) return 0;
        
        const mutualCount = await Follow.count({
          where: {
            follower_id: { [Op.in]: followingIds },
            following_id: userId
          }
        });
        
        return mutualCount;
      };

      const areFriends = async (userId1, userId2) => {
        const [follow1, follow2] = await Promise.all([
          Follow.findOne({
            where: {
              follower_id: userId1,
              following_id: userId2
            }
          }),
          Follow.findOne({
            where: {
              follower_id: userId2,
              following_id: userId1
            }
          })
        ]);
        
        return !!(follow1 && follow2);
      };

      const canSendFriendRequest = async (senderId, receiverId) => {
        // Check if already friends
        const areAlreadyFriends = await areFriends(senderId, receiverId);
        if (areAlreadyFriends) return false;
        
        // Check if friend request already exists
        const existingRequest = await FriendRequest.findOne({
          where: {
            [Op.or]: [
              { sender_id: senderId, receiver_id: receiverId },
              { sender_id: receiverId, receiver_id: senderId }
            ]
          }
        });
        
        return !existingRequest;
      };
      
      // Get basic stats using local helper functions
      const [
        tournamentsCreated,
        tournamentsParticipated,
        matchesPlayed,
        matchesWon,
        followersCount,
        followingCount,
        isUserFollowing,
        friendsCount
      ] = await Promise.all([
        // Tournaments created by user
        Tournament.count({
          where: { created_by: userId }
        }),
        
        // Tournaments participated
        TournamentParticipant.count({
          where: { user_id: userId }
        }),
        
        // Total matches played (through tournament participations)
        getMatchesPlayedCount(userId),
        
        // Matches won
        getMatchesWonCount(userId),
        
        // Followers count
        Follow.count({
          where: { following_id: userId }
        }),
        
        // Following count
        Follow.count({
          where: { follower_id: userId }
        }),
        
        // Check if current user is following PublicProfileController user
        currentUserId ? isFollowing(currentUserId, userId) : false,
        
        // Friends count
        getFriendsCount(userId)
      ]);
      
      // Calculate win rate if not in stats
      const winRate = user.stats?.win_rate || (matchesPlayed > 0 
        ? Math.round((matchesWon / matchesPlayed) * 100) 
        : 0);
      
      // Get recent tournaments (last 5)
      const recentTournaments = await TournamentParticipant.findAll({
        where: { user_id: userId },
        include: [
          {
            model: Tournament,
            as: 'tournament',
            include: [
              { model: Game, as: 'game', attributes: ['name'] },
              { model: GameMode, as: 'game_mode', attributes: ['name'] },
              { model: Platform, as: 'platform', attributes: ['name'] }
            ],
            attributes: ['id', 'name', 'status', 'created_at', 'prize_pool']
          }
        ],
        order: [['created_at', 'DESC']],
        limit: 5
      });
      
      // Get best tournament performance
      const bestTournament = await TournamentParticipant.findOne({
        where: { 
          user_id: userId,
          position: { [Op.ne]: null }
        },
        include: [
          {
            model: Tournament,
            as: 'tournament',
            attributes: ['id', 'name']
          }
        ],
        order: [['position', 'ASC']]
      });
      
      // Format response
      const response = {
        success: true,
        data: {
          user: {
            id: user.id,
            username: user.username,
            display_name: user.display_name,
            avatar_url: user.avatar_url,
            bio: user.bio,
            country: user.country,
            is_verified: user.is_verified,
            is_pro_player: user.is_pro_player,
            created_at: user.created_at,
            last_active_at: user.last_active_at,
            social_links: user.social_links,
            favorite_games: user.favorite_games,
            current_status: user.current_status
          },
          stats: {
            tournaments_created: tournamentsCreated,
            tournaments_participated: tournamentsParticipated,
            tournaments_won: user.stats?.tournaments_won || 0,
            matches_played: matchesPlayed,
            matches_won: matchesWon,
            win_rate: winRate,
            average_position: user.stats?.average_position || 0,
            best_win_streak: user.stats?.best_win_streak || 0,
            level: user.stats?.level || 1,
            followers_count: followersCount,
            following_count: followingCount,
            friends_count: friendsCount
          },
          relationship: {
            is_following: isUserFollowing,
            is_friend: currentUserId ? await areFriends(currentUserId, userId) : false,
            can_send_friend_request: currentUserId 
              ? await canSendFriendRequest(currentUserId, userId)
              : false
          },
          recent_tournaments: recentTournaments.map(participation => ({
            id: participation.tournament.id,
            name: participation.tournament.name,
            game: participation.tournament.game?.name,
            game_mode: participation.tournament.game_mode?.name,
            platform: participation.tournament.platform?.name,
            status: participation.tournament.status,
            position: participation.position,
            created_at: participation.tournament.created_at,
            prize_pool: participation.tournament.prize_pool
          })),
          best_performance: bestTournament ? {
            tournament_name: bestTournament.tournament.name,
            position: bestTournament.position,
            tournament_id: bestTournament.tournament.id
          } : null
        }
      };
      
      res.json(response);
      
    } catch (error) {
      console.error('Error getting public profile:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to load profile'
      });
    }
  }
  
  // Search users
  async searchUsers(req, res) {
    try {
      const {
        search = '',
        page = 1,
        limit = 20,
        sortBy = 'newest',
        role = 'all',
        onlineOnly = false,
        verifiedOnly = false,
        proOnly = false,
        excludeSelf = true,
        currentUserId
      } = req.query;
      
     // const currentUserId = req.user?.id;
      
      const offset = (page - 1) * limit;
      
      // Build where conditions
      const whereConditions = {};
      
      // Search by username, display name, or country
      if (search) {
        whereConditions[Op.or] = [
          { username: { [Op.iLike]: `%${search}%` } },
          { display_name: { [Op.iLike]: `%${search}%` } },
          { country: { [Op.iLike]: `%${search}%` } }
        ];
      }
      
      // Filter by role
      if (role !== 'all') {
        whereConditions.role = role;
      }
      
      // Filter by online status
      if (onlineOnly === 'true' || onlineOnly === true) {
        const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
        whereConditions.last_active_at = { [Op.gte]: thirtyMinutesAgo };
        whereConditions.current_status = { [Op.in]: ['online', 'in_game'] };
      }
      
      // Filter by verified status
      if (verifiedOnly === 'true' || verifiedOnly === true) {
        whereConditions.is_verified = true;
      }
      
      // Filter by pro player status
      if (proOnly === 'true' || proOnly === true) {
        whereConditions.is_pro_player = true;
      }
      
      // Exclude current user
      if (excludeSelf === 'true' && currentUserId) {
        whereConditions.id = { [Op.ne]: currentUserId };
      }
      
      // Build order conditions
      let order = [];
      switch (sortBy) {
        case 'newest':
          order = [['created_at', 'DESC']];
          break;
        case 'most_followed':
          order = [[Sequelize.literal('followers_count'), 'DESC']];
          break;
        case 'highest_winrate':
          order = [[{ model: UserStat, as: 'stats' }, 'win_rate', 'DESC']];
          break;
        case 'most_tournaments':
          order = [[{ model: UserStat, as: 'stats' }, 'tournaments_won', 'DESC']];
          break;
        case 'most_wins':
          order = [[{ model: UserStat, as: 'stats' }, 'matches_won', 'DESC']];
          break;
        default:
          order = [['created_at', 'DESC']];
      }
      
      // Get users with pagination
      const { count, rows: users } = await User.findAndCountAll({
        where: whereConditions,
        attributes: {
          exclude: ['email', 'password_hash', 'wallet_balance'],
          include: [
            [
              Sequelize.literal(`(
                SELECT COUNT(*)
                FROM follows
                WHERE following_id = "User".id
              )`),
              'followers_count'
            ]
          ]
        },
        include: [
          {
            model: UserStat,
            as: 'stats',
            attributes: ['win_rate', 'tournaments_won', 'matches_won', 'level']
          }
        ],
        order,
        limit: parseInt(limit),
        offset: parseInt(offset)
      });
      
      // Add follow status for each user if current user is logged in
      let usersWithFollowStatus = users;
      if (currentUserId) {
        const followStatuses = await PublicProfileController.getBatchFollowStatus(currentUserId, users.map(u => u.id));
        usersWithFollowStatus = users.map(user => ({
          ...user.toJSON(),
          is_following: followStatuses[user.id] || false
        }));
      }
      
      res.json({
        success: true,
        data: {
          users: usersWithFollowStatus,
          total: count,
          page: parseInt(page),
          totalPages: Math.ceil(count / limit)
        }
      });
      
    } catch (error) {
      console.error('Error searching users:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to search users'
      });
    }
  }
  
  // Get users list (alias for search with defaults)
  async getUsersList(req, res) {
    await PublicProfileController.searchUsers(req, res);
  }
  
  // Get suggested users to follow
  async getSuggestedUsers(req, res) {
    try {
      const currentUserId = req.user.id;
      const limit = parseInt(req.query.limit) || 10;
      
      // Get users that current user follows
      const following = await Follow.findAll({
        where: { follower_id: currentUserId },
        attributes: ['following_id']
      });
      
      const followingIds = following.map(f => f.following_id);
      followingIds.push(currentUserId); // Exclude self
      
      // Get users with similar interests or most followed
      const suggestedUsers = await User.findAll({
        where: {
          id: { [Op.notIn]: followingIds },
          profile_privacy: { [Op.ne]: 'private' }
        },
        attributes: {
          exclude: ['email', 'password_hash', 'wallet_balance'],
          include: [
            [
              Sequelize.literal(`(
                SELECT COUNT(*)
                FROM follows
                WHERE following_id = "User".id
              )`),
              'followers_count'
            ]
          ]
        },
        include: [
          {
            model: UserStat,
            as: 'stats',
            attributes: ['win_rate', 'tournaments_won', 'level']
          }
        ],
        order: [
          [Sequelize.literal('followers_count'), 'DESC']
        ],
        limit
      });
      
      // Add follow status
      const usersWithStatus = suggestedUsers.map(user => ({
        ...user.toJSON(),
        is_following: false // Since they're not in following list
      }));
      
      res.json({
        success: true,
        data: {
          users: usersWithStatus
        }
      });
      
    } catch (error) {
      console.error('Error getting suggested users:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get suggested users'
      });
    }
  }
  
  // Get top players by category
  async getTopPlayers(req, res) {
    try {
      const category = req.query.category || 'winrate';
      const limit = parseInt(req.query.limit) || 10;
      
      let orderBy;
      switch (category) {
        case 'winrate':
          orderBy = [['win_rate', 'DESC']];
          break;
        case 'tournaments':
          orderBy = [['tournaments_won', 'DESC']];
          break;
        case 'matches':
          orderBy = [['matches_won', 'DESC']];
          break;
        case 'level':
          orderBy = [['level', 'DESC']];
          break;
        case 'streak':
          orderBy = [['best_win_streak', 'DESC']];
          break;
        default:
          orderBy = [['win_rate', 'DESC']];
      }
      
      const topPlayers = await UserStat.findAll({
        where: {
          '$user.profile_privacy$': { [Op.ne]: 'private' }
        },
        include: [
          {
            model: User,
            as: 'user',
            attributes: {
              exclude: ['email', 'password_hash', 'wallet_balance']
            }
          }
        ],
        order: orderBy,
        limit
      });
      
      const formattedPlayers = topPlayers.map(stat => ({
        ...stat.user.toJSON(),
        stats: {
          win_rate: stat.win_rate,
          tournaments_won: stat.tournaments_won,
          matches_won: stat.matches_won,
          level: stat.level,
          best_win_streak: stat.best_win_streak
        }
      }));
      
      res.json({
        success: true,
        data: {
          players: formattedPlayers,
          category
        }
      });
      
    } catch (error) {
      console.error('Error getting top players:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get top players'
      });
    }
  }
  
  // Batch check follow status
  async checkMultipleFollowStatus(req, res) {
    try {
      const { userIds } = req.body;
      const currentUserId = req.user.id;
      
      if (!Array.isArray(userIds)) {
        return res.status(400).json({
          success: false,
          error: 'userIds must be an array'
        });
      }
      
      const followStatus = await PublicProfileController.getBatchFollowStatus(currentUserId, userIds);
      
      res.json({
        success: true,
        data: {
          follow_status: followStatus
        }
      });
      
    } catch (error) {
      console.error('Error checking multiple follow status:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to check follow status'
      });
    }
  }
  
  // Check follow status for single user
  async checkFollowStatus(req, res) {
    try {
      const { userId } = req.params;
      const currentUserId = req.user.id;
      
      const isFollowing = await PublicProfileController.isFollowing(currentUserId, userId);
      
      res.json({
        success: true,
        data: {
          is_following: isFollowing
        }
      });
      
    } catch (error) {
      console.error('Error checking follow status:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to check follow status'
      });
    }
  }
  
  // Get user tournaments
  async getUserTournaments(req, res) {
    try {
      const { userId } = req.params;
      const { page = 1, limit = 20, status } = req.query;
      const offset = (page - 1) * limit;
      
      const whereConditions = { user_id: userId };
      if (status) {
        whereConditions['$tournament.status$'] = status;
      }
      
      const { count, rows: participations } = await TournamentParticipant.findAndCountAll({
        where: whereConditions,
        include: [
          {
            model: Tournament,
            as: 'tournament',
            include: [
              { model: Game, as: 'game', attributes: ['name'] },
              { model: GameMode, as: 'game_mode', attributes: ['name'] },
              { model: Platform, as: 'platform', attributes: ['name'] }
            ]
          }
        ],
        order: [['created_at', 'DESC']],
        limit: parseInt(limit),
        offset: parseInt(offset)
      });
      
      const tournaments = participations.map(participation => ({
        id: participation.tournament.id,
        name: participation.tournament.name,
        game: participation.tournament.game?.name,
        game_mode: participation.tournament.game_mode?.name,
        platform: participation.tournament.platform?.name,
        status: participation.tournament.status,
        position: participation.position,
        created_at: participation.tournament.created_at,
        prize_pool: participation.tournament.prize_pool,
        total_participants: participation.tournament.total_slots
      }));
      
      res.json({
        success: true,
        data: {
          tournaments,
          total: count,
          page: parseInt(page),
          totalPages: Math.ceil(count / limit)
        }
      });
      
    } catch (error) {
      console.error('Error getting user tournaments:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to load tournaments'
      });
    }
  }
  
  // Get user achievements
  async getUserAchievements(req, res) {
    try {
      const { userId } = req.params;
      
      // Get achievements from activities
      const achievements = await Activity.findAll({
        where: {
          user_id: userId,
          activity_type: { [Op.in]: ['achievement_unlock', 'tournament_win', 'level_up'] }
        },
        order: [['created_at', 'DESC']],
        limit: 20
      });
      
      res.json({
        success: true,
        data: {
          achievements: achievements.map(achievement => ({
            type: achievement.activity_type,
            title: achievement.title,
            description: achievement.description,
            earned_at: achievement.created_at
          }))
        }
      });
      
    } catch (error) {
      console.error('Error getting user achievements:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to load achievements'
      });
    }
  }
  
  // Report a user
  async reportUser(req, res) {
    try {
      const { userId } = req.params;
      const currentUserId = req.user.id;
      const { reason, description } = req.body;
      
      if (!reason || !description) {
        return res.status(400).json({
          success: false,
          error: 'Reason and description are required'
        });
      }
      
      // Check if user exists
      const userToReport = await User.findByPk(userId);
      if (!userToReport) {
        return res.status(404).json({
          success: false,
          error: 'User not found'
        });
      }
      
      // Can't report yourself
      if (currentUserId === parseInt(userId)) {
        return res.status(400).json({
          success: false,
          error: 'You cannot report yourself'
        });
      }
      
      // TODO: Save report to database (create Report model)
      // For now, just log it
      console.log(`User ${currentUserId} reported user ${userId}: ${reason} - ${description}`);
      
      res.json({
        success: true,
        message: 'Report submitted successfully'
      });
      
    } catch (error) {
      console.error('Error reporting user:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to submit report'
      });
    }
  }
  
  // Follow a user
  async followUser(req, res) {
    try {
      const { userId } = req.params;
      const currentUserId = req.user.id;
      
      // Check if user exists
      const userToFollow = await User.findByPk(userId);
      if (!userToFollow) {
        return res.status(404).json({
          success: false,
          error: 'User not found'
        });
      }
      
      // Can't follow yourself
      if (currentUserId === parseInt(userId)) {
        return res.status(400).json({
          success: false,
          error: 'You cannot follow yourself'
        });
      }
      
      // Check if already following
      const existingFollow = await Follow.findOne({
        where: {
          follower_id: currentUserId,
          following_id: userId
        }
      });
      
      if (existingFollow) {
        return res.status(400).json({
          success: false,
          error: 'Already following PublicProfileController user'
        });
      }
      
      // Check if user has private profile
      if (userToFollow.profile_privacy === 'private') {
        // Send follow request instead
        // TODO: Implement follow requests for private profiles
        return res.status(403).json({
          success: false,
          error: 'This user has a private profile'
        });
      }
      
      // Create follow relationship
      const follow = await Follow.create({
        follower_id: currentUserId,
        following_id: userId
      });
      
      // Record activity
      try {
        // if (ActivityService) {
        //   await ActivityService.recordFollow(currentUserId, userId);
        // }
      } catch (activityError) {
        console.error('Error recording follow activity:', activityError);
      }
      
      res.json({
        success: true,
        message: 'Successfully followed user',
        data: follow
      });
      
    } catch (error) {
      console.error('Error following user:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to follow user'
      });
    }
  }
  
  // Unfollow a user
  async unfollowUser(req, res) {
    try {
      const { userId } = req.params;
      const currentUserId = req.user.id;
      
      // Find and delete follow relationship
      const follow = await Follow.findOne({
        where: {
          follower_id: currentUserId,
          following_id: userId
        }
      });
      
      if (!follow) {
        return res.status(404).json({
          success: false,
          error: 'Not following PublicProfileController user'
        });
      }
      
      await follow.destroy();
      
      res.json({
        success: true,
        message: 'Successfully unfollowed user'
      });
      
    } catch (error) {
      console.error('Error unfollowing user:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to unfollow user'
      });
    }
  }
  
  // Get user's followers
  async getFollowers(req, res) {
    try {
      const { userId } = req.params;
      const { page = 1, limit = 20 } = req.query;
      const offset = (page - 1) * limit;
      
      const followers = await Follow.findAndCountAll({
        where: { following_id: userId },
        include: [
          {
            model: User,
            as: 'follower',
            attributes: ['id', 'username', 'avatar_url', 'is_verified', 'is_pro_player', 'display_name', 'bio', 'country', 'created_at']
          }
        ],
        order: [['created_at', 'DESC']],
        limit: parseInt(limit),
        offset: parseInt(offset)
      });
      
      res.json({
        success: true,
        data: {
          followers: followers.rows.map(f => f.follower),
          total: followers.count,
          page: parseInt(page),
          total_pages: Math.ceil(followers.count / limit)
        }
      });
      
    } catch (error) {
      console.error('Error getting followers:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to load followers'
      });
    }
  }
  
  // Get users that a user is following
  async getFollowing(req, res) {
    try {
      const { userId } = req.params;
      const { page = 1, limit = 20 } = req.query;
      const offset = (page - 1) * limit;
      
      const following = await Follow.findAndCountAll({
        where: { follower_id: userId },
        include: [
          {
            model: User,
            as: 'following',
            attributes: ['id', 'username', 'avatar_url', 'is_verified', 'is_pro_player', 'display_name', 'bio', 'country', 'created_at']
          }
        ],
        order: [['created_at', 'DESC']],
        limit: parseInt(limit),
        offset: parseInt(offset)
      });
      
      res.json({
        success: true,
        data: {
          following: following.rows.map(f => f.following),
          total: following.count,
          page: parseInt(page),
          total_pages: Math.ceil(following.count / limit)
        }
      });
      
    } catch (error) {
      console.error('Error getting following:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to load following'
      });
    }
  }
  
  // Get user's friends (mutual follows)
  async getFriends(req, res) {
    try {
      const { userId } = req.params;
      const { page = 1, limit = 20 } = req.query;
      const offset = (page - 1) * limit;
      
      // Find mutual follows (users who follow each other)
      const userFollows = await Follow.findAll({
        where: { follower_id: userId },
        attributes: ['following_id']
      });
      
      const followingIds = userFollows.map(f => f.following_id);
      
      // Get users who also follow the current user
      const mutualFollows = await Follow.findAll({
        where: {
          follower_id: { [Op.in]: followingIds },
          following_id: userId
        },
        include: [
          {
            model: User,
            as: 'follower',
            attributes: ['id', 'username', 'avatar_url', 'is_verified', 'is_pro_player', 'display_name', 'bio', 'country', 'created_at']
          }
        ]
      });
      
      const friends = mutualFollows.map(f => f.follower);
      
      // Apply pagination
      const paginatedFriends = friends.slice(offset, offset + limit);
      
      res.json({
        success: true,
        data: {
          friends: paginatedFriends,
          total: friends.length,
          page: parseInt(page),
          total_pages: Math.ceil(friends.length / limit)
        }
      });
      
    } catch (error) {
      console.error('Error getting friends:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to load friends'
      });
    }
  }
  
  // Helper methods
  static async getBatchFollowStatus(currentUserId, userIds) {
    if (!userIds || userIds.length === 0) return {};
    
    const follows = await Follow.findAll({
      where: {
        follower_id: currentUserId,
        following_id: { [Op.in]: userIds }
      }
    });
    
    const followMap = {};
    follows.forEach(follow => {
      followMap[follow.following_id] = true;
    });
    
    const result = {};
    userIds.forEach(userId => {
      result[userId] = !!followMap[userId];
    });
    
    return result;
  }

  async isFollowing(followerId, followingId) {
    const follow = await Follow.findOne({
      where: {
        follower_id: followerId,
        following_id: followingId
      }
    });
    
    return !!follow;
  }
}

module.exports = new PublicProfileController();