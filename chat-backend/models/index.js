const { Sequelize } = require('sequelize');
const config = require('../config/config.js')[process.env.NODE_ENV || 'test'];

const sequelize = new Sequelize(config.database, config.username, config.password, {
  host: config.host,
  dialect: config.dialect,
  logging: config.logging || false,
  pool: {
    max: 10,
    min: 0,
    acquire: 30000,
    idle: 10000,
  },
});

const db = {
  sequelize,
  Sequelize,
  User: require('./user')(sequelize, Sequelize.DataTypes),
  Channel: require('./channel')(sequelize, Sequelize.DataTypes),
  ChannelMember: require('./channelmember')(sequelize, Sequelize.DataTypes),
  Message: require('./message')(sequelize, Sequelize.DataTypes),
  ReadReceipt: require('./readreceipt')(sequelize, Sequelize.DataTypes),
  Attachment: require('./attachment')(sequelize, Sequelize.DataTypes),
  Report: require('./report')(sequelize, Sequelize.DataTypes),
  UserBlock: require('./userblock')(sequelize, Sequelize.DataTypes),
  UserViolation: require('./userviolation')(sequelize, Sequelize.DataTypes),
  Reaction: require('./reaction.js')(sequelize,Sequelize.DataTypes),
  
};

// Set up associations
Object.keys(db).forEach(modelName => {
  if (db[modelName].associate) {
    db[modelName].associate(db);
  }
});

module.exports = db;