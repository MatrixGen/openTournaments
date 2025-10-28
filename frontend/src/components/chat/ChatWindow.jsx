// components/chat/ChatWindow.jsx
import { useState, useRef, useEffect, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useChat } from '../../contexts/ChatContext';

export default function ChatWindow({ 
  messages = [],
  onSendMessage,
  onRetryFailedMessage,
  currentChannel,
  isConnected,
  isLoading,
  isUserParticipant,
  tournament,
  typingUsers = [],
  onlineUsers = [],
  startTyping,
  stopTyping
}) {
  const { user } = useAuth();
  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [showNewMessageAlert, setShowNewMessageAlert] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const {chatUser} = useChat()
  
  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const previousMessagesLengthRef = useRef(0);
  const isUserAtBottomRef = useRef(true);
  const typingTimeoutRef = useRef(null);

  // Comprehensive user identification strategy
  const getMessageUserId = useCallback((msg) => {
    // Check all possible user identifier fields in order of priority
    if (msg.sender?.id) return msg.sender.id;
    if (msg.user?.id) return msg.user.id;
    if (msg.userId) return msg.userId;
    if (msg.sender_id) return msg.sender_id;
    
    console.warn('Could not identify user for message:', msg);
    return null;
  }, []);

  const getMessageSenderInfo = useCallback((msg) => {
    // Extract sender information from all possible fields
    const senderInfo = {
      id: getMessageUserId(msg),
      username: msg.sender?.username || msg.user?.username || 'Unknown User',
      avatar: msg.sender?.avatar || msg.user?.avatar,
    };
    
    // If we have a sender object but no username, try to extract from nested structures
    if (!senderInfo.username && msg.sender) {
      senderInfo.username = msg.sender.name || msg.sender.displayName || 'Unknown User';
    }
    
    return senderInfo;
  }, [getMessageUserId]);

  const isUserMessage = useCallback((msg) => {

    if (!chatUser?.id) return false;
    
    const messageUserId = getMessageUserId(msg);
    return messageUserId === chatUser.id;
  }, [chatUser?.id, getMessageUserId]);

  // Enhanced message comparison for avatar display
  const shouldShowAvatar = useCallback((currentMsg, previousMsg) => {
    if (!currentMsg || isUserMessage(currentMsg)) return false;
    if (!previousMsg) return true;
    
    const currentSenderId = getMessageUserId(currentMsg);
    const previousSenderId = getMessageUserId(previousMsg);
    
    // Show avatar if:
    // 1. Previous message doesn't exist OR
    // 2. Previous message is from current user OR
    // 3. Previous message is from different user
    return !previousMsg || isUserMessage(previousMsg) || currentSenderId !== previousSenderId;
  }, [isUserMessage, getMessageUserId]);

  // Track scroll position
  const handleScroll = useCallback(() => {
    const container = messagesContainerRef.current;
    if (!container) return;

    const { scrollTop, scrollHeight, clientHeight } = container;
    const isAtBottom = scrollHeight - scrollTop - clientHeight < 100;
    
    isUserAtBottomRef.current = isAtBottom;
    
    if (isAtBottom && showNewMessageAlert) {
      setShowNewMessageAlert(false);
      setUnreadCount(0);
    }
  }, [showNewMessageAlert]);

  // Check for new messages and show alert if user isn't at bottom
  useEffect(() => {
    if (messages.length > previousMessagesLengthRef.current && !isUserAtBottomRef.current) {
      const newMessageCount = messages.length - previousMessagesLengthRef.current;
      setUnreadCount(prev => prev + newMessageCount);
      setShowNewMessageAlert(true);
    }
    previousMessagesLengthRef.current = messages.length;
  }, [messages]);

  // Scroll to bottom function
  const scrollToBottom = useCallback(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
      setShowNewMessageAlert(false);
      setUnreadCount(0);
      isUserAtBottomRef.current = true;
    }
  }, []);

  // Auto-scroll when new messages come in and user is at bottom
  useEffect(() => {
    if (isUserAtBottomRef.current) {
      scrollToBottom();
    }
  }, [messages, scrollToBottom]);

  // Handle typing indicators
  const handleInputChange = useCallback((e) => {
    setMessage(e.target.value);
    
    // Start typing indicator
    if (e.target.value.trim() && startTyping) {
      startTyping();
      
      // Clear existing timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      
      // Set new timeout to stop typing
      typingTimeoutRef.current = setTimeout(() => {
        if (stopTyping) {
          stopTyping();
        }
      }, 3000);
    }
  }, [startTyping, stopTyping]);

  // Clean up typing timeout
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

  // Handle sending messages
  const handleSendMessage = async (e) => {
    e.preventDefault();
    
    const trimmedMessage = message.trim();
    if (!trimmedMessage || !currentChannel?.id || isSending) {
      return;
    }

    // Stop typing when sending
    if (stopTyping) {
      stopTyping();
    }

    setIsSending(true);

    try {
      await onSendMessage(currentChannel.id, trimmedMessage);
      setMessage('');
    } catch (err) {
      console.error('Failed to send message:', err);
      // Error is already handled in the optimistic update
    } finally {
      setIsSending(false);
    }
  };

  // Enhanced message processing with debugging
  const displayMessages = useCallback(() => {
    const filtered = messages.filter((msg, index, array) => {
      // If we have both optimistic and confirmed versions, show the confirmed one
      if (msg.isOptimistic && !msg.isConfirmed) {
        const confirmedVersion = array.find(m => 
          m.tempId === msg.tempId && m.isConfirmed
        );
        return !confirmedVersion;
      }
      return true;
    });

    /*/ Log message structure for debugging
    if (filtered.length > 0 && process.env.NODE_ENV === 'development') {
      console.log('Processed messages:', filtered.map(msg => ({
        id: msg.id,
        tempId: msg.tempId,
        userId: getMessageUserId(msg),
        sender: msg.sender,
        user: msg.user,
        isUserMessage: isUserMessage(msg),
        content: msg.content?.substring(0, 50)
      })));
    }*/

    return filtered.sort((a, b) => 
      new Date(a.created_at || a.createdAt) - new Date(b.created_at || b.createdAt)
    );
  }, [messages, getMessageUserId, isUserMessage]);

  const processedMessages = displayMessages();

  // Input area states
  const getInputAreaState = () => {
    if (!isUserParticipant) return 'not_participant';
    if (!tournament?.chat_channel_id) return 'chat_unavailable';
    if (!isConnected) return 'connecting';
    if (!currentChannel?.id) return 'setting_up';
    return 'ready';
  };

  const inputAreaState = getInputAreaState();

  // Get typing indicator text
  const getTypingText = () => {
    if (typingUsers.length === 0) return null;
    if (typingUsers.length === 1) return `${typingUsers[0]} is typing...`;
    if (typingUsers.length === 2) return `${typingUsers[0]} and ${typingUsers[1]} are typing...`;
    return `${typingUsers.length} people are typing...`;
  };

  const typingText = getTypingText();

  if (!chatUser) {
    return <div className="text-center text-gray-400 p-4"> Loading chat...</div>;
  }


  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-900 rounded-3xl shadow-2xl border border-gray-200 dark:border-gray-800 overflow-hidden">
      
      {/* Header with online status */}
      <div className="flex-shrink-0 px-6 py-4 border-b border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className={`w-2 h-2 rounded-full ${
              isConnected ? 'bg-emerald-500' : 'bg-gray-400'
            }`} />
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white">Tournament Chat</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {isConnected ? (
                  <>
                    {processedMessages.length} messages • {onlineUsers.length} online
                  </>
                ) : (
                  'Connecting...'
                )}
              </p>
            </div>
          </div>
          
          {/* Online users count */}
          {isConnected && onlineUsers.length > 0 && (
            <div className="flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-400">
              <div className="flex -space-x-2">
                {onlineUsers.slice(0, 3).map((userId, index) => (
                  <div
                    key={userId}
                    className="w-6 h-6 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full border-2 border-white dark:border-gray-900 flex items-center justify-center text-xs text-white font-medium"
                    style={{ zIndex: 3 - index }}
                  >
                    {String(userId).charAt(0).toUpperCase()}
                  </div>
                ))}
                {onlineUsers.length > 3 && (
                  <div className="w-6 h-6 bg-gray-300 dark:bg-gray-600 rounded-full border-2 border-white dark:border-gray-900 flex items-center justify-center text-xs text-gray-600 dark:text-gray-300 font-medium">
                    +{onlineUsers.length - 3}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
        
        {/* Typing indicator */}
        {typingText && (
          <div className="mt-2 flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-400">
            <div className="flex space-x-1">
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
            <span>{typingText}</span>
          </div>
        )}
      </div>

      {/* Messages Area */}
      <div 
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto p-6 space-y-4 bg-gray-50 dark:bg-gray-800/50"
        style={{ minHeight: 0 }}
        onScroll={handleScroll}
      >
        {!isUserParticipant ? (
          <div className="flex justify-center items-center h-full">
            <div className="text-center text-gray-500 dark:text-gray-400">
              <div className="text-4xl mb-4">🔒</div>
              <p className="font-medium text-gray-900 dark:text-white">Join Tournament</p>
              <p>Participate in the tournament to access the chat</p>
            </div>
          </div>
        ) : !tournament?.chat_channel_id ? (
          <div className="flex justify-center items-center h-full">
            <div className="text-center text-gray-500 dark:text-gray-400">
              <div className="text-4xl mb-4">💬</div>
              <p className="font-medium text-gray-900 dark:text-white">Chat Disabled</p>
              <p>Chat has not been enabled for this tournament</p>
            </div>
          </div>
        ) : isLoading && processedMessages.length === 0 ? (
          <div className="flex justify-center items-center h-full">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent mx-auto"></div>
              <div className="mt-4 text-gray-500 dark:text-gray-400">Loading messages...</div>
            </div>
          </div>
        ) : processedMessages.length === 0 ? (
          <div className="flex justify-center items-center h-full">
            <div className="text-center text-gray-500 dark:text-gray-400">
              <div className="text-4xl mb-4">👋</div>
              <p className="font-medium text-gray-900 dark:text-white">Start the Conversation</p>
              <p>Send the first message to get things started!</p>
            </div>
          </div>
        ) : (
          <>
            {processedMessages.map((msg, index) => {
              const isUser = isUserMessage(msg);
              const senderInfo = getMessageSenderInfo(msg);
              const previousMsg = index > 0 ? processedMessages[index - 1] : null;
              const showAvatar = shouldShowAvatar(msg, previousMsg);

              return (
                <div
                  key={msg.tempId || msg.id}
                  className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`flex max-w-[85%] ${isUser ? 'flex-row-reverse' : 'flex-row'} items-end space-x-2`}>
                    
                    {/* Avatar */}
                    {showAvatar && !isUser && (
                      <div 
                        className="flex-shrink-0 w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-sm font-medium"
                        title={senderInfo.username}
                      >
                        {senderInfo.username?.charAt(0).toUpperCase() || 'U'}
                      </div>
                    )}
                    
                    {/* Spacer for alignment when no avatar */}
                    {!showAvatar && !isUser && (
                      <div className="w-8 h-8 flex-shrink-0" />
                    )}
                    
                    {/* Message Content */}
                    <div className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} max-w-full`}>
                      
                      {/* Sender Name */}
                      {!isUser && showAvatar && (
                        <span className="text-xs text-gray-500 dark:text-gray-400 mb-1 ml-1">
                          {senderInfo.username}
                        </span>
                      )}
                      
                      {/* Message Bubble */}
                      <div className={`max-w-full ${
                        isUser ? 'bg-blue-500 text-white' : 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white'
                      } px-4 py-3 rounded-2xl shadow-sm border ${
                        isUser 
                          ? 'border-blue-400' 
                          : 'border-gray-200 dark:border-gray-600'
                      } break-words overflow-wrap-anywhere ${
                        msg.failed ? 'opacity-70' : ''
                      }`}>
                        
                        <div className="text-sm whitespace-pre-wrap break-words">
                          {msg.content}
                        </div>
                        
                        {/* Message Status */}
                        <div className={`flex items-center space-x-2 mt-2 ${
                          isUser ? 'justify-end' : 'justify-start'
                        }`}>
                          
                          {isUser && msg.failed && (
                            <button
                              onClick={() => onRetryFailedMessage && onRetryFailedMessage(msg)}
                              className="p-1 text-red-300 hover:text-white transition-colors"
                              title="Retry sending"
                            >
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                              </svg>
                            </button>
                          )}
                          
                          {isUser && msg.isOptimistic && !msg.isConfirmed && !msg.failed && (
                            <div className="flex items-center space-x-1 text-blue-200">
                              <div className="w-1.5 h-1.5 rounded-full bg-current animate-pulse"></div>
                              <span className="text-xs">Sending</span>
                            </div>
                          )}
                          
                          {isUser && !msg.isOptimistic && !msg.failed && (
                            <div className="text-blue-200">
                              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                            </div>
                          )}
                          
                          <span className={`text-xs ${
                            isUser ? 'text-blue-100' : 'text-gray-500 dark:text-gray-400'
                          }`}>
                            {new Date(msg.created_at || msg.createdAt).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Telegram-like New Message Alert */}
      {showNewMessageAlert && (
        <div className="absolute bottom-20 left-1/2 transform -translate-x-1/2 z-10">
          <button
            onClick={scrollToBottom}
            className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-full shadow-lg hover:shadow-xl transition-all duration-200 flex items-center space-x-2 animate-bounce"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
            </svg>
            <span>New message{unreadCount > 1 ? `s (${unreadCount})` : ''}</span>
          </button>
        </div>
      )}

      {/* Input Area */}
      <div className="flex-shrink-0 border-t border-gray-200 dark:border-gray-800 p-6 bg-white dark:bg-gray-900">
        {inputAreaState === 'not_participant' && (
          <div className="text-center py-4 text-gray-500 dark:text-gray-400">
            <p>Join the tournament to participate in chat</p>
          </div>
        )}
        {inputAreaState === 'chat_unavailable' && (
          <div className="text-center py-4 text-gray-500 dark:text-gray-400">
            <p>Chat is not available for this tournament</p>
          </div>
        )}
        {inputAreaState === 'connecting' && (
          <div className="text-center py-4 text-yellow-500">
            <div className="flex items-center justify-center space-x-2">
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-yellow-500 border-t-transparent"></div>
              <span>Connecting to chat...</span>
            </div>
          </div>
        )}
        {inputAreaState === 'setting_up' && (
          <div className="text-center py-4 text-yellow-500">
            <div className="flex items-center justify-center space-x-2">
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-yellow-500 border-t-transparent"></div>
              <span>Setting up chat channel...</span>
            </div>
          </div>
        )}
        {inputAreaState === 'ready' && (
          <form onSubmit={handleSendMessage} className="flex space-x-3 items-end">
            <div className="flex-1">
              <input
                type="text"
                value={message}
                onChange={handleInputChange}
                onBlur={stopTyping}
                placeholder="Type your message..."
                className="w-full bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-2xl px-5 py-4 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50"
                disabled={isSending}
                maxLength={500}
              />
            </div>
            <button
              type="submit"
              disabled={!message.trim() || isSending}
              className={`flex items-center justify-center w-12 h-12 rounded-2xl transition-all ${
                message.trim() 
                  ? 'bg-blue-500 hover:bg-blue-600 text-white transform hover:scale-105' 
                  : 'bg-gray-300 dark:bg-gray-700 text-gray-400 cursor-not-allowed'
              }`}
            >
              {isSending ? (
                <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}