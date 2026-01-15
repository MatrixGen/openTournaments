const { Tournament, TournamentParticipant, User, TournamentPrize } = require('../models');
const sequelize = require('../config/database');
const WalletService = require('./walletService');
const CurrencyUtils = require('../utils/currencyUtils');
const { WalletError } = require('../errors/WalletError');

const generatePrizeReference = () =>
  `PRIZE-${Date.now()}-${Math.random().toString(36).slice(2, 10).toUpperCase()}`;

const distributePrizes = async (tournamentId, transaction) => {
  const pendingNotifications = []; 

  try {
    const tournament = await Tournament.findByPk(tournamentId, {
      include: [
        {
          model: TournamentParticipant,
          as: 'participants',
          include: [{ model: User, as: 'user' }]
        },
        {
          model: TournamentPrize,
          as: 'prizes',
          order: [['position', 'ASC']]
        }
      ],
      transaction
    });

    if (!tournament) {
      throw new Error('Tournament not found');
    }

    if (tournament.status !== 'completed') {
      throw new Error('Tournament must be completed before distributing prizes');
    }

    const tournamentCurrency = tournament.currency?.trim().toUpperCase();
    if (!tournamentCurrency) {
      throw new WalletError('MISSING_CURRENCY', 'Tournament currency is missing');
    }
    if (!CurrencyUtils.isValidCurrency(tournamentCurrency)) {
      throw new WalletError('INVALID_CURRENCY', `Unsupported currency: ${tournamentCurrency}`);
    }

    if (tournament.prize_pool === null || tournament.prize_pool === undefined) {
      throw new Error(`Tournament prize pool is missing for tournament ${tournamentId}`);
    }
    const totalPrizePool = parseFloat(tournament.prize_pool);
    if (Number.isNaN(totalPrizePool)) {
      throw new Error(`Tournament prize pool is invalid for tournament ${tournamentId}`);
    }

    const sortedParticipants = tournament.participants
      .filter(p => p.final_standing !== null && p.final_standing > 0)
      .sort((a, b) => a.final_standing - b.final_standing);

    if (!tournament.prizes || tournament.prizes.length === 0) {
      console.warn(`No prizes defined for tournament ${tournamentId}`);
      return;
    }

    const totalPercentage = tournament.prizes.reduce(
      (sum, prize) => sum + parseFloat(prize.percentage),
      0
    );
    if (Math.abs(totalPercentage - 100) > 0.01) {
      throw new Error(
        `Prize distribution percentages must sum to 100%. Current sum: ${totalPercentage}%`
      );
    }

    for (const participant of sortedParticipants) {
      const prize = tournament.prizes.find(
        p => p.position === participant.final_standing
      );

      if (prize) {
        const prizeAmount = totalPrizePool * (prize.percentage / 100);

        if (isNaN(prizeAmount) || prizeAmount <= 0) {
          console.error(
            `Invalid prize amount calculated for participant ${participant.id}: ${prizeAmount}`
          );
          continue;
        }

        const roundedPrizeAmount = Math.round(prizeAmount * 100) / 100;

        await WalletService.credit({
          userId: participant.user.id,
          amount: roundedPrizeAmount,
          currency: tournamentCurrency,
          type: 'prize_won',
          reference: generatePrizeReference(),
          description: `Prize for finishing ${participant.final_standing}${getOrdinalSuffix(
            participant.final_standing
          )} place in tournament: ${tournament.name}`,
          tournamentId,
          transaction,
        });

        // Collect notification (send later after commit)
        pendingNotifications.push({
          userId: participant.user.id,
          title: 'Tournament Prize Won',
          message: `Congratulations! You won ${roundedPrizeAmount} for finishing ${participant.final_standing}${getOrdinalSuffix(
            participant.final_standing
          )} in the tournament "${tournament.name}".`,
          type: 'tournament_completed',
          relatedEntityType: 'tournament',
          relatedEntityId: tournamentId
        });

        console.log(
          `Distributed ${roundedPrizeAmount} to user ${participant.user.id} for ${participant.final_standing} place`
        );
      } else {
        console.warn(
          `No prize defined for position ${participant.final_standing} in tournament ${tournamentId}`
        );
      }
    }

    await tournament.update({ prizes_distributed: true }, { transaction });

    // Return notifications to caller so they can be sent AFTER transaction commit
    return pendingNotifications;

  } catch (error) {
    console.error('Error distributing prizes:', error);
    throw error;
  }
};

const getOrdinalSuffix = position => {
  if (position >= 11 && position <= 13) {
    return 'th';
  }
  switch (position % 10) {
    case 1:
      return 'st';
    case 2:
      return 'nd';
    case 3:
      return 'rd';
    default:
      return 'th';
  }
};

const validatePrizeDistribution = prizeDistribution => {
  if (!prizeDistribution || prizeDistribution.length === 0) {
    throw new Error('Prize distribution is required');
  }

  const totalPercentage = prizeDistribution.reduce(
    (sum, prize) => sum + prize.percentage,
    0
  );

  if (Math.abs(totalPercentage - 100) > 0.01) {
    throw new Error(
      `Prize distribution percentages must sum to 100%. Current sum: ${totalPercentage}%`
    );
  }

  const positions = prizeDistribution.map(prize => prize.position);
  const uniquePositions = new Set(positions);

  if (positions.length !== uniquePositions.size) {
    throw new Error('Duplicate positions found in prize distribution');
  }

  for (const prize of prizeDistribution) {
    if (prize.percentage <= 0 || prize.percentage > 100) {
      throw new Error(
        `Invalid percentage (${prize.percentage}%) for position ${prize.position}`
      );
    }
  }

  return true;
};

module.exports = {
  distributePrizes,
  validatePrizeDistribution
};
