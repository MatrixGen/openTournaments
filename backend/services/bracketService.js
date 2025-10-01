const { Tournament, TournamentParticipant, Match } = require('../models');

const generateBracket = async (tournamentId, participants, transaction) => {
  try {
    const tournament = await Tournament.findByPk(tournamentId, { transaction });

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

// Single Elimination Bracket Generation (already implemented)
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

// Round Robin Bracket Generation
const generateRoundRobinBracket = async (tournament, participants, transaction) => {
  const numParticipants = participants.length;
  
  // Generate all possible pairings
  const pairings = [];
  for (let i = 0; i < numParticipants; i++) {
    for (let j = i + 1; j < numParticipants; j++) {
      pairings.push([participants[i], participants[j]]);
    }
  }
  
  // Create matches for all pairings
  for (const [participant1, participant2] of pairings) {
    await Match.create({
      tournament_id: tournament.id,
      round_number: 1, // All matches in round 1 for round robin
      participant1_id: participant1.id,
      participant2_id: participant2.id,
      status: 'scheduled'
    }, { transaction });
  }
  
  // For round robin, we'll set current_round to 1
  await tournament.update({ current_round: 1 }, { transaction });
};

async function generateDoubleEliminationBracket(tournament, participants, transaction) {
  if (!participants || participants.length < 2) {
    throw new Error('At least 2 participants are required to generate a bracket.');
  }

  // Shuffle participants to randomize pairings
  const shuffled = [...participants].sort(() => Math.random() - 0.5);

  const matchesToCreate = [];

  for (let i = 0; i < shuffled.length; i += 2) {
    const p1 = shuffled[i];
    const p2 = shuffled[i + 1];

    if (!p1 || !p2) {
      throw new Error(`Odd number of participants. Cannot create match for index ${i}.`);
    }

    matchesToCreate.push({
      tournament_id: tournament.id,
      round_number: 1,
      bracket: 'winners', // start always in winners bracket
      participant1_id: p1.id,
      participant2_id: p2.id,
      status: 'scheduled', // match will be played later
    });
  }

  // Insert only Round 1 matches
  await Match.bulkCreate(matchesToCreate, { transaction });
}

// Double Elimination Bracket Generation
/*const generateDoubleEliminationBracket = async (tournament, participants, transaction) => {
  const numParticipants = participants.length;
  const winnersBracketRounds = Math.ceil(Math.log2(numParticipants));
  
  // Generate winners bracket (similar to single elimination)
  for (let round = 1; round <= winnersBracketRounds; round++) {
    const matchesInRound = Math.pow(2, winnersBracketRounds - round);
    
    for (let i = 0; i < matchesInRound; i++) {
      // For the first round, use the participants
      if (round === 1) {
        const participant1Index = i * 2;
        const participant2Index = participant1Index + 1;
        
        if (participant2Index < numParticipants) {
          await Match.create({
            tournament_id: tournament.id,
            round_number: round,
            bracket_type: 'winners',
            participant1_id: participants[participant1Index].id,
            participant2_id: participants[participant2Index].id,
            status: 'scheduled'
          }, { transaction });
        } else {
          // Handle bye
          await Match.create({
            tournament_id: tournament.id,
            round_number: round,
            bracket_type: 'winners',
            participant1_id: participants[participant1Index].id,
            participant2_id: null,
            status: 'completed',
            winner_id: participants[participant1Index].id
          }, { transaction });
        }
      } else {
        // For subsequent rounds, participants will be determined by previous round winners
        await Match.create({
          tournament_id: tournament.id,
          round_number: round,
          bracket_type: 'winners',
          participant1_id: null, // To be filled by previous round winners
          participant2_id: null,
          status: 'scheduled'
        }, { transaction });
      }
    }
  }
  
  // Generate losers bracket
  // The losers bracket has one less round than the winners bracket
  for (let round = 1; round < winnersBracketRounds; round++) {
    const matchesInRound = Math.pow(2, winnersBracketRounds - round - 1);
    
    for (let i = 0; i < matchesInRound; i++) {
      await Match.create({
        tournament_id: tournament.id,
        round_number: round,
        bracket_type: 'losers',
        participant1_id: null, // To be filled by losers from winners bracket and previous losers bracket matches
        participant2_id: null,
        status: 'scheduled'
      }, { transaction });
    }
  }
  
  // Generate grand finals match (winners bracket winner vs losers bracket winner)
  await Match.create({
    tournament_id: tournament.id,
    round_number: winnersBracketRounds + 1,
    bracket_type: 'finals',
    participant1_id: null, // Winners bracket winner
    participant2_id: null, // Losers bracket winner
    status: 'scheduled'
  }, { transaction });
  
  // Set current round to 1
  await tournament.update({ current_round: 1 }, { transaction });
};*/

// Function to advance winners in double elimination bracket
const advanceDoubleEliminationMatch = async (match, winnerId, transaction) => {
  const tournament = await Tournament.findByPk(match.tournament_id, { transaction });
  const nextRound = match.round_number + 1;
  
  if (match.bracket_type === 'winners') {
    // Find or create next match in winners bracket
    let nextMatch = await Match.findOne({
      where: {
        tournament_id: tournament.id,
        round_number: nextRound,
        bracket_type: 'winners',
        [Op.or]: [
          { participant1_id: null },
          { participant2_id: null }
        ]
      },
      transaction
    });
    
    if (!nextMatch) {
      nextMatch = await Match.create({
        tournament_id: tournament.id,
        round_number: nextRound,
        bracket_type: 'winners',
        participant1_id: null,
        participant2_id: null,
        status: 'scheduled'
      }, { transaction });
    }
    
    // Add winner to next match
    if (!nextMatch.participant1_id) {
      await nextMatch.update({ participant1_id: winnerId }, { transaction });
    } else {
      await nextMatch.update({ participant2_id: winnerId }, { transaction });
    }
    
    // Add loser to losers bracket
    const loserId = match.participant1_id === winnerId ? match.participant2_id : match.participant1_id;
    if (loserId) {
      await addToLosersBracket(tournament, loserId, match.round_number, transaction);
    }
  } else if (match.bracket_type === 'losers') {
    // Handle losers bracket advancement
    if (nextRound <= tournament.current_round) {
      let nextMatch = await Match.findOne({
        where: {
          tournament_id: tournament.id,
          round_number: nextRound,
          bracket_type: 'losers',
          [Op.or]: [
            { participant1_id: null },
            { participant2_id: null }
          ]
        },
        transaction
      });
      
      if (nextMatch) {
        if (!nextMatch.participant1_id) {
          await nextMatch.update({ participant1_id: winnerId }, { transaction });
        } else {
          await nextMatch.update({ participant2_id: winnerId }, { transaction });
        }
      }
    }
    
    // If this is the last round of losers bracket, advance to finals
    const winnersBracketRounds = Math.ceil(Math.log2(tournament.total_slots));
    if (match.round_number === winnersBracketRounds - 1) {
      const finalsMatch = await Match.findOne({
        where: {
          tournament_id: tournament.id,
          bracket_type: 'finals',
          participant2_id: null // Losers bracket winner goes to participant2_id
        },
        transaction
      });
      
      if (finalsMatch) {
        await finalsMatch.update({ participant2_id: winnerId }, { transaction });
      }
    }
  }
};

// Helper function to add a player to the losers bracket
const addToLosersBracket = async (tournament, participantId, fromRound, transaction) => {
  // Find the appropriate round in losers bracket
  // Losers bracket round typically corresponds to the winners bracket round
  const losersBracketRound = fromRound;
  
  let losersMatch = await Match.findOne({
    where: {
      tournament_id: tournament.id,
      round_number: losersBracketRound,
      bracket_type: 'losers',
      [Op.or]: [
        { participant1_id: null },
        { participant2_id: null }
      ]
    },
    transaction
  });
  
  if (!losersMatch) {
    losersMatch = await Match.create({
      tournament_id: tournament.id,
      round_number: losersBracketRound,
      bracket_type: 'losers',
      participant1_id: null,
      participant2_id: null,
      status: 'scheduled'
    }, { transaction });
  }
  
  // Add the participant to the match
  if (!losersMatch.participant1_id) {
    await losersMatch.update({ participant1_id: participantId }, { transaction });
  } else {
    await losersMatch.update({ participant2_id: participantId }, { transaction });
  }
};

// Function to advance tournament to next round
const generateNextRound = async (tournament, nextRoundNumber, transaction) => {
  if (tournament.format === 'single_elimination') {
    // For single elimination, create next round matches
    const previousRoundMatches = await Match.findAll({
      where: {
        tournament_id: tournament.id,
        round_number: nextRoundNumber - 1,
        status: 'completed'
      },
      transaction
    });
    
    // Group winners for next round
    const winners = previousRoundMatches.map(match => match.winner_id).filter(Boolean);
    
    // Create matches for next round
    for (let i = 0; i < winners.length; i += 2) {
      if (i + 1 < winners.length) {
        await Match.create({
          tournament_id: tournament.id,
          round_number: nextRoundNumber,
          participant1_id: winners[i],
          participant2_id: winners[i + 1],
          status: 'scheduled'
        }, { transaction });
      } else {
        // Handle odd number of winners (shouldn't happen in proper bracket)
        await Match.create({
          tournament_id: tournament.id,
          round_number: nextRoundNumber,
          participant1_id: winners[i],
          participant2_id: null,
          status: 'completed',
          winner_id: winners[i]
        }, { transaction });
      }
    }
  } else if (tournament.format === 'round_robin') {
    // Round robin doesn't have traditional rounds, so we just update the current round
    // All matches are created at the beginning
    await tournament.update({ current_round: nextRoundNumber }, { transaction });
  } else if (tournament.format === 'double_elimination') {
    // Double elimination advancement is handled by advanceDoubleEliminationMatch
    // We just need to update the current round
    await tournament.update({ current_round: nextRoundNumber }, { transaction });
  }
};

module.exports = {
  generateBracket,
  generateNextRound,
  advanceDoubleEliminationMatch
};