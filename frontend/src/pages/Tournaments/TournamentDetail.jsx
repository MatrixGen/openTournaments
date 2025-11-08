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

export default function TournamentDetail() {
  const { id } = useParams();
  const [tournament, setTournament] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [joinError, setJoinError] = useState('');
  const [joinSuccess, setJoinSuccess] = useState('');
  const [isJoinModalOpen, setIsJoinModalOpen] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const { user, updateUser } = useAuth();
  const navigate = useNavigate()

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
      // STEP 1: Join the tournament (user becomes participant)
      const response = await tournamentService.join(id, gamerTag);
      
      // STEP 2: If tournament has a channel, join user to that channel
      if (response.chat_channel_id) {
        try {
          await chatService.joinChannel(response.chat_channel_id);
          console.log(`✅ User joined tournament channel: ${response.chat_channel_id}`);
        } catch (channelError) {
          // Handle 409 (already member) as success, log others as warnings
          if (channelError.response?.status === 409) {
            console.log('ℹ️ User already a member of tournament channel');
          } else {
            console.warn('⚠️ Failed to join tournament channel:', channelError);
            // Don't throw - tournament join was successful, channel join is secondary
          }
        }
      } else {
        console.log('ℹ️ Tournament has no chat channel, skipping channel join');
      }

      setJoinSuccess('Successfully joined the tournament!');
      
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

  return (
    <div className="min-h-screen bg-neutral-900">
      
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

      <main className="mx-auto max-w-7xl py-4 sm:py-8 px-3 sm:px-6 lg:px-8">
        {/* Success Message Banner */}
        {joinSuccess && (
          <div className="mb-6 bg-green-500/10 border border-green-500/20 rounded-lg p-4">
            <div className="text-green-400 text-sm font-medium">{joinSuccess}</div>
          </div>
        )}

        {/* Management Section */}
        <ManagementSection 
          tournament={tournament} 
          user={user}
          onAction={handleManagementAction}
        />

        {/* Tournament Header */}
        <TournamentHeader tournament={tournament} />

        {/* Tournament Info Grid */}
        <TournamentInfoGrid tournament={tournament} />

        {/* Mobile Layout */}
        <div className="lg:hidden space-y-4 mt-6">
          {/* Join Card - Top on mobile */}
          <JoinTournamentCard
            tournament={tournament}
            user={user}
            onJoinClick={() => setIsJoinModalOpen(true)}
          />
          
          {/* Bracket Section - Important for mobile users */}
          <TournamentBracketSection tournament={tournament} />
          
          {/* Details Card */}
          <TournamentDetailsCard tournament={tournament} />
          
          {/* Participants List */}
          <ParticipantsList tournament={tournament} />
          
          {/* Info Sidebar */}
          <TournamentInfoSidebar tournament={tournament} />
        </div>

       {/* Desktop Layout */}
      <div className="hidden lg:grid lg:grid-cols-12 gap-6 lg:gap-8 mt-6">
        {/* Left Column — Details & Participants */}
        <div className="lg:col-span-4 space-y-6">
          <TournamentDetailsCard tournament={tournament} />
          <ParticipantsList tournament={tournament} />
        </div>

        {/* Middle Column — Bracket (wider area) */}
        <div className="lg:col-span-5">
          <TournamentBracketSection tournament={tournament} />
        </div>

        {/* Right Column — Sidebar */}
        <div className="lg:col-span-3 space-y-6">
          <JoinTournamentCard
            tournament={tournament}
            user={user}
            onJoinClick={() => setIsJoinModalOpen(true)}
          />
          <TournamentInfoSidebar tournament={tournament} />
        </div>
      </div>


        {/* Mobile Floating Join Button */}
        {tournament.status === 'open' && user && !tournament.participants?.some(p => p.user_id === user.id) && (
          <div className="lg:hidden fixed bottom-6 right-6 z-30">
            <button
              onClick={() => setIsJoinModalOpen(true)}
              className="bg-primary-500 hover:bg-primary-600 text-white p-4 rounded-full shadow-lg transition-all transform hover:scale-105 active:scale-95"
            >
              <span className="text-lg font-bold">+</span>
            </button>
          </div>
        )}
      </main>
    </div>
  );
}