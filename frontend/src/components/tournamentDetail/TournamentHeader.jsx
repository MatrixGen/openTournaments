const TournamentHeader = ({ tournament }) => {
  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'upcoming': return 'bg-blue-500/20 text-blue-300';
      case 'ongoing': return 'bg-green-500/20 text-green-300';
      case 'completed': return 'bg-purple-500/20 text-purple-300';
      default: return 'bg-gray-500/20 text-gray-300';
    }
  };

  return (
    <div className="bg-neutral-800 rounded-lg shadow overflow-hidden mb-4 sm:mb-6">
      <div className="p-4 sm:p-6">
        <div className="flex flex-col md:flex-row md:items-start justify-between">
          <div className="flex items-start mb-4 md:mb-0">
            <img
              src={tournament.game.logo_url}
              alt={tournament.game.name}
              className="h-12 w-12 sm:h-16 sm:w-16 rounded-md mr-3 sm:mr-4"
            />
            <div className="min-w-0 flex-1">
              <h1 className="text-xl sm:text-2xl font-bold text-white truncate">
                {tournament.name}
              </h1>
              <p className="text-gray-400 text-sm sm:text-base">
                {tournament.game.name} • {tournament.platform.name}
              </p>
              <p className="text-gray-400 text-sm">Game Mode: {tournament.game_mode.name}</p>
            </div>
          </div>

          <div className="flex flex-col items-start md:items-end">
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadgeClass(tournament.status)}`}>
              {tournament.status}
            </span>
            <p className="mt-2 text-sm text-gray-400">
              Created by <span className="text-white">{tournament.creator.username}</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TournamentHeader;