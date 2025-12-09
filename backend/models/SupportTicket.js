'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class SupportTicket extends Model {
    static associate(models) {
      SupportTicket.belongsTo(models.User, { 
        foreignKey: 'user_id', 
        as: 'user' 
      });
      SupportTicket.belongsTo(models.User, { 
        foreignKey: 'assigned_to', 
        as: 'assignee' 
      });
      SupportTicket.hasMany(models.SupportTicketMessage, { 
        foreignKey: 'ticket_id', 
        as: 'messages' 
      });
      SupportTicket.hasMany(models.SupportTicketAttachment, { 
        foreignKey: 'ticket_id', 
        as: 'attachments' 
      });
      SupportTicket.hasMany(models.SupportTicketStatusHistory, { 
        foreignKey: 'ticket_id', 
        as: 'status_history' 
      });
    }
  }

  SupportTicket.init({
    ticket_number: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: 'users', key: 'id' }
    },
    name: {
      type: DataTypes.STRING(200),
      allowNull: true
    },
    email: {
      type: DataTypes.STRING(200),
      allowNull: true,
      validate: { isEmail: true }
    },
    subject: {
      type: DataTypes.STRING(500),
      allowNull: false,
      validate: { notEmpty: true }
    },
    category: {
      type: DataTypes.STRING(100),
      allowNull: false,
      defaultValue: 'general'
    },
    subcategory: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    priority: {
      type: DataTypes.ENUM('low', 'medium', 'high', 'urgent'),
      defaultValue: 'medium'
    },
    status: {
      type: DataTypes.ENUM('open', 'in_progress', 'waiting_customer', 'waiting_agent', 'resolved', 'closed'),
      defaultValue: 'open'
    },
    message: {
      type: DataTypes.TEXT,
      allowNull: false,
      validate: { notEmpty: true }
    },
    source: {
      type: DataTypes.STRING(100),
      defaultValue: 'support_main_page'
    },
    ip_address: {
      type: DataTypes.STRING(45),
      allowNull: true
    },
    user_agent: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    assigned_to: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: 'users', key: 'id' }
    },
    estimated_response_time: {
      type: DataTypes.STRING(50),
      allowNull: true
    },
    actual_first_response_at: {
      type: DataTypes.DATE,
      allowNull: true
    },
    resolved_at: {
      type: DataTypes.DATE,
      allowNull: true
    },
    closed_at: {
      type: DataTypes.DATE,
      allowNull: true
    },
    satisfaction_rating: {
      type: DataTypes.INTEGER,
      validate: { min: 1, max: 5 },
      allowNull: true
    },
    satisfaction_feedback: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    internal_notes: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    metadata: {
      type: DataTypes.JSON,
      defaultValue: {}
    },
    thread_id: {
      type: DataTypes.STRING(100),
      allowNull: true,
      unique: true
    },
    auto_reply_sent: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    reference_links: {
      type: DataTypes.JSON,
      defaultValue: []
    },
    last_message_at: {
      type: DataTypes.DATE,
      allowNull: true
    },
    has_unread: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    }
  }, {
    sequelize,
    modelName: 'SupportTicket',
    tableName: 'support_tickets',
    underscored: true,
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      { fields: ['ticket_number'] },
      { fields: ['user_id'] },
      { fields: ['email'] },
      { fields: ['status'] },
      { fields: ['priority'] },
      { fields: ['category'] },
      { fields: ['assigned_to'] },
      { fields: ['created_at'] }
    ]
  });

  return SupportTicket;
};