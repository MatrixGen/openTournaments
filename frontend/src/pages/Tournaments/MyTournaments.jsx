import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Header from '../../components/layout/Header';
import { tournamentService } from '../../services/tournamentService';
import { useAuth } from '../../contexts/AuthContext';
import TournamentStats from '../../components/tournament/TournamentStats';
import FilterTabs from '../../components/tournament/FilterTabs';
import TournamentInfoCard from '../../components/tournament/TournamentInfoCard';
import TournamentSkeleton from '../../components/tournament/TournamentSkeleton';
import QuickTips from '../../components/tournament/QuickTips';
import EmptyState from '../../components/tournament/EmptyState';
import Banner from '../../components/common/Banner';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import { useConfirmDialog } from '../../hooks/useConfirmDialog';

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

  const { user } = useAuth();
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

  return (
    <div className="min-h-screen bg-neutral-900">
    
      <main className="mx-auto max-w-7xl py-4 sm:py-8 px-3 sm:px-6 lg:px-8">
        {/* Header Section */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-6 lg:mb-8 space-y-4 lg:space-y-0">
          <div className="w-full">
            <h1 className="text-1xl sm:text-1xl font-bold text-white">My Tournaments</h1>
            <p className="mt-1 sm:mt-2 text-sm sm:text-base text-gray-400">
              Manage and track your tournament progress
            </p>
          </div>
          <div className="flex space-x-2 sm:space-x-3 w-full lg:w-auto justify-end">
            <button
              onClick={loadMyTournaments}
              disabled={isLoading}
              className="bg-neutral-700 hover:bg-neutral-600 text-white font-medium py-2 px-3 sm:px-4 rounded disabled:opacity-50 flex items-center text-sm sm:text-base transition-colors"
            >
              {isLoading ? (
                <LoadingSpinner size="sm" className="mr-2" />
              ) : (
                <span className="mr-1 sm:mr-2">🔄</span>
              )}
              <span className="hidden sm:inline">Refresh</span>
              <span className="sm:hidden">Reload</span>
            </button>
            <Link
              to="/create-tournament"
              className="bg-primary-500 hover:bg-primary-600 text-white font-medium py-2 px-3 sm:px-4 rounded flex items-center text-sm sm:text-base transition-colors"
            >
              <span className="mr-1 sm:mr-2">➕</span>
              <span className="hidden sm:inline">Create New</span>
              <span className="sm:hidden">Create</span>
            </Link>
          </div>
        </div>

        {/* Stats Overview */}
        {filter === 'all' && <TournamentStats stats={stats} />}

        {/* Error Banner */}
        {error && (
          <Banner
            type="error"
            title="Action Failed"
            message={error}
            onClose={() => setError('')}
            className="mb-6"
          />
        )}

        {/* Success Banner */}
        {success && (
          <Banner
            type="success"
            title="Success!"
            message={success}
            onClose={() => setSuccess('')}
            className="mb-6"
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
            className="mb-6"
          />
        )}

        {/* Filter Tabs */}
        <FilterTabs 
          filter={filter} 
          setFilter={setFilter} 
          stats={stats} 
        />

        {/* Tournaments Grid */}
        {isLoading ? (
          <div className="space-y-3 sm:space-y-4">
            {[1, 2, 3].map((n) => (
              <TournamentSkeleton key={n} />
            ))}
          </div>
        ) : tournaments.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6">
            {tournaments.map((tournament) => (
              <TournamentInfoCard
                key={tournament.id}
                tournament={tournament}
                actionLoading={actionLoading}
                onAction={handleManagementAction}
              />
            ))}
          </div>
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
            className="mt-6"
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
            className="mt-6"
          />
        )}
      </main>

      {/* Reusable Confirmation Dialog */}
      <ConfirmDialog {...dialogProps} />
    </div>
  );
}
