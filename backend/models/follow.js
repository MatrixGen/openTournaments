// models/follow.js
'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Follow extends Model {
    static associate(models) {
      Follow.belongsTo(models.User, {
        foreignKey: 'follower_id',
        as: 'follower'
      });
      Follow.belongsTo(models.User, {
        foreignKey: 'following_id',
        as: 'following'
      });
    }
  }

  Follow.init({
    follower_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    following_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      }
    }
  }, {
    sequelize,
    modelName: 'Follow',
    tableName: 'follows',
    underscored: true,
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      {
        unique: true,
        fields: ['follower_id', 'following_id']
      },
      {
        fields: ['follower_id']
      },
      {
        fields: ['following_id']
      }
    ]
  });

  return Follow;
};