'use strict';

const fs = require('fs');
const path = require('path');
const Sequelize = require('sequelize');
const basename = path.basename(__filename);
const db = {};

// Import our custom sequelize instance from config/database.js
const sequelize = require('../config/database');

// Load all model files in this directory
fs.readdirSync(__dirname)
  .filter(file => {
    return (
      file.indexOf('.') !== 0 && // skip hidden files
      file !== basename &&       // skip this index.js file
      file.slice(-3) === '.js'   // only .js model files
    );
  })
  .forEach(file => {
    const model = require(path.join(__dirname, file))(sequelize, Sequelize.DataTypes);
    db[model.name] = model;
  });

// Setup model associations if defined
Object.keys(db).forEach(modelName => {
  if (db[modelName].associate) {
    db[modelName].associate(db);
  }
});

// Export sequelize instance + all models
db.sequelize = sequelize;
db.Sequelize = Sequelize;

module.exports = db;