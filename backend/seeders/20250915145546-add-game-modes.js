'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // First, ensure the unique constraint exists
    try {
      await queryInterface.addConstraint('game_modes', {
        fields: ['game_id', 'name'],
        type: 'unique',
        name: 'unique_game_mode'
      });
      console.log('Added unique constraint on (game_id, name)');
    } catch (error) {
      console.log('Constraint may already exist, continuing...');
    }
    
    // Get the actual games from database to map names to IDs
    const games = await queryInterface.sequelize.query(
      'SELECT id, name FROM games WHERE status = :status',
      { 
        replacements: { status: 'active' },
        type: Sequelize.QueryTypes.SELECT 
      }
    );
    
    // Create a mapping of game names to IDs
    const gameMap = {};
    games.forEach(game => {
      gameMap[game.name.toLowerCase()] = game.id;
    });
    
    console.log('Game mapping:', gameMap);
    
    // Define game modes with game names
    const gameModes = [
      // eFootball 2024 Modes
      { game_name: 'eFootball 2024', name: 'Quick Match', status: 'active' },
      { game_name: 'eFootball 2024', name: 'Online Quick Match', status: 'active' },
      // DLS Modes
      { game_name: 'Dream League Soccer 2024', name: 'Online Match', status: 'active' },
      // FC Mobile Modes
      { game_name: 'EA Sports FC Mobile', name: 'Head-to-Head', status: 'active' },
      { game_name: 'EA Sports FC Mobile', name: 'VS Attack', status: 'active' },
    ];

    // Insert modes using the correct game IDs
    for (const mode of gameModes) {
      const gameId = gameMap[mode.game_name.toLowerCase()];
      if (gameId) {
        try {
          await queryInterface.sequelize.query(
            `INSERT INTO game_modes (game_id, name, status, created_at, updated_at)
             VALUES (:game_id, :name, :status, NOW(), NOW())
             ON CONFLICT (game_id, name) DO NOTHING`,
            { 
              replacements: {
                game_id: gameId,
                name: mode.name,
                status: mode.status
              }
            }
          );
          console.log(`✓ Added mode: ${mode.name} for game: ${mode.game_name}`);
        } catch (error) {
          console.log(`Mode already exists or error: ${mode.name} - ${error.message}`);
        }
      } else {
        console.warn(`✗ Game "${mode.game_name}" not found, skipping mode: ${mode.name}`);
      }
    }
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('game_modes', null, {});
    
    // Remove the constraint if it exists
    try {
      await queryInterface.removeConstraint('game_modes', 'unique_game_mode');
    } catch (error) {
      console.log('Constraint may not exist, continuing...');
    }
  }
};