'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class SupportTicketStatusHistory extends Model {
    static associate(models) {
      SupportTicketStatusHistory.belongsTo(models.SupportTicket, { 
        foreignKey: 'ticket_id', 
        as: 'ticket' 
      });
      SupportTicketStatusHistory.belongsTo(models.User, { 
        foreignKey: 'changed_by', 
        as: 'changed_by_user' 
      });
    }
  }

  SupportTicketStatusHistory.init({
    ticket_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'support_tickets', key: 'id' }
    },
    old_status: {
      type: DataTypes.ENUM('open', 'in_progress', 'waiting_customer', 'waiting_agent', 'resolved', 'closed'),
      allowNull: true
    },
    new_status: {
      type: DataTypes.ENUM('open', 'in_progress', 'waiting_customer', 'waiting_agent', 'resolved', 'closed'),
      allowNull: false
    },
    changed_by: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: 'users', key: 'id' }
    },
    changed_by_type: {
      type: DataTypes.ENUM('customer', 'agent', 'system'),
      defaultValue: 'system'
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    metadata: {
      type: DataTypes.JSON,
      defaultValue: {}
    }
  }, {
    sequelize,
    modelName: 'SupportTicketStatusHistory',
    tableName: 'support_ticket_status_history',
    underscored: true,
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: false,
    indexes: [
      { fields: ['ticket_id'] },
      { fields: ['changed_by'] },
      { fields: ['created_at'] }
    ]
  });

  return SupportTicketStatusHistory;
};