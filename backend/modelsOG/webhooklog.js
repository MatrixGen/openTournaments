// models/WebhookLog.js
'use strict';

module.exports = (sequelize, DataTypes) => {
  const WebhookLog = sequelize.define('WebhookLog', {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },
    webhook_id: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: true // replay protection
    },
    received_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    },
    raw_payload: {
      type: DataTypes.JSON, // store original payload for audit/debug
      allowNull: true
    }
  }, {
    tableName: 'webhook_logs',
    timestamps: false // we don’t need createdAt/updatedAt
  });

  return WebhookLog;
};
