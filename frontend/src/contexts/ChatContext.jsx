import React, { createContext, useContext, useReducer, useEffect, useCallback, useRef } from 'react';
import { chatService } from '../services/chatService';
import chatWebSocketService from '../services/chatWebSocketService';
import { useAuth } from './AuthContext';
import chatAuthService from '../services/chatAuthService';

const ChatContext = createContext();

// Initial state - simplified for tournament chat
const initialState = {
  currentChannel: null,
  messages: [],
  isConnected: false,
  isLoading: false,
  error: null,
};

// Simplified action types
const ACTION_TYPES = {
  SET_LOADING: 'SET_LOADING',
  SET_ERROR: 'SET_ERROR',
  CLEAR_ERROR: 'CLEAR_ERROR',
  SET_CURRENT_CHANNEL: 'SET_CURRENT_CHANNEL',
  CLEAR_CURRENT_CHANNEL: 'CLEAR_CURRENT_CHANNEL',
  SET_MESSAGES: 'SET_MESSAGES',
  ADD_MESSAGE: 'ADD_MESSAGE',
  SET_CONNECTED: 'SET_CONNECTED',
};

// Simplified reducer
function chatReducer(state, action) {
  switch (action.type) {
    case ACTION_TYPES.SET_LOADING:
      return { ...state, isLoading: action.payload };
    
    case ACTION_TYPES.SET_ERROR:
      return { 
        ...state, 
        error: action.payload,
        isLoading: false,
      };
    
    case ACTION_TYPES.CLEAR_ERROR:
      return { ...state, error: null };
    
    case ACTION_TYPES.SET_CURRENT_CHANNEL:
      return { 
        ...state, 
        currentChannel: action.payload,
        messages: [], // Clear messages when channel changes
      };
    
    case ACTION_TYPES.CLEAR_CURRENT_CHANNEL:
      return { 
        ...state, 
        currentChannel: null,
        messages: [],
      };
    
    case ACTION_TYPES.SET_MESSAGES:
      return { ...state, messages: action.payload };
    
    case ACTION_TYPES.ADD_MESSAGE:
      const messageExists = state.messages.some(msg => msg.id === action.payload.id);
      if (messageExists) return state;
      
      return {
        ...state,
        messages: [...state.messages, action.payload]
      };
    
    case ACTION_TYPES.SET_CONNECTED:
      return { ...state, isConnected: action.payload };
    
    default:
      return state;
  }
}

// Normalize message structure
const normalizeMessage = (message) => ({
  id: message.id,
  content: message.content,
  created_at: message.createdAt || message.created_at,
  channel_id: message.channel_id,
  sender: {
    id: message.user?.id,
    username: message.user?.username || 'Unknown',
    ...message.user
  },
  ...message
});

export function ChatProvider({ children }) {
  const [state, dispatch] = useReducer(chatReducer, initialState);
  const { user, isAuthenticated } = useAuth();
  const initializationRef = useRef(false);
  const retryTimeoutRef = useRef(null);

  // Core authentication
  const ensureChatAuthentication = useCallback(async () => {
    try {
      if (!chatAuthService.isChatAuthenticated()) {
        console.log('🔐 Refreshing chat token...');
        await chatAuthService.refreshChatToken();
      }
      
      const token = chatAuthService.getChatToken();
      if (!token) {
        throw new Error('No chat token available');
      }

      // Verify token is valid
      await chatService.getCurrentUser();
      return true;
    } catch (error) {
      console.error('Chat authentication failed:', error);
      throw new Error('Chat authentication failed');
    }
  }, []);

  // Initialize chat system
  const initializeChat = useCallback(async () => {
    if (initializationRef.current) return;

    initializationRef.current = true;
    dispatch({ type: ACTION_TYPES.SET_LOADING, payload: true });
    dispatch({ type: ACTION_TYPES.CLEAR_ERROR });

    try {
      console.log('🚀 Initializing chat system...');
      
      await ensureChatAuthentication();
      const token = chatAuthService.getChatToken();
      if (!token) throw new Error('Chat token missing');

      // Connect WebSocket
      chatWebSocketService.connect(token);
      
      // Set up WebSocket message handler
      const unsubscribeMessages = chatWebSocketService.subscribeToChannel('global', (message) => {
        if (message.type === 'new_message') {
          const normalizedMessage = normalizeMessage(message);
          
          // Only add message if it's for the current channel
          if (normalizedMessage.channel_id === state.currentChannel?.id) {
            dispatch({ type: ACTION_TYPES.ADD_MESSAGE, payload: normalizedMessage });
          }
        }
      });


      // Set up connection status handler
      const unsubscribeConnection = chatWebSocketService.subscribeToConnectionEvents((event) => {
        switch (event.status) {
          case 'connected':
            dispatch({ type: ACTION_TYPES.SET_CONNECTED, payload: true });
            dispatch({ type: ACTION_TYPES.CLEAR_ERROR });
            break;
          case 'disconnected':
            dispatch({ type: ACTION_TYPES.SET_CONNECTED, payload: false });
            break;
          case 'error':
            dispatch({ type: ACTION_TYPES.SET_ERROR, payload: `WebSocket error: ${event.errorType}` });
            break;
        }
      });

      console.log('✅ Chat system initialized successfully');

      // Cleanup function
      return () => {
        unsubscribeMessages();
        unsubscribeConnection();
      };

    } catch (error) {
      console.error('❌ Failed to initialize chat:', error);
      dispatch({ type: ACTION_TYPES.SET_ERROR, payload: error.message });
      
      // Retry after 5 seconds
      retryTimeoutRef.current = setTimeout(() => {
        console.log('🔄 Retrying chat initialization...');
        initializationRef.current = false;
        initializeChat();
      }, 5000);
    } finally {
      dispatch({ type: ACTION_TYPES.SET_LOADING, payload: false });
    }
  }, [ensureChatAuthentication, state.currentChannel]);

  // Cleanup chat system
  const cleanupChat = useCallback(() => {
    console.log('🧹 Cleaning up chat...');
    initializationRef.current = false;
    chatWebSocketService.disconnect();
    dispatch({ type: ACTION_TYPES.SET_CONNECTED, payload: false });
    dispatch({ type: ACTION_TYPES.CLEAR_CURRENT_CHANNEL });
    
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }
  }, []);

  // Main initialization effect
  useEffect(() => {
    if (isAuthenticated && user && !initializationRef.current) {
      initializeChat();
    } else if (!isAuthenticated) {
      cleanupChat();
    }

    return () => {
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
    };
  }, [isAuthenticated, user, initializeChat, cleanupChat]);

  // Load channel messages
  const loadChannelMessages = useCallback(async (channelId) => {
    if (!channelId) throw new Error('Channel ID is required');

    await ensureChatAuthentication();

    try {
      dispatch({ type: ACTION_TYPES.SET_LOADING, payload: true });
      
      console.log(`📥 Loading messages for channel ${channelId}`);
      const response = await chatService.getChannelMessages(channelId);
      const messages = response?.data?.messages || response?.messages || [];
      const normalizedMessages = messages.map(normalizeMessage);

      dispatch({ type: ACTION_TYPES.SET_MESSAGES, payload: normalizedMessages });
      console.log(`✅ Loaded ${normalizedMessages.length} messages`);

      return normalizedMessages;
    } catch (error) {
      console.error('Failed to load channel messages:', error);
      throw error;
    } finally {
      dispatch({ type: ACTION_TYPES.SET_LOADING, payload: false });
    }
  }, [ensureChatAuthentication]);

  // Send message
  const sendMessage = useCallback(async (channelId, content) => {
    if (!channelId || !content?.trim()) {
      throw new Error('Channel ID and message content are required');
    }

    await ensureChatAuthentication();

    try {
      console.log(`📤 Sending message to channel ${channelId}`);
      const response = await chatService.sendMessage(channelId, content.trim());
      const msg = response?.data?.message || response;
      
      if (!msg) throw new Error('Invalid message response');

      const normalizedMessage = normalizeMessage(msg);
      console.log('✅ Message sent successfully');
      
      return normalizedMessage;
    } catch (error) {
      console.error('Failed to send message:', error);
      throw error;
    }
  }, [ensureChatAuthentication]);

  // Set current channel
  const setCurrentChannel = useCallback((channel) => {
    if (!channel) {
      dispatch({ type: ACTION_TYPES.CLEAR_CURRENT_CHANNEL });
      return;
    }

    const normalizedChannel = {
      id: channel.id,
      name: channel.name,
      description: channel.description,
      metadata: channel.metadata || {},
      ...channel
    };

    dispatch({ type: ACTION_TYPES.SET_CURRENT_CHANNEL, payload: normalizedChannel });
    console.log(`🎯 Current channel set to: ${normalizedChannel.id}`);
  }, []);

  // Retry connection
  const retryConnection = useCallback(() => {
    console.log('🔄 Manual connection retry requested');
    cleanupChat();
    initializationRef.current = false;
    initializeChat();
  }, [cleanupChat, initializeChat]);

  // Clear error
  const clearError = useCallback(() => {
    dispatch({ type: ACTION_TYPES.CLEAR_ERROR });
  }, []);

  const value = {
    // State
    currentChannel: state.currentChannel,
    messages: state.messages,
    isConnected: state.isConnected,
    isLoading: state.isLoading,
    error: state.error,
    
    // Actions
    loadChannelMessages,
    sendMessage,
    setCurrentChannel,
    retryConnection,
    clearError,
  };

  return (
    <ChatContext.Provider value={value}>
      {children}
    </ChatContext.Provider>
  );
}

export function useChat() {
  const context = useContext(ChatContext);
  if (context === undefined) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
}