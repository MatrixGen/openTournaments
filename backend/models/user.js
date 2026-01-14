// models/user.js
'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class User extends Model {
    static associate(models) {
      User.hasMany(models.Tournament, {
        foreignKey: "created_by",
        as: "created_tournaments",
      });
      User.hasMany(models.DeviceToken, {
        foreignKey: 'user_id',
        as: 'device_tokens'
      });


      User.hasMany(models.TournamentParticipant, {
        foreignKey: "user_id",
        as: "tournament_participations",
      });

      User.hasMany(models.Transaction, {
        foreignKey: "user_id",
        as: "transactions",
      });
      
      // NEW: Follow associations
      User.belongsToMany(models.User, {
        through: models.Follow,
        foreignKey: 'follower_id',
        otherKey: 'following_id',
        as: 'following'
      });
      
      User.belongsToMany(models.User, {
        through: models.Follow,
        foreignKey: 'following_id',
        otherKey: 'follower_id',
        as: 'followers'
      });
      
      // FriendRequest associations
      User.hasMany(models.FriendRequest, {
        foreignKey: 'sender_id',
        as: 'sent_friend_requests'
      });
      
      User.hasMany(models.FriendRequest, {
        foreignKey: 'receiver_id',
        as: 'received_friend_requests'
      });
      
      // Friends through accepted friend requests
      User.belongsToMany(models.User, {
        through: models.FriendRequest,
        foreignKey: 'sender_id',
        otherKey: 'receiver_id',
        as: 'friends',
        scope: {
          status: 'accepted'
        }
      });
      
      // Stats association
      User.hasOne(models.UserStat, {
        foreignKey: 'user_id',
        as: 'stats'
      });
      
      // Activities association
      User.hasMany(models.Activity, {
        foreignKey: 'user_id',
        as: 'activities'
      });
    }
  }

  User.init(
    {
      username: {
        type: DataTypes.STRING(255),
        allowNull: false,
        unique: true,
        validate: {
          notEmpty: true,
          len: [3, 255],
        },
      },
      email_verified: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
      },
      phone_verified: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
      },
      avatar_url: {
        type: DataTypes.STRING(500),
        allowNull: true,
        defaultValue: null,
      },
      verification_token: DataTypes.STRING(255),
      verification_token_expires: DataTypes.DATE,
      reset_token: DataTypes.STRING(255),
      reset_token_expires: DataTypes.DATE,
      phone_verification_code: DataTypes.STRING(10),
      phone_verification_expires: DataTypes.DATE,
      email_notifications: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
      },
      push_notifications: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
      },
      sms_notifications: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
      },
      email: {
        type: DataTypes.STRING(255),
        allowNull: false,
        unique: true,
        validate: {
          isEmail: true,
          notEmpty: true,
        },
      },
      // Google OAuth fields
      google_id: {
        type: DataTypes.STRING(255),
        allowNull: true,
        unique: true,
        comment: "Google OAuth ID for SSO",
      },
      // Make password_hash optional for OAuth users
      password_hash: {
        type: DataTypes.STRING(255),
        allowNull: true,
        validate: {
          requirePasswordIfNoGoogleId(value) {
            if (!this.google_id && (!value || value.trim() === '')) {
              throw new Error('Password is required for non-Google users');
            }
          }
        }
      },
      // Add OAuth provider field for future extensibility
      oauth_provider: {
        type: DataTypes.ENUM('google', 'facebook', 'apple', 'none'),
        defaultValue: 'none',
        allowNull: false,
      },
      phone_number: DataTypes.STRING(20),
      wallet_balance: {
        type: DataTypes.DECIMAL(10, 2),
        defaultValue: 0.0,
      },
      wallet_currency: {
        type: DataTypes.STRING(3),
        allowNull: false,
        defaultValue: 'TZS',
        validate: {
          isIn: [['USD', 'TZS']],
        },
      },
      role: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: "user",
      },
      is_verified: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
      },
      is_banned: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
      },
      last_login: DataTypes.DATE,
      
      // NEW FIELDS FOR PUBLIC PROFILE
      profile_privacy: {
        type: DataTypes.STRING,
        allowNull: true,
        defaultValue: 'public',
      },
      bio: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      country: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },
      language: {
        type: DataTypes.STRING(10),
        allowNull: true,
        defaultValue: 'en',
      },
      display_name: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
      is_pro_player: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      social_links: {
        type: DataTypes.JSONB,
        allowNull: true,
        defaultValue: {},
      },
      favorite_games: {
        type: DataTypes.JSONB,
        allowNull: true,
        defaultValue: [],
      },
      last_active_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      current_status: {
        type: DataTypes.STRING,
        allowNull: true,
        defaultValue: 'offline',
      },
    },
    {
      sequelize,
      modelName: "User",
      tableName: "users",
      underscored: true,
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
      hooks: {
        beforeValidate: (user) => {
          // Auto-set email_verified for Google OAuth users
          if (user.google_id && !user.email_verified) {
            user.email_verified = true;
          }
          
          // Generate username for Google users if not provided
          if (user.google_id && !user.username) {
            const emailPrefix = user.email.split('@')[0];
            user.username = `google_${emailPrefix}_${Date.now().toString().slice(-6)}`;
          }
          
          // Set display_name to username if not set
          if (!user.display_name && user.username) {
            user.display_name = user.username;
          }
        },
        beforeCreate: (user) => {
          // Set oauth_provider based on google_id presence
          if (user.google_id) {
            user.oauth_provider = 'google';
          }
        },
        beforeUpdate: (user) => {
          // Prevent removing google_id if it's the only auth method
          if (user.changed('google_id') && user.previous('google_id') && !user.google_id && !user.password_hash) {
            throw new Error('Cannot remove Google ID without setting a password');
          }
          
          // Update last_active_at when user logs in or performs actions
          if (user.changed('last_login')) {
            user.last_active_at = new Date();
          }
        }
      }
    }
  );

  return User;
};
