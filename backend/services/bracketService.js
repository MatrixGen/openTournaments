const { Tournament, TournamentParticipant, Match } = require('../models');

const generateTournamentBracket = async (tournamentId, transaction) => {
  try {
    const tournament = await Tournament.findByPk(tournamentId, { transaction });
    const participants = await TournamentParticipant.findAll({
      where: { tournament_id: tournamentId },
      transaction
    });

    // Shuffle participants for random seeding
    const shuffledParticipants = shuffleArray(participants);
    
    // Generate matches based on tournament format
    switch (tournament.format) {
      case 'single_elimination':
        await generateSingleEliminationBracket(tournament, shuffledParticipants, transaction);
        break;
      case 'double_elimination':
        await generateDoubleEliminationBracket(tournament, shuffledParticipants, transaction);
        break;
      case 'round_robin':
        await generateRoundRobinBracket(tournament, shuffledParticipants, transaction);
        break;
      default:
        throw new Error(`Unsupported tournament format: ${tournament.format}`);
    }
    
  } catch (error) {
    throw error;
  }
};

// Helper function to shuffle participants
const shuffleArray = (array) => {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

// Single Elimination Bracket Generation
const generateSingleEliminationBracket = async (tournament, participants, transaction) => {
  const numParticipants = participants.length;
  const numRounds = Math.ceil(Math.log2(numParticipants));
  
  // Create first round matches
  for (let i = 0; i < numParticipants; i += 2) {
    if (i + 1 < numParticipants) {
      await Match.create({
        tournament_id: tournament.id,
        round_number: 1,
        participant1_id: participants[i].id,
        participant2_id: participants[i + 1].id,
        status: 'scheduled'
      }, { transaction });
    } else {
      // Handle bye (odd number of participants)
      await Match.create({
        tournament_id: tournament.id,
        round_number: 1,
        participant1_id: participants[i].id,
        participant2_id: null, // bye
        status: 'completed', // auto-complete bye matches
        winner_id: participants[i].id
      }, { transaction });
    }
  }
};

// Add other bracket generation functions later
const generateDoubleEliminationBracket = async (tournament, participants, transaction) => {
  // Implementation for double elimination
};

const generateRoundRobinBracket = async (tournament, participants, transaction) => {
  // Implementation for round robin
};

module.exports = {
  generateTournamentBracket
};