import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import Header from '../../components/layout/Header';
import { tournamentService } from '../../services/tournamentService';
import { useAuth } from '../../contexts/AuthContext';
import { Dialog, Transition } from '@headlessui/react';
import { Fragment } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';

export default function TournamentDetail() {
  const { id } = useParams();
  const [tournament, setTournament] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [isJoining, setIsJoining] = useState(false);
  const [joinError, setJoinError] = useState('');
  const [joinSuccess, setJoinSuccess] = useState('');
  const [isJoinModalOpen, setIsJoinModalOpen] = useState(false);
  const [gamerTag, setGamerTag] = useState('');

  const { user } = useAuth();

  useEffect(() => {
    loadTournament();
  }, [id]);

  const loadTournament = async () => {
    try {
      const data = await tournamentService.getById(id);
      setTournament(data);
    } catch (err) {
      console.error('Tournament loading error:', err);
      setError(err.response?.data?.message || 'Failed to load tournament details');
    } finally {
      setIsLoading(false);
    }
  };

  const handleJoinTournament = async () => {
    if (!gamerTag.trim()) {
        setJoinError('Please enter your gamer tag');
        return;
    }

    setIsJoining(true);
    setJoinError('');
    setJoinSuccess('');

        try {
            const response = await tournamentService.join(id, gamerTag);
            setJoinSuccess('Successfully joined the tournament!');
            
            // Update user balance from the response
            if (response.new_balance) {
            updateUser({ wallet_balance: response.new_balance });
            }
            
            // Reload tournament data to update participants list
            await loadTournament();
            
            // Close modal after a short delay
            setTimeout(() => {
            setIsJoinModalOpen(false);
            }, 1500);
        } catch (err) {
            console.error('Join tournament error:', err);
            setJoinError(err.response?.data?.message || 'Failed to join tournament. Please try again.');
        } finally {
            setIsJoining(false);
        }
    };

  const isUserParticipant = () => {
    if (!tournament || !user) return false;
    return tournament.participants.some(
      (participant) => participant.user_id === user.id
    );
  };

  const isTournamentFull = () => {
    return tournament && tournament.current_slots >= tournament.total_slots;
  };

  const hasTournamentStarted = () => {
    return tournament && new Date(tournament.start_time) < new Date();
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

  if (error) {
    return (
      <div className="min-h-screen bg-neutral-900">
        <Header />
        <main className="mx-auto max-w-7xl py-8 px-4 sm:px-6 lg:px-8">
          <div className="rounded-md bg-red-800/50 py-4 px-4 text-red-200">
            {error}
          </div>
          <Link
            to="/tournaments"
            className="mt-4 inline-block text-primary-500 hover:text-primary-400"
          >
            ← Back to Tournaments
          </Link>
        </main>
      </div>
    );
  }

  if (!tournament) {
    return (
      <div className="min-h-screen bg-neutral-900">
        <Header />
        <main className="mx-auto max-w-7xl py-8 px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-white">Tournament not found</h1>
            <Link
              to="/tournaments"
              className="mt-4 inline-block text-primary-500 hover:text-primary-400"
            >
              ← Back to Tournaments
            </Link>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-900">
      <Header />
      
      {/* Join Tournament Modal */}
      <Transition appear show={isJoinModalOpen} as={Fragment}>
        <Dialog as="div" className="relative z-10" onClose={() => setIsJoinModalOpen(false)}>
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-black bg-opacity-75" />
          </Transition.Child>

          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4 text-center">
              <Transition.Child
                as={Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0 scale-95"
                enterTo="opacity-100 scale-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100 scale-100"
                leaveTo="opacity-0 scale-95"
              >
                <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-neutral-800 p-6 text-left align-middle shadow-xl transition-all">
                  <Dialog.Title
                    as="h3"
                    className="text-lg font-medium leading-6 text-white flex justify-between items-center"
                  >
                    Join Tournament
                    <button
                      type="button"
                      className="text-gray-400 hover:text-gray-300"
                      onClick={() => setIsJoinModalOpen(false)}
                    >
                      <XMarkIcon className="h-5 w-5" />
                    </button>
                  </Dialog.Title>

                  <div className="mt-4">
                    <p className="text-sm text-gray-400 mb-4">
                      You're about to join "{tournament.name}". The entry fee of ${tournament.entry_fee} will be deducted from your wallet.
                    </p>

                    <div className="mb-4">
                      <label htmlFor="gamerTag" className="block text-sm font-medium text-white mb-2">
                        Your Gamer Tag *
                      </label>
                      <input
                        type="text"
                        id="gamerTag"
                        value={gamerTag}
                        onChange={(e) => setGamerTag(e.target.value)}
                        className="w-full rounded-md border border-neutral-600 bg-neutral-700 py-2 px-3 text-white placeholder-gray-400 focus:border-primary-500 focus:outline-none focus:ring-primary-500 sm:text-sm"
                        placeholder="Enter your in-game username"
                      />
                    </div>

                    {joinError && (
                      <div className="mb-4 rounded-md bg-red-800/50 py-2 px-3 text-sm text-red-200">
                        {joinError}
                      </div>
                    )}

                    {joinSuccess && (
                      <div className="mb-4 rounded-md bg-green-800/50 py-2 px-3 text-sm text-green-200">
                        {joinSuccess}
                      </div>
                    )}
                  </div>

                  <div className="mt-6 flex justify-end space-x-3">
                    <button
                      type="button"
                      className="inline-flex justify-center rounded-md border border-gray-300 bg-transparent px-4 py-2 text-sm font-medium text-gray-300 hover:bg-neutral-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2"
                      onClick={() => setIsJoinModalOpen(false)}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      disabled={isJoining}
                      className="inline-flex justify-center rounded-md border border-transparent bg-primary-500 px-4 py-2 text-sm font-medium text-white hover:bg-primary-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                      onClick={handleJoinTournament}
                    >
                      {isJoining ? 'Joining...' : 'Join Tournament'}
                    </button>
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>

      <main className="mx-auto max-w-7xl py-8 px-4 sm:px-6 lg:px-8">
        <div className="mb-6">
          <Link
            to="/tournaments"
            className="text-primary-500 hover:text-primary-400 inline-flex items-center"
          >
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Tournaments
          </Link>
          {user && tournament.created_by === user.id && (
            <div className="bg-neutral-800 rounded-lg shadow p-6 mb-6">
                <h2 className="text-xl font-semibold text-white mb-4">Tournament Management</h2>
                
                <div className="space-y-3">
                <Link
                    to={`/tournaments/${tournament.id}/edit`}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md inline-block text-center"
                >
                    Edit Tournament
                </Link>
                
                {tournament.status === 'upcoming' && (
                    <button
                    onClick={() => {
                        if (window.confirm('Are you sure you want to cancel this tournament? This action cannot be undone.')) {
                        // Implement cancel tournament
                        }
                    }}
                    className="w-full bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded-md"
                    >
                    Cancel Tournament
                    </button>
                )}
                
                {tournament.status === 'ongoing' && (
                    <button
                    onClick={() => {
                        // Implement start tournament
                    }}
                    className="w-full bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded-md"
                    >
                    Start Tournament
                    </button>
                )}
                </div>
            </div>
            )}
        </div>

        <div className="bg-neutral-800 rounded-lg shadow overflow-hidden mb-8">
          <div className="p-6">
            <div className="flex flex-col md:flex-row md:items-start justify-between">
              <div className="flex items-start mb-4 md:mb-0">
                <img
                  src={tournament.game.logo_url}
                  alt={tournament.game.name}
                  className="h-16 w-16 rounded-md mr-4"
                />
                <div>
                  <h1 className="text-2xl font-bold text-white">{tournament.name}</h1>
                  <p className="text-gray-400">{tournament.game.name} • {tournament.platform.name}</p>
                  <p className="text-gray-400">Game Mode: {tournament.game_mode.name}</p>
                </div>
              </div>

              <div className="flex flex-col items-start md:items-end">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  tournament.status === 'upcoming' ? 'bg-blue-500/20 text-blue-300' :
                  tournament.status === 'ongoing' ? 'bg-green-500/20 text-green-300' :
                  tournament.status === 'completed' ? 'bg-purple-500/20 text-purple-300' :
                  'bg-gray-500/20 text-gray-300'
                }`}>
                  {tournament.status}
                </span>
                <p className="mt-2 text-sm text-gray-400">
                  Created by <span className="text-white">{tournament.creator.username}</span>
                </p>
              </div>
            </div>
          </div>

          <div className="border-t border-neutral-700 px-6 py-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <p className="text-sm text-gray-400">Format</p>
                <p className="text-white font-medium capitalize">
                  {tournament.format.replace('_', ' ')}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-400">Entry Fee</p>
                <p className="text-white font-medium">${tournament.entry_fee}</p>
              </div>
              <div>
                <p className="text-sm text-gray-400">Participants</p>
                <p className="text-white font-medium">
                  {tournament.current_slots} / {tournament.total_slots}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-400">Start Time</p>
                <p className="text-white font-medium">
                  {new Date(tournament.start_time).toLocaleString()}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2">
            {/* Tournament Details Card */}
            <div className="bg-neutral-800 rounded-lg shadow p-6 mb-6">
              <h2 className="text-xl font-semibold text-white mb-4">Tournament Details</h2>
              
              {tournament.rules && (
                <div className="mb-6">
                  <h3 className="text-md font-medium text-white mb-2">Rules & Guidelines</h3>
                  <p className="text-gray-400 whitespace-pre-wrap">{tournament.rules}</p>
                </div>
              )}

              {tournament.prizes && tournament.prizes.length > 0 && (
                <div>
                  <h3 className="text-md font-medium text-white mb-2">Prize Distribution</h3>
                  <div className="bg-neutral-700/50 rounded-lg p-4">
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div className="font-medium text-white">Position</div>
                      <div className="font-medium text-white">Percentage</div>
                      {tournament.prizes.map((prize, index) => (
                        <Fragment key={index}>
                          <div className="text-gray-400">{prize.position}st</div>
                          <div className="text-gray-400">{prize.percentage}%</div>
                        </Fragment>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Participants Card */}
            <div className="bg-neutral-800 rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold text-white mb-4">Participants ({tournament.participants.length})</h2>
              
              {tournament.participants.length > 0 ? (
                <div className="space-y-3">
                  {tournament.participants.map((participant) => (
                    <div key={participant.id} className="flex items-center justify-between p-3 bg-neutral-700/50 rounded-lg">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10 rounded-full bg-primary-500 flex items-center justify-center text-white font-medium">
                          {participant.user.username.charAt(0).toUpperCase()}
                        </div>
                        <div className="ml-3">
                          <p className="text-sm font-medium text-white">
                            {participant.user.username}
                          </p>
                          <p className="text-xs text-gray-400">
                            {participant.gamer_tag}
                          </p>
                        </div>
                      </div>
                      {participant.final_standing && (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-500/20 text-yellow-300">
                          #{participant.final_standing}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-400">No participants yet. Be the first to join!</p>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div>
            {/* Join Tournament Card */}
            {user && (
              <div className="bg-neutral-800 rounded-lg shadow p-6 mb-6">
                <h2 className="text-xl font-semibold text-white mb-4">Join Tournament</h2>
                
                {isUserParticipant() ? (
                  <div className="text-center">
                    <p className="text-green-400 mb-4">You've already joined this tournament!</p>
                    <button
                      disabled
                      className="w-full bg-gray-600 text-gray-400 py-2 px-4 rounded-md cursor-not-allowed"
                    >
                      Already Joined
                    </button>
                  </div>
                ) : isTournamentFull() ? (
                  <div className="text-center">
                    <p className="text-red-400 mb-4">This tournament is full.</p>
                    <button
                      disabled
                      className="w-full bg-gray-600 text-gray-400 py-2 px-4 rounded-md cursor-not-allowed"
                    >
                      Tournament Full
                    </button>
                  </div>
                ) : hasTournamentStarted() ? (
                  <div className="text-center">
                    <p className="text-red-400 mb-4">This tournament has already started.</p>
                    <button
                      disabled
                      className="w-full bg-gray-600 text-gray-400 py-2 px-4 rounded-md cursor-not-allowed"
                    >
                      Tournament Started
                    </button>
                  </div>
                ) : (
                  <div>
                    <p className="text-gray-400 mb-4">
                      Entry fee: <span className="text-white font-medium">${tournament.entry_fee}</span>
                    </p>
                    <p className="text-gray-400 mb-4">
                      Your wallet balance: <span className="text-white font-medium">${user.wallet_balance || '0.00'}</span>
                    </p>
    
                    {parseFloat(user.wallet_balance || 0) < parseFloat(tournament.entry_fee) ? (
                    <div className="text-center">
                        <p className="text-red-400 mb-4">Insufficient funds to join this tournament.</p>
                        <p className="text-gray-400 text-sm mb-4">
                        You need ${tournament.entry_fee} but only have ${user.wallet_balance || '0.00'}
                        </p>
                        <Link
                        to="/deposit"
                        className="w-full bg-primary-500 hover:bg-primary-600 text-white font-medium py-2 px-4 rounded-md inline-block"
                        >
                        Add Funds
                        </Link>
                    </div>
                    ) : (
                    <button
                        onClick={() => setIsJoinModalOpen(true)}
                        className="w-full bg-primary-500 hover:bg-primary-600 text-white font-medium py-2 px-4 rounded-md"
                    >
                        Join Tournament
                    </button>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Tournament Info Card */}
            <div className="bg-neutral-800 rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold text-white mb-4">Tournament Info</h2>
              
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-gray-400">Visibility</p>
                  <p className="text-white font-medium capitalize">{tournament.visibility}</p>
                </div>
                
                <div>
                  <p className="text-sm text-gray-400">Created</p>
                  <p className="text-white font-medium">
                    {new Date(tournament.created_at).toLocaleDateString()}
                  </p>
                </div>
                
                <div>
                  <p className="text-sm text-gray-400">Status</p>
                  <p className="text-white font-medium capitalize">{tournament.status}</p>
                </div>
                
                {tournament.updated_at && (
                  <div>
                    <p className="text-sm text-gray-400">Last Updated</p>
                    <p className="text-white font-medium">
                      {new Date(tournament.updated_at).toLocaleDateString()}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}