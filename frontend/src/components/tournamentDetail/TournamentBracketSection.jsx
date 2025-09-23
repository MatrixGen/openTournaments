import TournamentBracket from '../matches/TournamentBracket';
import DisputeList from '../admin/DisputeList';

const TournamentBracketSection = ({ tournament }) => {
  if (tournament.status === 'live' || tournament.status === 'completed') {
    return (
      <>
        <TournamentBracket tournamentId={tournament.id} />
        <DisputeList />
      </>
    );
  }

  return (
    <div className="bg-neutral-800 rounded-lg shadow p-4 sm:p-6">
      <h2 className="text-lg sm:text-xl font-semibold text-white mb-3 sm:mb-4">Tournament Bracket</h2>
      <p className="text-gray-400 text-sm sm:text-base">
        The bracket will be generated when the tournament starts.
      </p>
    </div>
  );
};

export default TournamentBracketSection;