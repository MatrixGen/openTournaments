import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useChat } from '../../contexts/ChatContext';
import { tournamentService } from '../../services/tournamentService';
import { useAuth } from '../../contexts/AuthContext';
import LoadingState from '../../components/tournamentDetail/LoadingState';
import ErrorState from '../../components/tournamentDetail/ErrorState';
import ChatWindow from '../chat/ChatWindow';
import { Trophy, Users, Calendar, Clock, ArrowLeft, Wifi, WifiOff, MessageCircle } from 'lucide-react';
import Banner from '../../components/common/Banner';
import LoadingSpinner from '../../components/common/LoadingSpinner';

// Status colors mapping
const STATUS_COLORS = {
  live: 'bg-green-500/10 border-green-500/20 text-green-400',
  upcoming: 'bg-blue-500/10 border-blue-500/20 text-blue-400',
  open: 'bg-yellow-500/10 border-yellow-500/20 text-yellow-400',
  completed: 'bg-gray-500/10 border-gray-500/20 text-gray-400',
  default: 'bg-gray-500/10 border-gray-500/20 text-gray-400'
};

// Status display mapping
const STATUS_DISPLAY = {
  live: 'LIVE',
  upcoming: 'UPCOMING',
  open: 'OPEN',
  completed: 'COMPLETED'
};

export default function TournamentChat() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [tournament, setTournament] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [isMobile, setIsMobile] = useState(false);
  
  const { 
    currentChannel, 
    setCurrentChannel,
    isConnected,
    retryConnection,
    clearError: clearChatError
  } = useChat();
  
  const { user } = useAuth();
  const hasSetChannelRef = useRef(false);
  const lastTournamentIdRef = useRef(null);
  const retryCountRef = useRef(0);
  const MAX_RETRIES = 3;

  // Check mobile screen size with debounce
  useEffect(() => {
    let timeoutId;
    const checkMobile = () => {
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        setIsMobile(window.innerWidth < 768);
      }, 100);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => {
      window.removeEventListener('resize', checkMobile);
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, []);

  // Memoized tournament loader with retry logic
  const loadTournament = useCallback(async (isRetry = false) => {
    if (isRetry) {
      retryCountRef.current++;
      if (retryCountRef.current > MAX_RETRIES) {
        setError('Failed to load tournament after multiple attempts. Please refresh the page.');
        setIsLoading(false);
        return;
      }
    } else {
      retryCountRef.current = 0;
    }

    try {
      setIsLoading(true);
      setError('');
      clearChatError(); // Clear any chat errors
      const data = await tournamentService.getById(id);
      
      // Validate tournament data
      if (!data || !data.id) {
        throw new Error('Invalid tournament data received');
      }

      setTournament(data);
      lastTournamentIdRef.current = data.id;
      return data;
    } catch (err) {
      console.error('Tournament loading error:', err);
      const errorMessage = err.response?.data?.message || err.message || 'Failed to load tournament details';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [id, clearChatError]);

  // Handle tournament loading
  useEffect(() => {
    if (!id || lastTournamentIdRef.current === id) return;
    
    loadTournament().catch(() => {
      // Error already handled in loadTournament
    });

    // Cleanup on unmount
    return () => {
      lastTournamentIdRef.current = null;
    };
  }, [id, loadTournament]);

  // Set current channel when tournament loads
  useEffect(() => {
    if (!tournament?.chat_channel_id || hasSetChannelRef.current) {
      return;
    }

    // Only set channel if it's different from current
    if (currentChannel?.id !== tournament.chat_channel_id) {
      const channelName = tournament.name ? `${tournament.name} Chat` : 'Tournament Chat';
      setCurrentChannel({ 
        id: tournament.chat_channel_id,
        name: channelName,
        description: tournament.description || `Chat for ${tournament.name} tournament`,
        metadata: {
          tournamentId: tournament.id,
          tournamentName: tournament.name,
          tournamentStatus: tournament.status
        }
      });
      hasSetChannelRef.current = true;
    }

    // Cleanup function
    return () => {
      hasSetChannelRef.current = false;
    };
  }, [tournament, currentChannel?.id, setCurrentChannel]);

  // Clear chat channel when leaving
  useEffect(() => {
    return () => {
      if (hasSetChannelRef.current) {
        setCurrentChannel(null);
      }
    };
  }, [setCurrentChannel]);

  const handleBackToTournament = useCallback(() => {
    navigate(`/tournaments/${id}`);
  }, [navigate, id]);

  const handleRetry = useCallback(async () => {
    setError('');
    clearChatError();
    try {
      await loadTournament(true);
    } catch  {
      // Error already handled in loadTournament
    }
  }, [loadTournament, clearChatError]);

  const handleReconnect = useCallback(() => {
    setError('');
    clearChatError();
    retryConnection();
  }, [retryConnection, clearChatError]);

  // Memoized tournament status calculations
  const tournamentStatus = useMemo(() => {
    return tournament?.status?.toLowerCase() || 'unknown';
  }, [tournament?.status]);

  const statusColorClass = useMemo(() => {
    return STATUS_COLORS[tournamentStatus] || STATUS_COLORS.default;
  }, [tournamentStatus]);

  const statusDisplay = useMemo(() => {
    return STATUS_DISPLAY[tournamentStatus] || tournamentStatus.toUpperCase();
  }, [tournamentStatus]);

  // Memoized format function
  const formatTournamentDate = useCallback((dateString) => {
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
    } catch {
      return 'Invalid date';
    }
  }, []);

  // Memoized participant check
  const isUserParticipant = useMemo(() => {
    if (!tournament || !user) return false;
    
    // Check various participant formats
    const participants = tournament.participants || [];
    return participants.some(participant => 
      participant.id === user.id ||
      participant.user_id === user.id ||
      participant.user?.id === user.id ||
      participant.userId === user.id
    );
  }, [tournament, user]);

  // Check if chat is enabled for this tournament
  const isChatEnabled = useMemo(() => {
    if (!tournament) return false;
    
    // Check if tournament has chat enabled
    const hasChatChannel = !!tournament.chat_channel_id;
    const isChatDisabled = tournament.chat_enabled === false;
    
    return hasChatChannel && !isChatDisabled;
  }, [tournament]);

  // Memoized banners to prevent unnecessary re-renders
  const banners = useMemo(() => {
    const bannerList = [];

    // Error banner (highest priority)
    if (error) {
      bannerList.push({
        id: 'error',
        type: 'error',
        title: 'Chat Error',
        message: error,
        action: {
          text: 'Retry',
          onClick: handleRetry
        }
      });
    }

    // Chat disabled banner
    if (tournament && !isChatEnabled && !error) {
      bannerList.push({
        id: 'chat-disabled',
        type: 'info',
        title: 'Chat Not Available',
        message: 'Chat has not been enabled for this tournament.',
        action: {
          text: 'View Tournament',
          onClick: handleBackToTournament
        }
      });
    }

    // Connection status banner
    if (!isConnected && !error && tournament && isChatEnabled) {
      bannerList.push({
        id: 'connection',
        type: 'warning',
        title: 'Connection Lost',
        message: 'You are currently disconnected from the chat. Messages may not send or receive.',
        action: {
          text: 'Reconnect',
          onClick: handleReconnect
        }
      });
    }

    // Non-participant info
    if (isChatEnabled && !isUserParticipant && tournamentStatus !== 'completed' && tournament) {
      bannerList.push({
        id: 'non-participant',
        type: 'info',
        title: 'Join Tournament to Chat',
        message: 'You need to join the tournament to participate in the chat and send messages.',
        action: {
          text: 'Join Tournament',
          onClick: handleBackToTournament
        }
      });
    }

    // Tournament completed
    if (isChatEnabled && tournamentStatus === 'completed') {
      bannerList.push({
        id: 'completed',
        type: 'info',
        title: 'Tournament Completed',
        message: 'This tournament has ended. The chat is now read-only for participants.'
      });
    }

    // Welcome banner for new participants
    if (isChatEnabled && isUserParticipant && tournamentStatus === 'upcoming' && !error) {
      bannerList.push({
        id: 'welcome',
        type: 'success',
        title: 'Welcome to Tournament Chat!',
        message: 'Introduce yourself and coordinate with other participants before the tournament starts.'
      });
    }

    return bannerList;
  }, [
    error,
    isConnected,
    isUserParticipant,
    tournamentStatus,
    tournament,
    isChatEnabled,
    handleRetry,
    handleReconnect,
    handleBackToTournament
  ]);

  // Handle chat initialization
  const shouldShowChat = useMemo(() => {
    return tournament && isChatEnabled;
  }, [tournament, isChatEnabled]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-neutral-900 to-neutral-950">
        <LoadingState />
      </div>
    );
  }

  if (error && !tournament) {
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
    <div className="min-h-screen bg-gradient-to-br from-neutral-900 to-neutral-950">
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
              {/* Chat Icon */}
              <div className="hidden sm:flex flex-shrink-0 items-center justify-center w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl shadow-lg">
                <MessageCircle className="w-6 h-6 text-white" />
              </div>
              
              <div className="min-w-0 flex-1">
                <div className="flex items-center space-x-2 mb-1">
                  <h1 className="text-lg sm:text-xl font-bold text-white truncate">
                    {tournament?.name ? `${tournament.name} Chat` : 'Tournament Chat'}
                  </h1>
                  <span className={`px-2 py-1 rounded-full text-xs font-semibold border ${statusColorClass}`}>
                    {statusDisplay}
                  </span>
                </div>
                
                <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-xs sm:text-sm text-gray-400">
                  <div className="flex items-center space-x-1">
                    <Users className="w-3 h-3 sm:w-4 sm:h-4" />
                    <span>{tournament?.participants?.length || 0} participants</span>
                  </div>
                  {tournament?.start_time && (
                    <div className="flex items-center space-x-1">
                      <Calendar className="w-3 h-3 sm:w-4 sm:h-4" />
                      <span>{formatTournamentDate(tournament.start_time)}</span>
                    </div>
                  )}
                  {tournament?.game_type && (
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
            {shouldShowChat && (
              <button
                onClick={!isConnected ? handleReconnect : undefined}
                className={`flex items-center space-x-2 px-3 py-2 rounded-xl border transition-all duration-300 ${
                  isConnected 
                    ? 'bg-green-500/10 border-green-500/20 text-green-400 shadow-lg shadow-green-500/10 cursor-default' 
                    : 'bg-red-500/10 border-red-500/20 text-red-400 shadow-lg shadow-red-500/10 hover:bg-red-500/20 cursor-pointer'
                }`}
                title={isConnected ? 'Connected to chat' : 'Click to reconnect'}
                disabled={isConnected}
              >
                {isConnected ? (
                  <Wifi className="w-4 h-4 animate-pulse" />
                ) : (
                  <WifiOff className="w-4 h-4" />
                )}
                <span className="text-sm font-medium hidden sm:inline">
                  {isConnected ? 'Connected' : 'Reconnect'}
                </span>
              </button>
            )}

            {/* Quick Actions */}
            <div className="flex items-center space-x-2">
              <button
                onClick={handleBackToTournament}
                className="hidden sm:flex items-center space-x-2 px-3 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-sm text-gray-300 hover:text-white transition-all duration-300 hover:scale-105"
              >
                <Trophy className="w-4 h-4" />
                <span>View Tournament</span>
              </button>
            </div>
          </div>
        </div>

        {/* Render banners */}
        {banners.map((banner) => (
          <Banner
            key={banner.id}
            type={banner.type}
            title={banner.title}
            message={banner.message}
            onClose={banner.id === 'error' ? () => setError('') : undefined}
            action={banner.action}
            className="mb-4"
            compact={true}
          />
        ))}

        {/* Enhanced Chat Window Container */}
        <div className={`flex-1 min-h-0 rounded-2xl overflow-hidden border border-white/10 shadow-2xl ${
          isMobile ? 'mb-16' : ''
        }`}>
          {shouldShowChat ? (
            <ChatWindow tournament={tournament} />
          ) : (
            <div className="h-full flex flex-col items-center justify-center bg-neutral-800/50 p-6">
              {!tournament ? (
                <>
                  <LoadingSpinner size="lg" />
                  <p className="mt-4 text-gray-400">Loading tournament...</p>
                </>
              ) : !isChatEnabled ? (
                <>
                  <div className="w-16 h-16 rounded-full bg-blue-500/10 flex items-center justify-center mb-4">
                    <MessageCircle className="w-8 h-8 text-blue-400" />
                  </div>
                  <h3 className="text-xl font-bold text-white mb-2">Chat Not Available</h3>
                  <p className="text-gray-400 text-center mb-6">
                    Chat has not been enabled for this tournament.
                  </p>
                  <button
                    onClick={handleBackToTournament}
                    className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                  >
                    Return to Tournament
                  </button>
                </>
              ) : (
                <>
                  <LoadingSpinner size="lg" />
                  <p className="mt-4 text-gray-400">Initializing chat...</p>
                </>
              )}
            </div>
          )}
        </div>

        {/* Fixed Mobile Bottom Navigation */}
        {isMobile && (
          <div className="fixed bottom-4 left-4 right-4 z-40 animate-fade-in-up">
            <div className="p-3 bg-neutral-800/90 backdrop-blur-sm rounded-xl border border-white/10 shadow-2xl">
              <div className="flex items-center justify-between">
                <button
                  onClick={handleBackToTournament}
                  className="flex items-center space-x-2 px-3 py-2 text-gray-400 hover:text-white transition-colors flex-1 justify-center"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span className="text-sm">Back</span>
                </button>
                
                {shouldShowChat && (
                  <button
                    onClick={!isConnected ? handleReconnect : undefined}
                    className={`flex items-center space-x-1 px-3 py-2 ${
                      isConnected ? 'text-green-400' : 'text-red-400'
                    } ${!isConnected ? 'hover:text-red-300' : ''}`}
                    disabled={isConnected}
                  >
                    {isConnected ? (
                      <Wifi className="w-4 h-4" />
                    ) : (
                      <WifiOff className="w-4 h-4" />
                    )}
                    <span className="text-xs">{isConnected ? 'Live' : 'Reconnect'}</span>
                  </button>
                )}

                <button
                  onClick={handleBackToTournament}
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
    </div>
  );
}