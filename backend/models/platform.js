'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Platform extends Model {
    static associate(models) {
      // define associations here later
    }
  }

  Platform.init({
    name: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true,
      validate: { notEmpty: true }
    },
    icon_url: DataTypes.STRING(512),
    status: {
      type: DataTypes.STRING,  // ENUM replaced with STRING
      allowNull: false,
      defaultValue: 'active'
    }
  }, {
    sequelize,
    modelName: 'Platform',
    tableName: 'platforms',
    underscored: true,
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  });

  return Platform;
};
