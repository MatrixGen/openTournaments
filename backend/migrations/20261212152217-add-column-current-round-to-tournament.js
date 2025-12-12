'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    try {
      // Check if tournaments table exists in platform schema
      const [tableExists] = await queryInterface.sequelize.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'platform' 
          AND table_name = 'tournaments'
        )
      `);
      
      if (!tableExists[0].exists) {
        console.log('⚠️ Table tournaments does not exist in platform schema, skipping...');
        return;
      }
      
      // Check if current_round column already exists
      const [columnExists] = await queryInterface.sequelize.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.columns 
          WHERE table_schema = 'platform' 
            AND table_name = 'tournaments' 
            AND column_name = 'current_round'
        )
      `);
      
      if (columnExists[0].exists) {
        console.log('⏭️ current_round column already exists in platform.tournaments, skipping...');
        return;
      }
      
      console.log('Adding current_round column to platform.tournaments...');
      
      // 1. Add column as NULL allowed (to avoid breaking existing rows)
      await queryInterface.addColumn('platform.tournaments', 'current_round', {
        type: Sequelize.INTEGER,
        allowNull: true,
        defaultValue: 1
      });
      console.log('✅ Step 1: Added current_round column (nullable)');
      
      // 2. Update existing rows to ensure no NULL values are present
      await queryInterface.sequelize.query(`
        UPDATE platform.tournaments 
        SET current_round = 1 
        WHERE current_round IS NULL;
      `);
      console.log('✅ Step 2: Updated existing rows with default value');
      
      // 3. Change to NOT NULL
      await queryInterface.changeColumn('platform.tournaments', 'current_round', {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 1
      });
      console.log('✅ Step 3: Changed column to NOT NULL');
      
      console.log('🎉 Successfully added current_round column to platform.tournaments');
      
    } catch (error) {
      console.error('⚠️ Error adding current_round column to platform.tournaments:', error.message);
      // Don't throw to prevent crash during deploy
    }
  },

  async down(queryInterface, Sequelize) {
    try {
      // Check if tournaments table exists in platform schema
      const [tableExists] = await queryInterface.sequelize.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'platform' 
          AND table_name = 'tournaments'
        )
      `);
      
      if (!tableExists[0].exists) {
        console.log('⚠️ Table tournaments does not exist in platform schema, skipping rollback...');
        return;
      }
      
      // Check if current_round column exists
      const [columnExists] = await queryInterface.sequelize.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.columns 
          WHERE table_schema = 'platform' 
            AND table_name = 'tournaments' 
            AND column_name = 'current_round'
        )
      `);
      
      if (columnExists[0].exists) {
        // Remove the column
        await queryInterface.removeColumn('platform.tournaments', 'current_round');
        console.log('🗑️ Removed current_round column from platform.tournaments');
      } else {
        console.log('⏭️ current_round column does not exist in platform.tournaments, nothing to remove');
      }
      
    } catch (error) {
      console.error('⚠️ Error removing current_round column from platform.tournaments:', error.message);
    }
  }
};