// services/activityService.js
const { Activity, User, Tournament } = require('../models');

class ActivityService {
  // Record a new activity
  static async recordActivity(userId, activityData) {
    try {
      const {
        activity_type,
        title,
        description,
        image_url,
        related_tournament_id,
        related_match_id,
        related_user_id,
        points_earned,
        position_achieved,
        visibility
      } = activityData;

      const activity = await Activity.create({
        user_id: userId,
        activity_type,
        title,
        description,
        image_url,
        related_tournament_id,
        related_match_id,
        related_user_id,
        points_earned,
        position_achieved,
        visibility,
        activity_date: new Date()
      });

      return activity;
    } catch (error) {
      console.error('Error recording activity:', error);
      throw error;
    }
  }

  // Record tournament join activity
  static async recordTournamentJoin(userId, tournamentId) {
    const tournament = await Tournament.findByPk(tournamentId);
    
    return this.recordActivity(userId, {
      activity_type: 'tournament_join',
      title: `Joined tournament: ${tournament?.name || 'New Tournament'}`,
      description: 'Registered to participate in a tournament',
      related_tournament_id: tournamentId,
      visibility: 'public'
    });
  }

  // Record tournament win activity
  static async recordTournamentWin(userId, tournamentId, position = 1) {
    const tournament = await Tournament.findByPk(tournamentId);
    
    return this.recordActivity(userId, {
      activity_type: position === 1 ? 'tournament_win' : 'tournament_position',
      title: position === 1 
        ? `Won tournament: ${tournament?.name || 'Tournament'}` 
        : `Finished #${position} in ${tournament?.name || 'tournament'}`,
      description: position === 1 
        ? 'Won first place in a tournament' 
        : `Achieved ${position}th place in tournament`,
      related_tournament_id: tournamentId,
      position_achieved: position,
      visibility: 'public'
    });
  }

  // Record follow activity
  static async recordFollow(followerId, followingId) {
    const followingUser = await User.findByPk(followingId);
    
    return this.recordActivity(followerId, {
      activity_type: 'follow',
      title: `Started following ${followingUser?.username || 'a player'}`,
      description: 'Started following a new player',
      related_user_id: followingId,
      visibility: 'public' // Or 'private' depending on your preference
    });
  }

  // Record level up activity
  static async recordLevelUp(userId, newLevel) {
    return this.recordActivity(userId, {
      activity_type: 'level_up',
      title: `Reached Level ${newLevel}`,
      description: 'Leveled up on the platform',
      visibility: 'public'
    });
  }

  // Get user's recent activities
  static async getUserActivities(userId, limit = 20, includePrivate = false) {
    const whereCondition = {
      user_id: userId
    };

    if (!includePrivate) {
      whereCondition.visibility = 'public';
    }

    const activities = await Activity.findAll({
      where: whereCondition,
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'username', 'avatar_url', 'display_name']
        },
        {
          model: Tournament,
          as: 'related_tournament',
          attributes: ['id', 'name', 'status', 'banner_url']
        },
        {
          model: User,
          as: 'related_user',
          attributes: ['id', 'username', 'avatar_url']
        }
      ],
      order: [['activity_date', 'DESC']],
      limit
    });

    return activities.map(activity => activity.getPublicData());
  }

  // Get activity feed for user (including friends' activities)
  static async getActivityFeed(userId, limit = 50) {
    // Get user's friends/following IDs
    const user = await User.findByPk(userId, {
      include: [
        {
          model: User,
          as: 'following',
          attributes: ['id']
        }
      ]
    });

    const followingIds = user.following.map(f => f.id);
    const userIds = [userId, ...followingIds];

    const activities = await Activity.findAll({
      where: {
        user_id: userIds,
        visibility: 'public'
      },
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'username', 'avatar_url', 'display_name']
        },
        {
          model: Tournament,
          as: 'related_tournament',
          attributes: ['id', 'name', 'status', 'banner_url']
        }
      ],
      order: [['activity_date', 'DESC']],
      limit
    });

    return activities.map(activity => activity.getPublicData());
  }
}

module.exports = ActivityService;