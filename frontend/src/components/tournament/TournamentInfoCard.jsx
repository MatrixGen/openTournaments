import { Link } from 'react-router-dom';

const TournamentInfoCard = ({ tournament, actionLoading, onAction }) => {
  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'open': return 'bg-blue-500/20 text-blue-300 border border-blue-500/30';
      case 'live': return 'bg-green-500/20 text-green-300 border border-green-500/30';
      case 'completed': return 'bg-purple-500/20 text-purple-300 border border-purple-500/30';
      case 'cancelled': return 'bg-red-500/20 text-red-300 border border-red-500/30';
      default: return 'bg-gray-500/20 text-gray-300 border border-gray-500/30';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'open': return '🔵';
      case 'live': return '🟢';
      case 'completed': return '🟣';
      case 'cancelled': return '🔴';
      default: return '⚪';
    }
  };

  const canStartTournament = (tournament) => {
    return tournament.current_slots >= 2 && tournament.status === 'open';
  };

  const canFinalizeTournament = (tournament) => {
    return tournament.status === 'live' && tournament.current_slots >= 2;
  };

  const canCancelTournament = (tournament) => {
    return tournament.status === 'open';
  };

  const canEditTournament = (tournament) => {
    return tournament.status === 'open' && tournament.current_slots === 0;
  };

  const isActionLoading = (actionType, tournamentId) => {
    return actionLoading === `${actionType}-${tournamentId}`;
  };

  const getTimeRemaining = (startTime) => {
    const now = new Date();
    const start = new Date(startTime);
    const diff = start - now;

    if (diff <= 0) return 'Started';

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

    if (days > 0) return `In ${days}d ${hours}h`;
    if (hours > 0) return `In ${hours}h`;
    return 'Soon';
  };

  return (
    <div className="bg-neutral-800 rounded-lg shadow-lg hover:shadow-xl transition-shadow border border-neutral-700">
      {/* Tournament Header */}
      <div className="p-4 sm:p-6 border-b border-neutral-700">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center space-x-3 min-w-0 flex-1">
            <img
              src={tournament.game?.logo_url || '/default-game.png'}
              alt={tournament.game?.name}
              className="h-8 w-8 sm:h-10 sm:w-10 rounded-md flex-shrink-0"
            />
            <div className="min-w-0 flex-1">
              <h3 className="font-semibold text-white text-base sm:text-lg truncate">
                {tournament.name}
              </h3>
              <p className="text-gray-400 text-xs sm:text-sm truncate">
                {tournament.game?.name}
              </p>
            </div>
          </div>
          <span className={`inline-flex items-center px-2 py-1 sm:px-3 sm:py-1 rounded-full text-xs font-medium ml-2 flex-shrink-0 ${getStatusBadgeClass(tournament.status)}`}>
            <span className="hidden sm:inline mr-1">{getStatusIcon(tournament.status)}</span>
            {tournament.status}
          </span>
        </div>

        {/* Tournament Info */}
        <div className="grid grid-cols-2 gap-3 sm:gap-4 text-xs sm:text-sm">
          <div>
            <span className="text-gray-400">Participants:</span>
            <div className="text-white font-medium">
              {tournament.current_slots}/{tournament.total_slots}
            </div>
          </div>
          <div>
            <span className="text-gray-400">Entry Fee:</span>
            <div className="text-white font-medium">${tournament.entry_fee}</div>
          </div>
          <div>
            <span className="text-gray-400">Prize Pool:</span>
            <div className="text-yellow-400 font-medium">${tournament.entry_fee * tournament.total_slots}</div>
          </div>
          <div>
            <span className="text-gray-400">Starts:</span>
            <div className="text-white font-medium text-xs">
              {getTimeRemaining(tournament.start_time)}
            </div>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="p-3 sm:p-4">
        <div className="flex flex-wrap gap-2">
          <Link
            to={`/tournaments/${tournament.id}`}
            className="flex-1 border border-neutral-600 text-neutral-200 hover:bg-neutral-700/30 hover:border-neutral-400 text-xs sm:text-sm font-medium py-2 px-2 sm:px-3 rounded text-center transition-all"
          >
            View Details
          </Link>

          {canEditTournament(tournament) && (
            <Link
              to={`/tournaments/${tournament.id}/edit`}
              className="border border-blue-500 text-blue-400 hover:bg-blue-500/10 text-xs sm:text-sm font-medium py-2 px-2 sm:px-3 rounded transition-all"
            >
              Edit
            </Link>
          )}

          {canStartTournament(tournament) && (
            <button
              onClick={() => onAction('start', tournament.id, tournament.name)}
              disabled={isActionLoading('start', tournament.id)}
              className="border border-green-500 text-green-400 hover:bg-green-500/10 text-xs sm:text-sm font-medium py-2 px-2 sm:px-3 rounded transition-all disabled:opacity-50"
            >
              {isActionLoading('start', tournament.id) ? 'Starting...' : 'Start'}
            </button>
          )}

          {canFinalizeTournament(tournament) && (
            <button
              onClick={() => onAction('finalize', tournament.id, tournament.name)}
              disabled={isActionLoading('finalize', tournament.id)}
              className="border border-purple-500 text-purple-400 hover:bg-purple-500/10 text-xs sm:text-sm font-medium py-2 px-2 sm:px-3 rounded transition-all disabled:opacity-50"
            >
              {isActionLoading('finalize', tournament.id) ? 'Finalizing...' : 'Finalize'}
            </button>
          )}

          {canCancelTournament(tournament) && (
            <button
              onClick={() => onAction('cancel', tournament.id, tournament.name)}
              disabled={isActionLoading('cancel', tournament.id)}
              className="border border-red-500 text-red-400 hover:bg-red-500/10 text-xs sm:text-sm font-medium py-2 px-2 sm:px-3 rounded transition-all disabled:opacity-50"
            >
              {isActionLoading('cancel', tournament.id) ? 'Canceling...' : 'Cancel'}
            </button>
          )}
        </div>

        {/* Status Messages */}
        {tournament.status === 'open' && tournament.current_slots < 2 && (
          <div className="mt-2 p-2 bg-yellow-800/30 rounded text-yellow-300 text-xs">
            ⚠️ Need {2 - tournament.current_slots} more participants to start
          </div>
        )}
      </div>
    </div>
  );
};

export default TournamentInfoCard;
