import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { useChat } from '../../contexts/ChatContext';
import { useAuth } from '../../contexts/AuthContext';
import ChatHeader from './ChatHeader';
import MessageList from './MessageList';
import ReactionPicker from './ReactionPicker';
import MediaUploader from './MediaUploader';
import ChatComposer from './ChatComposer';

export default function ChatWindow({ 
  tournament,
}) {
  const { theme } = useTheme();
  const { user: authUser } = useAuth();
  
  // Get chat functionality from ChatContext
  const {
    chatUser,
    messages,
    isConnected,
    isLoading,
    error: chatError,
    typingUsers,
    onlineUsers,
    currentChannel,
    sendMessage,
    onEditMessage,
    onSendMedia,
    loadChannelMessages
  } = useChat();
  
  // Local UI state
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [replyToMessage, setReplyToMessage] = useState(null);
  const [editingMessage, setEditingMessage] = useState(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(null);
  const [draftMessage, setDraftMessage] = useState('');
  
  // Refs
  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const emojiPickerRef = useRef(null);
  
  

  // Load messages when channel changes
  useEffect(() => {
    if (currentChannel?.id) {
      loadChannelMessages(currentChannel.id).catch(error => {
        console.error('Failed to load messages:', error);
      });
    }
  }, [currentChannel?.id, loadChannelMessages]);

  // Prevent body scroll
  useEffect(() => {
    const originalStyle = window.getComputedStyle(document.body).overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalStyle;
    };
  }, []);

  // Handle emoji picker click outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target)) {
        setShowEmojiPicker(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Handle emoji selection
  const handleEmojiSelect = useCallback((emoji) => {
    setDraftMessage(prev => prev + emoji);
    setShowEmojiPicker(false);
  }, []);

  // Handle message reply
  const handleReply = useCallback((message) => {
    console.log('📝 Setting replyToMessage:', {
      messageId: message.id,
      content: message.content,
      replyToMessage: message
    });
    setReplyToMessage(message);
    setSelectedMessage(null);
  }, []);

  // Send message handler
  const handleSend = useCallback(async (content, mediaFile = null, options = {}) => {
    console.log('📝 handleSend parameters:', {
      content,
      mediaFile,
      options,
      replyToMessageId: replyToMessage?.id,
      hasOptionsReplyTo: !!options?.replyTo
    });

    if (!currentChannel?.id) {
      console.error('No current channel selected');
      return;
    }

    try {
      // Create the final options object
      const finalOptions = {
        ...options,
        replyTo: options?.replyTo || replyToMessage?.id
      };
      
      console.log('🎯 Final options being sent:', finalOptions);

      if (editingMessage) {
        await onEditMessage?.(editingMessage.id, content);
        setEditingMessage(null);
      } else if (mediaFile) {
        await onSendMedia?.(currentChannel.id, mediaFile, content, finalOptions);
        setReplyToMessage(null);
      } else {
        await sendMessage(currentChannel.id, content, finalOptions);
        setReplyToMessage(null);
      }
      setDraftMessage('');
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  }, [currentChannel?.id, editingMessage, onEditMessage, onSendMedia, replyToMessage?.id, sendMessage]);

  

  // Filter out current user from typing/online lists
  const filteredTypingUsers = useMemo(() => 
    typingUsers.filter(username => username !== chatUser?.username),
    [typingUsers, chatUser]
  );
  
  const filteredOnlineUsers = useMemo(() => 
    onlineUsers.filter(username => username !== chatUser?.username),
    [onlineUsers, chatUser]
  );

 

  // Theme classes
  const themeClasses = {
    container: theme === 'dark' 
      ? 'bg-gray-900 border-gray-800' 
      : 'bg-white border-gray-200',
  };

  // Loading state
  if (!chatUser && isLoading) {
    return (
      <div className={`flex items-center justify-center h-full ${themeClasses.container}`}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
          <div className="mt-4 text-gray-500">Loading chat...</div>
        </div>
      </div>
    );
  }

  // Error state
  if (chatError) {
    return (
      <div className={`flex flex-col items-center justify-center h-full ${themeClasses.container} p-4`}>
        <div className="text-red-500 mb-2">⚠️ Connection Error</div>
        <div className="text-gray-500 text-center mb-4">{chatError}</div>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
        >
          Retry Connection
        </button>
      </div>
    );
  }

  // No channel state
  if (!currentChannel) {
    return (
      <div className={`flex flex-col items-center justify-center h-full ${themeClasses.container} p-4`}>
        <div className="text-gray-500 text-center mb-4">Select a channel to start chatting</div>
      </div>
    );
  }

  return (
    <div className={`flex flex-col h-full ${themeClasses.container} rounded-lg md:rounded-xl overflow-hidden`}>
      {/* Header */}
      <ChatHeader
        isConnected={isConnected}
        typingUsers={filteredTypingUsers}
        onlineUsers={filteredOnlineUsers}
        messageCount={messages.length}
        tournamentName={tournament?.name}
        channelName={currentChannel?.name}
      />
      
      {/* Messages List */}
      <MessageList
        ref={messagesContainerRef}
        tournament={tournament}
        onReply={handleReply}
        replyToMessage={replyToMessage}
      />
      
      {/* Composer */}
  <ChatComposer
    draftMessage={draftMessage}
    setDraftMessage={setDraftMessage}
    editingMessage={editingMessage}
    replyToMessage={replyToMessage}
    onSend={handleSend}
    onCancelEdit={() => {
      setEditingMessage(null);
      setDraftMessage('');
    }}
    onCancelReply={() => setReplyToMessage(null)}
    onToggleEmojiPicker={() => setShowEmojiPicker(!showEmojiPicker)}
    maxMediaSize={10 * 1024 * 1024}
    allowedMediaTypes={['image/jpeg', 'image/png', 'image/gif', 'video/mp4', 'video/quicktime']}
    uploadProgress={uploadProgress}
    tournament={tournament}
  />
      
      {/* Reaction Picker */}
      {showEmojiPicker && (
        <div ref={emojiPickerRef} className="absolute bottom-20 right-4 z-50">
          <ReactionPicker onSelect={handleEmojiSelect} />
        </div>
      )}
      
      {/* Media Uploader */}
      {uploadProgress && (
        <div className="fixed bottom-20 left-1/2 transform -translate-x-1/2 z-50 bg-white dark:bg-gray-800 p-4 rounded-lg shadow-xl">
          <MediaUploader
            progress={uploadProgress}
            onCancel={() => setUploadProgress(null)}
          />
        </div>
      )}
    </div>
  );
}