'use strict';
const { Model } = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class TournamentParticipant extends Model {
    static associate(models) {
      TournamentParticipant.belongsTo(models.Tournament, {
        foreignKey: 'tournament_id',
        as: 'tournament'
      });
      TournamentParticipant.belongsTo(models.User, {
        foreignKey: 'user_id',
        as: 'user'
      });
    }
  }
  TournamentParticipant.init({
    tournament_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'tournaments',
        key: 'id'
      }
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    gamer_tag: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    final_standing: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    checked_in: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    }
  }, {
    sequelize,
    modelName: 'TournamentParticipant',
    tableName: 'tournament_participants',
    underscored: true,
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  });
  return TournamentParticipant;
};