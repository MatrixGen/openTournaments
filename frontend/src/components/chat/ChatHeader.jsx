// ChatHeader.jsx - Optimized with your color scheme
import { memo, useMemo } from 'react';
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
  connectionStatus = null,
  
  // User presence data
  typingUsers = [],
  onlineUsers = [],
  activeUsers = [],
  totalUsers = 0,
  
  // Chat statistics
  messageCount = 0,
  unreadCount = 0,
  
  // Chat metadata
  tournament = null,
  channel = null,
  customTitle = null,
  customSubtitle = null,
  
  // Chat settings/state
  isMuted = false,
  notificationsEnabled = true,
  userRole = null,
  
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
}) => {
  // Determine chat type and metadata
  const chatInfo = useMemo(() => {
    const info = {
      type: 'channel',
      name: customTitle || 'Chat',
      description: customSubtitle,
      isPrivate: false,
      icon: Hash,
      iconColor: 'text-blue-500 dark:text-blue-400',
      bgColor: 'bg-blue-500/10 dark:bg-blue-900/20',
      onlineCount: onlineUsers.length || activeUsers.length || 0,
      totalCount: totalUsers || 0,
    };

    if (tournament) {
      info.type = 'tournament';
      info.name = tournament.name || 'Tournament Chat';
      info.description = 'Tournament discussion';
      info.icon = MessageSquare;
      info.iconColor = 'text-amber-500 dark:text-amber-400';
      info.bgColor = 'bg-amber-500/10 dark:bg-amber-900/20';
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
        info.iconColor = 'text-primary-600 dark:text-primary-400';
        info.bgColor = 'bg-primary-500/10 dark:bg-primary-900/20';
      } else if (channel.type === 'group') {
        info.icon = Users;
        info.iconColor = 'text-emerald-500 dark:text-emerald-400';
        info.bgColor = 'bg-emerald-500/10 dark:bg-emerald-900/20';
      } else {
        info.icon = Hash;
        info.iconColor = 'text-blue-500 dark:text-blue-400';
        info.bgColor = 'bg-blue-500/10 dark:bg-blue-900/20';
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
    if (connectionStatus === 'error') return 'bg-red-500 dark:bg-red-600';
    if (!isConnected || connectionStatus === 'disconnected') return 'bg-amber-500 dark:bg-amber-600';
    if (connectionStatus === 'connecting') return 'bg-amber-500 dark:bg-amber-600 animate-pulse';
    return 'bg-emerald-500 dark:bg-emerald-600';
  }, [isConnected, connectionStatus]);

  // Role badge configuration
  const roleBadgeConfig = useMemo(() => {
    const configs = {
      owner: { 
        icon: Crown, 
        text: 'Owner', 
        color: 'bg-amber-500/20 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border border-amber-500/30 dark:border-amber-700/50',
        iconColor: 'text-amber-500 dark:text-amber-400'
      },
      admin: { 
        icon: null, 
        text: 'Admin', 
        color: 'bg-blue-500/20 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border border-blue-500/30 dark:border-blue-700/50',
        iconColor: 'text-blue-500 dark:text-blue-400'
      },
      moderator: { 
        icon: null, 
        text: 'Mod', 
        color: 'bg-emerald-500/20 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 dark:border-emerald-700/50',
        iconColor: 'text-emerald-500 dark:text-emerald-400'
      },
      member: { 
        icon: null, 
        text: 'Member', 
        color: 'bg-gray-500/20 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-500/30 dark:border-gray-700/50',
        iconColor: 'text-gray-500 dark:text-gray-400'
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
    <div className="sticky top-0 z-10 px-4 py-3 border-b border-gray-200 dark:border-gray-800 bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm shadow-sm">
      {/* Main header row */}
      <div className="flex items-center justify-between mb-2">
        {/* Left side: Chat info */}
        <div className="flex items-center space-x-3 min-w-0 flex-1">
          {/* Status indicator */}
          <div className="relative flex-shrink-0">
            <div className={`w-3 h-3 rounded-full ${statusColor} absolute -top-1 -right-1 border-2 border-white dark:border-gray-900 z-10`} />
            <div className={`w-10 h-10 rounded-xl ${chatInfo.bgColor} flex items-center justify-center`}>
              <Icon className={`w-5 h-5 ${chatInfo.iconColor}`} />
            </div>
          </div>
          
          {/* Chat details */}
          <div className="min-w-0 flex-1">
            <div className="flex items-center space-x-2">
              <h2 className="text-base font-semibold truncate text-gray-900 dark:text-gray-100">
                {chatInfo.name}
              </h2>
              
              {/* Privacy badge */}
              {chatInfo.isPrivate && (
                <span className="px-1.5 py-0.5 text-xs rounded-md bg-primary-500/20 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 border border-primary-500/30 dark:border-primary-700/50 flex items-center gap-1">
                  <Lock className="w-3 h-3" />
                  Private
                </span>
              )}
              
              {/* Role badge */}
              {showUserRoleBadge && userRole && userRole !== 'member' && (
                <span className={`px-1.5 py-0.5 text-xs rounded-md ${roleBadgeConfig.color} flex items-center gap-1`}>
                  {roleBadgeConfig.icon && <roleBadgeConfig.icon className="w-3 h-3" />}
                  {roleBadgeConfig.text}
                </span>
              )}
            </div>
            
            <div className="flex items-center space-x-2 mt-0.5">
              <p className="text-xs truncate text-gray-600 dark:text-gray-400">
                {subtitle}
              </p>
              
              {/* Connection status */}
              {showConnectionStatus && connectionStatusText && (
                <span className="text-xs flex items-center gap-1 text-gray-500 dark:text-gray-500">
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
                  className={`p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors ${
                    isMuted ? 'text-red-500 dark:text-red-400' : 'text-gray-600 dark:text-gray-400'
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
                  className={`p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors ${
                    !notificationsEnabled ? 'text-gray-500 dark:text-gray-600' : 'text-gray-600 dark:text-gray-400'
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
                    className="w-7 h-7 rounded-full border-2 border-white dark:border-gray-900 flex items-center justify-center text-xs font-medium bg-gradient-to-br from-blue-500 to-primary-600 text-white shadow-sm"
                    style={{ zIndex: 10 - index }}
                    title={user.name || user.username || 'User'}
                  >
                    {(user.name || user.username || 'U').charAt(0).toUpperCase()}
                  </div>
                ))}
                
                {/* More users indicator */}
                {chatInfo.onlineCount > displayOnlineUsers.length && (
                  <div
                    className="w-7 h-7 rounded-full border-2 border-white dark:border-gray-900 flex items-center justify-center text-xs font-medium bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400 shadow-sm"
                    title={`${chatInfo.onlineCount - displayOnlineUsers.length} more online`}
                  >
                    +{chatInfo.onlineCount - displayOnlineUsers.length}
                  </div>
                )}
              </div>
              
              {/* Online count badge */}
              {chatInfo.onlineCount > 0 && (
                <div className="text-xs px-1.5 py-0.5 rounded-md bg-emerald-500/20 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300">
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
            <div className="w-1.5 h-1.5 bg-blue-500 dark:bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
            <div className="w-1.5 h-1.5 bg-blue-500 dark:bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
            <div className="w-1.5 h-1.5 bg-blue-500 dark:bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
          <span className="italic text-gray-600 dark:text-gray-400">{typingText}</span>
        </div>
      )}
      
      {/* Chat description */}
      {chatInfo.description && (
        <div className="mt-2">
          <p className="text-xs text-gray-500 dark:text-gray-500 line-clamp-2">
            {chatInfo.description}
          </p>
        </div>
      )}
      
      {/* Connection status bar */}
      {!isConnected && (
        <div className="mt-2 px-3 py-1.5 rounded-lg bg-amber-500/10 dark:bg-amber-900/20 border border-amber-500/20 dark:border-amber-700/30">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              {connectionStatus === 'connecting' ? (
                <Loader2 className="w-3 h-3 text-amber-500 dark:text-amber-400 animate-spin" />
              ) : (
                <WifiOff className="w-3 h-3 text-amber-500 dark:text-amber-400" />
              )}
              <span className="text-xs text-amber-700 dark:text-amber-300">
                {connectionStatusText}
              </span>
            </div>
            <button
              onClick={() => window.location.reload()}
              className="text-xs px-2 py-1 rounded bg-amber-500/20 dark:bg-amber-900/30 hover:bg-amber-500/30 dark:hover:bg-amber-900/40 text-amber-700 dark:text-amber-300 transition-colors"
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