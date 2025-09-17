'use strict';
const { Model } = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Dispute extends Model {
    static associate(models) {
      Dispute.belongsTo(models.Match, {
        foreignKey: 'match_id',
        as: 'match'
      });
      Dispute.belongsTo(models.User, {
        foreignKey: 'raised_by_user_id',
        as: 'raised_by'
      });
      Dispute.belongsTo(models.User, {
        foreignKey: 'resolved_by_admin_id',
        as: 'resolved_by'
      });
    }
  }
  Dispute.init({
    match_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'matches',
        key: 'id'
      }
    },
    raised_by_user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    reason: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    evidence_url: {
      type: DataTypes.STRING(512),
      allowNull: true
    },
    status: {
      type: DataTypes.ENUM('open', 'under_review', 'resolved'),
      defaultValue: 'open'
    },
    resolution_details: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    resolved_by_admin_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    closed_at: {
      type: DataTypes.DATE,
      allowNull: true
    }
  }, {
    sequelize,
    modelName: 'Dispute',
    tableName: 'disputes',
    underscored: true,
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  });
  return Dispute;
};