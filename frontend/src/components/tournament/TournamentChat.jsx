import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useChat } from '../../contexts/ChatContext';
import { tournamentService } from '../../services/tournamentService';
import { useAuth } from '../../contexts/AuthContext';
import LoadingState from '../../components/tournamentDetail/LoadingState';
import ErrorState from '../../components/tournamentDetail/ErrorState';
import ChatWindow from '../chat/ChatWindow';
import { Trophy, Users, Calendar, Clock, ArrowLeft, Wifi, WifiOff } from 'lucide-react';
import Banner from '../../components/common/Banner';
import LoadingSpinner from '../../components/common/LoadingSpinner';

export default function TournamentChat() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [tournament, setTournament] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [isMobile, setIsMobile] = useState(false);
  
  const { 
    currentChannel, 
    messages, 
    sendMessage, 
    loadChannelMessages,
    setCurrentChannel,
    isConnected,
    isLoading: isChatLoading
  } = useChat();
  
  const { user } = useAuth();
  const hasSetChannelRef = useRef(false);
  const containerRef = useRef(null);

  // Check mobile screen size
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Memoized load tournament function
  const loadTournament = useCallback(async () => {
    try {
      setIsLoading(true);
      setError('');
      const data = await tournamentService.getById(id);
      setTournament(data);
      
      return data;
    } catch (err) {
      console.error('Tournament loading error:', err);
      const errorMessage = err.response?.data?.message || 'Failed to load tournament details';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  // Load tournament details
  useEffect(() => {
    loadTournament();
  }, [loadTournament]);

  // Set current channel when tournament loads
  useEffect(() => {
    if (!tournament?.chat_channel_id || hasSetChannelRef.current) {
      return;
    }

   // console.log(`🎯 Setting tournament channel: ${tournament.chat_channel_id}`);
    setCurrentChannel({ id: tournament.chat_channel_id });
    hasSetChannelRef.current = true;

    // Cleanup function
    return () => {
      hasSetChannelRef.current = false;
    };
  }, [tournament?.chat_channel_id, setCurrentChannel]);

  // Load messages when channel is set and matches tournament
  useEffect(() => {
    const channelId = currentChannel?.id;
    const tournamentChannelId = tournament?.chat_channel_id;

    if (channelId && tournamentChannelId && channelId === tournamentChannelId) {
     // console.log(`📥 Loading messages for channel: ${channelId}`);
      loadChannelMessages(channelId)
        .catch(err => {
          console.error('Failed to load messages:', err);
          setError('Failed to load messages. Please try again.');
        });
    }
  }, [currentChannel?.id, tournament?.chat_channel_id, loadChannelMessages]);

  const handleSendMessage = async (channelId, content) => {
    return await sendMessage(channelId, content);
  };

  const handleRetryFailedMessage = async (failedMessage) => {
    if (!currentChannel?.id) return;
    return await sendMessage(currentChannel.id, failedMessage.content);
  };

  const handleBackToTournament = () => {
    navigate(`/tournaments/${id}`);
  };

  const handleRetry = async () => {
    setError('');
    try {
      await loadTournament();
    } catch (err) {
      // Error already set in loadTournament
    }
  };

  // Format tournament date
  const formatTournamentDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  // Check if user is participant
  const isUserParticipant = tournament?.participants?.some(
    participant => participant.user_id === user?.id
  );

  // Enhanced tournament status
  const getTournamentStatus = () => {
    return tournament?.status || 'unknown';
  };


  const tournamentStatus = getTournamentStatus();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-neutral-900 to-neutral-950">
        
        <LoadingState />
      </div>
    );
  }

  if (error || !tournament) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-neutral-900 to-neutral-950">
        
        <ErrorState 
          error={error} 
          tournament={tournament}
          onRetry={handleRetry}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-neutral-900 to-neutral-950" ref={containerRef}>
      
      <main className="mx-auto max-w-6xl h-[calc(100vh-80px)] flex flex-col py-4 px-3 sm:px-4 lg:px-6">
        {/* Enhanced Header */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between mb-4 lg:mb-6 flex-shrink-0 space-y-3 lg:space-y-0">
          {/* Left Section - Back button and tournament info */}
          <div className="flex items-start space-x-3 min-w-0 flex-1">
            <button
              onClick={handleBackToTournament}
              className="flex-shrink-0 text-gray-400 hover:text-white transition-all duration-300 flex items-center space-x-2 p-2 rounded-xl hover:bg-white/5 hover:scale-105 group"
              aria-label="Back to tournament"
            >
              <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
              <span className="hidden sm:inline text-sm font-medium">Back</span>
            </button>
            
            <div className="min-w-0 flex-1 flex items-center space-x-3">
              {/* Tournament Icon */}
              <div className="hidden sm:flex flex-shrink-0 items-center justify-center w-12 h-12 bg-gradient-to-br from-primary-500 to-purple-600 rounded-xl shadow-lg">
                <Trophy className="w-6 h-6 text-white" />
              </div>
              
              <div className="min-w-0 flex-1">
                <div className="flex items-center space-x-2 mb-1">
                  <h1 className="text-lg sm:text-xl font-bold text-white truncate">
                    {tournament.name}
                  </h1>
                  <span className={`px-2 py-1 rounded-full text-xs font-semibold border ${
                    tournamentStatus === 'live' 
                      ? 'bg-green-500/10 border-green-500/20 text-green-400'
                      : tournamentStatus === 'upcoming'
                      ? 'bg-blue-500/10 border-blue-500/20 text-blue-400'
                      : 'bg-gray-500/10 border-gray-500/20 text-gray-400'
                  }`}>
                    {tournamentStatus === 'live' ? 'LIVE' : tournamentStatus === 'open' ? 'OPEN' : 'COMPLETED'}
                  </span>
                </div>
                
                <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-xs sm:text-sm text-gray-400">
                  <div className="flex items-center space-x-1">
                    <Users className="w-3 h-3 sm:w-4 sm:h-4" />
                    <span>{tournament.participants?.length || 0} participants</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Calendar className="w-3 h-3 sm:w-4 sm:h-4" />
                    <span>{formatTournamentDate(tournament.start_time)}</span>
                  </div>
                  {tournament.game_type && (
                    <div className="flex items-center space-x-1">
                      <Clock className="w-3 h-3 sm:w-4 sm:h-4" />
                      <span>{tournament.game_type}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Right Section - Connection status and actions */}
          <div className="flex items-center justify-between lg:justify-end space-x-3 flex-shrink-0">
            {/* Connection Status */}
            <div 
              className={`flex items-center space-x-2 px-3 py-2 rounded-xl border transition-all duration-300 ${
                isConnected 
                  ? 'bg-green-500/10 border-green-500/20 text-green-400 shadow-lg shadow-green-500/10' 
                  : 'bg-red-500/10 border-red-500/20 text-red-400 shadow-lg shadow-red-500/10'
              }`}
              title={isConnected ? 'Connected to chat' : 'Disconnected from chat'}
            >
              {isConnected ? (
                <Wifi className="w-4 h-4 animate-pulse" />
              ) : (
                <WifiOff className="w-4 h-4" />
              )}
              <span className="text-sm font-medium hidden sm:inline">
                {isConnected ? 'Connected' : 'Disconnected'}
              </span>
            </div>

            {/* Quick Actions */}
            <div className="flex items-center space-x-2">
              <button
                onClick={() => navigate(`/tournaments/${id}`)}
                className="hidden sm:flex items-center space-x-2 px-3 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-sm text-gray-300 hover:text-white transition-all duration-300 hover:scale-105"
              >
                <Trophy className="w-4 h-4" />
                <span>View Tournament</span>
              </button>
            </div>
          </div>
        </div>

        {/* Error Banner */}
        {error && (
          <Banner
            type="error"
            title="Chat Error"
            message={error}
            onClose={() => setError('')}
            action={{
              text: 'Retry',
              onClick: handleRetry
            }}
            className="mb-4"
            compact={true}
          />
        )}

        {/* Connection Status Banner */}
        {!isConnected && (
          <Banner
            type="warning"
            title="Connection Lost"
            message="You are currently disconnected from the chat. Messages may not send or receive."
            action={{
              text: 'Reconnect',
              onClick: () => window.location.reload()
            }}
            className="mb-4"
            compact={true}
          />
        )}

        {/* Info Banner for Non-Participants */}
        {!isUserParticipant && tournamentStatus !== 'completed' && (
          <Banner
            type="info"
            title="Join Tournament to Chat"
            message="You need to join the tournament to participate in the chat and send messages."
            action={{
              text: 'Join Tournament',
              onClick: () => navigate(`/tournaments/${id}`)
            }}
            className="mb-4"
            compact={true}
          />
        )}

        {/* Tournament Status Banner */}
        {tournamentStatus === 'completed' && (
          <Banner
            type="info"
            title="Tournament Completed"
            message="This tournament has ended. The chat is now read-only for participants."
            className="mb-4"
            compact={true}
          />
        )}

        {/* Loading Banner for Chat */}
        {isChatLoading && (
          <Banner
            type="info"
            message={
              <div className="flex items-center space-x-2">
                <LoadingSpinner size="sm" />
                <span>Loading messages...</span>
              </div>
            }
            className="mb-4"
            compact={true}
          />
        )}

        {/* Welcome Banner for New Participants */}
        {isUserParticipant && tournamentStatus === 'upcoming' && (
          <Banner
            type="success"
            title="Welcome to Tournament Chat!"
            message="Introduce yourself and coordinate with other participants before the tournament starts."
            className="mb-4"
            compact={true}
          />
        )}

        {/* Enhanced Chat Window Container with proper spacing for mobile */}
        <div className={`flex-1 min-h-0 rounded-2xl overflow-hidden border border-white/10 shadow-2xl ${
          isMobile ? 'mb-0' : ''
        }`}>
          <ChatWindow
            messages={messages}
            onSendMessage={handleSendMessage}
            onRetryFailedMessage={handleRetryFailedMessage}
            currentChannel={currentChannel}
            isConnected={isConnected}
            isLoading={isChatLoading}
            isUserParticipant={isUserParticipant}
            tournament={tournament}
            error={error}
            setError={setError}
          />
        </div>

        {/* Fixed Mobile Bottom Navigation - Positioned outside the chat container */}
        {isMobile && (
          <div className="fixed bottom-4 left-4 right-4 z-40">
            <div className="p-3 bg-neutral-800/90 backdrop-blur-sm rounded-xl border border-white/10 shadow-2xl">
              <div className="flex items-center justify-between">
                <button
                  onClick={handleBackToTournament}
                  className="flex items-center space-x-2 px-3 py-2 text-gray-400 hover:text-white transition-colors flex-1 justify-center"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span className="text-sm">Back</span>
                </button>
                
                <div className={`flex items-center space-x-1 px-3 py-2 ${
                  isConnected ? 'text-green-400' : 'text-red-400'
                }`}>
                  {isConnected ? (
                    <Wifi className="w-4 h-4" />
                  ) : (
                    <WifiOff className="w-4 h-4" />
                  )}
                  <span className="text-xs">{isConnected ? 'Live' : 'Offline'}</span>
                </div>

                <button
                  onClick={() => navigate(`/tournaments/${id}`)}
                  className="flex items-center space-x-2 px-3 py-2 text-gray-400 hover:text-white transition-colors flex-1 justify-center"
                >
                  <Trophy className="w-4 h-4" />
                  <span className="text-sm">Details</span>
                </button>
              </div>
            </div>
            
            {/* Safe area spacer for iOS */}
            <div className="h-1" />
          </div>
        )}
      </main>

      {/* Custom CSS for enhanced animations */}
      <style jsx>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        .animate-fade-in-up {
          animation: fadeInUp 0.5s ease-out;
        }
      `}</style>
    </div>
  );
}