import { Trophy, Users, Gamepad2, Globe } from 'lucide-react';

const TournamentHeader = ({ tournament }) => {
  const getStatusConfig = (status) => {
    switch (status) {
      case 'upcoming':
        return {
          color: 'text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-500/20 border-blue-500/30',
          label: 'Upcoming'
        };
      case 'ongoing':
        return {
          color: 'text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-500/20 border-green-500/30',
          label: 'Live'
        };
      case 'completed':
        return {
          color: 'text-purple-600 dark:text-purple-400 bg-purple-100 dark:bg-purple-500/20 border-purple-500/30',
          label: 'Completed'
        };
      case 'cancelled':
        return {
          color: 'text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-500/20 border-red-500/30',
          label: 'Cancelled'
        };
      default:
        return {
          color: 'text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-500/20 border-gray-500/30',
          label: status
        };
    }
  };

  const statusConfig = getStatusConfig(tournament.status);

  return (
    <div className="hidden md:block bg-white dark:bg-neutral-800 rounded-xl shadow-sm border border-gray-200 dark:border-neutral-700 overflow-hidden mb-6">
      <div className="p-6">
        <div className="flex flex-col md:flex-row md:items-start justify-between">
          <div className="flex items-start mb-4 md:mb-0">
            <div className="h-14 w-14 md:h-16 md:w-16 rounded-lg bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center mr-3 md:mr-4 flex-shrink-0">
              {tournament.game?.logo_url ? (
                <img
                  src={tournament.game.logo_url}
                  alt={tournament.game.name}
                  className="h-10 w-10 md:h-12 md:w-12 object-contain"
                />
              ) : (
                <Gamepad2 className="h-7 w-7 md:h-8 md:w-8 text-white" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-2 mb-2">
                <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${statusConfig.color}`}>
                  {statusConfig.label}
                </span>
                {tournament.visibility === 'public' && (
                  <span className="inline-flex items-center text-xs text-gray-500 dark:text-gray-400">
                    <Globe className="h-3 w-3 mr-1" />
                    Public
                  </span>
                )}
              </div>
              <h1 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white truncate mb-1">
                {tournament.name}
              </h1>
              <div className="flex flex-col md:flex-row md:items-center md:space-x-4 text-sm">
                <div className="flex items-center text-gray-600 dark:text-gray-400 mb-1 md:mb-0">
                  <Trophy className="h-4 w-4 mr-1 flex-shrink-0" />
                  <span className="truncate">{tournament.game?.name || 'Tournament'}</span>
                </div>
                <span className="hidden md:block text-gray-400">•</span>
                <div className="flex items-center text-gray-600 dark:text-gray-400">
                  <Users className="h-4 w-4 mr-1 flex-shrink-0" />
                  <span className="truncate">{tournament.game_mode?.name || 'Game Mode'}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col items-start md:items-end">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
              Created by
            </p>
            <div className="flex items-center">
              <div className="h-8 w-8 rounded-full bg-gray-200 dark:bg-neutral-700 flex items-center justify-center mr-2">
                <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                  {tournament.creator?.username?.charAt(0).toUpperCase() || 'U'}
                </span>
              </div>
              <span className="text-sm font-medium text-gray-900 dark:text-white">
                {tournament.creator?.username || 'Unknown'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TournamentHeader;