import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { tournamentService } from '../../services/tournamentService';

import TournamentStats from '../../components/tournament/TournamentStats';
import FilterTabs from '../../components/tournament/FilterTabs';
import TournamentInfoCard from '../../components/tournament/TournamentInfoCard';
import TournamentSkeleton from '../../components/tournament/TournamentSkeleton';
import QuickTips from '../../components/tournament/QuickTips';
import EmptyState from '../../components/tournament/EmptyState';
import Banner from '../../components/common/Banner';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import { useConfirmDialog } from '../../hooks/useConfirmDialog';
import { 
  Trophy, 
  Plus, 
  RefreshCw, 
  Filter, 
  Calendar,
  Users,
  Award,
  TrendingUp,
  ChevronRight,
  BarChart3,
  Zap,
  Clock
} from 'lucide-react';

// Mobile Filter Drawer Component
const MobileFilterDrawer = ({ isOpen, onClose, filter, setFilter, stats }) => {
  const filterOptions = [
    { id: 'all', label: 'All', count: stats.total, icon: Trophy },
    { id: 'open', label: 'Open', count: stats.open, icon: Users },
    { id: 'live', label: 'Live', count: stats.live, icon: Zap },
    { id: 'completed', label: 'Completed', count: stats.completed, icon: Award },
    { id: 'cancelled', label: 'Cancelled', count: stats.cancelled, icon: Calendar },
  ];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 md:hidden">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-neutral-800 rounded-t-2xl shadow-xl p-4 max-h-[80vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Filter Tournaments</h3>
          <button
            onClick={onClose}
            className="p-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
          >
            <ChevronRight className="h-5 w-5 rotate-90" />
          </button>
        </div>
        <div className="space-y-2">
          {filterOptions.map((option) => (
            <button
              key={option.id}
              onClick={() => {
                setFilter(option.id);
                onClose();
              }}
              className={`w-full flex items-center justify-between p-3 rounded-lg transition-colors ${
                filter === option.id
                  ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400'
                  : 'hover:bg-gray-50 dark:hover:bg-neutral-700'
              }`}
            >
              <div className="flex items-center space-x-3">
                <div className={`p-2 rounded-lg ${
                  filter === option.id
                    ? 'bg-primary-100 dark:bg-primary-800'
                    : 'bg-gray-100 dark:bg-neutral-700'
                }`}>
                  <option.icon className={`h-4 w-4 ${
                    filter === option.id
                      ? 'text-primary-600 dark:text-primary-400'
                      : 'text-gray-500 dark:text-gray-400'
                  }`} />
                </div>
                <span className="font-medium text-gray-900 dark:text-white">{option.label}</span>
              </div>
              <span className={`px-2 py-1 text-xs rounded-full ${
                filter === option.id
                  ? 'bg-primary-100 dark:bg-primary-800 text-primary-600 dark:text-primary-400'
                  : 'bg-gray-100 dark:bg-neutral-700 text-gray-600 dark:text-gray-400'
              }`}>
                {option.count}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

// Mobile Stats Bar Component
const MobileStatsBar = ({ stats }) => {
  const statItems = [
    { label: 'Total', value: stats.total, color: 'text-blue-600 dark:text-blue-400' },
    { label: 'Live', value: stats.live, color: 'text-green-600 dark:text-green-400' },
    { label: 'Open', value: stats.open, color: 'text-purple-600 dark:text-purple-400' },
    { label: 'Completed', value: stats.completed, color: 'text-emerald-600 dark:text-emerald-400' },
  ];

  return (
    <div className="md:hidden mb-6">
      <div className="grid grid-cols-4 gap-2">
        {statItems.map((item, index) => (
          <div key={index} className="bg-white dark:bg-neutral-800 rounded-lg p-3 text-center">
            <p className={`text-lg font-bold ${item.color}`}>{item.value}</p>
            <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">{item.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default function MyTournaments() {
  const [tournaments, setTournaments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [filter, setFilter] = useState('all');
  const [actionLoading, setActionLoading] = useState(null);
  const [stats, setStats] = useState({
    total: 0,
    open: 0,
    live: 0,
    completed: 0,
    cancelled: 0
  });
  const [showMobileFilters, setShowMobileFilters] = useState(false);

  
  const { confirm, dialogProps } = useConfirmDialog();

  useEffect(() => {
    loadMyTournaments();
  }, [filter]);

  const loadMyTournaments = async () => {
    try {
      setIsLoading(true);
      let params = {};
      if (filter !== 'all') {
        params.status = filter;
      }

      const data = await tournamentService.getMyTournaments(params);
      setTournaments(data.tournaments || []);

      if (filter === 'all') {
        calculateStats(data.tournaments || []);
      } else {
        // Update stats for current filter only
        setStats(prev => ({
          ...prev,
          [filter]: data.tournaments?.length || 0
        }));
      }
    } catch (err) {
      console.error('Failed to load tournaments:', err);
      setError(err.response?.data?.message || 'Failed to load your tournaments');
    } finally {
      setIsLoading(false);
    }
  };

  const calculateStats = (tournaments) => {
    const stats = {
      total: tournaments.length,
      open: tournaments.filter(t => t.status === 'open').length,
      live: tournaments.filter(t => t.status === 'live').length,
      completed: tournaments.filter(t => t.status === 'completed').length,
      cancelled: tournaments.filter(t => t.status === 'cancelled').length
    };
    setStats(stats);
  };

  const handleManagementAction = async (actionType, tournamentId, tournamentName) => {
    setActionLoading(`${actionType}-${tournamentId}`);
    setError('');
    setSuccess('');

    try {
      const actions = {
        cancel: {
          message: `Are you sure you want to cancel "${tournamentName}"? This action cannot be undone.`,
          service: () => tournamentService.cancel(tournamentId)
        },
        start: {
          message: `Start tournament "${tournamentName}"? Participants will be notified.`,
          service: () => tournamentService.start(tournamentId)
        },
        finalize: {
          message: `Finalize results for "${tournamentName}"? This will distribute prizes and close the tournament.`,
          service: () => tournamentService.finalize(tournamentId)
        }
      };

      const action = actions[actionType];
      if (!action) return;

      const confirmed = await confirm({
        title: "Confirm Action",
        message: action.message,
        confirmText: "Yes, proceed",
        cancelText: "No, cancel"
      });

      if (!confirmed) {
        setActionLoading(null);
        return;
      }

      const response = await action.service();
      setSuccess(response.message || `Tournament ${actionType}ed successfully`);
      await loadMyTournaments();

    } catch (err) {
      console.error(`Failed to ${actionType} tournament:`, err);
      setError(err.response?.data?.message || `Failed to ${actionType} tournament. Please try again.`);
    } finally {
      setActionLoading(null);
    }
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
        filter={filter}
        setFilter={setFilter}
        stats={stats}
      />
      <MobileFAB />
      
      <main className="mx-auto max-w-7xl py-4 md:py-8 px-3 sm:px-4 lg:px-8">
        {/* Mobile Header */}
        <div className="md:hidden mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">My Tournaments</h1>
              <p className="text-gray-600 dark:text-gray-400 text-sm mt-0.5">
                Manage and track tournament progress
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setShowMobileFilters(true)}
                className="p-2 bg-white dark:bg-neutral-800 border border-gray-300 dark:border-neutral-700 rounded-lg"
              >
                <Filter className="h-5 w-5 text-gray-600 dark:text-gray-400" />
              </button>
              <button
                onClick={loadMyTournaments}
                disabled={isLoading}
                className="p-2 bg-white dark:bg-neutral-800 border border-gray-300 dark:border-neutral-700 rounded-lg disabled:opacity-50"
              >
                <RefreshCw className={`h-5 w-5 text-gray-600 dark:text-gray-400 ${isLoading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>
        </div>

        {/* Desktop Header */}
        <div className="hidden md:flex flex-col lg:flex-row justify-between items-start lg:items-center mb-6 lg:mb-8 space-y-4 lg:space-y-0">
          <div className="w-full">
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">My Tournaments</h1>
            <p className="mt-1 md:mt-2 text-sm md:text-base text-gray-600 dark:text-gray-400">
              Manage and track your tournament progress
            </p>
          </div>
          <div className="flex space-x-2 sm:space-x-3 w-full lg:w-auto justify-end">
            <button
              onClick={loadMyTournaments}
              disabled={isLoading}
              className="bg-gray-100 dark:bg-neutral-800 hover:bg-gray-200 dark:hover:bg-neutral-700 text-gray-900 dark:text-white font-medium py-2 px-3 sm:px-4 rounded-lg disabled:opacity-50 flex items-center text-sm sm:text-base transition-colors"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
              <span className="sm:hidden">Reload</span>
            </button>
            <Link
              to="/create-tournament"
              className="bg-primary-500 hover:bg-primary-600 text-grey font-medium py-2 px-3 sm:px-4 rounded-lg flex items-center text-sm sm:text-base transition-colors"
            >
              <Plus className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Create Tournament</span>
              <span className="sm:hidden">New</span>
            </Link>
          </div>
        </div>

        {/* Mobile Stats Bar */}
        {filter === 'all' && <MobileStatsBar stats={stats} />}

        {/* Desktop Stats Overview */}
        {filter === 'all' && <TournamentStats stats={stats} />}

        {/* Error Banner */}
        {error && (
          <Banner
            type="error"
            title="Action Failed"
            message={error}
            onClose={() => setError('')}
            className="mb-4 md:mb-6"
          />
        )}

        {/* Success Banner */}
        {success && (
          <Banner
            type="success"
            title="Success!"
            message={success}
            onClose={() => setSuccess('')}
            className="mb-4 md:mb-6"
          />
        )}

        {/* Info Banner for New Users */}
        {tournaments.length === 0 && !isLoading && (
          <Banner
            type="info"
            title="Ready to Create Your First Tournament?"
            message="Create a tournament to start competing with other players and win prizes!"
            action={{
              text: 'Create Tournament',
              to: '/create-tournament'
            }}
            className="mb-4 md:mb-6"
          />
        )}

        {/* Mobile Filter Tabs */}
        <div className="md:hidden mb-6 overflow-x-auto">
          <div className="flex space-x-2 pb-2 no-scrollbar">
            {[
              { id: 'all', label: 'All', icon: Trophy },
              { id: 'open', label: 'Open', icon: Users },
              { id: 'live', label: 'Live', icon: Zap },
              { id: 'completed', label: 'Completed', icon: Award },
              { id: 'cancelled', label: 'Cancelled', icon: Calendar },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setFilter(tab.id)}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg whitespace-nowrap transition-colors ${
                  filter === tab.id
                    ? 'bg-primary-500 text-blue'
                    : 'bg-white dark:bg-neutral-800 text-gray-700 dark:text-gray-300'
                }`}
              >
                <tab.icon className="h-4 w-4" />
                <span className="text-sm font-medium">{tab.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Desktop Filter Tabs */}
        <div className="hidden md:block mb-6">
          <FilterTabs 
            filter={filter} 
            setFilter={setFilter} 
            stats={stats} 
          />
        </div>

        {/* Tournaments Grid */}
        {isLoading ? (
          <div className="space-y-4 md:space-y-6">
            {[1, 2, 3].map((n) => (
              <TournamentSkeleton key={n} />
            ))}
          </div>
        ) : tournaments.length > 0 ? (
          <>
            {/* Mobile: List View */}
            <div className="md:hidden space-y-4">
              {tournaments.map((tournament) => (
                <div key={tournament.id} className="bg-white dark:bg-neutral-800 rounded-xl p-4 border border-gray-200 dark:border-neutral-700">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-white text-base truncate">
                        {tournament.name}
                      </h3>
                      <div className="flex items-center space-x-2 mt-1">
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          tournament.status === 'completed' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' :
                          tournament.status === 'live' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' :
                          tournament.status === 'open' ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400' :
                          'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400'
                        }`}>
                          {tournament.status}
                        </span>
                        <span className="text-gray-500 dark:text-gray-400 text-xs">
                          {tournament.game_type}
                        </span>
                      </div>
                    </div>
                    <span className="text-lg font-bold text-gray-900 dark:text-white">
                      ${tournament.entry_fee || 0}
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-gray-900 dark:text-white">
                        {tournament.current_slots || 0}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Players</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                        {tournament.entry_fee*tournament.total_slots || 0}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Prize</p>
                    </div>
                  </div>

                  <Link
                    to={`/tournaments/${tournament.id}`}
                    className="block w-full text-center bg-gray-100 dark:bg-neutral-700 hover:bg-gray-200 dark:hover:bg-neutral-600 text-gray-900 dark:text-white font-medium py-2 px-4 rounded-lg transition-colors text-sm"
                  >
                    View Details
                  </Link>
                </div>
              ))}
            </div>

            {/* Desktop: Grid View */}
            <div className="hidden md:grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-4 md:gap-6">
              {tournaments.map((tournament) => (
                <TournamentInfoCard
                  key={tournament.id}
                  tournament={tournament}
                  actionLoading={actionLoading}
                  onAction={handleManagementAction}
                />
              ))}
            </div>
          </>
        ) : (
          <EmptyState filter={filter} />
        )}

        {/* Quick Tips */}
        {tournaments.length > 0 && <QuickTips />}

        {/* Achievement Banner */}
        {tournaments.length >= 5 && (
          <Banner
            type="success"
            title="Tournament Pro!"
            message={`You've created ${tournaments.length} tournaments. Keep up the great work!`}
            className="mt-4 md:mt-6"
            icon={<TrendingUp className="h-5 w-5" />}
          />
        )}

        {/* Warning Banner for Live Tournaments */}
        {stats.live > 0 && (
          <Banner
            type="warning"
            title="Live Tournaments"
            message={`You have ${stats.live} tournament${stats.live > 1 ? 's' : ''} currently in progress. Make sure to monitor them closely.`}
            action={{
              text: 'View Live',
              onClick: () => setFilter('live')
            }}
            className="mt-4 md:mt-6"
            icon={<Clock className="h-5 w-5" />}
          />
        )}

        {/* Mobile Action Footer */}
        <div className="md:hidden mt-8 bg-white dark:bg-neutral-800 rounded-xl p-4 border border-gray-200 dark:border-neutral-700">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium text-gray-900 dark:text-white text-sm">Need Help?</h4>
              <p className="text-gray-500 dark:text-gray-400 text-xs mt-0.5">
                Check out our tournament guide
              </p>
            </div>
            <Link
              to="/help/tournaments"
              className="text-primary-600 dark:text-primary-500 hover:text-primary-700 dark:hover:text-primary-400 text-sm font-medium"
            >
              View Guide →
            </Link>
          </div>
        </div>
      </main>

      {/* Reusable Confirmation Dialog */}
      <ConfirmDialog {...dialogProps} />
      
      {/* Mobile bottom navigation spacer */}
      <div className="h-16 md:h-0"></div>
    </div>
  );
}