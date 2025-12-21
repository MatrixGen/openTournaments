
const { Tournament, TournamentParticipant, Match ,Series} = require('../models');

const NotificationService = require('./notificationService');
const { distributePrizes } = require('./prizeService');

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
       case 'best_of_three':
        await generateBestOfThreeBracket(tournament, shuffledParticipants, transaction);
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

// Single Elimination Bracket Generation (UPDATED)
const generateSingleEliminationBracket = async (tournament, participants, transaction) => {
  const numParticipants = participants.length;
  const P = nextPowerOfTwo(numParticipants);
  const numRounds = Math.ceil(Math.log2(P));
  
  const matchMap = new Map();
  const matchesToLink = [];

  // Helper to determine the key of the next match
  const getNextMatchKey = (round, matchIndex) => {
    if (round === numRounds) return null;
    const nextRound = round + 1;
    const nextRoundIndex = Math.ceil(matchIndex / 2);
    return `R${nextRound}M${nextRoundIndex}`;
  };

  // 1. Generate All Placeholder Matches (starting from the last round back to 1)
  // This helps us map the IDs immediately upon creation.
  for (let round = numRounds; round >= 1; round--) {
    const matchesInRound = P / Math.pow(2, round);
    for (let i = 0; i < matchesInRound; i++) {
      const matchIndex = i + 1;
      const matchIdKey = `R${round}M${matchIndex}`;
      const nextMatchIdKey = getNextMatchKey(round, matchIndex);

      let p1_id = null;
      let p2_id = null;
      let status = 'scheduled';
      let winner_id = null;

      // Set participants only for Round 1
      if (round === 1) {
        const p1 = participants[i * 2];
        const p2 = participants[i * 2 + 1];
        
        p1_id = p1 ? p1.id : null;
        // Handle odd participants/byes by checking the index bounds
        p2_id = (i * 2 + 1 < numParticipants) ? p2.id : null;

        // Auto-complete bye (if p2_id is null)
        if (p1_id && !p2_id) {
          status = 'completed';
          winner_id = p1_id;
        }
      }

      const newMatch = await Match.create({
        tournament_id: tournament.id,
        round_number: round,
        bracket_type: 'winners', // Single elimination is always the winners bracket
        participant1_id: p1_id,
        participant2_id: p2_id,
        status: status,
        winner_id: winner_id,

        // Use the ID Key for now, replace with actual IDs later
        next_match_id: nextMatchIdKey,
        next_match_slot: (matchIndex % 2) !== 0 ? 'participant1_id' : 'participant2_id',
        loser_next_match_id: null, // Single elimination has no loser bracket
        loser_next_match_slot: null,
      }, { transaction });

      matchMap.set(matchIdKey, newMatch.id);
      matchesToLink.push(newMatch);
    }
  }

  // 2. Finalizing Match Links
  for (const match of matchesToLink) {
    if (typeof match.next_match_id === 'string' && matchMap.has(match.next_match_id)) {
      await match.update({
        next_match_id: matchMap.get(match.next_match_id)
      }, { transaction });
    }
  }
  
  // 3. Update Tournament
  await tournament.update({ current_round: 1 }, { transaction });
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

// Add necessary helper function
const nextPowerOfTwo = (n) => {
  if (n <= 1) return 1;
  let p = 1;
  while (p < n) {
    p *= 2;
  }
  return p;
};

// ----------------------------------------------------------------------
// ✅ REWRITTEN FUNCTION: generateDoubleEliminationBracket
// Creates the full, deterministically mapped Double Elimination structure.
// ----------------------------------------------------------------------
async function generateDoubleEliminationBracket(tournament, participants, transaction) {
  if (!participants || participants.length < 2) {
    throw new Error('At least 2 participants are required to generate a bracket.');
  }

  const numParticipants = participants.length;
  const P = nextPowerOfTwo(numParticipants); // Bracket Size (Power of 2)
  const numByes = P - numParticipants;
  const numWBRounds = Math.ceil(Math.log2(P));
  
  // A temporary map to store match IDs by their structural address (e.g., 'W1M1')
  const matchMap = new Map();
  const matchesToCreate = [];
  
  // 1. Seed Participants and Handle Byes
  // Shuffle participants for random seeding
  const seededParticipants = shuffleArray(participants);
  
  // Pad with nulls (byes) if needed to fill the bracket to P
  const round1Participants = [...seededParticipants];
  for (let i = 0; i < numByes; i++) {
    // Add null placeholder for bye slots
    // For standard seeding, byes are placed to ensure top seeds advance easily.
    // Here we just append them, relying on the loop structure to pair them with participants.
    round1Participants.push(null); 
  }

  // 2. Calculate Match Indices for all rounds (W-Bracket first)
  // We need to calculate how matches flow into each other before creation (ID injection).

  // A helper structure to define the bracket flow (standard pattern)
  const getNextWBId = (round, matchIndex, totalMatches) => {
    if (round === numWBRounds) return null; // Final match winner advances to Finals
    const nextRound = round + 1;
    const nextRoundIndex = Math.ceil(matchIndex / 2);
    return `W${nextRound}M${nextRoundIndex}`;
  };

  const getLoserLBId = (round, matchIndex) => {
    if (round === numWBRounds) return 'GFM1'; // Final match winner stays, loser goes to Grand Final Reset (handled by final match type)
    
    // Losers from WB round R drop into LB round 2R-1 or 2R
    let lbRound;
    let lbMatchIndex;
    
    if (round === 1) {
        lbRound = 1;
        // Losers from W1 drop to L1, in the same order
        lbMatchIndex = matchIndex;
    } else {
        // Losers from W2 drop to L3, W3 to L5, etc.
        lbRound = (round * 2) - 1; 
        
        // Losers from the first half of WB matches drop into the second half of LB matches in that round
        // Losers from the second half drop into the first half of LB matches in that round
        const matchesInLBRound = Math.pow(2, numWBRounds - round);
        const halfLBRound = matchesInLBRound / 2;

        if (matchIndex <= halfLBRound) {
             // Losers from the top half of WB matches go to the bottom half of the LB round slots
             lbMatchIndex = matchIndex + halfLBRound;
        } else {
             // Losers from the bottom half of WB matches go to the top half of the LB round slots (They wait)
             lbMatchIndex = matchIndex - halfLBRound;
        }
    }
    return `L${lbRound}M${lbMatchIndex}`;
  };

  // --- 2.1. Winners Bracket (WB) Match Creation ---
  for (let round = 1; round <= numWBRounds; round++) {
    const matchesInRound = Math.pow(2, numWBRounds - round);
    for (let i = 0; i < matchesInRound; i++) {
      const matchIndex = i + 1;
      const matchIdKey = `W${round}M${matchIndex}`;
      const nextWBMatchIdKey = getNextWBId(round, matchIndex, matchesInRound);
      const loserLBMatchIdKey = round < numWBRounds ? getLoserLBId(round, matchIndex) : null;
      
      let p1_id = null;
      let p2_id = null;
      let status = 'scheduled';
      let winner_id = null;
      
      // Only set participants for Round 1
      if (round === 1) {
        const p1 = round1Participants[i * 2];
        const p2 = round1Participants[i * 2 + 1];

        p1_id = p1 ? p1.id : null;
        p2_id = p2 ? p2.id : null;
        
        // Handle bye (if one participant is null)
        if (p1_id && !p2_id) {
          status = 'completed';
          winner_id = p1_id;
        }
      }
      
      const newMatch = await Match.create({
        tournament_id: tournament.id,
        round_number: round,
        bracket_type: 'winners',
        participant1_id: p1_id,
        participant2_id: p2_id,
        status: status,
        winner_id: winner_id,
        
        // Use the ID Key for now, replace with actual IDs later
        next_match_id: nextWBMatchIdKey, 
        next_match_slot: (matchIndex % 2) !== 0 ? 'participant1_id' : 'participant2_id',
        loser_next_match_id: loserLBMatchIdKey,
        loser_next_match_slot: (matchIndex % 2) !== 0 ? 'participant1_id' : 'participant2_id', // Needs specific LB slot logic if required
      }, { transaction });
      
      matchMap.set(matchIdKey, newMatch.id);
      matchesToCreate.push(newMatch);
    }
  }

  // --- 2.2. Losers Bracket (LB) Match Creation ---
  // The LB has 2 * (numWBRounds - 1) total rounds.
  for (let round = 1; round <= 2 * (numWBRounds - 1); round++) {
    // Round 1 LB matches are only from WB losers. Round 2 LB matches are L1 winners vs WB losers.
    const isWBLoserDropRound = (round % 2) !== 0; // Odd rounds are where WB losers drop
    const effectiveWBRound = Math.ceil((round + 1) / 2);
    
    // Total matches in a Losers Bracket Round
    const matchesInRound = Math.pow(2, numWBRounds - effectiveWBRound - (isWBLoserDropRound ? 0 : 1));

    for (let i = 0; i < matchesInRound; i++) {
      const matchIndex = i + 1;
      const matchIdKey = `L${round}M${matchIndex}`;
      
      // Determine next match ID for the winner of this LB match
      let nextLBMatchIdKey = null;
      let nextLBSlot = null;

      if (round < 2 * (numWBRounds - 1)) {
        // Winner advances to the next LB round
        const nextRound = round + 1;
        const nextRoundIndex = Math.ceil(matchIndex / 2);
        nextLBMatchIdKey = `L${nextRound}M${nextRoundIndex}`;
        nextLBSlot = (matchIndex % 2) !== 0 ? 'participant1_id' : 'participant2_id';
      } else {
        // Winner advances to the Grand Finals (participant 2 slot)
        nextLBMatchIdKey = `GFM1`;
        nextLBSlot = 'participant2_id';
      }

      // Losers Bracket matches start with NULL participants
      const newMatch = await Match.create({
        tournament_id: tournament.id,
        round_number: round,
        bracket_type: 'losers',
        participant1_id: null,
        participant2_id: null,
        status: 'scheduled',
        
        // Use the ID Key for now, replace with actual IDs later
        next_match_id: nextLBMatchIdKey,
        next_match_slot: nextLBSlot,
        loser_next_match_id: null, // Losers are eliminated from LB
        loser_next_match_slot: null,
      }, { transaction });
      
      matchMap.set(matchIdKey, newMatch.id);
      matchesToCreate.push(newMatch);
    }
  }

  // --- 2.3. Grand Finals (GF) Match Creation ---
  const finalsMatch = await Match.create({
    tournament_id: tournament.id,
    round_number: numWBRounds + 1,
    bracket_type: 'finals',
    participant1_id: null, // WB Winner
    participant2_id: null, // LB Winner
    status: 'scheduled',
    
    // Finals do not advance anywhere else (unless it's a Grand Final Reset)
    next_match_id: null, 
    next_match_slot: null,
    loser_next_match_id: null,
    loser_next_match_slot: null,
  }, { transaction });
  matchMap.set('GFM1', finalsMatch.id);
  matchesToCreate.push(finalsMatch);

  // 3. Finalizing Match Links (Updating next_match_id fields with actual DB IDs)
  // This step iterates over all created matches and replaces the temporary string keys with the real IDs.
  for (const match of matchesToCreate) {
    let updateFields = {};
    
    // Update Winner's Link
    if (typeof match.next_match_id === 'string' && matchMap.has(match.next_match_id)) {
      updateFields.next_match_id = matchMap.get(match.next_match_id);
    } else if (match.next_match_id !== null) {
        updateFields.next_match_id = null; // Clear any invalid keys
    }

    // Update Loser's Link (Only for WB matches)
    if (match.bracket_type === 'winners' && typeof match.loser_next_match_id === 'string' && matchMap.has(match.loser_next_match_id)) {
      updateFields.loser_next_match_id = matchMap.get(match.loser_next_match_id);
    } else if (match.bracket_type === 'winners' && match.loser_next_match_id !== null) {
      updateFields.loser_next_match_id = null; // Clear any invalid keys
    }
    
    // Bulk update the links
    if (Object.keys(updateFields).length > 0) {
      await match.update(updateFields, { transaction });
    }
  }

  // 4. Update Tournament
  await tournament.update({ current_round: 1 }, { transaction });
}

const advanceDoubleEliminationMatch = async (match, winnerId, transaction) => {
  // Find the ID of the loser participant (which might be null if a bye was involved)
  const loserId = (match.participant1_id === winnerId) 
    ? match.participant2_id 
    : match.participant1_id;

  // 1. Advance Winner (always advances based on next_match_id)
  if (match.next_match_id && match.next_match_slot) {
    const nextMatch = await Match.findByPk(match.next_match_id, { transaction });

    if (nextMatch) {
      // Use the slot field ('participant1_id' or 'participant2_id') to update the next match
      await nextMatch.update({
        [match.next_match_slot]: winnerId 
      }, { transaction });
    } else {
      console.error(`[DE Advance Error] Next match ID ${match.next_match_id} not found.`);
      // Optionally throw an error or log a severe warning if the bracket structure is broken
    }
  }

  // 2. Advance Loser (only applies if the match is in the Winners Bracket and a loser exists)
  if (match.bracket_type === 'winners' && loserId) {
    if (match.loser_next_match_id && match.loser_next_match_slot) {
      const loserNextMatch = await Match.findByPk(match.loser_next_match_id, { transaction });

      if (loserNextMatch) {
        // Use the slot field for the loser
        await loserNextMatch.update({
          [match.loser_next_match_slot]: loserId
        }, { transaction });
      } else {
        console.error(`[DE Advance Error] Loser next match ID ${match.loser_next_match_id} not found.`);
      }
    }
  }
  
  // NOTE: No need to explicitly update current_round here. That is handled by the 
  // 'advanceTournament' controller function once all matches in the current round are completed.
};


// Function to advance tournament to next round (UPDATED)
const generateNextRound = async (tournament, nextRoundNumber, transaction) => {
  if (tournament.format === 'single_elimination') {
    
    // 🔥 Removed the manual finding of winners and creation of next round matches.
    // This is now handled by the initial bracket generation and the match advancement logic 
    // in the controller/service (e.g., advanceWinnerToNextRound which needs fixing too!)
    
    // We only update the current round number here
    await tournament.update({ current_round: nextRoundNumber }, { transaction });

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

// Add this function to handle bracket advancement (UPDATED LOGIC)
const advanceWinnerToNextRound = async (match, winnerParticipantId, transaction) => {
  try {
    // 1. Check if the match links to a next match
    if (match.next_match_id && match.next_match_slot) {
      const nextMatch = await Match.findByPk(match.next_match_id, { transaction });
      
      if (nextMatch) {
          // 2. Fill the determined slot in the next match
          await nextMatch.update({
              [match.next_match_slot]: winnerParticipantId
          }, { transaction });

          console.log(`Advanced winner of Match ${match.id} to Next Match ${nextMatch.id}, Slot: ${match.next_match_slot}`);
          
          // Return early, advancement complete
          return;
      } else {
          // Log error if link exists but match doesn't (Should not happen in correct bracket generation)
          console.error(`Error: Match ${match.id} links to non-existent match ID ${match.next_match_id}`);
          // Proceed to complete tournament as this might be the final match link
      }
    }

    // 3. If no next_match_id/slot, or if the linked match was not found, this is the final match.
    // NOTE: This handles Round Robin which has no 'next_match_id' but still needs completion.
    await completeTournament(match.tournament_id, winnerParticipantId, transaction);
    
  } catch (error) {
    throw error;
  }
};

// Add this function to handle tournament completion
const completeTournament = async (tournamentId, winnerParticipantId, transaction) => {
  
  try {
    // Update tournament status
    await Tournament.update(
      { status: 'completed' },
      { where: { id: tournamentId }, transaction }
    );

    // Update the winner's final standing
    await TournamentParticipant.update(
      { final_standing: 1 },
      { where: { id: winnerParticipantId }, transaction }
    );

    // Distribute prizes
    await distributePrizes(tournamentId, transaction);
    
    console.log(`Tournament ${tournamentId} completed. Winner: ${winnerParticipantId}`);
    
    // TODO: Notify all participants about tournament completion
    const participants = await TournamentParticipant.findAll({
      where: { tournament_id: tournamentId },
      attributes: ['id'],
      raw: true, // Returns plain objects instead of model instances
      transaction
    });

    const participantIds = participants.map(p => p.id);

    const tournament = await Tournament.findOne({
      where:{id:tournamentId}
    },transaction)

    //This is not normal,console error it
    if(!participants || !tournament) {
      console.error('participants or tournament were not found in the given tournament id , this is not normal');
      return 
    }

    await NotificationService.bulkCreateNotifications(
      participantIds,
      'Tournament Completed',
      `Tournament ${tournament.name} was completed and prizes were distributed successfully`,
      'info',
      'tournament',
      tournamentId
    )
    
  } catch (error) {
    throw error;
  }
};

// ✅ NEW FUNCTION: Generate Best of Three bracket
const generateBestOfThreeBracket = async (tournament, participants, transaction) => {
  if (participants.length !== 2) {
    throw new Error('Best of Three requires exactly 2 participants');
  }
  
  const [p1, p2] = participants;
  
  // Create a parent "series" record to track wins
  // You'll need to create this model (see Step 5)
  const series = await Series.create({
    tournament_id: tournament.id,
    participant1_id: p1.id,
    participant2_id: p2.id,
    participant1_wins: 0,
    participant2_wins: 0,
    status: 'active'
  }, { transaction });
  
  // Create Match 1 of the series
  await Match.create({
    tournament_id: tournament.id,
    bracket_type: 'series',
    round_number: 1,
    series_match_number: 1,
    series_id: series.id, // Link to series
    participant1_id: p1.id,
    participant2_id: p2.id,
    status: 'scheduled',
    next_match_id: null, // We'll handle this differently
    scheduled_time: tournament.start_time
  }, { transaction });
  
  // Update tournament
  await tournament.update({ current_round: 1 }, { transaction });
};

// ✅ NEW FUNCTION: Advance Best of Three series
const advanceBestOfThreeSeries = async (match, winnerId, transaction) => {
  // Get the series record
  const series = await Series.findOne({
    where: { tournament_id: match.tournament_id },
    transaction
  });
  
  if (!series) {
    throw new Error('Series not found for tournament');
  }
  
  // Update win count
  if (winnerId === series.participant1_id) {
    await series.increment('participant1_wins', { by: 1, transaction });
  } else if (winnerId === series.participant2_id) {
    await series.increment('participant2_wins', { by: 1, transaction });
  } else {
    throw new Error('Winner is not part of this series');
  }
  
  // Reload series to get updated counts
  await series.reload({ transaction });
  
  // Check if series is complete
  if (series.participant1_wins === 2 || series.participant2_wins === 2) {
    // Tournament complete
    const tournamentWinnerId = series.participant1_wins === 2 
      ? series.participant1_id 
      : series.participant2_id;
    
    await completeTournament(match.tournament_id, tournamentWinnerId, transaction);
    await series.update({ status: 'completed' }, { transaction });
    return;
  }
  
  // Series continues - create next match
  const nextMatchNumber = series.participant1_wins + series.participant2_wins + 1;
  
  await Match.create({
    tournament_id: match.tournament_id,
    bracket_type: 'series',
    round_number: nextMatchNumber,
    series_match_number: nextMatchNumber,
    series_id: series.id,
    participant1_id: series.participant1_id,
    participant2_id: series.participant2_id,
    status: 'scheduled',
    scheduled_time: new Date(Date.now() + 24 * 60 * 60 * 1000) 
  }, { transaction });
};

module.exports = {
  generateBracket,
  generateNextRound,
  advanceDoubleEliminationMatch,
  advanceWinnerToNextRound,
  generateBestOfThreeBracket,
  advanceBestOfThreeSeries
};