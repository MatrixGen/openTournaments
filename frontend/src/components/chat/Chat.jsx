// Chat.jsx - A unified chat component for both tournament and custom channels
import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useChat } from '../../contexts/ChatContext';
import { tournamentService } from '../../services/tournamentService';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import LoadingState from '../../components/tournamentDetail/LoadingState';
import ErrorState from '../../components/tournamentDetail/ErrorState';
import ChatWindow from '../chat/ChatWindow';
import { 
  Trophy, Users, Calendar, Clock, ArrowLeft, Wifi, WifiOff, MessageCircle, 
  ChevronLeft, MoreVertical, Hash, Lock, Globe, UserPlus, Crown, 
  Settings, Volume2, VolumeX, Bell, BellOff, Link, Share2 
} from 'lucide-react';
import Banner from '../../components/common/Banner';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import ChannelService from '../../services/chatService';

// Utility function for conditional class names
function cn(...classes) {
  return classes.filter(Boolean).join(' ');
}

// Status colors mapping with theme support
const STATUS_COLORS = {
  live: 'bg-green-500/10 border-green-500/20 text-green-600 dark:text-green-400',
  upcoming: 'bg-blue-500/10 border-blue-500/20 text-blue-600 dark:text-blue-400',
  open: 'bg-yellow-500/10 border-yellow-500/20 text-yellow-600 dark:text-yellow-400',
  completed: 'bg-gray-500/10 border-gray-500/20 text-gray-600 dark:text-gray-400',
  default: 'bg-gray-500/10 border-gray-500/20 text-gray-600 dark:text-gray-400'
};

// Channel type icons and colors
const CHANNEL_TYPE_CONFIG = {
  direct: {
    icon: Users,
    bgColor: 'bg-purple-500',
    textColor: 'text-purple-600 dark:text-purple-400',
    badge: 'DM'
  },
  group: {
    icon: Users,
    bgColor: 'bg-green-500',
    textColor: 'text-green-600 dark:text-green-400',
    badge: 'Group'
  },
  channel: {
    icon: Hash,
    bgColor: 'bg-blue-500',
    textColor: 'text-blue-600 dark:text-blue-400',
    badge: 'Channel'
  }
};

export default function Chat() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  
  // Determine chat type from route
  const isTournamentChat = location.pathname.startsWith('/tournaments/');
  const isChannelChat = location.pathname.startsWith('/channels/');
  
  // State
  const [chatData, setChatData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [isMobile, setIsMobile] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [channelSettings, setChannelSettings] = useState({
    isMuted: false,
    notificationsEnabled: true,
    hidePreviews: false
  });
  
  // Refs
  const { 
    currentChannel, 
    setCurrentChannel,
    isConnected,
    retryConnection,
    clearError: clearChatError,
    onlineUsers
  } = useChat();
  
  const { user } = useAuth();
  const { isDarkMode } = useTheme(); 
  const hasSetChannelRef = useRef(false);
  const retryCountRef = useRef(0);
  const MAX_RETRIES = 3;

  // Mobile detection
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    
    let timeoutId;
    const handleResize = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(checkMobile, 100);
    };
    
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      clearTimeout(timeoutId);
    };
  }, []);

  // Load data based on chat type
  const loadChatData = useCallback(async (isRetry = false) => {
    if (isRetry) {
      retryCountRef.current++;
      if (retryCountRef.current > MAX_RETRIES) {
        setError('Failed to load chat. Please refresh.');
        setIsLoading(false);
        return;
      }
    } else {
      retryCountRef.current = 0;
    }

    try {
      setIsLoading(true);
      setError('');
      clearChatError();

      let data;

      if (isTournamentChat) {
        // Load tournament data
        data = await tournamentService.getById(id);
        if (!data?.id) {
          throw new Error('Invalid tournament data');
        }
        
        // Format as chat data object
        data = {
          type: 'tournament',
          id: data.id,
          name: data.name,
          description: data.description,
          status: data.status,
          participants: data.participants,
          start_time: data.start_time,
          game_type: data.game_type,
          chat_channel_id: data.chat_channel_id,
          metadata: {
            ...data,
            chatType: 'tournament'
          }
        };
      } else if (isChannelChat) {
        // Load channel data
        data = await ChannelService.getChannel(id);
        if (!data?.data?.channel && !data?.channel) {
          throw new Error('Invalid channel data');
        }
        
        const channel = data.data?.channel || data.channel;
        
        // Format as chat data object
        data = {
          type: 'channel',
          id: channel.id,
          name: channel.name,
          description: channel.description,
          channelType: channel.type,
          isPrivate: channel.isPrivate,
          memberCount: channel.memberCount,
          members: channel.members,
          admins: channel.admins || [],
          ownerId: channel.ownerId || channel.createdBy,
          owner: channel.owner || channel.creator,
          isMember: channel.isMember,
          userRole: channel.userRole,
          createdAt: channel.createdAt,
          updatedAt: channel.updatedAt,
          tags: channel.tags || [],
          metadata: {
            ...channel,
            chatType: 'channel'
          }
        };
      } else {
        throw new Error('Invalid chat route');
      }

      setChatData(data);
      return data;
    } catch (err) {
      console.error('Chat data loading error:', err);
      const errorMessage = err.response?.data?.message || err.message || 'Failed to load chat';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [id, isTournamentChat, isChannelChat, clearChatError]);

  // Initial load
  useEffect(() => {
    if (!id) return;
    
    loadChatData().catch(() => {
      // Error handled in loadChatData
    });

    return () => {
      setChatData(null);
    };
  }, [id, loadChatData]);

  // Set chat channel
  useEffect(() => {
    if (!chatData || hasSetChannelRef.current) return;

    let channelId;
    let channelName;
    let channelDescription;

    if (chatData.type === 'tournament') {
      channelId = chatData.chat_channel_id;
      channelName = chatData.name ? `${chatData.name} Chat` : 'Tournament Chat';
      channelDescription = chatData.description || `Chat for ${chatData.name} tournament`;
    } else if (chatData.type === 'channel') {
      channelId = chatData.id;
      channelName = chatData.name;
      channelDescription = chatData.description;
    }

    if (channelId && currentChannel?.id !== channelId) {
      setCurrentChannel({ 
        id: channelId,
        name: channelName,
        description: channelDescription,
        type: chatData.channelType || 'channel',
        isPrivate: chatData.isPrivate || false,
        metadata: {
          chatType: chatData.type,
          ...chatData.metadata
        }
      });
      hasSetChannelRef.current = true;
    }

    return () => {
      hasSetChannelRef.current = false;
    };
  }, [chatData, currentChannel?.id, setCurrentChannel]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (hasSetChannelRef.current) {
        setCurrentChannel(null);
      }
    };
  }, [setCurrentChannel]);

  // Navigation handlers
  const handleBack = useCallback(() => {
    if (chatData?.type === 'tournament') {
      navigate(`/tournaments/${id}`);
    } else if (chatData?.type === 'channel') {
      navigate('/channels');
    } else {
      navigate('/');
    }
  }, [navigate, id, chatData]);

  const handleRetry = useCallback(async () => {
    setError('');
    clearChatError();
    try {
      await loadChatData(true);
    } catch  {
      // Error handled in loadChatData
    }
  }, [loadChatData, clearChatError]);

  const handleReconnect = useCallback(() => {
    setError('');
    clearChatError();
    retryConnection();
  }, [retryConnection, clearChatError]);

  const handleInvite = useCallback(() => {
    if (chatData?.type === 'channel' && chatData?.id) {
      setShowInviteModal(true);
    }
  }, [chatData]);

  const handleCopyInviteLink = useCallback(() => {
    const inviteLink = `${window.location.origin}/channels/${id}/join`;
    navigator.clipboard.writeText(inviteLink);
    
    // Show success message (you could use a toast notification here)
    alert('Invite link copied to clipboard!');
  }, [id]);

  const handleToggleMute = useCallback(() => {
    setChannelSettings(prev => ({
      ...prev,
      isMuted: !prev.isMuted
    }));
  }, []);

  const handleToggleNotifications = useCallback(() => {
    setChannelSettings(prev => ({
      ...prev,
      notificationsEnabled: !prev.notificationsEnabled
    }));
  }, []);

  // Memoized values
  const chatStatus = useMemo(() => {
    if (chatData?.type === 'tournament') {
      return chatData.status?.toLowerCase() || 'unknown';
    }
    return 'active'; // Default for channels
  }, [chatData]);

  const statusColorClass = useMemo(() => {
    if (chatData?.type === 'tournament') {
      return STATUS_COLORS[chatStatus] || STATUS_COLORS.default;
    }
    return STATUS_COLORS.default;
  }, [chatData?.type, chatStatus]);

  const statusDisplay = useMemo(() => {
    if (chatData?.type === 'tournament') {
     // const tournamentStatus = chatData.status?.toLowerCase();
     // return STATUS_DISPLAY[tournamentStatus] || tournamentStatus?.toUpperCase() || 'UNKNOWN';
    }
    return chatData?.isPrivate ? 'PRIVATE' : 'PUBLIC';
  }, [chatData]);

  const formatDate = useCallback((dateString) => {
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

  const isUserMember = useMemo(() => {
    if (!chatData || !user) return false;
    
    if (chatData.type === 'tournament') {
      const participants = chatData.participants || [];
      return participants.some(participant => 
        participant.id === user.id ||
        participant.user_id === user.id ||
        participant.user?.id === user.id ||
        participant.userId === user.id
      );
    } else if (chatData.type === 'channel') {
      return chatData.isMember;
    }
    
    return false;
  }, [chatData, user]);

  const isChatEnabled = useMemo(() => {
    if (!chatData) return false;
    
    if (chatData.type === 'tournament') {
      const hasChatChannel = !!chatData.chat_channel_id;
      return hasChatChannel;
    } else if (chatData.type === 'channel') {
      return true; // Channels are always chat enabled
    }
    
    return false;
  }, [chatData]);

  const shouldShowChat = useMemo(() => 
    chatData && isChatEnabled && (isUserMember || !chatData.isPrivate),
    [chatData, isChatEnabled, isUserMember]
  );

  const channelConfig = useMemo(() => {
    if (chatData?.type === 'channel' && chatData.channelType) {
      return CHANNEL_TYPE_CONFIG[chatData.channelType] || CHANNEL_TYPE_CONFIG.channel;
    }
    return CHANNEL_TYPE_CONFIG.channel;
  }, [chatData]);

  const isUserAdmin = useMemo(() => {
    if (!chatData || !user) return false;
    
    if (chatData.type === 'channel') {
      return chatData.admins?.includes(user.id) || chatData.ownerId === user.id;
    }
    
    return false;
  }, [chatData, user]);

  const isUserOwner = useMemo(() => {
    if (!chatData || !user) return false;
    
    if (chatData.type === 'channel') {
      return chatData.ownerId === user.id;
    }
    
    return false;
  }, [chatData, user]);

  // Memoized banners
  const banners = useMemo(() => {
    const bannerList = [];

    if (error) {
      bannerList.push({
        id: 'error',
        type: 'error',
        title: 'Chat Error',
        message: error,
        action: { text: 'Retry', onClick: handleRetry }
      });
    }

    if (chatData?.type === 'tournament' && !isChatEnabled && !error) {
      bannerList.push({
        id: 'chat-disabled',
        type: 'info',
        title: 'Chat Not Available',
        message: 'Chat has not been enabled for this tournament.',
        action: { text: 'View Tournament', onClick: handleBack }
      });
    }

    if (!isConnected && !error && chatData && isChatEnabled) {
      bannerList.push({
        id: 'connection',
        type: 'warning',
        title: 'Connection Lost',
        message: 'You are currently disconnected from the chat.',
        action: { text: 'Reconnect', onClick: handleReconnect }
      });
    }

    if (isChatEnabled && !isUserMember && chatData?.isPrivate) {
      bannerList.push({
        id: 'non-member',
        type: 'info',
        title: 'Join to Chat',
        message: 'You need to be a member of this private channel to participate in the chat.',
        action: { 
          text: 'Join Channel', 
          onClick: () => {
            if (chatData.type === 'channel') {
              ChannelService.joinChannel(chatData.id)
                .then(() => {
                  loadChatData();
                })
                .catch(err => {
                  console.error('Failed to join channel:', err);
                });
            }
          }
        }
      });
    }

    if (chatData?.type === 'tournament' && isChatEnabled && !isUserMember && chatStatus !== 'completed') {
      bannerList.push({
        id: 'non-participant',
        type: 'info',
        title: 'Join Tournament to Chat',
        message: 'You need to join the tournament to participate in the chat.',
        action: { text: 'Join Tournament', onClick: handleBack }
      });
    }

    if (chatData?.type === 'tournament' && isChatEnabled && chatStatus === 'completed') {
      bannerList.push({
        id: 'completed',
        type: 'info',
        title: 'Tournament Completed',
        message: 'This tournament has ended. The chat is now read-only for participants.'
      });
    }

    if (chatData?.type === 'tournament' && isChatEnabled && isUserMember && chatStatus === 'upcoming' && !error) {
      bannerList.push({
        id: 'welcome',
        type: 'success',
        title: 'Welcome to Tournament Chat!',
        message: 'Introduce yourself and coordinate with other participants.'
      });
    }

    return bannerList;
  }, [
    error,
    isConnected,
    isUserMember,
    chatStatus,
    chatData,
    isChatEnabled,
    handleRetry,
    handleReconnect,
    handleBack,
    loadChatData
  ]);

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <LoadingState />
      </div>
    );
  }

  // Error state
  if (error && !chatData) {
    return (
      <div className="min-h-screen bg-background">
        <ErrorState 
          error={error} 
          data={chatData}
          onRetry={handleRetry}
        />
      </div>
    );
  }

  // Theme-aware container classes
  const containerClasses = cn(
    "min-h-screen transition-colors duration-300",
    isDarkMode 
      ? "bg-gradient-to-br from-gray-900 to-gray-950" 
      : "bg-gradient-to-br from-gray-50 to-gray-100"
  );

  const cardClasses = cn(
    "rounded-2xl overflow-hidden border shadow-2xl transition-all duration-300",
    isDarkMode
      ? "bg-gray-800/50 border-gray-700"
      : "bg-white border-gray-200"
  );

  const textPrimaryClasses = cn(
    "transition-colors duration-300",
    isDarkMode ? "text-gray-100" : "text-gray-900"
  );

  const textSecondaryClasses = cn(
    "transition-colors duration-300",
    isDarkMode ? "text-gray-400" : "text-gray-600"
  );

  const buttonBaseClasses = cn(
    "transition-all duration-300 flex items-center space-x-2 p-2 rounded-xl",
    isDarkMode 
      ? "hover:bg-white/5 text-gray-400 hover:text-gray-100" 
      : "hover:bg-gray-100 text-gray-600 hover:text-gray-900"
  );

  return (
    <div className={containerClasses}>
      {/* Mobile Header */}
      {isMobile && (
        <div className="sticky top-0 z-50 px-4 py-3 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="flex items-center justify-between">
            <button
              onClick={handleBack}
              className="flex items-center space-x-2 p-2 -ml-2"
              aria-label="Back"
            >
              <ChevronLeft className="w-5 h-5" />
              <span className="font-medium text-sm">Back</span>
            </button>
            
            <div className="flex items-center space-x-2">
              <div className={`px-2 py-1 rounded-full text-xs font-semibold border ${statusColorClass}`}>
                {statusDisplay}
              </div>
              
              <button
                onClick={() => setShowMobileMenu(!showMobileMenu)}
                className="p-2"
                aria-label="More options"
              >
                <MoreVertical className="w-5 h-5" />
              </button>
            </div>
          </div>
          
          {/* Mobile Menu Dropdown */}
          {showMobileMenu && (
            <div className="absolute top-full right-4 mt-2 w-48 rounded-lg shadow-lg bg-background border z-50">
              <div className="p-2">
                <button
                  onClick={handleReconnect}
                  className="w-full flex items-center justify-between p-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-800 rounded"
                >
                  <span>Reconnect</span>
                  {isConnected ? (
                    <Wifi className="w-4 h-4 text-green-500" />
                  ) : (
                    <WifiOff className="w-4 h-4 text-red-500" />
                  )}
                </button>
                
                {chatData?.type === 'channel' && (
                  <>
                    {isUserMember && (
                      <button
                        onClick={handleInvite}
                        className="w-full flex items-center space-x-2 p-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-800 rounded"
                      >
                        <UserPlus className="w-4 h-4" />
                        <span>Invite Users</span>
                      </button>
                    )}
                    
                    <button
                      onClick={handleToggleMute}
                      className="w-full flex items-center justify-between p-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-800 rounded"
                    >
                      <div className="flex items-center space-x-2">
                        {channelSettings.isMuted ? (
                          <VolumeX className="w-4 h-4" />
                        ) : (
                          <Volume2 className="w-4 h-4" />
                        )}
                        <span>{channelSettings.isMuted ? 'Unmute' : 'Mute'} Channel</span>
                      </div>
                    </button>
                  </>
                )}
                
                <button
                  onClick={handleBack}
                  className="w-full flex items-center space-x-2 p-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-800 rounded"
                >
                  {chatData?.type === 'tournament' ? (
                    <Trophy className="w-4 h-4" />
                  ) : (
                    <Hash className="w-4 h-4" />
                  )}
                  <span>View {chatData?.type === 'tournament' ? 'Tournament' : 'Channels'}</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      <main className="mx-auto max-w-6xl h-[calc(100vh-64px)] flex flex-col py-4 px-3 sm:px-4 lg:px-6">
        {/* Desktop Header */}
        {!isMobile && (
          <div className="flex flex-col lg:flex-row lg:items-center justify-between mb-4 lg:mb-6 flex-shrink-0 space-y-3 lg:space-y-0">
            {/* Left Section */}
            <div className="flex items-start space-x-3 min-w-0 flex-1">
              <button
                onClick={handleBack}
                className={cn(buttonBaseClasses, "group")}
                aria-label="Back"
              >
                <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
                <span className="text-sm font-medium">Back</span>
              </button>
              
              <div className="min-w-0 flex-1 flex items-center space-x-3">
                <div className={cn(
                  "hidden sm:flex flex-shrink-0 items-center justify-center w-12 h-12 rounded-xl shadow-lg",
                  chatData?.type === 'channel' ? channelConfig.bgColor : 'bg-gradient-to-br from-blue-500 to-purple-600'
                )}>
                  {chatData?.type === 'channel' ? (
                    <channelConfig.icon className="w-6 h-6 text-white" />
                  ) : (
                    <MessageCircle className="w-6 h-6 text-white" />
                  )}
                </div>
                
                <div className="min-w-0 flex-1">
                  <div className="flex items-center space-x-2 mb-1 flex-wrap">
                    <h1 className={cn("text-lg sm:text-xl font-bold truncate", textPrimaryClasses)}>
                      {chatData?.name}
                      {chatData?.type === 'channel' && (
                        <span className="ml-2 text-xs font-normal opacity-75">
                          {channelConfig.badge}
                        </span>
                      )}
                    </h1>
                    
                    <div className="flex items-center space-x-2">
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold border ${statusColorClass}`}>
                        {statusDisplay}
                      </span>
                      
                      {chatData?.type === 'channel' && (
                        <>
                          {chatData.isPrivate ? (
                            <span className="px-2 py-1 rounded-full text-xs font-semibold bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 border border-purple-200 dark:border-purple-700">
                              <Lock className="w-3 h-3 inline mr-1" />
                              Private
                            </span>
                          ) : (
                            <span className="px-2 py-1 rounded-full text-xs font-semibold bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 border border-green-200 dark:border-green-700">
                              <Globe className="w-3 h-3 inline mr-1" />
                              Public
                            </span>
                          )}
                          
                          {isUserOwner && (
                            <span className="px-2 py-1 rounded-full text-xs font-semibold bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200 border border-yellow-200 dark:border-yellow-700">
                              <Crown className="w-3 h-3 inline mr-1" />
                              Owner
                            </span>
                          )}
                          
                          {isUserAdmin && !isUserOwner && (
                            <span className="px-2 py-1 rounded-full text-xs font-semibold bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 border border-blue-200 dark:border-blue-700">
                              <Settings className="w-3 h-3 inline mr-1" />
                              Admin
                            </span>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-xs sm:text-sm">
                    {chatData?.type === 'tournament' ? (
                      <>
                        <div className={cn("flex items-center space-x-1", textSecondaryClasses)}>
                          <Users className="w-3 h-3 sm:w-4 sm:h-4" />
                          <span>{chatData?.participants?.length || 0} participants</span>
                        </div>
                        {chatData?.start_time && (
                          <div className={cn("flex items-center space-x-1", textSecondaryClasses)}>
                            <Calendar className="w-3 h-3 sm:w-4 sm:h-4" />
                            <span>{formatDate(chatData.start_time)}</span>
                          </div>
                        )}
                        {chatData?.game_type && (
                          <div className={cn("flex items-center space-x-1", textSecondaryClasses)}>
                            <Clock className="w-3 h-3 sm:w-4 sm:h-4" />
                            <span>{chatData.game_type}</span>
                          </div>
                        )}
                      </>
                    ) : chatData?.type === 'channel' && (
                      <>
                        <div className={cn("flex items-center space-x-1", textSecondaryClasses)}>
                          <Users className="w-3 h-3 sm:w-4 sm:h-4" />
                          <span>{chatData.memberCount || 0} members</span>
                          {onlineUsers.length > 0 && (
                            <span className="text-green-500 dark:text-green-400">
                              ({onlineUsers.length} online)
                            </span>
                          )}
                        </div>
                        {chatData?.createdAt && (
                          <div className={cn("flex items-center space-x-1", textSecondaryClasses)}>
                            <Calendar className="w-3 h-3 sm:w-4 sm:h-4" />
                            <span>Created {formatDate(chatData.createdAt)}</span>
                          </div>
                        )}
                        {chatData?.owner?.username && (
                          <div className={cn("flex items-center space-x-1", textSecondaryClasses)}>
                            <Crown className="w-3 h-3 sm:w-4 sm:h-4" />
                            <span>Owned by {chatData.owner.username}</span>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                  
                  {chatData?.description && (
                    <p className={cn("mt-2 text-sm line-clamp-1", textSecondaryClasses)}>
                      {chatData.description}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Right Section */}
            <div className="flex items-center justify-between lg:justify-end space-x-3 flex-shrink-0">
              {/* Connection Status */}
              {shouldShowChat && (
                <button
                  onClick={!isConnected ? handleReconnect : undefined}
                  className={cn(
                    "flex items-center space-x-2 px-3 py-2 rounded-xl border transition-all duration-300",
                    isConnected 
                      ? 'bg-green-500/10 border-green-500/20 text-green-600 dark:text-green-400' 
                      : 'bg-red-500/10 border-red-500/20 text-red-600 dark:text-red-400 hover:opacity-90 cursor-pointer'
                  )}
                  title={isConnected ? 'Connected to chat' : 'Click to reconnect'}
                  disabled={isConnected}
                >
                  {isConnected ? (
                    <Wifi className="w-4 h-4" />
                  ) : (
                    <WifiOff className="w-4 h-4" />
                  )}
                  <span className="text-sm font-medium hidden sm:inline">
                    {isConnected ? 'Connected' : 'Reconnect'}
                  </span>
                </button>
              )}

              {/* Channel Actions */}
              {chatData?.type === 'channel' && isUserMember && (
                <div className="flex items-center space-x-2">
                  {/* Invite Button */}
                  {isUserAdmin && (
                    <button
                      onClick={handleInvite}
                      className={cn(
                        "flex items-center space-x-2 px-3 py-2 rounded-xl text-sm font-medium transition-all duration-300 hover:scale-105",
                        isDarkMode
                          ? "bg-purple-500 hover:bg-purple-600 text-white"
                          : "bg-purple-500 hover:bg-purple-600 text-white"
                      )}
                    >
                      <UserPlus className="w-4 h-4" />
                      <span className="hidden sm:inline">Invite</span>
                    </button>
                  )}
                  
                  {/* Copy Invite Link */}
                  {!chatData.isPrivate && (
                    <button
                      onClick={handleCopyInviteLink}
                      className={cn(
                        "flex items-center space-x-2 px-3 py-2 rounded-xl text-sm font-medium transition-all duration-300 hover:scale-105",
                        isDarkMode
                          ? "bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 hover:text-white"
                          : "bg-gray-100 hover:bg-gray-200 border border-gray-200 text-gray-700 hover:text-gray-900"
                      )}
                    >
                      <Link className="w-4 h-4" />
                      <span className="hidden sm:inline">Copy Link</span>
                    </button>
                  )}
                  
                  {/* Mute/Notification Toggle */}
                  <div className="flex items-center space-x-1">
                    <button
                      onClick={handleToggleMute}
                      className={cn(
                        "p-2 rounded-xl transition-all duration-300",
                        channelSettings.isMuted
                          ? 'bg-red-500/10 text-red-500 hover:bg-red-500/20'
                          : isDarkMode
                            ? 'hover:bg-white/5 text-gray-400 hover:text-gray-100'
                            : 'hover:bg-gray-100 text-gray-600 hover:text-gray-900'
                      )}
                      title={channelSettings.isMuted ? 'Unmute channel' : 'Mute channel'}
                    >
                      {channelSettings.isMuted ? (
                        <VolumeX className="w-4 h-4" />
                      ) : (
                        <Volume2 className="w-4 h-4" />
                      )}
                    </button>
                    
                    <button
                      onClick={handleToggleNotifications}
                      className={cn(
                        "p-2 rounded-xl transition-all duration-300",
                        !channelSettings.notificationsEnabled
                          ? 'bg-gray-500/10 text-gray-500 hover:bg-gray-500/20'
                          : isDarkMode
                            ? 'hover:bg-white/5 text-gray-400 hover:text-gray-100'
                            : 'hover:bg-gray-100 text-gray-600 hover:text-gray-900'
                      )}
                      title={channelSettings.notificationsEnabled ? 'Disable notifications' : 'Enable notifications'}
                    >
                      {channelSettings.notificationsEnabled ? (
                        <Bell className="w-4 h-4" />
                      ) : (
                        <BellOff className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>
              )}

              {/* Back Button */}
              <div className="flex items-center space-x-2">
                <button
                  onClick={handleBack}
                  className={cn(
                    "hidden sm:flex items-center space-x-2 px-3 py-2 rounded-xl text-sm font-medium transition-all duration-300 hover:scale-105",
                    isDarkMode
                      ? "bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 hover:text-white"
                      : "bg-gray-100 hover:bg-gray-200 border border-gray-200 text-gray-700 hover:text-gray-900"
                  )}
                >
                  {chatData?.type === 'tournament' ? (
                    <Trophy className="w-4 h-4" />
                  ) : (
                    <Hash className="w-4 h-4" />
                  )}
                  <span>View {chatData?.type === 'tournament' ? 'Tournament' : 'Channels'}</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Banners Section */}
        {banners.map((banner) => (
          <Banner
            key={banner.id}
            type={banner.type}
            title={banner.title}
            message={banner.message}
            onClose={banner.id === 'error' ? () => setError('') : undefined}
            action={banner.action}
            className="mb-4"
            compact={isMobile}
          />
        ))}

        {/* Chat Window Container */}
        <div className={cn("flex-1 min-h-0", cardClasses, isMobile ? 'mb-16' : '')}>
          {shouldShowChat ? (
            <ChatWindow 
              tournament={chatData?.type === 'tournament' ? chatData : null}
              channel={chatData?.type === 'channel' ? chatData : null}
            />
          ) : (
            <div className={cn(
              "h-full flex flex-col items-center justify-center p-6",
              isDarkMode ? "bg-gray-800/50" : "bg-gray-50"
            )}>
              {!chatData ? (
                <>
                  <LoadingSpinner size="lg" />
                  <p className="mt-4 text-gray-400">Loading chat...</p>
                </>
              ) : !isChatEnabled ? (
                <>
                  <div className="w-16 h-16 rounded-full bg-blue-500/10 flex items-center justify-center mb-4">
                    <MessageCircle className="w-8 h-8 text-blue-500" />
                  </div>
                  <h3 className="text-xl font-bold mb-2">Chat Not Available</h3>
                  <p className="text-center mb-6">
                    {chatData.type === 'tournament' 
                      ? 'Chat has not been enabled for this tournament.'
                      : 'You do not have access to this chat.'}
                  </p>
                  <button
                    onClick={handleBack}
                    className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                  >
                    Return to {chatData.type === 'tournament' ? 'Tournament' : 'Channels'}
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

        {/* Mobile Bottom Navigation */}
        {isMobile && (
          <div className="fixed bottom-0 left-0 right-0 z-40 animate-fade-in-up mobile-nav-container">
            <div className={cn(
              "p-3 border-t backdrop-blur-sm",
              isDarkMode 
                ? "bg-gray-800/90 border-gray-700" 
                : "bg-white/90 border-gray-200"
            )}>
              <div className="flex items-center justify-around">
                <button
                  onClick={handleBack}
                  className="flex flex-col items-center p-2"
                  aria-label="Back"
                >
                  <ChevronLeft className="w-5 h-5 mb-1" />
                  <span className="text-xs">Back</span>
                </button>
                
                {shouldShowChat && (
                  <button
                    onClick={!isConnected ? handleReconnect : undefined}
                    className="flex flex-col items-center p-2"
                    disabled={isConnected}
                    aria-label={isConnected ? 'Connected' : 'Reconnect'}
                  >
                    {isConnected ? (
                      <Wifi className="w-5 h-5 mb-1 text-green-500" />
                    ) : (
                      <WifiOff className="w-5 h-5 mb-1 text-red-500" />
                    )}
                    <span className="text-xs">{isConnected ? 'Connected' : 'Reconnect'}</span>
                  </button>
                )}

                {chatData?.type === 'channel' && isUserMember && (
                  <button
                    onClick={handleInvite}
                    className="flex flex-col items-center p-2"
                    aria-label="Invite users"
                  >
                    <UserPlus className="w-5 h-5 mb-1" />
                    <span className="text-xs">Invite</span>
                  </button>
                )}

                <button
                  onClick={handleBack}
                  className="flex flex-col items-center p-2"
                  aria-label="Details"
                >
                  {chatData?.type === 'tournament' ? (
                    <Trophy className="w-5 h-5 mb-1" />
                  ) : (
                    <Hash className="w-5 h-5 mb-1" />
                  )}
                  <span className="text-xs">Details</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Invite Modal for Channels */}
      {showInviteModal && chatData?.type === 'channel' && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className={cn(
            "rounded-xl border w-full max-w-md max-h-[90vh] overflow-y-auto",
            isDarkMode ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"
          )}>
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold">Invite Users to {chatData.name}</h2>
                <button
                  onClick={() => setShowInviteModal(false)}
                  className="p-1 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Invite Link
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      readOnly
                      value={`${window.location.origin}/channels/${id}/join`}
                      className={cn(
                        "flex-1 px-3 py-2 rounded-lg border text-sm",
                        isDarkMode 
                          ? "bg-gray-700 border-gray-600 text-gray-100" 
                          : "bg-gray-50 border-gray-300 text-gray-900"
                      )}
                    />
                    <button
                      onClick={handleCopyInviteLink}
                      className={cn(
                        "px-4 py-2 rounded-lg font-medium flex items-center gap-2",
                        isDarkMode
                          ? "bg-blue-600 hover:bg-blue-700 text-white"
                          : "bg-blue-500 hover:bg-blue-600 text-white"
                      )}
                    >
                      <Link className="w-4 h-4" />
                      Copy
                    </button>
                  </div>
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    Share this link with anyone you want to invite to this channel
                  </p>
                </div>
                
                <div>
                  <h3 className="text-sm font-medium mb-2">Quick Actions</h3>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => {
                        // Share via social media (simplified)
                        if (navigator.share) {
                          navigator.share({
                            title: `Join ${chatData.name} on our platform`,
                            text: `Check out this chat channel: ${chatData.name}`,
                            url: `${window.location.origin}/channels/${id}/join`,
                          });
                        }
                      }}
                      className={cn(
                        "p-3 rounded-lg border flex flex-col items-center justify-center gap-2",
                        isDarkMode
                          ? "border-gray-700 hover:bg-gray-700"
                          : "border-gray-200 hover:bg-gray-50"
                      )}
                    >
                      <Share2 className="w-5 h-5" />
                      <span className="text-sm">Share</span>
                    </button>
                    
                    <button
                      onClick={() => {
                        // In a real app, this would open an email client
                        const subject = `Invitation to join ${chatData.name}`;
                        const body = `You've been invited to join "${chatData.name}" chat channel.\n\nJoin here: ${window.location.origin}/channels/${id}/join`;
                        window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
                      }}
                      className={cn(
                        "p-3 rounded-lg border flex flex-col items-center justify-center gap-2",
                        isDarkMode
                          ? "border-gray-700 hover:bg-gray-700"
                          : "border-gray-200 hover:bg-gray-50"
                      )}
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                      <span className="text-sm">Email</span>
                    </button>
                  </div>
                </div>
                
                <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                  <button
                    onClick={() => setShowInviteModal(false)}
                    className={cn(
                      "w-full px-4 py-2 rounded-lg font-medium",
                      isDarkMode
                        ? "bg-gray-700 hover:bg-gray-600 text-gray-100"
                        : "bg-gray-200 hover:bg-gray-300 text-gray-800"
                    )}
                  >
                    Done
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}