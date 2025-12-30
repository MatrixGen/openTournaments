// models/activity.js
'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Activity extends Model {
    static associate(models) {
      Activity.belongsTo(models.User, {
        foreignKey: 'user_id',
        as: 'user'
      });
      
      Activity.belongsTo(models.Tournament, {
        foreignKey: 'related_tournament_id',
        as: 'related_tournament'
      });
      
      Activity.belongsTo(models.Match, {
        foreignKey: 'related_match_id',
        as: 'related_match'
      });
      
      Activity.belongsTo(models.User, {
        foreignKey: 'related_user_id',
        as: 'related_user'
      });
    }
  }

  Activity.init({
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE'
    },
    activity_type: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        isIn: [
          [
            'tournament_join',
            'tournament_win',
            'tournament_position',
            'achievement_unlock',
            'match_win',
            'streak_milestone',
            'level_up',
            'follow',
            'stream_start',
            'tournament_create',
            'match_complete',
            'friend_request_sent',
            'friend_request_accepted',
            'profile_update'
          ]
        ]
      }
    },
    title: {
      type: DataTypes.STRING,
      allowNull: false
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    image_url: {
      type: DataTypes.STRING(500),
      allowNull: true
    },
    related_tournament_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'tournaments',
        key: 'id'
      }
    },
    related_match_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'matches',
        key: 'id'
      }
    },
    related_user_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    points_earned: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 0
    },
    position_achieved: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    visibility: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: 'public',
      validate: {
        isIn: [['public', 'friends_only', 'private']]
      }
    },
    activity_date: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    }
  }, {
    sequelize,
    modelName: 'Activity',
    tableName: 'activities',
    underscored: true,
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      {
        fields: ['user_id', 'activity_date']
      },
      {
        fields: ['user_id']
      },
      {
        fields: ['activity_type']
      },
      {
        fields: ['related_tournament_id']
      },
      {
        fields: ['activity_date']
      }
    ],
    hooks: {
      beforeCreate: (activity) => {
        // Ensure activity_date is set
        if (!activity.activity_date) {
          activity.activity_date = new Date();
        }
        
        // Set default visibility based on activity type
        if (!activity.visibility) {
          switch (activity.activity_type) {
            case 'follow':
            case 'friend_request_sent':
            case 'friend_request_accepted':
              activity.visibility = 'private';
              break;
            default:
              activity.visibility = 'public';
          }
        }
        
        // Generate title and description if not provided
        if (!activity.title) {
          activity.title = Activity.generateTitle(activity.activity_type, activity.position_achieved);
        }
      }
    }
  });

  // Static method to generate titles
  Activity.generateTitle = function(activityType, position = null) {
    const titles = {
      tournament_join: 'Joined a tournament',
      tournament_win: 'Won a tournament',
      tournament_position: position ? `Finished #${position} in tournament` : 'Finished tournament',
      achievement_unlock: 'Unlocked a new achievement',
      match_win: 'Won a match',
      streak_milestone: 'Achieved a new streak milestone',
      level_up: 'Leveled up',
      follow: 'Started following a player',
      stream_start: 'Started streaming',
      tournament_create: 'Created a tournament',
      match_complete: 'Completed a match',
      friend_request_sent: 'Sent a friend request',
      friend_request_accepted: 'Accepted a friend request',
      profile_update: 'Updated profile'
    };
    
    return titles[activityType] || 'New activity';
  };

  // Instance method to get public data
  Activity.prototype.getPublicData = function() {
    return {
      id: this.id,
      activity_type: this.activity_type,
      title: this.title,
      description: this.description,
      image_url: this.image_url,
      points_earned: this.points_earned,
      position_achieved: this.position_achieved,
      activity_date: this.activity_date,
      created_at: this.created_at,
      user: this.user ? {
        id: this.user.id,
        username: this.user.username,
        avatar_url: this.user.avatar_url,
        display_name: this.user.display_name
      } : null,
      related_tournament: this.related_tournament ? {
        id: this.related_tournament.id,
        name: this.related_tournament.name,
        status: this.related_tournament.status
      } : null,
      related_user: this.related_user ? {
        id: this.related_user.id,
        username: this.related_user.username,
        avatar_url: this.related_user.avatar_url
      } : null
    };
  };

  return Activity;
};