'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class FriendRequest extends Model {
    static associate(models) {
      FriendRequest.belongsTo(models.User, {
        foreignKey: 'sender_id',
        as: 'sender'
      });
      FriendRequest.belongsTo(models.User, {
        foreignKey: 'receiver_id',
        as: 'receiver'
      });
    }
  }

  FriendRequest.init({
    sender_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    receiver_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    status: {
      type: DataTypes.STRING,  
      allowNull: false,
      defaultValue: 'pending'
    }
  }, {
    sequelize,
    modelName: 'FriendRequest',
    tableName: 'friend_requests',
    underscored: true,
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  });

  return FriendRequest;
};
