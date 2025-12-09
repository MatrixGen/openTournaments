import { useState, useEffect, useCallback } from 'react';
import { tournamentService } from '../../services/tournamentService';
import { Link } from 'react-router-dom';
import Banner from '../../components/common/Banner';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { 
  Plus, 
  Clock, 
  Users, 
  DollarSign, 
  Trophy, 
  Gamepad2,
  Calendar,
  Filter,
  TrendingUp,
  ChevronRight,
  Search,
  Star,
  Zap,
  AlertCircle,
  ChevronLeft,
  ChevronDown,
  X
} from 'lucide-react';
import { formatCurrency } from '../../utils/formatters';

// Mobile Filter Drawer Component
const MobileFilterDrawer = ({ isOpen, onClose, filters, onFilterChange, onReset }) => {
  const statusOptions = [
    { id: 'all', label: 'All Status', icon: Trophy },
    { id: 'ongoing', label: 'Ongoing', icon: Zap },
    { id: 'upcoming', label: 'Upcoming', icon: Calendar },
    { id: 'completed', label: 'Completed', icon: Trophy },
  ];

  const sortOptions = [
    { id: 'newest', label: 'Newest First' },
    { id: 'prize_high', label: 'Prize: High to Low' },
    { id: 'prize_low', label: 'Prize: Low to High' },
    { id: 'starting_soon', label: 'Starting Soon' },
  ];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 md:hidden">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-neutral-800 rounded-t-2xl shadow-xl max-h-[80vh] overflow-y-auto">
        <div className="p-4 border-b border-gray-200 dark:border-neutral-700">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Filter & Sort</h3>
            <button
              onClick={onClose}
              className="p-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          
          <div className="space-y-4">
            <div>
              <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">Status</h4>
              <div className="flex flex-wrap gap-2">
                {statusOptions.map((option) => (
                  <button
                    key={option.id}
                    onClick={() => onFilterChange('status', option.id)}
                    className={`px-3 py-2 rounded-lg text-sm flex items-center space-x-2 ${
                      filters.status === option.id
                        ? 'bg-primary-500 text-white'
                        : 'bg-gray-100 dark:bg-neutral-700 text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    <option.icon className="h-4 w-4" />
                    <span>{option.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">Sort By</h4>
              <div className="space-y-2">
                {sortOptions.map((option) => (
                  <button
                    key={option.id}
                    onClick={() => onFilterChange('sort', option.id)}
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm ${
                      filters.sort === option.id
                        ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400'
                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-neutral-700'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">Price Range</h4>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="number"
                  placeholder="Min"
                  value={filters.minPrice || ''}
                  onChange={(e) => onFilterChange('minPrice', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-neutral-600 rounded-lg bg-white dark:bg-neutral-700 text-gray-900 dark:text-white text-sm"
                />
                <input
                  type="number"
                  placeholder="Max"
                  value={filters.maxPrice || ''}
                  onChange={(e) => onFilterChange('maxPrice', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-neutral-600 rounded-lg bg-white dark:bg-neutral-700 text-gray-900 dark:text-white text-sm"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="p-4 space-y-3">
          <button
            onClick={onReset}
            className="w-full px-4 py-3 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-neutral-600 rounded-lg text-sm font-medium hover:bg-gray-50 dark:hover:bg-neutral-700"
          >
            Reset Filters
          </button>
          <button
            onClick={onClose}
            className="w-full px-4 py-3 bg-primary-500 text-white rounded-lg text-sm font-medium hover:bg-primary-600"
          >
            Apply Filters
          </button>
        </div>
      </div>
    </div>
  );
};

// Tournament Card Component
const TournamentCard = ({ tournament }) => {
  const getStatusConfig = (status) => {
    switch (status) {
      case 'ongoing':
        return {
          color: 'text-green-600 dark:text-green-400 bg-green-500/10 dark:bg-green-500/20 border-green-500/30',
          icon: Zap,
          label: 'Live'
        };
      case 'upcoming':
        return {
          color: 'text-blue-600 dark:text-blue-400 bg-blue-500/10 dark:bg-blue-500/20 border-blue-500/30',
          icon: Clock,
          label: 'Upcoming'
        };
      case 'completed':
        return {
          color: 'text-purple-600 dark:text-purple-400 bg-purple-500/10 dark:bg-purple-500/20 border-purple-500/30',
          icon: Trophy,
          label: 'Completed'
        };
      default:
        return {
          color: 'text-gray-600 dark:text-gray-400 bg-gray-500/10 dark:bg-gray-500/20 border-gray-500/30',
          icon: AlertCircle,
          label: status
        };
    }
  };

  const statusConfig = getStatusConfig(tournament.status);
  const Icon = statusConfig.icon;

  return (
    <div className="bg-white dark:bg-neutral-800 rounded-xl shadow-sm hover:shadow-md transition-shadow border border-gray-200 dark:border-neutral-700">
      {/* Tournament Header */}
      <div className="p-4 md:p-6 border-b border-gray-100 dark:border-neutral-700">
        <div className="flex justify-between items-start mb-3">
          <div className="flex-1 min-w-0 pr-2">
            <h3 className="text-base md:text-lg font-semibold text-gray-900 dark:text-white line-clamp-2">
              {tournament.name}
            </h3>
            <div className="flex items-center space-x-2 mt-1">
              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${statusConfig.color}`}>
                <Icon className="h-3 w-3 mr-1" />
                {statusConfig.label}
              </span>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {tournament.game_type || tournament.game?.name}
              </span>
            </div>
          </div>
          {tournament.is_featured && (
            <div className="flex-shrink-0">
              <Star className="h-5 w-5 text-yellow-500" />
            </div>
          )}
        </div>

        <div className="flex items-center">
          <div className="w-10 h-10 md:w-12 md:h-12 rounded-lg bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center flex-shrink-0 mr-3">
            <Gamepad2 className="h-5 w-5 md:h-6 md:w-6 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm text-gray-900 dark:text-white font-medium truncate">
              {tournament.game?.name || 'Tournament'}
            </p>
            <div className="flex items-center text-gray-500 dark:text-gray-400 text-xs">
              <Calendar className="h-3 w-3 mr-1 flex-shrink-0" />
              <span className="truncate">
                {new Date(tournament.start_time).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric'
                })}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Tournament Details */}
      <div className="p-4 md:p-6">
        <div className="grid grid-cols-2 gap-3 md:gap-4 mb-4">
          <div className="text-center">
            <div className="flex items-center justify-center space-x-1 mb-1">
              <DollarSign className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              <p className="text-lg md:text-xl font-bold text-gray-900 dark:text-white">
                {formatCurrency(tournament.entry_fee || 0)}
              </p>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">Entry Fee</p>
          </div>

          <div className="text-center">
            <div className="flex items-center justify-center space-x-1 mb-1">
              <Users className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              <p className="text-lg md:text-xl font-bold text-gray-900 dark:text-white">
                {tournament.current_participants || 0}/{tournament.max_participants || 0}
              </p>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">Players</p>
          </div>

          <div className="text-center">
            <div className="flex items-center justify-center space-x-1 mb-1">
              <Trophy className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
              <p className="text-lg md:text-xl font-bold text-emerald-600 dark:text-emerald-400">
                {formatCurrency(tournament.prize_pool || 0)}
              </p>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">Prize Pool</p>
          </div>

          <div className="text-center">
            <div className="flex items-center justify-center space-x-1 mb-1">
              <Clock className="h-4 w-4 text-purple-600 dark:text-purple-400" />
              <p className="text-lg md:text-xl font-bold text-gray-900 dark:text-white">
                {tournament.duration || '2h'}
              </p>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">Duration</p>
          </div>
        </div>

        <Link
          to={`/tournaments/${tournament.id}`}
          className="block w-full bg-primary-500 hover:bg-primary-600 text-white text-center font-medium py-3 rounded-lg transition-colors text-sm md:text-base"
        >
          View Tournament
        </Link>
      </div>
    </div>
  );
};

// Tournament Skeleton Component
const TournamentSkeleton = () => (
  <div className="bg-white dark:bg-neutral-800 rounded-xl p-4 md:p-6 border border-gray-200 dark:border-neutral-700 animate-pulse">
    <div className="flex justify-between items-start mb-4">
      <div className="h-5 bg-gray-200 dark:bg-neutral-700 rounded w-3/4"></div>
      <div className="h-5 bg-gray-200 dark:bg-neutral-700 rounded w-16"></div>
    </div>
    <div className="flex items-center mb-4">
      <div className="h-10 w-10 md:h-12 md:w-12 bg-gray-200 dark:bg-neutral-700 rounded-lg mr-3"></div>
      <div className="flex-1 min-w-0">
        <div className="h-4 bg-gray-200 dark:bg-neutral-700 rounded w-24 mb-2"></div>
        <div className="h-3 bg-gray-200 dark:bg-neutral-700 rounded w-16"></div>
      </div>
    </div>
    <div className="grid grid-cols-2 gap-3 md:gap-4 mb-4">
      {[1, 2, 3, 4].map((n) => (
        <div key={n} className="text-center">
          <div className="h-7 bg-gray-200 dark:bg-neutral-700 rounded mb-2"></div>
          <div className="h-3 bg-gray-200 dark:bg-neutral-700 rounded w-16 mx-auto"></div>
        </div>
      ))}
    </div>
    <div className="h-10 bg-gray-200 dark:bg-neutral-700 rounded"></div>
  </div>
);

export default function Tournaments() {
  const [tournaments, setTournaments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [activeTournaments, setActiveTournaments] = useState(0);
  const [filters, setFilters] = useState({
    status: 'all',
    sort: 'newest',
    minPrice: '',
    maxPrice: '',
    search: '',
  });

  const loadTournaments = useCallback(async () => {
    try {
      setIsLoading(true);
      setError('');
      
      // Convert filters to API params
      const params = {};
      if (filters.status !== 'all') params.status = filters.status;
      if (filters.sort) params.sort = filters.sort;
      if (filters.minPrice) params.min_price = filters.minPrice;
      if (filters.maxPrice) params.max_price = filters.maxPrice;
      if (filters.search) params.search = filters.search;

      const data = await tournamentService.getAll(params);
      setTournaments(data.tournaments || []);
      
      // Calculate active tournaments
      const ongoing = data.tournaments?.filter(t => t.status === 'ongoing').length || 0;
      setActiveTournaments(ongoing);
    } catch (err) {
      console.error('Tournaments loading error:', err);
      setError(err.response?.data?.message || 'Failed to load tournaments');
    } finally {
      setIsLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    loadTournaments();
  }, [loadTournaments]);

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleResetFilters = () => {
    setFilters({
      status: 'all',
      sort: 'newest',
      minPrice: '',
      maxPrice: '',
      search: '',
    });
  };

  // Mobile floating action button
  const MobileFAB = () => (
    <div className="fixed bottom-20 right-4 z-40 md:hidden">
      <Link
        to="/create-tournament"
        className="p-4 bg-primary-500 text-white rounded-full shadow-lg transform transition-all duration-200 hover:scale-105 hover:bg-primary-600"
      >
        <Plus className="h-6 w-6" />
      </Link>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-neutral-900 safe-padding">
      <MobileFilterDrawer
        isOpen={showMobileFilters}
        onClose={() => setShowMobileFilters(false)}
        filters={filters}
        onFilterChange={handleFilterChange}
        onReset={handleResetFilters}
      />
      <MobileFAB />
      
      <main className="mx-auto max-w-7xl py-4 md:py-8 px-3 sm:px-4 lg:px-8">
        {/* Mobile Header */}
        <div className="md:hidden mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">Tournaments</h1>
              <p className="text-gray-600 dark:text-gray-400 text-sm mt-0.5">
                Explore available tournaments
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setShowMobileFilters(true)}
                className="p-2 bg-white dark:bg-neutral-800 border border-gray-300 dark:border-neutral-700 rounded-lg"
              >
                <Filter className="h-5 w-5 text-gray-600 dark:text-gray-400" />
              </button>
            </div>
          </div>

          {/* Mobile Search */}
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search tournaments..."
              value={filters.search}
              onChange={(e) => handleFilterChange('search', e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-neutral-800 border border-gray-300 dark:border-neutral-700 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Desktop Header */}
        <div className="hidden md:flex flex-col lg:flex-row justify-between items-start lg:items-center mb-6 lg:mb-8 space-y-4 lg:space-y-0">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">Tournaments</h1>
            <p className="mt-1 md:mt-2 text-sm md:text-base text-gray-600 dark:text-gray-400">
              Explore all available tournaments
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search tournaments..."
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                className="pl-10 pr-4 py-2.5 bg-white dark:bg-neutral-800 border border-gray-300 dark:border-neutral-700 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-primary-500 focus:border-transparent w-64"
              />
            </div>
            <Link
              to="/create-tournament"
              className="flex items-center justify-center space-x-2 bg-primary-500 hover:bg-primary-600 text-white font-medium py-2.5 px-4 rounded-lg transition-colors"
            >
              <Plus className="h-4 w-4" />
              <span>Create Tournament</span>
            </Link>
          </div>
        </div>

        {/* Desktop Filter Bar */}
        <div className="hidden md:flex items-center justify-between mb-6">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-600 dark:text-gray-400">Filter by:</span>
              <select
                value={filters.status}
                onChange={(e) => handleFilterChange('status', e.target.value)}
                className="bg-white dark:bg-neutral-800 border border-gray-300 dark:border-neutral-700 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white"
              >
                <option value="all">All Status</option>
                <option value="ongoing">Ongoing</option>
                <option value="upcoming">Upcoming</option>
                <option value="completed">Completed</option>
              </select>
              <select
                value={filters.sort}
                onChange={(e) => handleFilterChange('sort', e.target.value)}
                className="bg-white dark:bg-neutral-800 border border-gray-300 dark:border-neutral-700 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white"
              >
                <option value="newest">Newest First</option>
                <option value="prize_high">Prize: High to Low</option>
                <option value="prize_low">Prize: Low to High</option>
                <option value="starting_soon">Starting Soon</option>
              </select>
            </div>
            <button
              onClick={handleResetFilters}
              className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-300"
            >
              Reset Filters
            </button>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Showing <span className="font-medium text-gray-900 dark:text-white">{tournaments.length}</span> tournaments
          </p>
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

        {/* Active Tournaments Alert */}
        {activeTournaments > 0 && (
          <Banner
            type="success"
            title="Live Tournaments Available!"
            message={`There ${activeTournaments === 1 ? 'is' : 'are'} ${activeTournaments} tournament${activeTournaments > 1 ? 's' : ''} currently in progress. Join now!`}
            icon={<Zap className="h-5 w-5" />}
            action={{
              text: 'View Live',
              onClick: () => handleFilterChange('status', 'ongoing')
            }}
            className="mb-6"
          />
        )}

        {/* Welcome Banner for New Users */}
        {tournaments.length === 0 && !isLoading && !error && (
          <Banner
            type="info"
            title="Welcome to Tournaments!"
            message="This is where you can find and join exciting gaming tournaments. Create your first tournament or join an existing one to get started."
            action={{
              text: 'Create Tournament',
              to: '/create-tournament'
            }}
            icon={<Trophy className="h-5 w-5" />}
            className="mb-6"
          />
        )}

        {/* Loading State */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
            {[1, 2, 3, 4, 5, 6].map((n) => (
              <TournamentSkeleton key={n} />
            ))}
          </div>
        ) : tournaments.length > 0 ? (
          <>
            {/* Mobile Results Count */}
            <div className="md:hidden flex justify-between items-center mb-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {tournaments.length} tournaments
              </p>
             
            </div>

            {/* Tournaments Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
              {tournaments.map((tournament) => (
                <TournamentCard key={tournament.id} tournament={tournament} />
              ))}
            </div>

            {/* Tournament Tips */}
            <div className="mt-6 md:mt-8 bg-gray-50 dark:bg-neutral-800 rounded-xl p-4 md:p-6 border border-gray-200 dark:border-neutral-700">
              <div className="flex items-center space-x-3 mb-3">
                <AlertCircle className="h-5 w-5 text-yellow-500" />
                <h3 className="text-sm font-medium text-gray-900 dark:text-white">Tournament Tips</h3>
              </div>
              <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                <li className="flex items-start">
                  <span className="text-primary-500 mr-2">•</span>
                  Make sure to read the rules before joining
                </li>
                <li className="flex items-start">
                  <span className="text-primary-500 mr-2">•</span>
                  Check your schedule to ensure you can participate
                </li>
                <li className="flex items-start">
                  <span className="text-primary-500 mr-2">•</span>
                  Ensure sufficient wallet balance for entry fees
                </li>
              </ul>
            </div>
          </>
        ) : (
          <div className="text-center py-12 md:py-16 bg-white dark:bg-neutral-800 rounded-xl border border-gray-200 dark:border-neutral-700">
            <div className="mx-auto w-16 h-16 md:w-20 md:h-20 rounded-full bg-gray-100 dark:bg-neutral-700 flex items-center justify-center mb-4">
              <Trophy className="h-8 w-8 md:h-10 md:w-10 text-gray-400 dark:text-gray-500" />
            </div>
            <h3 className="text-lg md:text-xl font-medium text-gray-900 dark:text-white mb-2">
              No tournaments found
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-md mx-auto px-4 text-sm md:text-base">
              There are no tournaments matching your criteria. Try adjusting your filters or create the first one!
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link
                to="/create-tournament"
                className="inline-flex items-center justify-center bg-primary-500 hover:bg-primary-600 text-white font-medium py-2.5 px-4 rounded-lg transition-colors text-sm md:text-base"
              >
                <Plus className="h-4 w-4 mr-2" />
                Create Tournament
              </Link>
              <button
                onClick={handleResetFilters}
                className="inline-flex items-center justify-center bg-gray-100 dark:bg-neutral-700 hover:bg-gray-200 dark:hover:bg-neutral-600 text-gray-900 dark:text-white font-medium py-2.5 px-4 rounded-lg transition-colors text-sm md:text-base"
              >
                Clear Filters
              </button>
            </div>
          </div>
        )}

        {/* Mobile Quick Stats */}
        <div className="md:hidden mt-6 bg-white dark:bg-neutral-800 rounded-xl p-4 border border-gray-200 dark:border-neutral-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Active Now</p>
              <p className="text-lg font-bold text-gray-900 dark:text-white">{activeTournaments}</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-600 dark:text-gray-400">Total</p>
              <p className="text-lg font-bold text-gray-900 dark:text-white">{tournaments.length}</p>
            </div>
          </div>
        </div>

        {/* Mobile bottom navigation spacer */}
        <div className="h-16 md:h-0"></div>
      </main>
    </div>
  );
}