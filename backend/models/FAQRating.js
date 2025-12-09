'use strict';
const { Model ,Op} = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class FAQRating extends Model {
    static associate(models) {
      FAQRating.belongsTo(models.FAQ, { 
        foreignKey: 'faq_id', 
        as: 'faq' 
      });
      FAQRating.belongsTo(models.User, { 
        foreignKey: 'user_id', 
        as: 'user' 
      });
    }
  }

  FAQRating.init({
    faq_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'faqs', key: 'id' }
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: 'users', key: 'id' }
    },
    helpful: {
      type: DataTypes.BOOLEAN,
      allowNull: false
    },
    user_ip: {
      type: DataTypes.STRING(45),
      allowNull: true
    },
    user_agent: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    feedback: {
      type: DataTypes.TEXT,
      allowNull: true
    }
  }, {
    sequelize,
    modelName: 'FAQRating',
    tableName: 'faq_ratings',
    underscored: true,
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: false,
    indexes: [
      { 
        fields: ['faq_id', 'user_id'],
        unique: true,
        where: { user_id: { [Op.not]: null } }
      },
      { 
        fields: ['faq_id', 'user_ip', 'created_at'],
        unique: true,
        where: { user_id: null }
      },
      { fields: ['faq_id'] },
      { fields: ['user_id'] },
      { fields: ['helpful'] }
    ]
  });

  return FAQRating;
};