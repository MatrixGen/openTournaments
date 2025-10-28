import React, { createContext, useContext, useReducer, useEffect, useCallback, useRef } from 'react';
import { chatService } from '../services/chatService';
import chatWebSocketService from '../services/chatWebSocketService';
import { useAuth } from './AuthContext';
import chatAuthService from '../services/chatAuthService';

const ChatContext = createContext();

// Extended initial state for WebSocket features
const initialState = {
  currentChannel: null,
  messages: [],
  isConnected: false,
  isLoading: false,
  error: null,
  typingUsers: [],
  onlineUsers: [],
};

// Extended action types for WebSocket features
const ACTION_TYPES = {
  SET_LOADING: 'SET_LOADING',
  SET_ERROR: 'SET_ERROR',
  CLEAR_ERROR: 'CLEAR_ERROR',
  SET_CURRENT_CHANNEL: 'SET_CURRENT_CHANNEL',
  CLEAR_CURRENT_CHANNEL: 'CLEAR_CURRENT_CHANNEL',
  SET_MESSAGES: 'SET_MESSAGES',
  ADD_MESSAGE: 'ADD_MESSAGE',
  UPDATE_MESSAGE: 'UPDATE_MESSAGE',
  REMOVE_OPTIMISTIC_MESSAGE: 'REMOVE_OPTIMISTIC_MESSAGE',
  SET_CONNECTED: 'SET_CONNECTED',
  ADD_TYPING_USER: 'ADD_TYPING_USER',
  REMOVE_TYPING_USER: 'REMOVE_TYPING_USER',
  SET_ONLINE_USERS: 'SET_ONLINE_USERS',
  ADD_ONLINE_USER: 'ADD_ONLINE_USER',
  REMOVE_ONLINE_USER: 'REMOVE_ONLINE_USER',
};

// Enhanced reducer with WebSocket features
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
        messages: [], 
        typingUsers: [], 
      };
    
    case ACTION_TYPES.CLEAR_CURRENT_CHANNEL:
      return { 
        ...state, 
        currentChannel: null,
        messages: [],
        typingUsers: [],
      };
    
    case ACTION_TYPES.SET_MESSAGES:
      return { ...state, messages: action.payload };
    
    case ACTION_TYPES.ADD_MESSAGE:
      // Check if message already exists (optimistic + confirmed)
      const existingMessageIndex = state.messages.findIndex(msg => 
        msg.tempId === action.payload.tempId || 
        msg.id === action.payload.id
      );
      
      if (existingMessageIndex !== -1) {
        // Replace the existing message
        const newMessages = [...state.messages];
        newMessages[existingMessageIndex] = action.payload;
        return { ...state, messages: newMessages };
      }
      
      return {
        ...state,
        messages: [...state.messages, action.payload]
      };
    
    case ACTION_TYPES.UPDATE_MESSAGE:
      return {
        ...state,
        messages: state.messages.map(msg =>
          msg.tempId === action.payload.tempId || msg.id === action.payload.id
            ? { ...msg, ...action.payload.updates }
            : msg
        )
      };
    
    case ACTION_TYPES.REMOVE_OPTIMISTIC_MESSAGE:
      return {
        ...state,
        messages: state.messages.filter(msg => msg.tempId !== action.payload)
      };
    
    case ACTION_TYPES.SET_CONNECTED:
      return { ...state, isConnected: action.payload };
    
    case ACTION_TYPES.ADD_TYPING_USER:
      const userExists = state.typingUsers.includes(action.payload);
      if (userExists) return state;
      
      return {
        ...state,
        typingUsers: [...state.typingUsers, action.payload]
      };
    
    case ACTION_TYPES.REMOVE_TYPING_USER:
      return {
        ...state,
        typingUsers: state.typingUsers.filter(userId => userId !== action.payload)
      };
    
    case ACTION_TYPES.SET_ONLINE_USERS:
      return { ...state, onlineUsers: action.payload };
    
    case ACTION_TYPES.ADD_ONLINE_USER:
      const onlineUserExists = state.onlineUsers.includes(action.payload);
      if (onlineUserExists) return state;
      
      return {
        ...state,
        onlineUsers: [...state.onlineUsers, action.payload]
      };
    
    case ACTION_TYPES.REMOVE_ONLINE_USER:
      return {
        ...state,
        onlineUsers: state.onlineUsers.filter(userId => userId !== action.payload)
      };
    
    default:
      return state;
  }
}

// Enhanced message normalization
const normalizeMessage = (message) => ({
  id: message.id || message.tempId,
  tempId: message.tempId,
  content: message.content,
  created_at: message.createdAt || message.created_at || new Date().toISOString(),
  channel_id: message.channel_id || message.channelId,
  sender: message.sender || message.user || {
    id: message.user_id,
    username: 'Unknown User',
  },
  isOptimistic: message.isOptimistic || false,
  isConfirmed: message.isConfirmed || false,
  failed: message.failed || false,
  ...message
});

export function ChatProvider({ children }) {
  const [state, dispatch] = useReducer(chatReducer, initialState);
  const { user, isAuthenticated } = useAuth();
  const [chatUser, setChatUser] = React.useState(null);
  const initializationRef = useRef(false);
  const retryTimeoutRef = useRef(null);
  const messageSubscriptionsRef = useRef(new Map());
  const typingTimeoutRef = useRef(null);

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

  // Handle incoming WebSocket messages
  const handleWebSocketMessage = useCallback((message) => {
    if (!message.type) return;

    switch (message.type) {
      case 'new_message':
        const normalizedMessage = normalizeMessage({
          ...message.message,
          tempId: message.tempId,
          isConfirmed: true
        });
        
        // Only add message if it's for the current channel
        if (normalizedMessage.channel_id === state.currentChannel?.id) {
          dispatch({ type: ACTION_TYPES.ADD_MESSAGE, payload: normalizedMessage });
        }
        break;

      case 'user_online':
        dispatch({ type: ACTION_TYPES.ADD_ONLINE_USER, payload: message.userId });
        break;

      case 'user_offline':
        dispatch({ type: ACTION_TYPES.REMOVE_ONLINE_USER, payload: message.userId });
        break;

      case 'user_typing':
        if (message.channelId === state.currentChannel?.id) {
          if (message.isTyping && message.userId !== user?.id) {
            dispatch({ type: ACTION_TYPES.ADD_TYPING_USER, payload: message.userId });
            
            // Auto-remove typing indicator after 3 seconds
            setTimeout(() => {
              dispatch({ type: ACTION_TYPES.REMOVE_TYPING_USER, payload: message.userId });
            }, 3000);
          } else {
            dispatch({ type: ACTION_TYPES.REMOVE_TYPING_USER, payload: message.userId });
          }
        }
        break;

      default:
        console.log('Unhandled WebSocket message:', message);
    }
  }, [state.currentChannel?.id, user?.id]);

  // Handle connection status changes
  const handleConnectionChange = useCallback((event) => {
    switch (event.status) {
      case 'connected':
        dispatch({ type: ACTION_TYPES.SET_CONNECTED, payload: true });
        dispatch({ type: ACTION_TYPES.CLEAR_ERROR });
        console.log('✅ WebSocket connected');
        break;
      
      case 'disconnected':
        dispatch({ type: ACTION_TYPES.SET_CONNECTED, payload: false });
        console.log('⚠️ WebSocket disconnected');
        break;
      
      case 'connecting':
        dispatch({ type: ACTION_TYPES.SET_CONNECTED, payload: false });
        console.log('🔄 WebSocket connecting...');
        break;
      
      case 'error':
        dispatch({ type: ACTION_TYPES.SET_ERROR, payload: `WebSocket error: ${event.errorType}` });
        console.error('❌ WebSocket error:', event);
        break;
      
      case 'connection_failed':
        dispatch({ type: ACTION_TYPES.SET_ERROR, payload: `Connection failed: ${event.message}` });
        console.error('🚫 Connection failed:', event);
        break;
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

      // ✅ Fetch chat user before connecting

      try {
        let response = await chatService.getCurrentUser()
        const currentChatUser = response?.data?.user
        setChatUser(currentChatUser);
        console.log('💬 Chat user loaded successfully ');
      } catch (err) {
        console.error('❌ Failed to load chat user:', err);
      }

      // Now connect the socket
      chatWebSocketService.connect(token);


      
      // Set up WebSocket message handlers
      const unsubscribeConnection = chatWebSocketService.subscribeToConnectionEvents(handleConnectionChange);
      
      // Subscribe to global events (online/offline)
      const unsubscribeGlobal = chatWebSocketService.subscribeToChannelEvents('global', handleWebSocketMessage);
      // Cleanup function
      return () => {
        unsubscribeConnection();
        unsubscribeGlobal();
        
        // Clean up channel-specific subscriptions
        messageSubscriptionsRef.current.forEach(unsubscribe => unsubscribe());
        messageSubscriptionsRef.current.clear();
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
  }, [ensureChatAuthentication, handleConnectionChange, handleWebSocketMessage]);

  // Subscribe to channel when current channel changes
  useEffect(() => {
    if (!state.currentChannel?.id || !chatWebSocketService.isConnected()) return;

    // Unsubscribe from previous channel
    if (messageSubscriptionsRef.current.has(state.currentChannel.id)) {
      messageSubscriptionsRef.current.get(state.currentChannel.id)();
      messageSubscriptionsRef.current.delete(state.currentChannel.id);
    }

    // Subscribe to new channel
    const unsubscribe = chatWebSocketService.subscribeToChannel(
      state.currentChannel.id,
      handleWebSocketMessage
    );

    messageSubscriptionsRef.current.set(state.currentChannel.id, unsubscribe);

    // Join channels via WebSocket
    chatWebSocketService.socket?.emit('join_channels');

    return () => {
      unsubscribe();
      messageSubscriptionsRef.current.delete(state.currentChannel.id);
    };
  }, [state.currentChannel?.id, handleWebSocketMessage]);

  // Cleanup chat system
  const cleanupChat = useCallback(() => {
    console.log('🧹 Cleaning up chat...');
    initializationRef.current = false;
    chatWebSocketService.disconnect();
    dispatch({ type: ACTION_TYPES.SET_CONNECTED, payload: false });
    dispatch({ type: ACTION_TYPES.CLEAR_CURRENT_CHANNEL });
    dispatch({ type: ACTION_TYPES.SET_ONLINE_USERS, payload: [] });
    dispatch({ type: ACTION_TYPES.SET_TYPING_USERS, payload: [] });
    
    // Clean up subscriptions
    messageSubscriptionsRef.current.forEach(unsubscribe => unsubscribe());
    messageSubscriptionsRef.current.clear();
    
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
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

  // Load channel messages (HTTP for initial load)
  const loadChannelMessages = useCallback(async (channelId) => {
    if (!channelId) throw new Error('Channel ID is required');

    await ensureChatAuthentication();

    try {
      dispatch({ type: ACTION_TYPES.SET_LOADING, payload: true });
      
      //console.log(`📥 Loading messages for channel ${channelId}`);
      const response = await chatService.getChannelMessages(channelId);
      const messages = response?.data?.messages || response?.messages || [];
      const normalizedMessages = messages.map(normalizeMessage);
      
      dispatch({ type: ACTION_TYPES.SET_MESSAGES, payload: normalizedMessages });
      //console.log(`✅ Loaded ${normalizedMessages.length} messages`);

      return normalizedMessages;
    } catch (error) {
      console.error('Failed to load channel messages:', error);
      throw error;
    } finally {
      dispatch({ type: ACTION_TYPES.SET_LOADING, payload: false });
    }
  }, [ensureChatAuthentication]);

    // Send message via WebSocket
  const sendMessage = useCallback(async (channelId, content, options = {}) => {
    if (!channelId || !content?.trim()) throw new Error('Channel ID and message content required');
    if (!chatWebSocketService.isConnected()) throw new Error('Not connected');

    const tempId = options.tempId || `temp-${Date.now()}`;

    // Optimistic message
    const optimisticMessage = normalizeMessage({
      tempId,
      content: content.trim(),
      channel_id: channelId,
      sender: user,
      created_at: new Date().toISOString(),
      isOptimistic: true,
      isConfirmed: false,
      ...options
    });

    dispatch({ type: ACTION_TYPES.ADD_MESSAGE, payload: optimisticMessage });

    try {
      //console.log(`📤 Sending message via WebSocket to channel ${channelId}`);
      
      // Send via WebSocket
      const response = await chatWebSocketService.sendMessage(channelId, content.trim(), { tempId });

      console.log('✅ Message sent successfully via WebSocket');

      // ✅ Mark optimistic message as confirmed
      dispatch({
        type: ACTION_TYPES.UPDATE_MESSAGE,
        payload: {
          tempId,
          updates: {
            isOptimistic: false,
            isConfirmed: true,
            id: response.message?.id || tempId // fallback if server doesn't return id
          }
        }
      });

      return response;

    } catch (error) {
      console.error('❌ Failed to send message via WebSocket:', error);

      // Mark as failed
      dispatch({
        type: ACTION_TYPES.UPDATE_MESSAGE,
        payload: {
          tempId,
          updates: { failed: true, error: error.message }
        }
      });

      throw error;
    }
  }, [user]);


  // Retry failed message
  const retryFailedMessage = useCallback(async (failedMessage) => {
    if (!state.currentChannel?.id) {
      throw new Error('No current channel');
    }

    // Remove the failed message
    dispatch({
      type: ACTION_TYPES.REMOVE_OPTIMISTIC_MESSAGE,
      payload: failedMessage.tempId
    });

    // Retry sending
    return await sendMessage(state.currentChannel.id, failedMessage.content, {
      tempId: failedMessage.tempId
    });
  }, [state.currentChannel?.id, sendMessage]);

  // Typing indicators
  const startTyping = useCallback(() => {
    if (!state.currentChannel?.id || !chatWebSocketService.isConnected()) return;

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Start typing
    chatWebSocketService.startTyping(state.currentChannel.id);

    // Auto-stop typing after 3 seconds
    typingTimeoutRef.current = setTimeout(() => {
      stopTyping();
    }, 3000);
  }, [state.currentChannel?.id]);

  const stopTyping = useCallback(() => {
    if (!state.currentChannel?.id || !chatWebSocketService.isConnected()) return;

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }

    chatWebSocketService.stopTyping(state.currentChannel.id);
  }, [state.currentChannel?.id]);

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
    typingUsers: state.typingUsers.filter(id => id !== user?.id), // Exclude current user
    onlineUsers: state.onlineUsers.filter(id => id !== user?.id), // Exclude current user

    //users 
    chatUser,
    // Actions
    loadChannelMessages,
    sendMessage,
    retryFailedMessage,
    setCurrentChannel,
    retryConnection,
    clearError,
    
    // Typing indicators
    startTyping,
    stopTyping,
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