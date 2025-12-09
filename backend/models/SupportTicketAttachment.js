'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class SupportTicketAttachment extends Model {
    static associate(models) {
      SupportTicketAttachment.belongsTo(models.SupportTicket, { 
        foreignKey: 'ticket_id', 
        as: 'ticket' 
      });
      SupportTicketAttachment.belongsTo(models.SupportTicketMessage, { 
        foreignKey: 'message_id', 
        as: 'message' 
      });
    }
  }

  SupportTicketAttachment.init({
    ticket_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: 'support_tickets', key: 'id' }
    },
    message_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: 'support_ticket_messages', key: 'id' }
    },
    filename: {
      type: DataTypes.STRING(500),
      allowNull: false
    },
    original_name: {
      type: DataTypes.STRING(500),
      allowNull: false
    },
    file_path: {
      type: DataTypes.STRING(1000),
      allowNull: false
    },
    mime_type: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    size: {
      type: DataTypes.INTEGER,
      validate: { min: 0 }
    },
    is_public: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    upload_token: {
      type: DataTypes.STRING(100),
      allowNull: true,
      unique: true
    },
    expires_at: {
      type: DataTypes.DATE,
      allowNull: true
    },
    uploaded_by: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: 'users', key: 'id' }
    }
  }, {
    sequelize,
    modelName: 'SupportTicketAttachment',
    tableName: 'support_ticket_attachments',
    underscored: true,
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      { fields: ['ticket_id'] },
      { fields: ['message_id'] },
      { fields: ['upload_token'] },
      { fields: ['expires_at'] }
    ]
  });

  return SupportTicketAttachment;
};