'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class ResourceLink extends Model {
    static associate(models) {
      // No direct associations needed
    }
  }

  ResourceLink.init({
    title: {
      type: DataTypes.STRING(200),
      allowNull: false
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    href: {
      type: DataTypes.STRING(500),
      allowNull: false
    },
    category: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    icon: {
      type: DataTypes.STRING(50),
      defaultValue: 'document-text'
    },
    is_external: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    popularity: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      validate: { min: 0, max: 100 }
    },
    order: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    tags: {
      type: DataTypes.JSON,
      defaultValue: []
    },
    target: {
      type: DataTypes.STRING(20),
      defaultValue: '_self'
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    click_count: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    last_clicked_at: {
      type: DataTypes.DATE,
      allowNull: true
    }
  }, {
    sequelize,
    modelName: 'ResourceLink',
    tableName: 'resource_links',
    underscored: true,
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      { fields: ['category'] },
      { fields: ['is_active'] },
      { fields: ['order'] },
      { fields: ['popularity'] }
    ]
  });

  return ResourceLink;
};