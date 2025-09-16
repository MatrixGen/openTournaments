'use strict';
const { Model } = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Match extends Model {
    static associate(models) {
      Match.belongsTo(models.Tournament, {
        foreignKey: 'tournament_id',
        as: 'tournament'
      });
      Match.belongsTo(models.TournamentParticipant, {
        foreignKey: 'participant1_id',
        as: 'participant1'
      });
      Match.belongsTo(models.TournamentParticipant, {
        foreignKey: 'participant2_id',
        as: 'participant2'
      });
      Match.belongsTo(models.User, {
        foreignKey: 'reported_by_user_id',
        as: 'reported_by'
      });
      Match.belongsTo(models.TournamentParticipant, {
        foreignKey: 'winner_id',
        as: 'winner'
      });
    }
  }
  Match.init({
    tournament_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'tournaments',
        key: 'id'
      }
    },
    round_number: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    participant1_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'tournament_participants',
        key: 'id'
      }
    },
    participant2_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'tournament_participants',
        key: 'id'
      }
    },
    participant1_score: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    participant2_score: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    status: {
      type: DataTypes.ENUM('scheduled', 'completed', 'disputed'),
      defaultValue: 'scheduled'
    },
    scheduled_time: {
      type: DataTypes.DATE,
      allowNull: true
    },
    reported_by_user_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    winner_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'tournament_participants',
        key: 'id'
      }
    }
  }, {
    sequelize,
    modelName: 'Match',
    tableName: 'matches',
    underscored: true,
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  });
  return Match;
};