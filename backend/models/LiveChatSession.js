'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class LiveChatSession extends Model {
    static associate(models) {
      LiveChatSession.belongsTo(models.User, { 
        foreignKey: 'user_id', 
        as: 'user' 
      });
      LiveChatSession.belongsTo(models.User, { 
        foreignKey: 'agent_id', 
        as: 'agent' 
      });
      LiveChatSession.belongsTo(models.SupportTicket, { 
        foreignKey: 'ticket_id', 
        as: 'ticket' 
      });
    }
  }

  LiveChatSession.init({
    session_id: {
      type: DataTypes.STRING(100),
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
    department: {
      type: DataTypes.STRING(100),
      defaultValue: 'general'
    },
    issue: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    agent_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: 'users', key: 'id' }
    },
    estimated_wait_time: {
      type: DataTypes.STRING(50),
      allowNull: true
    },
    chat_token: {
      type: DataTypes.STRING(200),
      allowNull: false,
      unique: true
    },
    websocket_url: {
      type: DataTypes.STRING(500),
      allowNull: true
    },
    room_id: {
      type: DataTypes.STRING(100),
      allowNull: true,
      unique: true
    },
    status: {
      type: DataTypes.ENUM('waiting', 'active', 'ended', 'transferred', 'timed_out'),
      defaultValue: 'waiting'
    },
    started_at: {
      type: DataTypes.DATE,
      allowNull: true
    },
    ended_at: {
      type: DataTypes.DATE,
      allowNull: true
    },
    expires_at: {
      type: DataTypes.DATE,
      allowNull: true
    },
    metadata: {
      type: DataTypes.JSON,
      defaultValue: {}
    },
    ticket_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: 'support_tickets', key: 'id' }
    },
    messages_count: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    avg_response_time: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    satisfaction_rating: {
      type: DataTypes.INTEGER,
      validate: { min: 1, max: 5 },
      allowNull: true
    },
    ended_by: {
      type: DataTypes.ENUM('customer', 'agent', 'system', 'timeout'),
      allowNull: true
    }
  }, {
    sequelize,
    modelName: 'LiveChatSession',
    tableName: 'live_chat_sessions',
    underscored: true,
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      { fields: ['session_id'] },
      { fields: ['chat_token'] },
      { fields: ['user_id'] },
      { fields: ['agent_id'] },
      { fields: ['status'] },
      { fields: ['created_at'] },
      { fields: ['department'] }
    ]
  });

  return LiveChatSession;
};