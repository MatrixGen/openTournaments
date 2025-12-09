'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class FAQCategory extends Model {
    static associate(models) {
      FAQCategory.hasMany(models.FAQ, { 
        foreignKey: 'category_id', 
        as: 'faqs' 
      });
    }
  }

  FAQCategory.init({
    name: {
      type: DataTypes.STRING(100),
      allowNull: false,
      validate: { notEmpty: true }
    },
    slug: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    icon: {
      type: DataTypes.STRING(50),
      allowNull: true,
      defaultValue: 'question-mark'
    },
    order: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    color: {
      type: DataTypes.STRING(20),
      defaultValue: '#6b46c1'
    }
  }, {
    sequelize,
    modelName: 'FAQCategory',
    tableName: 'faq_categories',
    underscored: true,
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      { fields: ['slug'] },
      { fields: ['order'] },
      { fields: ['is_active'] }
    ]
  });

  return FAQCategory;
};