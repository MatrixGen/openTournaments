const { Tournament, TournamentParticipant, Transaction, User } = require('../models');
const sequelize = require('../config/database');

const distributePrizes = async (tournamentId, transaction) => {
  try {
    const tournament = await Tournament.findByPk(tournamentId, {
      include: [{
        model: TournamentParticipant,
        as: 'participants',
        include: [{
          model: User,
          as: 'user'
        }]
      }, {
        model: TournamentPrize,
        as: 'prizes'
      }],
      transaction
    });

    if (!tournament) {
      throw new Error('Tournament not found');
    }

    // Sort participants by final standing (1st, 2nd, 3rd, etc.)
    const sortedParticipants = tournament.participants
      .filter(p => p.final_standing !== null)
      .sort((a, b) => a.final_standing - b.final_standing);

    // Distribute prizes based on final standings
    for (const participant of sortedParticipants) {
      const prize = tournament.prizes.find(p => p.position === participant.final_standing);
      
      if (prize) {
        const prizeAmount = (tournament.entry_fee * tournament.total_slots) * (prize.percentage / 100);
        
        // Update user's wallet balance
        const newBalance = participant.user.wallet_balance + prizeAmount;
        await User.update(
          { wallet_balance: newBalance },
          { where: { id: participant.user.id }, transaction }
        );

        // Record the transaction
        await Transaction.create({
          user_id: participant.user.id,
          type: 'prize_won',
          amount: prizeAmount,
          balance_before: participant.user.wallet_balance,
          balance_after: newBalance,
          status: 'completed',
          description: `Prize for finishing ${participant.final_standing} place in tournament: ${tournament.name}`
        }, { transaction });

        console.log(`Distributed ${prizeAmount} to user ${participant.user.id} for ${participant.final_standing} place`);
      }
    }

  } catch (error) {
    throw error;
  }
};

module.exports = {
  distributePrizes
};