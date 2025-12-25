"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class User extends Model {
    static associate(models) {
      User.hasMany(models.Tournament, {
        foreignKey: "created_by",
        as: "created_tournaments",
      });

      User.hasMany(models.TournamentParticipant, {
        foreignKey: "user_id",
        as: "tournament_participations",
      });

      User.hasMany(models.Transaction, {
        foreignKey: "user_id",
        as: "transactions",
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
        allowNull: true, // Changed from false to true
        validate: {
          // Custom validator: require password_hash unless google_id exists
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
    },
    {
      sequelize,
      modelName: "User",
      tableName: "users",
      underscored: true,
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
      // Add hooks to handle OAuth logic
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
        }
      }
    }
  );

  return User;
};