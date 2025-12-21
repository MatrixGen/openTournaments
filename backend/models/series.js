'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Series extends Model {
    static associate(models) {
      Series.belongsTo(models.Tournament, {
        foreignKey: 'tournament_id',
        as: 'tournament'
      });
      Series.belongsTo(models.TournamentParticipant, {
        foreignKey: 'participant1_id',
        as: 'participant1'
      });
      Series.belongsTo(models.TournamentParticipant, {
        foreignKey: 'participant2_id',
        as: 'participant2'
      });
      Series.hasMany(models.Match, {
        foreignKey: 'series_id',
        as: 'matches'
      });
    }
  }

  Series.init({
    tournament_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'tournaments', key: 'id' }
    },
    participant1_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'tournament_participants', key: 'id' }
    },
    participant2_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'tournament_participants', key: 'id' }
    },
    participant1_wins: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      validate: { min: 0, max: 2 }
    },
    participant2_wins: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      validate: { min: 0, max: 2 }
    },
    status: {
      type: DataTypes.STRING,
      defaultValue: 'active'
    }
  }, {
    sequelize,
    modelName: 'Series',
    tableName: 'series',
    underscored: true,
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  });

  return Series;
};