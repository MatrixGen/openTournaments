// ChatHeader.jsx - Flexible for both tournament and channel chats
import { memo, useMemo } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { 
  Users, 
  MessageSquare, 
  
  WifiOff, 
  Hash, 
  Lock, 
  
  Crown,
  Volume2,
  VolumeX,
  Bell,
  BellOff,
  Loader2
} from 'lucide-react';

const ChatHeader = memo(({
  // Chat connection and status
  isConnected = false,
  connectionStatus = null, // 'connecting', 'connected', 'disconnected', 'error'
  
  // User presence data
  typingUsers = [],
  onlineUsers = [],
  activeUsers = [], // Alternative to onlineUsers
  totalUsers = 0, // Total members/participants
  
  // Chat statistics
  messageCount = 0,
  unreadCount = 0,
  
  // Chat metadata
  tournament = null,
  channel = null,
  customTitle = null,
  customSubtitle = null,
  
  // Chat settings/state
  //isPrivate = false,
  isMuted = false,
  notificationsEnabled = true,
  userRole = null, // 'owner', 'admin', 'member', 'moderator'
  
  // Display options
  showOnlineUsers = true,
  showTypingIndicator = true,
  showConnectionStatus = true,
  showMessageStats = true,
  showUserRoleBadge = true,
  showChatSettings = false,
  
  // Callbacks
  onToggleMute = null,
  onToggleNotifications = null,
 // onManageSettings = null,
 // onInviteUsers = null,
}) => {
  const { theme } = useTheme();
  
  // Theme classes
  const themeClasses = useMemo(() => ({
    header: theme === 'dark'
      ? 'bg-gradient-to-r from-gray-900/95 to-gray-800/95 backdrop-blur-sm border-gray-800'
      : 'bg-gradient-to-r from-white/95 to-gray-50/95 backdrop-blur-sm border-gray-200',
    textPrimary: theme === 'dark' 
      ? 'text-gray-100' 
      : 'text-gray-900',
    textSecondary: theme === 'dark' 
      ? 'text-gray-400' 
      : 'text-gray-600',
    textMuted: theme === 'dark' 
      ? 'text-gray-500' 
      : 'text-gray-400',
    border: theme === 'dark' 
      ? 'border-gray-700' 
      : 'border-gray-300',
    card: theme === 'dark'
      ? 'bg-gray-800/50 border-gray-700'
      : 'bg-gray-50/80 border-gray-200',
  }), [theme]);

  // Determine chat type and metadata
  const chatInfo = useMemo(() => {
    const info = {
      type: 'channel',
      name: customTitle || 'Chat',
      description: customSubtitle,
      isPrivate: false,
      icon: Hash,
      iconColor: 'text-blue-500',
      bgColor: 'bg-blue-500/10',
      onlineCount: onlineUsers.length || activeUsers.length || 0,
      totalCount: totalUsers || 0,
    };

    if (tournament) {
      info.type = 'tournament';
      info.name = tournament.name || 'Tournament Chat';
      info.description = 'Tournament discussion';
      info.icon = MessageSquare;
      info.iconColor = 'text-yellow-500';
      info.bgColor = 'bg-yellow-500/10';
      info.onlineCount = onlineUsers.length || 0;
      info.totalCount = tournament.participants?.length || 0;
    } else if (channel) {
      info.type = 'channel';
      info.name = channel.name || 'Channel';
      info.description = channel.description || '';
      info.isPrivate = channel.isPrivate || false;
      
      // Set icon based on channel type
      if (channel.type === 'direct') {
        info.icon = Users;
        info.iconColor = 'text-purple-500';
        info.bgColor = 'bg-purple-500/10';
      } else if (channel.type === 'group') {
        info.icon = Users;
        info.iconColor = 'text-green-500';
        info.bgColor = 'bg-green-500/10';
      } else {
        info.icon = Hash;
        info.iconColor = 'text-blue-500';
        info.bgColor = 'bg-blue-500/10';
      }
      
      info.onlineCount = onlineUsers.length || 0;
      info.totalCount = channel.memberCount || channel.members?.length || 0;
    }

    return info;
  }, [tournament, channel, customTitle, customSubtitle, onlineUsers, activeUsers, totalUsers]);

  // Typing indicator text
  const typingText = useMemo(() => {
    if (!showTypingIndicator || typingUsers.length === 0) return null;
    
    const users = typingUsers.slice(0, 3);
    const names = users.map(u => u.name || u.username || 'Someone');
    
    if (typingUsers.length === 1) return `${names[0]} is typing...`;
    if (typingUsers.length === 2) return `${names[0]} and ${names[1]} are typing...`;
    if (typingUsers.length === 3) return `${names[0]}, ${names[1]}, and ${names[2]} are typing...`;
    return `${typingUsers.length} people are typing...`;
  }, [typingUsers, showTypingIndicator]);

  // Connection status text
  const connectionStatusText = useMemo(() => {
    if (!showConnectionStatus) return null;
    
    if (connectionStatus === 'connecting') return 'Connecting...';
    if (connectionStatus === 'disconnected') return 'Disconnected';
    if (connectionStatus === 'error') return 'Connection error';
    if (!isConnected) return 'Connecting...';
    return 'Connected';
  }, [isConnected, connectionStatus, showConnectionStatus]);

  // Status indicator color
  const statusColor = useMemo(() => {
    if (connectionStatus === 'error') return 'bg-red-500';
    if (!isConnected || connectionStatus === 'disconnected') return 'bg-yellow-500';
    if (connectionStatus === 'connecting') return 'bg-yellow-500 animate-pulse';
    return 'bg-green-500';
  }, [isConnected, connectionStatus]);

  // Role badge configuration
  const roleBadgeConfig = useMemo(() => {
    const configs = {
      owner: { 
        icon: Crown, 
        text: 'Owner', 
        color: 'bg-yellow-500/20 text-yellow-600 dark:text-yellow-400 border-yellow-500/30',
        iconColor: 'text-yellow-500'
      },
      admin: { 
        icon: null, 
        text: 'Admin', 
        color: 'bg-blue-500/20 text-blue-600 dark:text-blue-400 border-blue-500/30',
        iconColor: 'text-blue-500'
      },
      moderator: { 
        icon: null, 
        text: 'Mod', 
        color: 'bg-green-500/20 text-green-600 dark:text-green-400 border-green-500/30',
        iconColor: 'text-green-500'
      },
      member: { 
        icon: null, 
        text: 'Member', 
        color: 'bg-gray-500/20 text-gray-600 dark:text-gray-400 border-gray-500/30',
        iconColor: 'text-gray-500'
      },
    };
    
    return configs[userRole] || configs.member;
  }, [userRole]);

  // Online users to display (max 5)
  const displayOnlineUsers = useMemo(() => {
    if (!showOnlineUsers) return [];
    const users = onlineUsers.length > 0 ? onlineUsers : activeUsers;
    return users.slice(0, 5);
  }, [onlineUsers, activeUsers, showOnlineUsers]);

  // Main title
  const mainTitle = useMemo(() => {
    return chatInfo.name;
  }, [chatInfo.name]);

  // Subtitle
  const subtitle = useMemo(() => {
    const parts = [];
    
    if (showMessageStats && messageCount > 0) {
      parts.push(`${messageCount} ${messageCount === 1 ? 'message' : 'messages'}`);
    }
    
    if (chatInfo.totalCount > 0) {
      parts.push(`${chatInfo.totalCount} ${chatInfo.type === 'tournament' ? 'participants' : 'members'}`);
    }
    
    if (chatInfo.onlineCount > 0) {
      parts.push(`${chatInfo.onlineCount} online`);
    }
    
    if (unreadCount > 0) {
      parts.push(`${unreadCount} unread`);
    }
    
    return parts.join(' • ') || (isConnected ? 'Connected' : 'Connecting...');
  }, [messageCount, chatInfo, unreadCount, isConnected, showMessageStats]);

  const Icon = chatInfo.icon;

  return (
    <div className={`sticky top-0 z-10 px-4 py-3 border-b shadow-sm ${themeClasses.header}`}>
      {/* Main header row */}
      <div className="flex items-center justify-between mb-2">
        {/* Left side: Chat info */}
        <div className="flex items-center space-x-3 min-w-0 flex-1">
          {/* Status indicator */}
          <div className="relative flex-shrink-0">
            <div className={`w-3 h-3 rounded-full ${statusColor} absolute -top-1 -right-1 border-2 ${theme === 'dark' ? 'border-gray-900' : 'border-white'} z-10`} />
            <div className={`w-10 h-10 rounded-xl ${chatInfo.bgColor} flex items-center justify-center`}>
              <Icon className={`w-5 h-5 ${chatInfo.iconColor}`} />
            </div>
          </div>
          
          {/* Chat details */}
          <div className="min-w-0 flex-1">
            <div className="flex items-center space-x-2">
              <h2 className={`text-base font-semibold truncate ${themeClasses.textPrimary}`}>
                {mainTitle}
              </h2>
              
              {/* Privacy badge */}
              {chatInfo.isPrivate && (
                <span className="px-1.5 py-0.5 text-xs rounded-md bg-purple-500/20 text-purple-600 dark:text-purple-400 border border-purple-500/30 flex items-center gap-1">
                  <Lock className="w-3 h-3" />
                  Private
                </span>
              )}
              
              {/* Role badge */}
              {showUserRoleBadge && userRole && userRole !== 'member' && (
                <span className={`px-1.5 py-0.5 text-xs rounded-md ${roleBadgeConfig.color} border flex items-center gap-1`}>
                  {roleBadgeConfig.icon && <roleBadgeConfig.icon className="w-3 h-3" />}
                  {roleBadgeConfig.text}
                </span>
              )}
            </div>
            
            <div className="flex items-center space-x-2 mt-0.5">
              <p className={`text-xs truncate ${themeClasses.textSecondary}`}>
                {subtitle}
              </p>
              
              {/* Connection status */}
              {showConnectionStatus && connectionStatusText && (
                <span className={`text-xs flex items-center gap-1 ${themeClasses.textMuted}`}>
                  <span className="w-1 h-1 rounded-full bg-current"></span>
                  {connectionStatusText}
                </span>
              )}
            </div>
          </div>
        </div>
        
        {/* Right side: Actions and online users */}
        <div className="flex items-center space-x-3 flex-shrink-0">
          {/* Chat settings buttons */}
          {showChatSettings && (
            <div className="flex items-center space-x-1">
              {onToggleMute && (
                <button
                  onClick={onToggleMute}
                  className={`p-1.5 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors ${
                    isMuted ? 'text-red-500' : themeClasses.textSecondary
                  }`}
                  title={isMuted ? 'Unmute' : 'Mute'}
                >
                  {isMuted ? (
                    <VolumeX className="w-4 h-4" />
                  ) : (
                    <Volume2 className="w-4 h-4" />
                  )}
                </button>
              )}
              
              {onToggleNotifications && (
                <button
                  onClick={onToggleNotifications}
                  className={`p-1.5 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors ${
                    !notificationsEnabled ? 'text-gray-500' : themeClasses.textSecondary
                  }`}
                  title={notificationsEnabled ? 'Disable notifications' : 'Enable notifications'}
                >
                  {notificationsEnabled ? (
                    <Bell className="w-4 h-4" />
                  ) : (
                    <BellOff className="w-4 h-4" />
                  )}
                </button>
              )}
            </div>
          )}
          
          {/* Online users */}
          {showOnlineUsers && displayOnlineUsers.length > 0 && (
            <div className="flex items-center space-x-2">
              <div className="flex -space-x-2">
                {displayOnlineUsers.map((user, index) => (
                  <div
                    key={user.id || index}
                    className={`w-7 h-7 rounded-full border-2 ${
                      theme === 'dark' ? 'border-gray-900' : 'border-white'
                    } flex items-center justify-center text-xs font-medium bg-gradient-to-br from-blue-500 to-purple-600 text-white shadow-sm`}
                    style={{ zIndex: 10 - index }}
                    title={user.name || user.username || 'User'}
                  >
                    {(user.name || user.username || 'U').charAt(0).toUpperCase()}
                  </div>
                ))}
                
                {/* More users indicator */}
                {chatInfo.onlineCount > displayOnlineUsers.length && (
                  <div
                    className={`w-7 h-7 rounded-full border-2 ${
                      theme === 'dark' ? 'border-gray-900' : 'border-white'
                    } flex items-center justify-center text-xs font-medium ${themeClasses.card} ${themeClasses.textSecondary} shadow-sm`}
                    title={`${chatInfo.onlineCount - displayOnlineUsers.length} more online`}
                  >
                    +{chatInfo.onlineCount - displayOnlineUsers.length}
                  </div>
                )}
              </div>
              
              {/* Online count badge */}
              {chatInfo.onlineCount > 0 && (
                <div className="text-xs px-1.5 py-0.5 rounded-md bg-green-500/20 text-green-600 dark:text-green-400">
                  {chatInfo.onlineCount} online
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      
      {/* Typing indicator */}
      {typingText && (
        <div className="mt-2 flex items-center space-x-2 text-xs animate-fade-in">
          <div className="flex space-x-1">
            <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
            <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
            <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
          <span className={`italic ${themeClasses.textSecondary}`}>{typingText}</span>
        </div>
      )}
      
      {/* Chat description */}
      {chatInfo.description && (
        <div className="mt-2">
          <p className={`text-xs ${themeClasses.textMuted} line-clamp-2`}>
            {chatInfo.description}
          </p>
        </div>
      )}
      
      {/* Connection status bar */}
      {!isConnected && (
        <div className="mt-2 px-3 py-1.5 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              {connectionStatus === 'connecting' ? (
                <Loader2 className="w-3 h-3 text-yellow-500 animate-spin" />
              ) : (
                <WifiOff className="w-3 h-3 text-yellow-500" />
              )}
              <span className="text-xs text-yellow-600 dark:text-yellow-400">
                {connectionStatusText}
              </span>
            </div>
            <button
              onClick={() => window.location.reload()}
              className="text-xs px-2 py-1 rounded bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-600 dark:text-yellow-400 transition-colors"
            >
              Retry
            </button>
          </div>
        </div>
      )}
    </div>
  );
});

ChatHeader.displayName = 'ChatHeader';

export default ChatHeader;