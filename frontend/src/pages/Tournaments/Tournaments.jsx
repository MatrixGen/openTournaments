import { useState, useEffect } from 'react';
import Header from '../../components/layout/Header';
import { tournamentService } from '../../services/tournamentService';
import { Link } from 'react-router-dom';
import { 
  PlusIcon,
  ClockIcon,
  UserGroupIcon,
  CurrencyDollarIcon,
  TrophyIcon
} from '@heroicons/react/24/outline';
import Banner from '../../components/common/Banner';


export default function Tournaments() {
  const [tournaments, setTournaments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadTournaments();
  }, []);

  const loadTournaments = async () => {
    try {
      const data = await tournamentService.getAll();
      setTournaments(data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load tournaments');
      console.error('Tournaments loading error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'upcoming': return 'bg-blue-500/20 text-blue-300 border border-blue-500/30';
      case 'ongoing': return 'bg-green-500/20 text-green-300 border border-green-500/30';
      case 'completed': return 'bg-purple-500/20 text-purple-300 border border-purple-500/30';
      case 'cancelled': return 'bg-red-500/20 text-red-300 border border-red-500/30';
      default: return 'bg-gray-500/20 text-gray-300 border border-gray-500/30';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'upcoming': return '⏰';
      case 'ongoing': return '🔴';
      case 'completed': return '🏆';
      case 'cancelled': return '❌';
      default: return '⚪';
    }
  };

  const TournamentCardSkeleton = () => (
    <div className="bg-neutral-800 rounded-xl shadow-lg p-4 sm:p-6 animate-pulse">
      <div className="flex justify-between items-start mb-4">
        <div className="h-6 bg-neutral-700 rounded w-3/4"></div>
        <div className="h-6 bg-neutral-700 rounded w-16"></div>
      </div>
      <div className="flex items-center mb-4">
        <div className="h-10 w-10 sm:h-12 sm:w-12 bg-neutral-700 rounded-lg mr-3"></div>
        <div className="flex-1 min-w-0">
          <div className="h-4 bg-neutral-700 rounded w-24 mb-2"></div>
          <div className="h-3 bg-neutral-700 rounded w-16"></div>
        </div>
      </div>
      <div className="space-y-2 mb-4">
        <div className="h-3 bg-neutral-700 rounded w-full"></div>
        <div className="h-3 bg-neutral-700 rounded w-2/3"></div>
      </div>
      <div className="h-10 bg-neutral-700 rounded"></div>
    </div>
  );

  if (isLoading) {
    return (
      <div className="min-h-screen bg-neutral-900">
        
        <main className="mx-auto max-w-7xl py-6 sm:py-8 px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-8 space-y-4 lg:space-y-0">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-white">Tournaments</h1>
              <p className="mt-1 sm:mt-2 text-sm sm:text-base text-gray-400">
                Explore all available tournaments
              </p>
            </div>
            <div className="h-10 bg-neutral-800 rounded-lg w-48 animate-pulse"></div>
          </div>
          
          {/* Loading Banner */}
          <Banner
            type="info"
            message="Loading tournaments..."
            className="mb-6"
          />
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {[1, 2, 3, 4, 5, 6].map((n) => (
              <TournamentCardSkeleton key={n} />
            ))}
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-900">
      
      <main className="mx-auto max-w-7xl py-6 sm:py-8 px-4 sm:px-6 lg:px-8">
        {/* Header Section */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-6 lg:mb-8 space-y-4 lg:space-y-0">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white">Tournaments</h1>
            <p className="mt-1 sm:mt-2 text-sm sm:text-base text-gray-400">
              Explore all available tournaments
            </p>
          </div>
          <Link
            to="/create-tournament"
            className="flex items-center justify-center space-x-2 bg-primary-500 hover:bg-primary-600 text-white font-medium py-2.5 sm:py-3 px-4 sm:px-6 rounded-lg transition-colors w-full lg:w-auto"
          >
            <PlusIcon className="h-4 w-4 sm:h-5 sm:w-5" />
            <span>Create Tournament</span>
          </Link>
        </div>

        {/* Error Banner */}
        {error && (
          <Banner
            type="error"
            title="Failed to Load Tournaments"
            message={error}
            onClose={() => setError('')}
            action={{
              text: 'Try Again',
              onClick: loadTournaments
            }}
            className="mb-6"
          />
        )}

        {/* Welcome Banner for New Users */}
        {tournaments.length === 0 && !error && (
          <Banner
            type="info"
            title="Welcome to Tournaments!"
            message="This is where you can find and join exciting gaming tournaments. Create your first tournament or join an existing one to get started."
            action={{
              text: 'Learn More',
              to: '/how-it-works'
            }}
            className="mb-6"
          />
        )}

        {/* Results Count */}
        <div className="flex justify-between items-center mb-4 sm:mb-6">
          <p className="text-gray-400 text-sm sm:text-base">
            Showing <span className="text-white font-medium">{tournaments.length}</span> tournaments
          </p>
          <Link
            to="/browse-matches"
            className="text-primary-500 hover:text-primary-400 text-sm font-medium transition-colors"
          >
            Advanced Filters →
          </Link>
        </div>

        {/* Tournaments Grid */}
        {tournaments.length > 0 ? (
          <>
            {/* Active Tournaments Info */}
            {tournaments.filter(t => t.status === 'ongoing').length > 0 && (
              <Banner
                type="success"
                title="Live Tournaments Available!"
                message={`There are ${tournaments.filter(t => t.status === 'ongoing').length} tournaments currently in progress. Join now!`}
                className="mb-6"
              />
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {tournaments.map((tournament) => (
                <div key={tournament.id} className="bg-neutral-800 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 hover:transform hover:scale-105 border border-neutral-700">
                  {/* Tournament Header */}
                  <div className="p-4 sm:p-6 border-b border-neutral-700">
                    <div className="flex justify-between items-start mb-3 sm:mb-4 gap-2">
                      <h3 className="text-base sm:text-lg font-semibold text-white line-clamp-2 flex-1 min-w-0">
                        {tournament.name}
                      </h3>
                      <span className={`inline-flex items-center px-2 py-1 sm:px-3 sm:py-1 rounded-full text-xs font-medium flex-shrink-0 ${getStatusBadgeClass(tournament.status)}`}>
                        <span className="hidden sm:inline mr-1">{getStatusIcon(tournament.status)}</span>
                        {tournament.status}
                      </span>
                    </div>
                    
                    <div className="flex items-center">
                      <img
                        src={tournament.game.logo_url}
                        alt={tournament.game.name}
                        className="h-10 w-10 sm:h-12 sm:w-12 rounded-lg mr-3 flex-shrink-0"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-white font-medium text-sm sm:text-base truncate">
                          {tournament.game.name}
                        </p>
                        <p className="text-gray-400 text-xs sm:text-sm truncate">
                          {tournament.platform?.name || 'Multiplatform'}
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  {/* Tournament Details */}
                  <div className="p-4 sm:p-6">
                    <div className="grid grid-cols-2 gap-3 sm:gap-4 mb-4">
                      <div className="flex items-center text-xs sm:text-sm">
                        <CurrencyDollarIcon className="h-3 w-3 sm:h-4 sm:w-4 text-green-400 mr-1 sm:mr-2 flex-shrink-0" />
                        <div className="min-w-0">
                          <div className="text-gray-400">Entry Fee</div>
                          <div className="text-white font-medium truncate">${tournament.entry_fee}</div>
                        </div>
                      </div>
                      <div className="flex items-center text-xs sm:text-sm">
                        <UserGroupIcon className="h-3 w-3 sm:h-4 sm:w-4 text-blue-400 mr-1 sm:mr-2 flex-shrink-0" />
                        <div className="min-w-0">
                          <div className="text-gray-400">Players</div>
                          <div className="text-white font-medium truncate">
                            {tournament.current_slots}/{tournament.total_slots}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center text-xs sm:text-sm">
                        <TrophyIcon className="h-3 w-3 sm:h-4 sm:w-4 text-yellow-400 mr-1 sm:mr-2 flex-shrink-0" />
                        <div className="min-w-0">
                          <div className="text-gray-400">Prize Pool</div>
                          <div className="text-white font-medium truncate">
                            ${tournament.entry_fee * tournament.total_slots}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center text-xs sm:text-sm">
                        <ClockIcon className="h-3 w-3 sm:h-4 sm:w-4 text-purple-400 mr-1 sm:mr-2 flex-shrink-0" />
                        <div className="min-w-0">
                          <div className="text-gray-400">Starts</div>
                          <div className="text-white font-medium text-xs truncate">
                            {new Date(tournament.start_time).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <Link
                      to={`/tournaments/${tournament.id}`}
                      className="block w-full bg-primary-500 hover:bg-primary-600 text-white text-center font-medium py-2.5 sm:py-3 px-4 rounded-lg transition-colors text-sm sm:text-base"
                    >
                      View Tournament
                    </Link>
                  </div>
                </div>
              ))}
            </div>

            {/* Tournament Tips Banner */}
            <Banner
              type="info"
              title="Tournament Tips"
              message="Make sure to read the rules before joining. Check your schedule to ensure you can participate in the entire tournament."
              className="mt-6"
            />
          </>
        ) : (
          <div className="text-center py-12 sm:py-16 bg-neutral-800 rounded-xl border border-neutral-700">
            <div className="mx-auto h-16 w-16 sm:h-20 sm:w-20 rounded-full bg-neutral-700 flex items-center justify-center mb-4">
              <TrophyIcon className="h-8 w-8 sm:h-10 sm:w-10 text-gray-400" />
            </div>
            <h3 className="text-lg sm:text-xl font-medium text-white mb-2">No tournaments found</h3>
            <p className="text-gray-400 mb-6 max-w-md mx-auto text-sm sm:text-base px-4">
              There are no tournaments available at the moment. Be the first to create one!
            </p>
            <Link
              to="/create-tournament"
              className="inline-flex items-center px-4 sm:px-6 py-2 sm:py-3 border border-transparent rounded-lg shadow-sm text-sm sm:text-base font-medium text-white bg-primary-500 hover:bg-primary-600 transition-colors"
            >
              Create First Tournament
            </Link>
          </div>
        )}
      </main>

      <style jsx>{`
        .line-clamp-2 {
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
      `}</style>
    </div>
  );
}