// MessageList.js
import React, { forwardRef, useCallback, memo, useMemo } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { useChat } from '../../contexts/ChatContext';
import MessageBubble from './MessageBubble';
import { useAuth } from '../../contexts/AuthContext';

const MessageList = forwardRef(({
  // Only essential props that are truly specific to this component
  tournament,
  onReply, // Keep this as prop since it's UI-specific action
  replyToMessage, // Keep this as prop since it's transient UI state
}, ref) => {
  // Get data from context
  const { 
    messages, 
    isLoading, 
    isConnected,
    chatUser,
    retryFailedMessage,
    onReactToMessage: onReact,
    onEditMessage: onEdit,
    onDeleteMessage: onDelete
  } = useChat();

  console.log('messages in Messege list:',messages);
  
  
  const { user: authUser } = useAuth();
  const { theme } = useTheme();

  // Determine current user ID (prefer chat context user, fallback to auth user)
  const currentUserId = useMemo(() => 
    chatUser?.user.id,
    [chatUser]
  );

  // Determine if user is participant (can be enhanced with tournament data)
  const isUserParticipant = useMemo(() => {
    if (!tournament || !currentUserId) return false;
    
    // Check if user is in participants
    const participants = tournament.participants || tournament.players || [];
    return participants.some(p => p.user.id === authUser?.id);
  }, [tournament,authUser.id,currentUserId]);

  // Handle retry for failed messages
  const handleRetry = useCallback(async (failedMessage) => {
    try {
      await retryFailedMessage(failedMessage);
    } catch (error) {
      console.error('Failed to retry message:', error);
    }
  }, []);

  const themeClasses = {
    messagesArea: theme === 'dark'
      ? 'bg-gray-800/30'
      : 'bg-gray-50',
  };

  // Group messages by sender and time
  const groupedMessages = useMemo(() => {
    const groups = [];
    let currentGroup = [];
    
    messages.forEach((msg, index) => {
      const prevMsg = messages[index - 1];
      const timeDiff = prevMsg ? 
        new Date(msg.created_at || msg.createdAt).getTime() - 
        new Date(prevMsg.created_at || prevMsg.createdAt).getTime() : 
        Infinity;
      
      // Group messages within 5 minutes and from same sender
      const sameSender = prevMsg && 
        (msg.sender?.id || msg.userId) === (prevMsg.sender?.id || prevMsg.userId);
      
      if (timeDiff > 300000 || !sameSender) {
        if (currentGroup.length > 0) {
          groups.push(currentGroup);
        }
        currentGroup = [msg];
      } else {
        currentGroup.push(msg);
      }
    });
    
    if (currentGroup.length > 0) {
      groups.push(currentGroup);
    }
    
    return groups;
  }, [messages]);

  // Render empty states
  const renderEmptyState = useCallback(() => {
    // Not connected state
    if (!isConnected) {
      return (
        <div className="flex flex-col items-center justify-center h-full text-center p-4">
          <div className="text-4xl mb-4">🔌</div>
          <p className="font-medium mb-2">Connecting...</p>
          <p className="text-gray-500 dark:text-gray-400">
            Establishing chat connection
          </p>
        </div>
      );
    }

    if (!isUserParticipant) {
      return (
        <div className="flex flex-col items-center justify-center h-full text-center p-4">
          <div className="text-4xl mb-4">🔒</div>
          <p className="font-medium mb-2">Join Tournament</p>
          <p className="text-gray-500 dark:text-gray-400">
            Participate in the tournament to access the chat
          </p>
        </div>
      );
    }

    if (!tournament?.chat_channel_id) {
      return (
        <div className="flex flex-col items-center justify-center h-full text-center p-4">
          <div className="text-4xl mb-4">💬</div>
          <p className="font-medium mb-2">Chat Disabled</p>
          <p className="text-gray-500 dark:text-gray-400">
            Chat has not been enabled for this tournament
          </p>
        </div>
      );
    }

    if (isLoading) {
      return (
        <div className="flex flex-col items-center justify-center h-full">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          <div className="mt-4 text-gray-500 dark:text-gray-400">Loading messages...</div>
        </div>
      );
    }

    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-4">
        <div className="text-4xl mb-4">👋</div>
        <p className="font-medium mb-2">Start the Conversation</p>
        <p className="text-gray-500 dark:text-gray-400">
          Send the first message to get things started!
        </p>
      </div>
    );
  }, [isConnected, isUserParticipant, tournament, isLoading]);

  // Early return for empty states
  if (!isConnected || !isUserParticipant || !tournament?.chat_channel_id || messages.length === 0) {
    return renderEmptyState();
  }

  // Render message groups
  const messageGroups = groupedMessages;

  return (
    <div
      ref={ref}
      className={`flex-1 overflow-y-auto overscroll-contain p-4 ${themeClasses.messagesArea}`}
      style={{
        minHeight: 0,
        WebkitOverflowScrolling: 'touch',
      }}
    >
      <div className="space-y-4">
        {messageGroups.map((group, groupIndex) => {
          const firstMessage = group[0];
          const sender = firstMessage.sender || firstMessage.user;
          const isCurrentUser = (sender?.id || firstMessage.userId) === currentUserId;
          const showDate = groupIndex === 0 || 
            new Date(firstMessage.created_at || firstMessage.createdAt).toDateString() !== 
            new Date(messageGroups[groupIndex - 1][0].created_at || 
                   messageGroups[groupIndex - 1][0].createdAt).toDateString();

          return (
            <div key={`group-${groupIndex}`} className="space-y-1">
              {/* Date separator */}
              {showDate && (
                <div className="flex justify-center my-4">
                  <span className="px-3 py-1 text-xs text-gray-500 bg-gray-100 dark:bg-gray-800 rounded-full">
                    {new Date(firstMessage.created_at || firstMessage.createdAt).toLocaleDateString([], {
                      weekday: 'long',
                      month: 'short',
                      day: 'numeric'
                    })}
                  </span>
                </div>
              )}

              {/* Group header (sender info for non-current user) */}
              {!isCurrentUser && (
                <div className="flex items-center space-x-2 ml-1 mb-1">
                  <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center text-xs text-white font-medium">
                    {(sender?.name || sender?.username || 'U').charAt(0).toUpperCase()}
                  </div>
                  <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                    {sender?.name || sender?.username || 'Unknown User'}
                  </span>
                </div>
              )}

              {/* Message bubbles in group */}
              <div className={`flex ${isCurrentUser ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] ${isCurrentUser ? 'ml-auto' : ''}`}>
                  {group.map((message, index) => (
                    <MessageBubble
                      key={message.id || message.tempId}
                      message={message}
                      isCurrentUser={isCurrentUser}
                      isFirstInGroup={index === 0}
                      isLastInGroup={index === group.length - 1}
                      showAvatar={!isCurrentUser && index === 0}
                      onReact={onReact}
                      onEdit={onEdit}
                      onDelete={onDelete}
                      onReply={onReply}
                      onRetry={handleRetry}
                      isHighlighted={replyToMessage?.id === message.id}
                    />
                  ))}
                </div>
              </div>
            </div>
          );
        })}
        {/* Scroll anchor */}
        <div ref={ref} />
      </div>
    </div>
  );
});

MessageList.displayName = 'MessageList';
export default memo(MessageList);