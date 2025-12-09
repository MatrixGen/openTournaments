'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class FAQ extends Model {
    static associate(models) {
      FAQ.belongsTo(models.FAQCategory, { 
        foreignKey: 'category_id', 
        as: 'category' 
      });
      FAQ.hasMany(models.FAQRating, { 
        foreignKey: 'faq_id', 
        as: 'ratings' 
      });
      FAQ.belongsTo(models.User, { 
        foreignKey: 'created_by', 
        as: 'author' 
      });
    }
  }

  FAQ.init({
    question: {
      type: DataTypes.TEXT,
      allowNull: false,
      validate: { notEmpty: true }
    },
    answer: {
      type: DataTypes.TEXT,
      allowNull: false,
      validate: { notEmpty: true }
    },
    category_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'faq_categories', key: 'id' }
    },
    subcategory: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    helpful_count: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      validate: { min: 0 }
    },
    not_helpful_count: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      validate: { min: 0 }
    },
    view_count: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      validate: { min: 0 }
    },
    last_viewed_at: {
      type: DataTypes.DATE,
      allowNull: true
    },
    tags: {
      type: DataTypes.JSON,
      defaultValue: [],
      get() {
        const raw = this.getDataValue('tags');
        return raw ? raw : [];
      }
    },
    related_faqs: {
      type: DataTypes.JSON,
      defaultValue: [],
      get() {
        const raw = this.getDataValue('related_faqs');
        return raw ? raw : [];
      }
    },
    is_published: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    created_by: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: 'users', key: 'id' }
    },
    popularity_score: {
      type: DataTypes.DECIMAL(5, 2),
      defaultValue: 0
    },
    language: {
      type: DataTypes.STRING(10),
      defaultValue: 'en'
    },
    meta_title: {
      type: DataTypes.STRING(200),
      allowNull: true
    },
    meta_description: {
      type: DataTypes.STRING(500),
      allowNull: true
    }
  }, {
    sequelize,
    modelName: 'FAQ',
    tableName: 'faqs',
    underscored: true,
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      { fields: ['category_id'] },
      { fields: ['subcategory'] },
      { fields: ['is_published'] },
      { fields: ['popularity_score'] },
      { fields: ['created_by'] },
      { 
        name: 'faq_search_idx',
        type: 'FULLTEXT',
        fields: ['question', 'answer', 'tags']
      }
    ]
  });

  return FAQ;
};