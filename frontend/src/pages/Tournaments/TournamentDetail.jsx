import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import Header from '../../components/layout/Header';
import { tournamentService } from '../../services/tournamentService';
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

  useEffect(() => {
    if (tournament && (tournament.status === 'ongoing' || tournament.status === 'completed')) {
      const unsubscribe = websocketService.subscribeToMatchUpdates((data) => {
        if (data.tournament_id === tournament.id) {
          loadTournament();
        }
      });
      
      return () => unsubscribe();
    }
  }, [tournament]);

  useEffect(() => {
    loadTournament();
  }, [id]);

  const loadTournament = async () => {
    try {
      setIsLoading(true);
      const data = await tournamentService.getById(id);
      setTournament(data);
      setError('');
    } catch (err) {
      console.error('Tournament loading error:', err);
      setError(err.response?.data?.message || 'Failed to load tournament details');
    } finally {
      setIsLoading(false);
    }
  };

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
      setJoinSuccess('Successfully joined the tournament!');
      setJoinError('');
      
      // Update user balance from the response
      if (response.new_balance && updateUser) {
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
      setJoinSuccess('');
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
      <Header />
      
      <TournamentJoinModal
        isOpen={isJoinModalOpen}
        onClose={() => setIsJoinModalOpen(false)}
        tournament={tournament}
        onJoin={handleJoinTournament}
        joinError={joinError}
        joinSuccess={joinSuccess}
        isJoining={isJoining}
        setJoinError={setJoinError}
        setJoinSuccess={setJoinSuccess}
      />

      <main className="mx-auto max-w-7xl py-4 sm:py-8 px-3 sm:px-6 lg:px-8">
        {/* Back Navigation and Management Actions */}
        <ManagementSection 
          tournament={tournament} 
          user={user}
          onAction={handleManagementAction}
        />

        {/* Tournament Header */}
        <TournamentHeader tournament={tournament} />

        {/* Tournament Info Grid */}
        <TournamentInfoGrid tournament={tournament} />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8 mt-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-4 sm:space-y-6">
            <TournamentDetailsCard tournament={tournament} />
            <ParticipantsList tournament={tournament} />
          </div>

          {/* Sidebar */}
          <div className="space-y-4 sm:space-y-6">
            <JoinTournamentCard
              tournament={tournament}
              user={user}
              onJoinClick={() => setIsJoinModalOpen(true)}
            />
            <TournamentBracketSection tournament={tournament} />
            <TournamentInfoSidebar tournament={tournament} />
          </div>
        </div>
      </main>
    </div>
  );
}