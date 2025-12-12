const { sequelize } = require('../models');
require('dotenv').config();

async function setupDatabase() {
  try {
    // Test connection
    await sequelize.authenticate();
    console.log('✅ Database connection established successfully.');

    // Sync all models
    await sequelize.sync({ force: false }); // Use { force: true } only in development to drop tables
    console.log('✅ Database synchronized successfully.');

    process.exit(0);
  } catch (error) {
    console.error('❌ Database setup failed:', error);
    process.exit(1);
  }
}

setupDatabase();