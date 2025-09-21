import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Header from '../components/layout/Header';
import { tournamentService } from '../services/tournamentService';
import { dataService } from '../services/dataService';
import { FunnelIcon, XMarkIcon } from '@heroicons/react/24/outline'; // Add Heroicons

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
  const [showFilters, setShowFilters] = useState(false); // new state

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
      case 'upcoming': return 'bg-blue-500/20 text-blue-300';
      case 'ongoing': return 'bg-green-500/20 text-green-300';
      case 'completed': return 'bg-purple-500/20 text-purple-300';
      case 'cancelled': return 'bg-red-500/20 text-red-300';
      default: return 'bg-gray-500/20 text-gray-300';
    }
  };

  return (
    <div className="min-h-screen bg-neutral-900">
      <Header />
      <main className="mx-auto max-w-7xl py-8 px-4 sm:px-6 lg:px-8">
        {/* Title + Filter toggle button */}
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-white">Browse Tournaments</h1>
          <button
            onClick={() => setShowFilters(prev => !prev)}
            className="p-2 rounded bg-neutral-800 hover:bg-neutral-700 transition"
            aria-label="Toggle Filters"
          >
            {showFilters ? (
              <XMarkIcon className="h-5 w-5 text-white" />
            ) : (
              <FunnelIcon className="h-5 w-5 text-white" />
            )}
          </button>
        </div>

        {/* Filters Section (conditionally rendered) */}
        {showFilters && (
          <div className="bg-neutral-800 rounded-lg p-6 mb-8 transition-all duration-300">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-white">Filters</h2>
              <button
                onClick={clearFilters}
                className="text-primary-500 hover:text-primary-400 text-sm font-medium"
              >
                Clear All
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-white mb-1">Status</label>
                <select
                  value={filters.status}
                  onChange={(e) => handleFilterChange('status', e.target.value)}
                  className="w-full rounded-md border border-neutral-600 bg-neutral-700 py-2 px-3 text-white"
                >
                  <option value="upcoming">Upcoming</option>
                  <option value="ongoing">Ongoing</option>
                  <option value="completed">Completed</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-white mb-1">Game</label>
                <select
                  value={filters.game}
                  onChange={(e) => handleFilterChange('game', e.target.value)}
                  className="w-full rounded-md border border-neutral-600 bg-neutral-700 py-2 px-3 text-white"
                >
                  <option value="">All Games</option>
                  {games.map(game => (
                    <option key={game.id} value={game.id}>{game.name}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-white mb-1">Platform</label>
                <select
                  value={filters.platform}
                  onChange={(e) => handleFilterChange('platform', e.target.value)}
                  className="w-full rounded-md border border-neutral-600 bg-neutral-700 py-2 px-3 text-white"
                >
                  <option value="">All Platforms</option>
                  {platforms.map(platform => (
                    <option key={platform.id} value={platform.id}>{platform.name}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-white mb-1">Search</label>
                <input
                  type="text"
                  value={filters.search}
                  onChange={(e) => handleFilterChange('search', e.target.value)}
                  placeholder="Search tournaments..."
                  className="w-full rounded-md border border-neutral-600 bg-neutral-700 py-2 px-3 text-white"
                />
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="mb-6 rounded-md bg-red-800/50 py-3 px-4 text-sm text-red-200">
            {error}
          </div>
        )}

        {/* Tournaments Grid */}
        {tournaments.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {tournaments.map((tournament) => (
              <div key={tournament.id} className="bg-neutral-800 rounded-lg shadow p-6 hover:bg-neutral-750 transition-colors">
                <div className="flex justify-between items-start mb-4">
                  <h3 className="text-lg font-semibold text-white">{tournament.name}</h3>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadgeClass(tournament.status)}`}>
                    {tournament.status}
                  </span>
                </div>
                
                <div className="flex items-center mb-4">
                  <img
                    src={tournament.game.logo_url}
                    alt={tournament.game.name}
                    className="h-10 w-10 rounded-md mr-3"
                  />
                  <div>
                    <p className="text-white">{tournament.game.name}</p>
                    <p className="text-gray-400 text-sm">{tournament.platform.name}</p>
                  </div>
                </div>
                
                <div className="space-y-2 mb-4">
                  <p className="text-gray-400 text-sm"><span className="text-white">Entry Fee: </span> ${tournament.entry_fee}</p>
                  <p className="text-gray-400 text-sm"><span className="text-white">Players: </span> {tournament.current_slots}/{tournament.total_slots}</p>
                  <p className="text-gray-400 text-sm"><span className="text-white">Format: </span> {tournament.format.replace('_', ' ')}</p>
                  <p className="text-gray-400 text-sm"><span className="text-white">Starts: </span> {new Date(tournament.start_time).toLocaleDateString()}</p>
                </div>
                
                <Link
                  to={`/tournaments/${tournament.id}`}
                  className="block w-full bg-primary-500 hover:bg-primary-600 text-white text-center font-medium py-2 px-4 rounded"
                >
                  View Tournament
                </Link>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="mx-auto h-24 w-24 rounded-full bg-neutral-800 flex items-center justify-center mb-4">
              <svg className="h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-white">No tournaments found</h3>
            <p className="mt-2 text-gray-400">
              {filters.search || filters.game || filters.platform || filters.status !== 'upcoming'
                ? "Try adjusting your filters to see more results."
                : "There are no tournaments available at the moment."}
            </p>
            <button
              onClick={clearFilters}
              className="mt-4 text-primary-500 hover:text-primary-400 text-sm font-medium"
            >
              Clear all filters
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
