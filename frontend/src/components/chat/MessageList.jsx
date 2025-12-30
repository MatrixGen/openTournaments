// MessageList.js - Flexible for both tournament and channel chats
import React, { forwardRef, useCallback, memo, useMemo } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { useChat } from '../../contexts/ChatContext';
import { useAuth } from '../../contexts/AuthContext';
import MessageBubble from './MessageBubble';
import { 
  MessageSquare, 
  Users, 
  Lock, 
  Wifi, 
  WifiOff,
  Loader,
  AlertCircle,
  Smile
} from 'lucide-react';

const MessageList = forwardRef(({
  // Optional props for specific use cases
  tournament = null,
  channel = null,
  onReply,
  replyToMessage,
  showWelcomeMessage = true,
  customEmptyState = null,
  showTypingIndicators = true,
}, ref) => {
  // Get data from contexts
  const { 
    messages, 
    isLoading, 
    isConnected,
    chatUser,
    retryFailedMessage,
    onReactToMessage: onReact,
    onEditMessage: onEdit,
    onDeleteMessage: onDelete,
    typingUsers = [],
    currentChannel,
    error: chatError
  } = useChat();

  const { user: authUser } = useAuth();
  const { theme } = useTheme();

  // Determine current user ID from multiple possible sources
  const currentUserId = useMemo(() => {
    // Priority 1: Chat context user
    if (chatUser?.user?.id) return chatUser.user.id;
    if (chatUser?.id) return chatUser.id;
    
    // Priority 2: Auth user
    if (authUser?.id) return authUser.id;
    
    // Priority 3: Channel creator for DMs
    if (channel?.createdBy) return channel.createdBy;
    
    return null;
  }, [chatUser, authUser, channel]);

  // Determine chat type and access permissions
  const chatConfig = useMemo(() => {
    const isTournamentChat = !!tournament;
    const isChannelChat = !!channel || !!currentChannel;
    
    // Determine if user has access
    let hasAccess = false;
    let accessReason = '';
    let isMember = false;
    let isParticipant = false;
    
    if (isTournamentChat) {
      // Check tournament participation
      const participants = tournament?.participants || tournament?.players || [];
      isParticipant = participants.some(p => 
        p.user?.id === currentUserId || 
        p.user_id === currentUserId ||
        p.id === currentUserId||
        p.id=== authUser?.id
        
      );
      hasAccess = isParticipant;
      accessReason = isParticipant ? 'participant' : 'non_participant';
    } 
    else if (isChannelChat) {
      // Check channel membership
      const channelData = channel || currentChannel;
      isMember = channelData?.isMember || false;
      const isPublic = !channelData?.isPrivate;
      hasAccess = isMember || isPublic;
      accessReason = isMember ? 'member' : isPublic ? 'public_access' : 'non_member';
    }
    else {
      // General chat (fallback)
      hasAccess = true;
      accessReason = 'general';
    }
    
    return {
      isTournamentChat,
      isChannelChat,
      hasAccess,
      accessReason,
      isMember,
      isParticipant,
      channelType: channel?.type || currentChannel?.type || 'general',
      isPrivate: channel?.isPrivate || currentChannel?.isPrivate || false
    };
  }, [tournament, channel, currentChannel, currentUserId]);

  // Handle retry for failed messages
  const handleRetry = useCallback(async (failedMessage) => {
    try {
      await retryFailedMessage(failedMessage);
    } catch (error) {
      console.error('Failed to retry message:', error);
    }
  }, [retryFailedMessage]);

  // Theme classes
  const themeClasses = {
    messagesArea: theme === 'dark'
      ? 'bg-gradient-to-b from-gray-900 via-gray-900/95 to-gray-900/90'
      : 'bg-gradient-to-b from-gray-50 via-white to-white',
    textPrimary: theme === 'dark' ? 'text-gray-100' : 'text-gray-900',
    textSecondary: theme === 'dark' ? 'text-gray-400' : 'text-gray-600',
    textAccent: theme === 'dark' ? 'text-blue-400' : 'text-blue-600',
    bgCard: theme === 'dark' ? 'bg-gray-800/50' : 'bg-white/80',
    borderColor: theme === 'dark' ? 'border-gray-700' : 'border-gray-200',
  };

  // Group messages by sender and time with enhanced grouping
  const groupedMessages = useMemo(() => {
    if (!messages || messages.length === 0) return [];
    
    const groups = [];
    let currentGroup = [];
    let lastSenderId = null;
    let lastTimestamp = null;
    
    messages.forEach((msg, index) => {
      const msgTimestamp = new Date(msg.created_at || msg.createdAt || Date.now());
      const msgSenderId = msg.sender?.id || msg.user?.id || msg.userId;
      
      // Determine if should start new group
      const timeDiff = lastTimestamp ? 
        msgTimestamp.getTime() - lastTimestamp.getTime() : 
        Infinity;
      
      const isSameSender = msgSenderId === lastSenderId;
      const isWithinTimeLimit = timeDiff < 300000; // 5 minutes
      const isSameDay = lastTimestamp ? 
        msgTimestamp.toDateString() === lastTimestamp.toDateString() : 
        true;
      
      if (!isSameSender || !isWithinTimeLimit || !isSameDay) {
        if (currentGroup.length > 0) {
          groups.push({
            senderId: lastSenderId,
            sender: messages[index - 1]?.sender || messages[index - 1]?.user,
            messages: currentGroup,
            date: lastTimestamp
          });
        }
        currentGroup = [msg];
      } else {
        currentGroup.push(msg);
      }
      
      lastSenderId = msgSenderId;
      lastTimestamp = msgTimestamp;
    });
    
    // Add the last group
    if (currentGroup.length > 0) {
      groups.push({
        senderId: lastSenderId,
        sender: messages[messages.length - 1]?.sender || messages[messages.length - 1]?.user,
        messages: currentGroup,
        date: lastTimestamp
      });
    }
    
    return groups;
  }, [messages]);

  // Render typing indicators
  const renderTypingIndicator = useCallback(() => {
    if (!showTypingIndicators || typingUsers.length === 0) return null;
    
    return (
      <div className="px-4 py-2 animate-pulse">
        <div className="flex items-center space-x-2">
          <div className="flex space-x-1">
            {[1, 2, 3].map((dot) => (
              <div
                key={dot}
                className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"
                style={{ animationDelay: `${dot * 0.1}s` }}
              />
            ))}
          </div>
          <span className="text-sm text-gray-500 dark:text-gray-400">
            {typingUsers.length === 1 
              ? `${typingUsers[0]} is typing...`
              : `${typingUsers.length} people are typing...`
            }
          </span>
        </div>
      </div>
    );
  }, [typingUsers, showTypingIndicators]);

  // Render connection status banner
  const renderConnectionStatus = useCallback(() => {
    if (isConnected) return null;
    
    return (
      <div className="sticky top-0 z-10 px-4 py-3 bg-yellow-500/10 border-b border-yellow-500/20 backdrop-blur-sm">
        <div className="flex items-center justify-center space-x-2">
          <WifiOff className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />
          <span className="text-sm font-medium text-yellow-600 dark:text-yellow-400">
            Connecting to chat...
          </span>
        </div>
      </div>
    );
  }, [isConnected]);

  // Render welcome message for new chats
  const renderWelcomeMessage = useCallback(() => {
    if (!showWelcomeMessage || messages.length > 0 || isLoading) return null;
    
    const chatName = tournament?.name || channel?.name || currentChannel?.name || 'Chat';
    const isDirectMessage = chatConfig.channelType === 'direct';
    
    return (
      <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center mb-4 shadow-lg">
          {isDirectMessage ? (
            <Users className="w-8 h-8 text-white" />
          ) : (
            <MessageSquare className="w-8 h-8 text-white" />
          )}
        </div>
        
        <h3 className="text-xl font-bold mb-2">
          {isDirectMessage ? 'Direct Message Started' : `Welcome to ${chatName}`}
        </h3>
        
        <p className="max-w-md mx-auto mb-6">
          {isDirectMessage
            ? 'This is the beginning of your direct message conversation. Say hello!'
            : chatConfig.isChannelChat
              ? `This is the start of the ${chatName} channel. Send a message to get things started!`
              : `Welcome to the ${chatName} tournament chat. Introduce yourself to other participants!`
          }
        </p>
        
        {chatConfig.isPrivate && !chatConfig.isMember && (
          <div className="flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-400">
            <Lock className="w-4 h-4" />
            <span>This is a private channel. Only members can see messages.</span>
          </div>
        )}
      </div>
    );
  }, [
    showWelcomeMessage, 
    messages.length, 
    isLoading, 
    tournament, 
    channel, 
    currentChannel, 
    chatConfig
  ]);

  // Enhanced empty states based on chat type and status
  const renderEmptyState = useCallback(() => {
    // Custom empty state override
    if (customEmptyState) return customEmptyState;

    // Connection states
    if (!isConnected) {
      return (
        <div className="flex flex-col items-center justify-center h-full p-6 text-center">
          <div className="relative mb-6">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-800 flex items-center justify-center animate-pulse">
              <WifiOff className="w-10 h-10 text-gray-400 dark:text-gray-500" />
            </div>
            <div className="absolute -inset-2 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-full animate-ping"></div>
          </div>
          <h3 className="text-xl font-bold mb-2">Connecting to Chat</h3>
          <p className="text-gray-500 dark:text-gray-400 mb-6 max-w-sm">
            Establishing a secure connection to the chat server...
          </p>
          <div className="flex items-center space-x-2 text-sm text-blue-500 dark:text-blue-400">
            <Loader className="w-4 h-4 animate-spin" />
            <span>Attempting to reconnect</span>
          </div>
        </div>
      );
    }

    // Access/permission states
    if (!chatConfig.hasAccess) {
      if (chatConfig.isTournamentChat) {
        return (
          <div className="flex flex-col items-center justify-center h-full p-6 text-center">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-yellow-500/20 to-yellow-600/20 flex items-center justify-center mb-6">
              <AlertCircle className="w-10 h-10 text-yellow-600 dark:text-yellow-400" />
            </div>
            <h3 className="text-xl font-bold mb-2">Tournament Access Required</h3>
            <p className="text-gray-500 dark:text-gray-400 mb-6 max-w-sm">
              You need to be a participant in this tournament to access the chat.
            </p>
            {tournament && (
              <button
                onClick={() => window.location.href = `/tournaments/${tournament.id}`}
                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium"
              >
                View Tournament Details
              </button>
            )}
          </div>
        );
      } else if (chatConfig.isPrivate) {
        return (
          <div className="flex flex-col items-center justify-center h-full p-6 text-center">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-purple-500/20 to-purple-600/20 flex items-center justify-center mb-6">
              <Lock className="w-10 h-10 text-purple-600 dark:text-purple-400" />
            </div>
            <h3 className="text-xl font-bold mb-2">Private Channel</h3>
            <p className="text-gray-500 dark:text-gray-400 mb-6 max-w-sm">
              This is a private channel. You need an invitation to join and view messages.
            </p>
            {channel && !channel.isMember && (
              <button
                onClick={() => {
                  // Join channel logic would go here
                  console.log('Request to join channel:', channel.id);
                }}
                className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors font-medium"
              >
                Request to Join
              </button>
            )}
          </div>
        );
      }
    }

    // Loading state
    if (isLoading) {
      return (
        <div className="flex flex-col items-center justify-center h-full p-6">
          <div className="relative mb-6">
            <div className="w-16 h-16 rounded-full border-4 border-blue-500 border-t-transparent animate-spin"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <MessageSquare className="w-8 h-8 text-blue-500 animate-pulse" />
            </div>
          </div>
          <p className="text-gray-500 dark:text-gray-400 animate-pulse">
            Loading messages...
          </p>
        </div>
      );
    }

    // Chat error state
    if (chatError) {
      return (
        <div className="flex flex-col items-center justify-center h-full p-6 text-center">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-red-500/20 to-red-600/20 flex items-center justify-center mb-6">
            <AlertCircle className="w-10 h-10 text-red-600 dark:text-red-400" />
          </div>
          <h3 className="text-xl font-bold mb-2">Chat Error</h3>
          <p className="text-gray-500 dark:text-gray-400 mb-6 max-w-sm">
            {chatError.message || 'Unable to load messages. Please try again.'}
          </p>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium"
          >
            Reload Chat
          </button>
        </div>
      );
    }

    // No messages state (with welcome message)
    return renderWelcomeMessage() || (
      <div className="flex flex-col items-center justify-center h-full p-6 text-center">
        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-green-500/20 to-green-600/20 flex items-center justify-center mb-6">
          <Smile className="w-10 h-10 text-green-600 dark:text-green-400" />
        </div>
        <h3 className="text-xl font-bold mb-2">No Messages Yet</h3>
        <p className="text-gray-500 dark:text-gray-400 max-w-sm">
          Be the first to start the conversation!
        </p>
      </div>
    );
  }, [
    customEmptyState,
    isConnected,
    chatConfig,
    isLoading,
    chatError,
    tournament,
    channel,
    renderWelcomeMessage
  ]);

  // Main render logic
  if (!isConnected || !chatConfig.hasAccess || isLoading) {
    return (
      <div
        ref={ref}
        className={`flex-1 overflow-y-auto overscroll-contain ${themeClasses.messagesArea}`}
        style={{ minHeight: 0, WebkitOverflowScrolling: 'touch' }}
      >
        {renderConnectionStatus()}
        {renderEmptyState()}
      </div>
    );
  }

  if (messages.length === 0) {
    return (
      <div
        ref={ref}
        className={`flex-1 overflow-y-auto overscroll-contain ${themeClasses.messagesArea}`}
        style={{ minHeight: 0, WebkitOverflowScrolling: 'touch' }}
      >
        {renderConnectionStatus()}
        {renderEmptyState()}
      </div>
    );
  }

  return (
    <div
      ref={ref}
      className={`flex-1 overflow-y-auto overscroll-contain ${themeClasses.messagesArea}`}
      style={{ minHeight: 0, WebkitOverflowScrolling: 'touch' }}
    >
      {renderConnectionStatus()}
      
      {/* Welcome message for new chats */}
      {renderWelcomeMessage()}
      
      {/* Messages container */}
      <div className="px-4 pb-4 space-y-6">
        {groupedMessages.map((group, groupIndex) => {
          const { sender, messages: groupMessages, date } = group;
          const isCurrentUser = sender?.id === currentUserId || group.senderId === currentUserId;
          const showDateSeparator = groupIndex === 0 || 
            date?.toDateString() !== groupedMessages[groupIndex - 1]?.date?.toDateString();

          return (
            <div key={`group-${groupIndex}-${sender?.id || 'unknown'}`} className="space-y-1">
              {/* Date separator */}
              {showDateSeparator && (
                <div className="flex justify-center my-4">
                  <div className={`px-4 py-1.5 rounded-full text-xs font-medium ${themeClasses.bgCard} ${themeClasses.borderColor} border backdrop-blur-sm`}>
                    {date?.toLocaleDateString([], {
                      weekday: 'long',
                      month: 'short',
                      day: 'numeric',
                      year: groupIndex === 0 ? 'numeric' : undefined
                    })}
                  </div>
                </div>
              )}

              {/* Group header for other users */}
              {!isCurrentUser && sender && (
                <div className="flex items-center space-x-2 px-1 mb-1">
                  <div className="relative">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-xs text-white font-medium shadow">
                      {(sender.name || sender.username || 'U').charAt(0).toUpperCase()}
                    </div>
                    {sender.status === 'online' && (
                      <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-white dark:border-gray-800"></div>
                    )}
                  </div>
                  <div>
                    <span className="text-sm font-medium">
                      {sender.name || sender.username || 'Unknown User'}
                    </span>
                    {sender.role && (
                      <span className="ml-2 text-xs px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-600 dark:text-blue-400">
                        {sender.role}
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Message bubbles */}
              <div className={`space-y-1 ${isCurrentUser ? 'pl-12' : 'pr-12'}`}>
                {groupMessages.map((message, msgIndex) => {
                  const isFirstInGroup = msgIndex === 0;
                  const isLastInGroup = msgIndex === groupMessages.length - 1;
                  const showAvatar = !isCurrentUser && isFirstInGroup;
                  
                  return (
                    <MessageBubble
                      key={message.id || message.tempId}
                      message={message}
                      isCurrentUser={isCurrentUser}
                      isFirstInGroup={isFirstInGroup}
                      isLastInGroup={isLastInGroup}
                      showAvatar={showAvatar}
                      avatarUrl={sender?.profilePicture || sender?.avatar}
                      senderName={sender?.name || sender?.username}
                      onReact={onReact}
                      onEdit={onEdit}
                      onDelete={onDelete}
                      onReply={onReply}
                      onRetry={handleRetry}
                      isHighlighted={replyToMessage?.id === message.id}
                      showTimestamp={isLastInGroup}
                      theme={theme}
                    />
                  );
                })}
              </div>
            </div>
          );
        })}
        
        {/* Typing indicators */}
        {renderTypingIndicator()}
        
        {/* Scroll anchor */}
        <div ref={ref} />
      </div>
    </div>
  );
});

MessageList.displayName = 'MessageList';

export default memo(MessageList);