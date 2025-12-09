'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class SupportChannel extends Model {
    static associate(models) {
      // No direct associations needed
    }
  }

  SupportChannel.init({
    title: {
      type: DataTypes.STRING(200),
      allowNull: false
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    action: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    action_type: {
      type: DataTypes.STRING(50),
      allowNull: false
    },
    variant: {
      type: DataTypes.STRING(50),
      defaultValue: 'primary'
    },
    is_available: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    availability_hours: {
      type: DataTypes.STRING(100),
      defaultValue: '24/7'
    },
    response_time: {
      type: DataTypes.STRING(50),
      defaultValue: '2 minutes'
    },
    icon: {
      type: DataTypes.STRING(50),
      defaultValue: 'help'
    },
    order: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    color: {
      type: DataTypes.STRING(20),
      allowNull: true
    },
    url: {
      type: DataTypes.STRING(500),
      allowNull: true
    },
    requires_auth: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    is_featured: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    metadata: {
      type: DataTypes.JSON,
      defaultValue: {}
    }
  }, {
    sequelize,
    modelName: 'SupportChannel',
    tableName: 'support_channels',
    underscored: true,
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      { fields: ['action_type'] },
      { fields: ['is_available'] },
      { fields: ['order'] },
      { fields: ['is_featured'] }
    ]
  });

  return SupportChannel;
};