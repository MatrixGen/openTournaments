import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { tournamentService } from '../../services/tournamentService';
import { chatService } from '../../services/chatService'; 
import { useAuth } from '../../contexts/AuthContext';
import websocketService from '../../services/websocketService';
import TournamentHeader from '../../components/tournamentDetail/TournamentHeader';
import TournamentInfoGrid from '../../components/tournamentDetail/TournamentInfoGrid';
import TournamentDetailsCard from '../../components/tournamentDetail/TournamentDetailsCard';
import ParticipantsList from '../../components/tournamentDetail/ParticipantsList';
import JoinTournamentCard from '../../components/tournamentDetail/JoinTournamentCard';
import TournamentBracketSection from '../../components/tournamentDetail/TournamentBracketSection';
import TournamentInfoSidebar from '../../components/tournamentDetail/TournamentInfoSidebar';
import TournamentJoinModal from '../../components/tournamentDetail/TournamentJoinModal';
import ManagementSection from '../../components/tournamentDetail/ManagementSection';
import LoadingState from '../../components/tournamentDetail/LoadingState';
import ErrorState from '../../components/tournamentDetail/ErrorState';
import Banner from '../../components/common/Banner';
import { 
  MessageSquare,
  Users,
  Trophy,
  Clock,
  DollarSign,
  ExternalLink,
  AlertTriangle
} from 'lucide-react';

// Mobile Navigation Tabs Component
const MobileNavTabs = ({ activeTab, onTabChange }) => {
  const tabs = [
    { id: 'overview', label: 'Overview', icon: Trophy },
    { id: 'bracket', label: 'Bracket', icon: Users },
    { id: 'participants', label: 'Players', icon: Users },
    { id: 'info', label: 'Info', icon: Clock },
  ];

  return (
    <div className="md:hidden mb-6">
      <div className="flex space-x-1 overflow-x-auto pb-2 no-scrollbar">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`flex items-center space-x-2 px-4 py-2.5 rounded-lg whitespace-nowrap transition-colors ${
                activeTab === tab.id
                  ? 'bg-primary-500 text-white'
                  : 'bg-white dark:bg-neutral-800 text-gray-700 dark:text-gray-300'
              }`}
            >
              <Icon className="h-4 w-4" />
              <span className="text-sm font-medium">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

// Mobile Tournament Stats Component
const MobileTournamentStats = ({ tournament }) => {
  const stats = [
    {
      label: 'Prize Pool',
      value: `$${tournament.entry_fee*tournament.total_slots || 0}`,
      icon: DollarSign,
      color: 'text-emerald-600 dark:text-emerald-400',
      bgColor: 'bg-emerald-100 dark:bg-emerald-900/20'
    },
    {
      label: 'Players',
      value: `${tournament.current_slots || 0}/${tournament.total_slots || 0}`,
      icon: Users,
      color: 'text-blue-600 dark:text-blue-400',
      bgColor: 'bg-blue-100 dark:bg-blue-900/20'
    },
    {
      label: 'Entry Fee',
      value: `$${tournament.entry_fee || 0}`,
      icon: DollarSign,
      color: 'text-yellow-600 dark:text-yellow-400',
      bgColor: 'bg-yellow-100 dark:bg-yellow-900/20'
    },
  ];

  return (
    <div className="md:hidden mb-6">
      <div className="grid grid-cols-3 gap-3">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <div key={index} className="bg-white dark:bg-neutral-800 rounded-lg p-3 text-center">
              <div className="flex justify-center mb-2">
                <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                  <Icon className={`h-4 w-4 ${stat.color}`} />
                </div>
              </div>
              <p className={`text-lg font-bold ${stat.color}`}>{stat.value}</p>
              <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">{stat.label}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default function TournamentDetail() {
  const { id } = useParams();
  const [tournament, setTournament] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [joinError, setJoinError] = useState('');
  const [joinSuccess, setJoinSuccess] = useState('');
  const [isJoinModalOpen, setIsJoinModalOpen] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [activeMobileTab, setActiveMobileTab] = useState('overview');
  const { user, updateUser } = useAuth();
  const navigate = useNavigate();

  const loadTournament = useCallback(async () => {
    try {
      setIsLoading(true);
      setError('');
      const data = await tournamentService.getById(id);
      setTournament(data);
    } catch (err) {
      console.error('Tournament loading error:', err);
      setError(err.response?.data?.message || 'Failed to load tournament details');
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadTournament();
  }, [loadTournament]);

  useEffect(() => {
    if (!tournament || !(tournament.status === 'ongoing' || tournament.status === 'completed')) {
      return;
    }

    const unsubscribe = websocketService.subscribeToMatchUpdates((data) => {
      if (data.tournament_id === tournament.id) {
        loadTournament();
      }
    });

    return () => unsubscribe();
  }, [tournament, loadTournament]);

  const handleJoinTournament = async (gamerTag) => {
    if (!gamerTag.trim()) {
      setJoinError('Please enter your gamer tag');
      return;
    }

    setIsJoining(true);
    setJoinError('');
    setJoinSuccess('');

    try {
      const response = await tournamentService.join(id, gamerTag);
      
      if (response.chat_channel_id) {
        try {
          await chatService.joinChannel(response.chat_channel_id);
        } catch (channelError) {
          if (channelError.response?.status !== 409) {
            console.warn('Failed to join tournament channel:', channelError);
          }
        }
      }

      setJoinSuccess('Successfully joined the tournament');
      
      if (response.new_balance && updateUser) {
        updateUser({ wallet_balance: response.new_balance });
      }
      
      await loadTournament();
      
      setTimeout(() => {
        setIsJoinModalOpen(false);
        setJoinSuccess('');
        navigate(`/tournaments/${tournament.id}/chat`);
      }, 2000);
    } catch (err) {
      console.error('Join tournament error:', err);
      setJoinError(err.response?.data?.message || 'Failed to join tournament. Please try again.');
    } finally {
      setIsJoining(false);
    }
  };

  const handleManagementAction = async (actionType) => {
    try {
      let response;
      switch (actionType) {
        case 'cancel':
          response = await tournamentService.cancel(id);
          break;
        case 'start':
          response = await tournamentService.start(id);
          break;
        case 'finalize':
          response = await tournamentService.finalize(id);
          break;
        default:
          return;
      }
      
      setJoinSuccess(response.message || `Tournament ${actionType}ed successfully`);
      await loadTournament();
    } catch (err) {
      console.error(`Failed to ${actionType} tournament:`, err);
      setError(err.response?.data?.message || `Failed to ${actionType} tournament. Please try again.`);
    }
  };

  if (isLoading) {
    return <LoadingState />;
  }

  if (error || !tournament) {
    return <ErrorState error={error} tournament={tournament} />;
  }

  const isParticipant = user && tournament.participants?.some(p => p.user_id === user.id);
  const isCreator = user && tournament.created_by === user.id;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-neutral-900 safe-padding">
      <TournamentJoinModal
        isOpen={isJoinModalOpen}
        onClose={() => {
          setIsJoinModalOpen(false);
          setJoinError('');
          setJoinSuccess('');
        }}
        tournament={tournament}
        onJoin={handleJoinTournament}
        joinError={joinError}
        joinSuccess={joinSuccess}
        isJoining={isJoining}
        setJoinError={setJoinError}
        setJoinSuccess={setJoinSuccess}
      />

      <main className="mx-auto max-w-7xl py-4 md:py-8 px-3 sm:px-4 lg:px-8">
        {/* Mobile Header Actions */}
        <div className="md:hidden mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white truncate">
                {tournament.name}
              </h1>
              <div className="flex items-center space-x-2 mt-1">
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  tournament.status === 'completed' 
                    ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' 
                    : tournament.status === 'ongoing'
                    ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
                    : tournament.status === 'open'
                    ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400'
                    : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400'
                }`}>
                  {tournament.status}
                </span>
                <span className="text-xs text-gray-600 dark:text-gray-400">
                  {tournament.game_type || tournament.game?.name}
                </span>
              </div>
            </div>
            
            {/* Mobile Action Button */}
            {tournament.chat_channel_id && isParticipant && (
              <button
                onClick={() => navigate(`/tournaments/${tournament.id}/chat`)}
                className="p-2 bg-white dark:bg-neutral-800 border border-gray-300 dark:border-neutral-700 rounded-lg"
                title="Open Chat"
              >
                <MessageSquare className="h-5 w-5 text-gray-600 dark:text-gray-400" />
              </button>
            )}
          </div>
          
          <MobileTournamentStats tournament={tournament} />
          <MobileNavTabs activeTab={activeMobileTab} onTabChange={setActiveMobileTab} />
        </div>

        {/* Success Message Banner */}
        {joinSuccess && (
          <Banner
            type="success"
            title="Success"
            message={joinSuccess}
            onClose={() => setJoinSuccess('')}
            icon={<Trophy className="h-5 w-5" />}
            className="mb-4 md:mb-6"
          />
        )}

        {/* Management Section */}
        <ManagementSection 
          tournament={tournament} 
          user={user}
          onAction={handleManagementAction}
        />

        {/* Desktop Tournament Header */}
        <div className="hidden md:block">
          <TournamentHeader tournament={tournament} />
          <TournamentInfoGrid tournament={tournament} />
        </div>

        {/* Mobile Content Based on Active Tab */}
        <div className="md:hidden space-y-6">
          {activeMobileTab === 'overview' && (
            <>
              <TournamentDetailsCard tournament={tournament} />
              <JoinTournamentCard
                tournament={tournament}
                user={user}
                onJoinClick={() => setIsJoinModalOpen(true)}
              />
              <TournamentInfoSidebar tournament={tournament} />
            </>
          )}
          
          {activeMobileTab === 'bracket' && (
            <TournamentBracketSection tournament={tournament} />
          )}
          
          {activeMobileTab === 'participants' && (
            <ParticipantsList tournament={tournament} />
          )}
          
          {activeMobileTab === 'info' && (
            <div className="space-y-6">
              <div className="bg-white dark:bg-neutral-800 rounded-xl p-4 border border-gray-200 dark:border-neutral-700">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-3">Tournament Rules</h3>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  {tournament.rules || 'No specific rules provided for this tournament.'}
                </div>
              </div>
              <div className="bg-white dark:bg-neutral-800 rounded-xl p-4 border border-gray-200 dark:border-neutral-700">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-3">Additional Information</h3>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Created</span>
                    <span className="text-gray-900 dark:text-white">
                      {new Date(tournament.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Starts</span>
                    <span className="text-gray-900 dark:text-white">
                      {tournament.start_time ? new Date(tournament.start_time).toLocaleDateString() : 'TBD'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Visibility</span>
                    <span className="text-gray-900 dark:text-white capitalize">{tournament.visibility}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Desktop Layout */}
        <div className="hidden md:grid md:grid-cols-12 gap-6 lg:gap-8 mt-6">
          <div className="lg:col-span-4 space-y-6">
            <TournamentDetailsCard tournament={tournament} />
            <ParticipantsList tournament={tournament} />
          </div>

          <div className="lg:col-span-5">
            <TournamentBracketSection tournament={tournament} />
          </div>

          <div className="lg:col-span-3 space-y-6">
            <JoinTournamentCard
              tournament={tournament}
              user={user}
              onJoinClick={() => setIsJoinModalOpen(true)}
            />
            <TournamentInfoSidebar tournament={tournament} />
          </div>
        </div>

        {/* Warning Banner for Low Balance */}
        {tournament.status === 'open' && user && parseFloat(user.wallet_balance || 0) < tournament.entry_fee && (
          <Banner
            type="warning"
            title="Insufficient Balance"
            message={`You need $${tournament.entry_fee} to join this tournament. Your current balance is $${user.wallet_balance || 0}`}
            action={{
              text: 'Add Funds',
              to: '/deposit'
            }}
            icon={<AlertTriangle className="h-5 w-5" />}
            className="mt-6"
          />
        )}

        {/* Mobile Floating Join Button */}
        {tournament.status === 'open' && user && !isParticipant && (
          <div className="md:hidden fixed bottom-6 right-4 z-30">
            <button
              onClick={() => setIsJoinModalOpen(true)}
              className="bg-primary-500 hover:bg-primary-600 text-white p-4 rounded-full shadow-lg transition-all active:scale-95"
            >
              <span className="text-lg font-bold">Join</span>
            </button>
          </div>
        )}

        {/* Desktop Quick Actions */}
        <div className="hidden md:flex items-center justify-between mt-8 pt-6 border-t border-gray-200 dark:border-neutral-700">
          <div className="flex items-center space-x-4">
            {tournament.chat_channel_id && isParticipant && (
              <button
                onClick={() => navigate(`/tournaments/${tournament.id}/chat`)}
                className="inline-flex items-center px-4 py-2 bg-gray-100 dark:bg-neutral-800 hover:bg-gray-200 dark:hover:bg-neutral-700 text-gray-900 dark:text-white rounded-lg transition-colors"
              >
                <MessageSquare className="h-4 w-4 mr-2" />
                Tournament Chat
              </button>
            )}
            
            {isCreator && tournament.status === 'open' && (
              <button
                onClick={() => navigate(`/tournaments/${tournament.id}/edit`)}
                className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-neutral-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-neutral-800 rounded-lg transition-colors"
              >
                Edit Tournament
              </button>
            )}
          </div>
          
          <div className="flex items-center space-x-4">
            <button
              onClick={loadTournament}
              className="inline-flex items-center px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-300 transition-colors"
            >
              Refresh
            </button>
            <a
              href={`/tournaments/${tournament.id}/share`}
              className="inline-flex items-center px-4 py-2 text-primary-600 dark:text-primary-500 hover:text-primary-700 dark:hover:text-primary-400 transition-colors"
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Share
            </a>
          </div>
        </div>

        {/* Mobile bottom navigation spacer */}
        <div className="h-16 md:h-0"></div>
      </main>
    </div>
  );
}