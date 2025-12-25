import { useMemo } from 'react';
import TournamentBracket from '../matches/TournamentBracket';
import DisputeList from '../admin/DisputeList';

const TournamentBracketSection = ({ tournament }) => {
  const shouldShowBracket = useMemo(() => 
    tournament?.status === 'live' || tournament?.status === 'completed',
    [tournament?.status]
  );

  if (shouldShowBracket) {
    return (
      <div className="space-y-6">
        <TournamentBracket tournamentId={tournament.id} />
        <DisputeList tournamentId={tournament.id} />
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-neutral-800 rounded-lg shadow-sm border border-gray-200 dark:border-neutral-700 p-4 sm:p-6">
      <h2 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-gray-900 dark:text-white mb-3 sm:mb-4">
        Tournament Bracket
      </h2>
      <p className="text-gray-600 dark:text-gray-400 text-sm sm:text-base">
        The bracket will be generated when the tournament starts.
      </p>
    </div>
  );
};

export default TournamentBracketSection;