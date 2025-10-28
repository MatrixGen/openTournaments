import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Header from '../components/layout/Header';
import { tournamentService } from '../services/tournamentService';
import { dataService } from '../services/dataService';
import { 
  FunnelIcon, 
  XMarkIcon, 
  MagnifyingGlassIcon,
  ClockIcon,
  UserGroupIcon,
  CurrencyDollarIcon,
  TrophyIcon
} from '@heroicons/react/24/outline';

export default function BrowseMatches() {
  const [tournaments, setTournaments] = useState([]);
  const [games, setGames] = useState([]);
  const [platforms, setPlatforms] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState({
    game: '',
    platform: '',
    status: 'upcoming',
    search: ''
  });
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    loadTournaments();
  }, [filters]);

  const loadInitialData = async () => {
    try {
      const [gamesData, platformsData] = await Promise.all([
        dataService.getGames(),
        dataService.getPlatforms()
      ]);
      setGames(gamesData);
      setPlatforms(platformsData);
    } catch (err) {
      console.error('Failed to load initial data:', err);
    }
  };

  const loadTournaments = async () => {
    try {
      setIsLoading(true);
      const params = {
        status: filters.status,
        game_id: filters.game,
        platform_id: filters.platform,
        search: filters.search
      };
      Object.keys(params).forEach(key => {
        if (params[key] === '' || params[key] === null) delete params[key];
      });
      const data = await tournamentService.getAll(params);
      setTournaments(data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load tournaments');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const clearFilters = () => {
    setFilters({
      game: '',
      platform: '',
      status: 'upcoming',
      search: ''
    });
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

  const activeFilterCount = Object.values(filters).filter(value => 
    value !== '' && value !== 'upcoming'
  ).length;

  return (
    <div className="min-h-screen bg-neutral-900">
      
      <main className="mx-auto max-w-7xl py-4 sm:py-6 lg:py-8 px-3 sm:px-4 lg:px-6">
        {/* Header Section - Fixed for mobile */}
        <div className="flex flex-col space-y-4 mb-6 lg:mb-8">
          <div className="text-center lg:text-left">
            <h1 className="text-1xl sm:text-3xl font-bold text-white">Browse Tournaments</h1>
            <p className="mt-1 sm:mt-2 text-sm sm:text-base text-gray-400">
              Find and join exciting gaming tournaments
            </p>
          </div>
          
          {/* Search and Filter Controls - Stack on mobile */}
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Search Bar - Full width on mobile */}
            <div className="relative flex-1">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 sm:h-5 sm:w-5 text-gray-400" />
              <input
                type="text"
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                placeholder="Search tournaments..."
                className="w-full pl-10 pr-4 py-2 sm:py-2.5 bg-neutral-800 border border-neutral-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-primary-500 text-sm sm:text-base"
              />
            </div>

            {/* Filter Toggle Button - Auto width */}
            <button
              onClick={() => setShowFilters(prev => !prev)}
              className={`flex items-center justify-center space-x-2 px-4 py-2 sm:py-2.5 rounded-lg transition-colors whitespace-nowrap ${
                showFilters ? 'bg-primary-500 text-white' : 'bg-neutral-800 text-gray-300 hover:bg-neutral-700'
              }`}
            >
              <FunnelIcon className="h-4 w-4 sm:h-5 sm:w-5" />
              <span className="text-sm sm:text-base">Filters</span>
              {activeFilterCount > 0 && (
                <span className="bg-primary-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                  {activeFilterCount}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Filters Section - Improved mobile layout */}
        {showFilters && (
          <div className="bg-neutral-800 rounded-xl shadow-lg p-4 sm:p-6 mb-6 lg:mb-8 animate-slide-down">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 sm:mb-6 gap-3 sm:gap-0">
              <h2 className="text-lg sm:text-xl font-semibold text-white">Filter Tournaments</h2>
              <div className="flex space-x-3 self-end sm:self-auto">
                <button
                  onClick={clearFilters}
                  className="text-gray-400 hover:text-white text-sm font-medium transition-colors"
                >
                  Clear All
                </button>
                <button
                  onClick={() => setShowFilters(false)}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <XMarkIcon className="h-5 w-5" />
                </button>
              </div>
            </div>
            
            {/* Filter Grid - Stack on mobile, 2 columns on medium, 4 on large */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
              <div>
                <label className="block text-sm font-medium text-white mb-2 sm:mb-3">Status</label>
                <select
                  value={filters.status}
                  onChange={(e) => handleFilterChange('status', e.target.value)}
                  className="w-full rounded-lg border border-neutral-700 bg-neutral-900 py-2.5 sm:py-3 px-3 sm:px-4 text-white focus:outline-none focus:border-primary-500 transition-colors text-sm sm:text-base"
                >
                  <option value="upcoming">Upcoming</option>
                  <option value="ongoing">Live Now</option>
                  <option value="completed">Completed</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-white mb-2 sm:mb-3">Game</label>
                <select
                  value={filters.game}
                  onChange={(e) => handleFilterChange('game', e.target.value)}
                  className="w-full rounded-lg border border-neutral-700 bg-neutral-900 py-2.5 sm:py-3 px-3 sm:px-4 text-white focus:outline-none focus:border-primary-500 transition-colors text-sm sm:text-base"
                >
                  <option value="">All Games</option>
                  {games.map(game => (
                    <option key={game.id} value={game.id}>{game.name}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-white mb-2 sm:mb-3">Platform</label>
                <select
                  value={filters.platform}
                  onChange={(e) => handleFilterChange('platform', e.target.value)}
                  className="w-full rounded-lg border border-neutral-700 bg-neutral-900 py-2.5 sm:py-3 px-3 sm:px-4 text-white focus:outline-none focus:border-primary-500 transition-colors text-sm sm:text-base"
                >
                  <option value="">All Platforms</option>
                  {platforms.map(platform => (
                    <option key={platform.id} value={platform.id}>{platform.name}</option>
                  ))}
                </select>
              </div>
              
              <div className="flex items-end">
                <button
                  onClick={loadTournaments}
                  className="w-full bg-primary-500 hover:bg-primary-600 text-white font-medium py-2.5 sm:py-3 px-4 sm:px-6 rounded-lg transition-colors text-sm sm:text-base"
                >
                  Apply Filters
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="mb-4 sm:mb-6 rounded-lg bg-red-800/50 border border-red-600/50 py-3 px-4 text-sm text-red-200 flex items-center">
            <span className="mr-2">⚠️</span>
            {error}
          </div>
        )}

        {/* Results Count */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 sm:mb-6 gap-2 sm:gap-0">
          <p className="text-gray-400 text-sm sm:text-base">
            Showing <span className="text-white font-medium">{tournaments.length}</span> tournaments
          </p>
          {activeFilterCount > 0 && (
            <button
              onClick={clearFilters}
              className="text-primary-500 hover:text-primary-400 text-sm font-medium transition-colors"
            >
              Clear all filters
            </button>
          )}
        </div>

        {/* Tournaments Grid - Proper mobile grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {[1, 2, 3, 4, 5, 6].map((n) => (
              <TournamentCardSkeleton key={n} />
            ))}
          </div>
        ) : tournaments.length > 0 ? (
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
                      <p className="text-white font-medium text-sm sm:text-base truncate">{tournament.game.name}</p>
                      <p className="text-gray-400 text-xs sm:text-sm truncate">{tournament.platform.name}</p>
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
                        <div className="text-white font-medium truncate">{tournament.current_slots}/{tournament.total_slots}</div>
                      </div>
                    </div>
                    <div className="flex items-center text-xs sm:text-sm">
                      <TrophyIcon className="h-3 w-3 sm:h-4 sm:w-4 text-yellow-400 mr-1 sm:mr-2 flex-shrink-0" />
                      <div className="min-w-0">
                        <div className="text-gray-400">Prize Pool</div>
                        <div className="text-white font-medium truncate">${tournament.entry_fee * tournament.total_slots}</div>
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
        ) : (
          <div className="text-center py-12 sm:py-16 bg-neutral-800 rounded-xl border border-neutral-700">
            <div className="mx-auto h-16 w-16 sm:h-20 sm:w-20 rounded-full bg-neutral-700 flex items-center justify-center mb-4">
              <TrophyIcon className="h-8 w-8 sm:h-10 sm:w-10 text-gray-400" />
            </div>
            <h3 className="text-lg sm:text-xl font-medium text-white mb-2">No tournaments found</h3>
            <p className="text-gray-400 mb-6 max-w-md mx-auto text-sm sm:text-base px-4">
              {filters.search || filters.game || filters.platform || filters.status !== 'upcoming'
                ? "Try adjusting your filters to see more results."
                : "There are no tournaments available at the moment. Check back later!"}
            </p>
            <button
              onClick={clearFilters}
              className="inline-flex items-center px-4 sm:px-6 py-2 sm:py-3 border border-transparent rounded-lg shadow-sm text-sm sm:text-base font-medium text-white bg-primary-500 hover:bg-primary-600 transition-colors"
            >
              Clear Filters
            </button>
          </div>
        )}
      </main>

      <style jsx>{`
        .animate-slide-down {
          animation: slideDown 0.3s ease-out;
        }
        
        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
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