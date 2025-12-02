'use strict';
const { Model } = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class TournamentPrize extends Model {
    static associate(models) {
      TournamentPrize.belongsTo(models.Tournament, {
        foreignKey: 'tournament_id',
        as: 'tournament'
      });
    }
  }
  TournamentPrize.init({
    tournament_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'tournaments',
        key: 'id'
      }
    },
    position: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    percentage: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: false
    }
  }, {
    sequelize,
    modelName: 'TournamentPrize',
    tableName: 'tournament_prizes',
    underscored: true,
    timestamps: false // Assuming you don't have timestamp columns in this table
  });
  return TournamentPrize;
};