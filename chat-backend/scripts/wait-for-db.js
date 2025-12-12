const { exec } = require('child_process');
const { sequelize } = require('../models');

const waitForDatabase = async (maxAttempts = 30) => {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      console.log(`Checking database connection (attempt ${attempt}/${maxAttempts})...`);
      await sequelize.authenticate();
      console.log('✅ Database connection established');
      
      // Run migrations
      console.log('Running database migrations...');
      await sequelize.sync({ force: false });
      console.log('✅ Database migrations completed');
      
      return true;
    } catch (error) {
      console.log(`❌ Database not ready (attempt ${attempt}/${maxAttempts}):`, error.message);
      
      if (attempt === maxAttempts) {
        console.error('❌ Failed to connect to database after maximum attempts');
        process.exit(1);
      }
      
      // Wait 2 seconds before retrying
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
};

waitForDatabase();