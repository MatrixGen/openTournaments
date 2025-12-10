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
        allowNull: false,
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
      password_hash: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },
      phone_number: DataTypes.STRING(20),
      wallet_balance: {
        type: DataTypes.DECIMAL(10, 2),
        defaultValue: 0.0,
      },
      role: {
        type: DataTypes.STRING, // ENUM replaced with STRING
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
    }
  );

  return User;
};
