'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class SupportTicketMessage extends Model {
    static associate(models) {
      SupportTicketMessage.belongsTo(models.SupportTicket, { 
        foreignKey: 'ticket_id', 
        as: 'ticket' 
      });
      SupportTicketMessage.belongsTo(models.User, { 
        foreignKey: 'sender_id', 
        as: 'sender' 
      });
      SupportTicketMessage.hasMany(models.SupportTicketAttachment, { 
        foreignKey: 'message_id', 
        as: 'attachments' 
      });
    }
  }

  SupportTicketMessage.init({
    ticket_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'support_tickets', key: 'id' }
    },
    sender_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: 'users', key: 'id' }
    },
    sender_type: {
      type: DataTypes.ENUM('customer', 'agent', 'system'),
      defaultValue: 'customer'
    },
    sender_name: {
      type: DataTypes.STRING(200),
      allowNull: true
    },
    sender_email: {
      type: DataTypes.STRING(200),
      allowNull: true
    },
    message: {
      type: DataTypes.TEXT,
      allowNull: false,
      validate: { notEmpty: true }
    },
    is_internal: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    is_read: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    read_at: {
      type: DataTypes.DATE,
      allowNull: true
    },
    metadata: {
      type: DataTypes.JSON,
      defaultValue: {}
    }
  }, {
    sequelize,
    modelName: 'SupportTicketMessage',
    tableName: 'support_ticket_messages',
    underscored: true,
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      { fields: ['ticket_id'] },
      { fields: ['sender_id'] },
      { fields: ['sender_type'] },
      { fields: ['created_at'] },
      { fields: ['is_read'] }
    ]
  });

  return SupportTicketMessage;
};