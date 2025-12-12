'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    try {
      // Check if matches table exists in platform schema
      const [tableExists] = await queryInterface.sequelize.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'platform' 
          AND table_name = 'matches'
        )
      `);
      
      if (!tableExists[0].exists) {
        console.log('⚠️ Table matches does not exist in platform schema, skipping...');
        return;
      }
      
      // Check if columns already exist
      const [columns] = await queryInterface.sequelize.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_schema = 'platform' 
          AND table_name = 'matches' 
          AND column_name IN ('next_match_id', 'next_match_slot', 'loser_next_match_id', 'loser_next_match_slot')
      `);
      
      const existingColumns = columns.map(col => col.column_name);
      
      // Add next_match_id if it doesn't exist
      if (!existingColumns.includes('next_match_id')) {
        await queryInterface.addColumn('platform.matches', 'next_match_id', {
          type: Sequelize.INTEGER,
          allowNull: true,
          comment: 'ID of the match the winner advances to',
        });
        console.log('✅ Added next_match_id column to platform.matches');
      } else {
        console.log('⏭️ next_match_id column already exists in platform.matches');
      }
      
      // Add next_match_slot if it doesn't exist
      if (!existingColumns.includes('next_match_slot')) {
        await queryInterface.addColumn('platform.matches', 'next_match_slot', {
          type: Sequelize.STRING(20),
          allowNull: true,
          comment: 'The slot (p1 or p2) the winner fills in the next match',
        });
        console.log('✅ Added next_match_slot column to platform.matches');
      } else {
        console.log('⏭️ next_match_slot column already exists in platform.matches');
      }
      
      // Add loser_next_match_id if it doesn't exist
      if (!existingColumns.includes('loser_next_match_id')) {
        await queryInterface.addColumn('platform.matches', 'loser_next_match_id', {
          type: Sequelize.INTEGER,
          allowNull: true,
          comment: 'ID of the match the loser advances to (if in winners bracket)',
        });
        console.log('✅ Added loser_next_match_id column to platform.matches');
      } else {
        console.log('⏭️ loser_next_match_id column already exists in platform.matches');
      }
      
      // Add loser_next_match_slot if it doesn't exist
      if (!existingColumns.includes('loser_next_match_slot')) {
        await queryInterface.addColumn('platform.matches', 'loser_next_match_slot', {
          type: Sequelize.STRING(20),
          allowNull: true,
          comment: 'The slot (p1 or p2) the loser fills in the next match',
        });
        console.log('✅ Added loser_next_match_slot column to platform.matches');
      } else {
        console.log('⏭️ loser_next_match_slot column already exists in platform.matches');
      }
      
    } catch (error) {
      console.error('⚠️ Error adding columns to platform.matches:', error.message);
      // Don't throw to prevent crash during deploy
    }
  },

  async down(queryInterface, Sequelize) {
    try {
      // Check if matches table exists in platform schema
      const [tableExists] = await queryInterface.sequelize.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'platform' 
          AND table_name = 'matches'
        )
      `);
      
      if (!tableExists[0].exists) {
        console.log('⚠️ Table matches does not exist in platform schema, skipping rollback...');
        return;
      }
      
      // Check which columns exist before removing
      const [columns] = await queryInterface.sequelize.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_schema = 'platform' 
          AND table_name = 'matches' 
          AND column_name IN ('next_match_id', 'next_match_slot', 'loser_next_match_id', 'loser_next_match_slot')
      `);
      
      const columnsToRemove = columns.map(col => col.column_name);
      
      // Remove columns that exist
      for (const columnName of ['next_match_id', 'next_match_slot', 'loser_next_match_id', 'loser_next_match_slot']) {
        if (columnsToRemove.includes(columnName)) {
          await queryInterface.removeColumn('platform.matches', columnName);
          console.log(`🗑️ Removed ${columnName} column from platform.matches`);
        }
      }
      
    } catch (error) {
      console.error('⚠️ Error removing columns from platform.matches:', error.message);
    }
  }
};