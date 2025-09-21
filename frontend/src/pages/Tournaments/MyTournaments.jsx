import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Header from '../../components/layout/Header';
import { tournamentService } from '../../services/tournamentService';
import { useAuth } from '../../contexts/AuthContext';

export default function MyTournaments() {
  const [tournaments, setTournaments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [filter, setFilter] = useState('all');
  const [actionLoading, setActionLoading] = useState(null); // Track which tournament action is loading

  const { user } = useAuth();

  useEffect(() => {
    loadMyTournaments();
  }, [filter]);

  const loadMyTournaments = async () => {
    try {
      let params = {};
      if (filter !== 'all') {
        params.status = filter;
      }
      
      const data = await tournamentService.getMyTournaments(params);
      
      setTournaments(data.tournaments)
    } catch (err) {
      console.error('Failed to load tournaments:', err);
      setError(err.response?.data?.message || 'Failed to load your tournaments');
    } finally {
      setIsLoading(false);
    }
  };

  const handleManagementAction = async (actionType, tournamentId) => {
    setActionLoading(`${actionType}-${tournamentId}`);
    setError('');
    setSuccess('');

    try {
      let response;
      switch (actionType) {
        case 'cancel':
          if (!window.confirm('Are you sure you want to cancel this tournament? This action cannot be undone.')) {
            setActionLoading(null);
            return;
          }
          response = await tournamentService.cancel(tournamentId);
          break;
        case 'start':
          response = await tournamentService.start(tournamentId);
          break;
        case 'finalize':
          response = await tournamentService.finalize(tournamentId);
          break;
        default:
          return;
      }
      
      setSuccess(response.message || `Tournament ${actionType}ed successfully`);
      
      // Reload tournaments to reflect changes
      await loadMyTournaments();
    } catch (err) {
      console.error(`Failed to ${actionType} tournament:`, err);
      setError(err.response?.data?.message || `Failed to ${actionType} tournament. Please try again.`);
    } finally {
      setActionLoading(null);
    }
  };

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'open': return 'bg-blue-500/20 text-blue-300';
      case 'live': return 'bg-green-500/20 text-green-300';
      case 'completed': return 'bg-purple-500/20 text-purple-300';
      case 'cancelled': return 'bg-red-500/20 text-red-300';
      default: return 'bg-gray-500/20 text-gray-300';
    }
  };

  const canStartTournament = (tournament) => {
    return tournament.current_slots>=2 && tournament.status ==='open';
  };

  const canFinalizeTournament = (tournament) => {
    return tournament.status === 'live'&& tournament.current_slots <2;
  };

  const canCancelTournament = (tournament) => {
    return tournament.current_slots<=1 && tournament.status ==='open';
  };

  const isActionLoading = (actionType, tournamentId) => {
    return actionLoading === `${actionType}-${tournamentId}`;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-neutral-900">
        <Header />
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-900">
      <Header />
      <main className="mx-auto max-w-7xl py-8 px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white">My Tournaments</h1>
            <p className="mt-2 text-gray-400">Manage tournaments you've created</p>
          </div>
          <Link
            to="/create-tournament"
            className="bg-primary-500 hover:bg-primary-600 text-white font-medium py-2 px-4 rounded"
          >
            Create New
          </Link>
        </div>

        {error && (
          <div className="mb-6 rounded-md bg-red-800/50 py-3 px-4 text-sm text-red-200">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-6 rounded-md bg-green-800/50 py-3 px-4 text-sm text-green-200">
            {success}
          </div>
        )}

        {/* Filter Tabs */}
        <div className="mb-6 border-b border-neutral-700">
        <nav className="-mb-px flex space-x-8 overflow-x-auto whitespace-nowrap scrollbar-hide">
            {['all', 'upcoming', 'ongoing', 'completed', 'cancelled'].map((tab) => (
            <button
                key={tab}
                onClick={() => setFilter(tab)}
                className={`py-4 px-1 text-sm font-medium border-b-2 ${
                filter === tab
                    ? 'border-primary-500 text-primary-500'
                    : 'border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-300'
                } capitalize`}
            >
                {tab}
            </button>
            ))}
        </nav>
        </div>


        {/* Tournaments List */}
        {tournaments.length > 0 ? (
          <div className="grid grid-cols-1 gap-6">
            {tournaments.map((tournament) => (
              <div key={tournament.id} className="bg-neutral-800 rounded-lg shadow p-6">
                <div className="flex flex-col md:flex-row md:items-start justify-between">
                  <div className="flex items-start mb-4 md:mb-0">
                    <img
                      src={tournament.game.logo_url}
                      alt={tournament.game.name}
                      className="h-12 w-12 rounded-md mr-4"
                    />
                    <div>
                      <h3 className="text-lg font-semibold text-white">{tournament.name}</h3>
                      <p className="text-gray-400 text-sm">{tournament.game.name}</p>
                      <p className="text-gray-400 text-sm">
                        {tournament.current_slots}/{tournament.total_slots} participants • 
                        ${tournament.entry_fee} entry fee
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col items-start md:items-end">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadgeClass(tournament.status)}`}>
                      {tournament.status}
                    </span>
                    <p className="mt-2 text-sm text-gray-400">
                      Starts: {new Date(tournament.start_time).toLocaleString()}
                    </p>
                  </div>
                </div>

                <div className="mt-6 flex flex-wrap gap-3">
                  <Link
                    to={`/tournaments/${tournament.id}`}
                    className="px-4 py-2 text-sm font-medium text-white bg-neutral-700 hover:bg-neutral-600 rounded-md"
                  >
                    View Details
                  </Link>

                  {canCancelTournament(tournament) && (
                    <>
                      <Link
                        to={`/tournaments/${tournament.id}/edit`}
                        className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md"
                      >
                        Edit
                      </Link>
                      <button
                        onClick={() => handleManagementAction('cancel', tournament.id)}
                        disabled={isActionLoading('cancel', tournament.id)}
                        className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isActionLoading('cancel', tournament.id) ? 'Canceling...' : 'Cancel'}
                      </button>
                    </>
                  )}

                  {canStartTournament(tournament) && (
                    <button
                      onClick={() => handleManagementAction('start', tournament.id)}
                      disabled={isActionLoading('start', tournament.id)}
                      className="px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isActionLoading('start', tournament.id) ? 'Starting...' : 'Start Tournament'}
                    </button>
                  )}

                  {canFinalizeTournament(tournament) && (
                    <button
                      onClick={() => handleManagementAction('finalize', tournament.id)}
                      disabled={isActionLoading('finalize', tournament.id)}
                      className="px-4 py-2 text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isActionLoading('finalize', tournament.id) ? 'Finalizing...' : 'Finalize Results'}
                    </button>
                  )}
                </div>

                {/* Additional status information */}
                {tournament.status === 'upcoming' && tournament.current_slots < 2 && (
                  <div className="mt-4 p-3 bg-yellow-800/30 rounded-md">
                    <p className="text-yellow-300 text-sm">
                      Need at least 2 participants to start the tournament
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="mx-auto h-24 w-24 rounded-full bg-neutral-800 flex items-center justify-center mb-4">
              <svg className="h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-white">No tournaments found</h3>
            <p className="mt-2 text-gray-400">
              {filter === 'all' 
                ? "You haven't created any tournaments yet." 
                : `You don't have any ${filter} tournaments.`}
            </p>
            <div className="mt-6">
              <Link
                to="/create-tournament"
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-500 hover:bg-primary-600"
              >
                Create Your First Tournament
              </Link>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}