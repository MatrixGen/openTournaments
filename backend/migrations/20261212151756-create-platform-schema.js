'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // List of tables to move (from your output)
    const tablesToMove = [
      'disputes',
      'faq_categories',
      'faq_ratings',
      'faqs',
      'friend_requests',
      'friends',
      'game_modes',
      'games',
      'live_chat_sessions',
      'matches',
      'notifications',
      'payment_methods',
      'payment_records',
      'platforms',
      'resource_links',
      'support_channels',
      'support_ticket_attachments',
      'support_ticket_messages',
      'support_ticket_status_history',
      'support_tickets',
      'tournament_participants',
      'tournament_prizes',
      'tournaments',
      'transactions',
      'users',
      'webhook_logs'
    ];
    
    console.log(`Moving ${tablesToMove.length} tables to platform schema...`);
    
    for (const tableName of tablesToMove) {
      try {
        await queryInterface.sequelize.query(`
          ALTER TABLE IF EXISTS public."${tableName}" 
          SET SCHEMA platform
        `);
        console.log(`✓ Moved: ${tableName}`);
      } catch (error) {
        console.log(`⚠️ Error moving ${tableName}: ${error.message}`);
      }
    }
    
    console.log('✅ Tables migration completed');
  },

  async down(queryInterface, Sequelize) {
    const tablesToMoveBack = [
      'disputes',
      'faq_categories',
      'faq_ratings',
      'faqs',
      'friend_requests',
      'friends',
      'game_modes',
      'games',
      'live_chat_sessions',
      'matches',
      'notifications',
      'payment_methods',
      'payment_records',
      'platforms',
      'resource_links',
      'support_channels',
      'support_ticket_attachments',
      'support_ticket_messages',
      'support_ticket_status_history',
      'support_tickets',
      'tournament_participants',
      'tournament_prizes',
      'tournaments',
      'transactions',
      'users',
      'webhook_logs'
    ];
    
    console.log(`Moving ${tablesToMoveBack.length} tables back to public schema...`);
    
    for (const tableName of tablesToMoveBack) {
      try {
        await queryInterface.sequelize.query(`
          ALTER TABLE IF EXISTS platform."${tableName}" 
          SET SCHEMA public
        `);
        console.log(`✓ Moved back: ${tableName}`);
      } catch (error) {
        console.log(`⚠️ Error moving back ${tableName}: ${error.message}`);
      }
    }
    
    console.log('✅ Tables moved back to public schema');
  }
};