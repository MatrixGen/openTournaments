import { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';

export default function ChatWindow({ 
  messages = [],
  onSendMessage,
  onRetryFailedMessage,
  currentChannel,
  isConnected,
  isLoading,
  isUserParticipant,
  tournament
}) {
  const { user } = useAuth();
  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [localMessages, setLocalMessages] = useState([]);
  const [showNewMessageAlert, setShowNewMessageAlert] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  
  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const previousMessagesLengthRef = useRef(0);
  const isUserAtBottomRef = useRef(true);

  // Track scroll position to detect if user is at bottom
  const handleScroll = () => {
    const container = messagesContainerRef.current;
    if (!container) return;

    const { scrollTop, scrollHeight, clientHeight } = container;
    const isAtBottom = scrollHeight - scrollTop - clientHeight < 100;
    
    isUserAtBottomRef.current = isAtBottom;
    
    // Hide new message alert if user scrolls to bottom
    if (isAtBottom && showNewMessageAlert) {
      setShowNewMessageAlert(false);
      setUnreadCount(0);
    }
  };

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
  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
      setShowNewMessageAlert(false);
      setUnreadCount(0);
      isUserAtBottomRef.current = true;
    }
  };

  // Combined messages
  const allMessages = [...messages, ...localMessages]
    .filter((msg, index, array) => {
      const existingIndex = array.findIndex(m => 
        m.id === msg.id || 
        (m.tempId && m.tempId === msg.tempId)
      );
      return existingIndex === index;
    })
    .sort((a, b) => new Date(a.created_at) - new Date(b.created_at));

  // Handle sending messages
  const handleSendMessage = async (e) => {
    e.preventDefault();
    
    const trimmedMessage = message.trim();
    if (!trimmedMessage || !currentChannel?.id || isSending) {
      return;
    }

    const tempId = `temp-${Date.now()}`;
    const optimisticMessage = {
      id: tempId,
      tempId: tempId,
      content: trimmedMessage,
      sender: {
        id: user.id,
        username: user.username,
        avatar: user.avatar
      },
      created_at: new Date().toISOString(),
      isOptimistic: true,
      channel_id: currentChannel.id
    };

    setIsSending(true);
    setLocalMessages(prev => [...prev, optimisticMessage]);
    setMessage('');

    // Auto-scroll to bottom when user sends their own message
    setTimeout(() => {
      scrollToBottom();
    }, 100);

    try {
      const realMessage = await onSendMessage(currentChannel.id, trimmedMessage);
      
      setLocalMessages(prev => 
        prev.map(msg => 
          msg.tempId === tempId 
            ? { ...realMessage, isConfirmed: true }
            : msg
        ).filter(msg => !msg.isOptimistic || msg.isConfirmed)
      );
      
    } catch (err) {
      console.error('Failed to send message:', err);
      
      setLocalMessages(prev => 
        prev.map(msg => 
          msg.tempId === tempId 
            ? { ...msg, failed: true }
            : msg
        )
      );
    } finally {
      setIsSending(false);
    }
  };

  const handleRetryFailedMessage = async (failedMessage) => {
    if (!currentChannel?.id) return;

    setLocalMessages(prev => prev.filter(msg => msg.tempId !== failedMessage.tempId));
    
    setIsSending(true);
    try {
      const realMessage = await onSendMessage(currentChannel.id, failedMessage.content);
      setLocalMessages(prev => [...prev, { ...realMessage, isConfirmed: true }]);
    } catch (err) {
      console.error('Failed to resend message:', err);
      setLocalMessages(prev => [...prev, { ...failedMessage, failed: true }]);
    } finally {
      setIsSending(false);
    }
  };

  // Input area states
  const getInputAreaState = () => {
    if (!isUserParticipant) return 'not_participant';
    if (!tournament?.chat_channel_id) return 'chat_unavailable';
    if (!isConnected) return 'connecting';
    if (!currentChannel?.id) return 'setting_up';
    return 'ready';
  };

  const inputAreaState = getInputAreaState();

  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-900 rounded-3xl shadow-2xl border border-gray-200 dark:border-gray-800 overflow-hidden">
      
      {/* Header */}
      <div className="flex-shrink-0 px-6 py-4 border-b border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900">
        <div className="flex items-center space-x-3">
          <div className={`w-2 h-2 rounded-full ${
            isConnected ? 'bg-emerald-500' : 'bg-gray-400'
          }`} />
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white">Tournament Chat</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {isConnected ? `${allMessages.length} messages` : 'Connecting...'}
            </p>
          </div>
        </div>
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
        ) : !tournament.chat_channel_id ? (
          <div className="flex justify-center items-center h-full">
            <div className="text-center text-gray-500 dark:text-gray-400">
              <div className="text-4xl mb-4">💬</div>
              <p className="font-medium text-gray-900 dark:text-white">Chat Disabled</p>
              <p>Chat has not been enabled for this tournament</p>
            </div>
          </div>
        ) : isLoading && allMessages.length === 0 ? (
          <div className="flex justify-center items-center h-full">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent mx-auto"></div>
              <div className="mt-4 text-gray-500 dark:text-gray-400">Loading messages...</div>
            </div>
          </div>
        ) : allMessages.length === 0 ? (
          <div className="flex justify-center items-center h-full">
            <div className="text-center text-gray-500 dark:text-gray-400">
              <div className="text-4xl mb-4">👋</div>
              <p className="font-medium text-gray-900 dark:text-white">Start the Conversation</p>
              <p>Send the first message to get things started!</p>
            </div>
          </div>
        ) : (
          <>
            {allMessages.map((msg, index) => {
              const isUser = msg.sender?.id === user?.id;
              const showAvatar = !isUser && (
                index === 0 || allMessages[index - 1]?.sender?.id !== msg.sender?.id
              );

              return (
                <div
                  key={msg.tempId || msg.id}
                  className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`flex max-w-[85%] ${isUser ? 'flex-row-reverse' : 'flex-row'} items-end space-x-2`}>
                    
                    {/* Avatar */}
                    {showAvatar && !isUser && (
                      <div className="flex-shrink-0 w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-sm font-medium">
                        {msg.sender?.username?.charAt(0).toUpperCase() || 'U'}
                      </div>
                    )}
                    
                    {/* Message Content */}
                    <div className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} max-w-full`}>
                      
                      {/* Sender Name */}
                      {!isUser && showAvatar && (
                        <span className="text-xs text-gray-500 dark:text-gray-400 mb-1 ml-1">
                          {msg.sender?.username || 'Unknown User'}
                        </span>
                      )}
                      
                      {/* Message Bubble */}
                      <div className={`max-w-full ${
                        isUser ? 'bg-blue-500 text-white' : 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white'
                      } px-4 py-3 rounded-2xl shadow-sm border ${
                        isUser 
                          ? 'border-blue-400' 
                          : 'border-gray-200 dark:border-gray-600'
                      } break-words overflow-wrap-anywhere`}>
                        
                        <div className="text-sm whitespace-pre-wrap break-words">
                          {msg.content}
                        </div>
                        
                        {/* Message Status */}
                        <div className={`flex items-center space-x-2 mt-2 ${
                          isUser ? 'justify-end' : 'justify-start'
                        }`}>
                          
                          {isUser && msg.failed && (
                            <button
                              onClick={() => handleRetryFailedMessage(msg)}
                              className="p-1 text-red-300 hover:text-white"
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
                          
                          <span className={`text-xs ${
                            isUser ? 'text-blue-100' : 'text-gray-500 dark:text-gray-400'
                          }`}>
                            {new Date(msg.created_at).toLocaleTimeString([], {
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
            className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-full shadow-lg hover:shadow-xl transition-all duration-200 flex items-center space-x-2"
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
                onChange={(e) => setMessage(e.target.value)}
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
                  ? 'bg-blue-500 hover:bg-blue-600 text-white' 
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