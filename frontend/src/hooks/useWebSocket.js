// hooks/useWebSocket.js
import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import chatWebSocketService from '../services/chatWebSocketService';

export const useWebSocket = (channelId) => {
  const { user } = useAuth();
  const [isConnected, setIsConnected] = useState(false);
  const [messages, setMessages] = useState([]);
  const [typingUsers, setTypingUsers] = useState(new Set());
  const [onlineUsers, setOnlineUsers] = useState(new Set());
  const messageHandlers = useRef(new Map());
  const connectionHandlers = useRef(new Set());

  // Handle incoming messages
  const handleNewMessage = useCallback((data) => {
    const { message, tempId } = data;
    
    setMessages(prev => {
      // Remove optimistic message with matching tempId
      const filtered = prev.filter(msg => 
        !(msg.tempId === tempId && msg.isOptimistic)
      );
      
      // Add the confirmed message
      return [...filtered, { ...message, isConfirmed: true }];
    });
  }, []);

  // Handle user online status
  const handleUserOnline = useCallback((data) => {
    setOnlineUsers(prev => new Set(prev).add(data.userId));
  }, []);

  // Handle user offline status
  const handleUserOffline = useCallback((data) => {
    setOnlineUsers(prev => {
      const newSet = new Set(prev);
      newSet.delete(data.userId);
      return newSet;
    });
  }, []);

  // Handle typing indicators
  const handleUserTyping = useCallback((data) => {
    setTypingUsers(prev => {
      const newSet = new Set(prev);
      if (data.isTyping) {
        newSet.add(data.userId);
      } else {
        newSet.delete(data.userId);
      }
      return newSet;
    });
  }, []);

  // Handle connection status changes
  const handleConnectionChange = useCallback((status) => {
    setIsConnected(status.status === 'connected');
    
    connectionHandlers.current.forEach(handler => {
      try {
        handler(status);
      } catch (error) {
        console.error('Error in connection handler:', error);
      }
    });
  }, []);

  // Subscribe to channel messages
  const subscribeToChannel = useCallback((callback) => {
    if (!channelId) return () => {};
    
    const handler = (message) => {
      if (message.type === 'new_message') {
        handleNewMessage(message);
      } else if (message.type === 'user_typing') {
        handleUserTyping(message);
      }
      callback(message);
    };

    return chatWebSocketService.subscribeToChannel(channelId, handler);
  }, [channelId, handleNewMessage, handleUserTyping]);

  // Send message via WebSocket
  const sendMessage = useCallback(async (content, options = {}) => {
    if (!channelId || !chatWebSocketService.isConnected()) {
      throw new Error('Not connected to chat');
    }

    const tempId = `temp-${Date.now()}`;
    
    // Add optimistic message immediately
    const optimisticMessage = {
      id: tempId,
      tempId,
      content,
      sender: user,
      created_at: new Date().toISOString(),
      isOptimistic: true,
      channel_id: channelId,
      ...options
    };

    setMessages(prev => [...prev, optimisticMessage]);

    try {
      const response = await chatWebSocketService.sendMessage(channelId, content, {
        ...options,
        tempId
      });

      return response;
    } catch (error) {
      // Mark message as failed
      setMessages(prev => 
        prev.map(msg => 
          msg.tempId === tempId 
            ? { ...msg, failed: true, error: error.message }
            : msg
        )
      );
      throw error;
    }
  }, [channelId, user]);

  // Typing indicators
  const startTyping = useCallback(() => {
    if (channelId && chatWebSocketService.isConnected()) {
      chatWebSocketService.startTyping(channelId);
    }
  }, [channelId]);

  const stopTyping = useCallback(() => {
    if (channelId && chatWebSocketService.isConnected()) {
      chatWebSocketService.stopTyping(channelId);
    }
  }, [channelId]);

  // Initialize WebSocket connection
  useEffect(() => {
    if (!user?.accessToken) return;

    const token = user.accessToken;
    
    // Connect to WebSocket
    chatWebSocketService.connect(token);

    // Subscribe to connection events
    const unsubscribeConnection = chatWebSocketService.subscribeToConnectionEvents(
      handleConnectionChange
    );

    // Subscribe to global events
    const globalMessageHandler = (message) => {
      if (message.type === 'user_online') {
        handleUserOnline(message);
      } else if (message.type === 'user_offline') {
        handleUserOffline(message);
      }
    };

    const unsubscribeGlobal = chatWebSocketService.subscribeToChannelEvents(
      'global',
      globalMessageHandler
    );

    return () => {
      unsubscribeConnection();
      unsubscribeGlobal();
    };
  }, [user?.accessToken, handleConnectionChange, handleUserOnline, handleUserOffline]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Don't disconnect completely as other components might be using the connection
      // Just clean up our specific subscriptions
      setMessages([]);
      setTypingUsers(new Set());
      setOnlineUsers(new Set());
    };
  }, []);

  return {
    isConnected,
    messages,
    sendMessage,
    subscribeToChannel,
    typingUsers: Array.from(typingUsers),
    onlineUsers: Array.from(onlineUsers),
    startTyping,
    stopTyping,
    reconnect: () => chatWebSocketService.connect(user?.accessToken)
  };
};