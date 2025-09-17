const sequelize = require('../config/database');
const { Tournament, TournamentParticipant, Match, User, Game, Platform, GameMode } = require('../models');

const seedTestData = async () => {
  try {
    console.log('Starting test data seeding...');

    // 1. Find or create test users
    const [user1, user2, user3, user4] = await Promise.all([
      User.findOrCreate({
        where: { email: 'player1@test.com' },
        defaults: {
          username: 'player1',
          password_hash: '$2b$12$EXAMPLEHASH', // This would be a real hash in production
          wallet_balance: 100.00
        }
      }),
      User.findOrCreate({
        where: { email: 'player2@test.com' },
        defaults: {
          username: 'player2',
          password_hash: '$2b$12$EXAMPLEHASH',
          wallet_balance: 100.00
        }
      }),
      User.findOrCreate({
        where: { email: 'player3@test.com' },
        defaults: {
          username: 'player3',
          password_hash: '$2b$12$EXAMPLEHASH',
          wallet_balance: 100.00
        }
      }),
      User.findOrCreate({
        where: { email: 'player4@test.com' },
        defaults: {
          username: 'player4',
          password_hash: '$2b$12$EXAMPLEHASH',
          wallet_balance: 100.00
        }
      })
    ]);

    // 2. Find existing game, platform, and game mode
    const game = await Game.findOne();
    const platform = await Platform.findOne();
    const gameMode = await GameMode.findOne();

    if (!game || !platform || !gameMode) {
      console.error('Please make sure you have games, platforms, and game modes in your database');
      process.exit(1);
    }

    // 3. Create a test tournament
    const tournament = await Tournament.create({
      name: 'Test Tournament',
      game_id: game.id,
      platform_id: platform.id,
      game_mode_id: gameMode.id,
      format: 'single_elimination',
      entry_fee: 10.00,
      total_slots: 4,
      current_slots: 4,
      status: 'locked', // Set to locked to simulate a full tournament
      created_by: user1[0].id,
      start_time: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days from now
    });

    // 4. Add participants to the tournament
    const participants = await Promise.all([
      TournamentParticipant.create({
        tournament_id: tournament.id,
        user_id: user1[0].id,
        gamer_tag: 'PlayerOne'
      }),
      TournamentParticipant.create({
        tournament_id: tournament.id,
        user_id: user2[0].id,
        gamer_tag: 'PlayerTwo'
      }),
      TournamentParticipant.create({
        tournament_id: tournament.id,
        user_id: user3[0].id,
        gamer_tag: 'PlayerThree'
      }),
      TournamentParticipant.create({
        tournament_id: tournament.id,
        user_id: user4[0].id,
        gamer_tag: 'PlayerFour'
      })
    ]);

    // 5. Create matches for the tournament
    const matches = await Promise.all([
      // Round 1 matches
      Match.create({
        tournament_id: tournament.id,
        round_number: 1,
        participant1_id: participants[0].id,
        participant2_id: participants[1].id,
        status: 'scheduled'
      }),
      Match.create({
        tournament_id: tournament.id,
        round_number: 1,
        participant1_id: participants[2].id,
        participant2_id: participants[3].id,
        status: 'scheduled'
      }),
      // Round 2 match (final)
      Match.create({
        tournament_id: tournament.id,
        round_number: 2,
        participant1_id: null, // Will be filled after round 1 winners are determined
        participant2_id: null,
        status: 'scheduled'
      })
    ]);

    console.log('Test data seeded successfully!');
    console.log(`Tournament ID: ${tournament.id}`);
    console.log('Match IDs:');
    matches.forEach((match, index) => {
      console.log(`  Match ${index + 1}: ${match.id}`);
    });
    console.log('\nYou can now use these match IDs to test the reporting endpoints.');

  } catch (error) {
    console.error('Error seeding test data:', error);
  } finally {
    await sequelize.close();
  }
};

// Run the seeding script if this file is executed directly
if (require.main === module) {
  seedTestData();
}

module.exports = seedTestData;