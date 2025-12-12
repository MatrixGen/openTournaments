// scripts/sync-databases.js
const { Sequelize } = require('sequelize');
const devConfig = require('../config/config.json').development;
const testConfig = require('../config/config.json').test;

const createSequelizeInstance = (config) => new Sequelize(config.database, config.username, config.password, {
  host: config.host,
  dialect: config.dialect,
  logging: console.log,
});

// Function to initialize models
const initModels = (sequelize) => {
  const db = {
    sequelize,
    Sequelize,
    User: require('../models/user')(sequelize, Sequelize.DataTypes),
    Channel: require('../models/channel')(sequelize, Sequelize.DataTypes),
    ChannelMember: require('../models/channelmember')(sequelize, Sequelize.DataTypes),
    Message: require('../models/message')(sequelize, Sequelize.DataTypes),
    ReadReceipt: require('../models/readreceipt')(sequelize, Sequelize.DataTypes),
    Attachment: require('../models/attachment')(sequelize, Sequelize.DataTypes),
  };

  Object.keys(db).forEach(modelName => {
    if (db[modelName].associate) db[modelName].associate(db);
  });

  return db;
};

const syncDatabase = async (config, dbName) => {
  console.log(`Syncing ${dbName}...`);
  const sequelize = createSequelizeInstance(config);
  const db = initModels(sequelize);
  await db.sequelize.sync({ force: true }); // drops & recreates tables
  console.log(`${dbName} synced!`);
  await sequelize.close();
};

(async () => {
  await syncDatabase(devConfig, 'Development DB');
  await syncDatabase(testConfig, 'Test DB');
})();
