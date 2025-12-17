import { io } from 'socket.io-client';
import chatAuthService from './chatAuthService';

class ChatWebSocketService {
  constructor() {
    this.socket = null;
    this.isConnected = false;
    
    // Event handlers
    this.messageHandlers = new Map();
    this.channelHandlers = new Map();
    this.connectionHandlers = new Set();
    
    // Bind methods
    this.handleConnect = this.handleConnect.bind(this);
    this.handleDisconnect = this.handleDisconnect.bind(this);
    this.handleNewMessage = this.handleNewMessage.bind(this);
    this.handleMessageSent = this.handleMessageSent.bind(this); // ← NEW
    this.handleUserPresence = this.handleUserPresence.bind(this);
    this.handleTyping = this.handleTyping.bind(this);
    
    // Handlers for updates from REST commands
    this.handleMessageUpdate = this.handleMessageUpdate.bind(this);
    this.handleMessageDelete = this.handleMessageDelete.bind(this);
  }

  // ===== Public Methods =====
  
  /**
   * Connect to chat WebSocket server
   */
  connect(serverUrl = null) {
    if (this.socket?.connected) {
      console.log('✅ Chat WebSocket already connected');
      return;
    }

    // Get chat token from auth service
    const token = chatAuthService.getChatToken();
    if (!token) {
      console.warn('⚠️ No chat token available, cannot connect WebSocket');
      return;
    }

    // Determine server URL
    const wsUrl = serverUrl || import.meta.env.CHAT_API_URL;
    
    console.log(`🔗 Connecting to chat WebSocket at: ${wsUrl}`);
    
    try {
      this.socket = io(wsUrl, {
        transports: ['websocket', 'polling'],
        auth: { token }
      });

      this.setupEventHandlers();
    } catch (error) {
      console.error('❌ Failed to create WebSocket connection:', error);
    }
  }

  /**
   * Disconnect from WebSocket server
   */
  disconnect() {
    console.log('🛑 Disconnecting WebSocket');
    
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    
    this.isConnected = false;
    this.notifyConnectionStateChange('disconnected');
  }

  /**
   * Send a chat message (text-only)
   */
  sendMessage(channelId, content, options = {}) {
    console.log('📡 [CLIENT] WebSocket sending:', {
      channelId,
      content: content.substring(0, 50),
      options,
      hasTempId: !!options.tempId,
      tempId: options.tempId
    });
    
    if (!this.socket?.connected) {
      console.warn('WebSocket not connected');
      return false;
    }

    if (!channelId || !content) {
      console.warn('Invalid message parameters');
      return false;
    }

    try {
      this.socket.emit('send_message', {
        channelId,
        content,
        timestamp: Date.now(),
        ...options 
      });
      
      return options.tempId || null;
    } catch (error) {
      console.error('Failed to send message:', error);
      return false;
    }
  }

  /**
   * Start typing indicator
   */
  startTyping(channelId) {
    if (this.socket?.connected && channelId) {
      this.socket.emit('typing_start', { channelId });
    }
  }

  /**
   * Stop typing indicator
   */
  stopTyping(channelId) {
    if (this.socket?.connected && channelId) {
      this.socket.emit('typing_stop', { channelId });
    }
  }

  /**
   * Join a channel
   */
  joinChannel(channelId) {
    if (this.socket?.connected && channelId) {
      this.socket.emit('join_channel', { channelId });
    }
  }

  /**
   * Leave a channel
   */
  leaveChannel(channelId) {
    if (this.socket?.connected && channelId) {
      this.socket.emit('leave_channel', { channelId });
    }
  }

  // ===== Subscription Management =====
  
  /**
   * Subscribe to messages in a channel
   */
  subscribeToMessages(channelId, callback) {
    if (!this.messageHandlers.has(channelId)) {
      this.messageHandlers.set(channelId, new Set());
    }
    this.messageHandlers.get(channelId).add(callback);
    
    // Return unsubscribe function
    return () => {
      const handlers = this.messageHandlers.get(channelId);
      if (handlers) {
        handlers.delete(callback);
        if (handlers.size === 0) {
          this.messageHandlers.delete(channelId);
        }
      }
    };
  }

  /**
   * Subscribe to channel events
   */
  subscribeToChannelEvents(channelId, callback) {
    if (!this.channelHandlers.has(channelId)) {
      this.channelHandlers.set(channelId, new Set());
    }
    this.channelHandlers.get(channelId).add(callback);
    
    // Return unsubscribe function
    return () => {
      const handlers = this.channelHandlers.get(channelId);
      if (handlers) {
        handlers.delete(callback);
        if (handlers.size === 0) {
          this.channelHandlers.delete(channelId);
        }
      }
    };
  }

  /**
   * Subscribe to connection state changes
   */
  subscribeToConnection(callback) {
    this.connectionHandlers.add(callback);
    
    // Return unsubscribe function
    return () => {
      this.connectionHandlers.delete(callback);
    };
  }

  // ===== Event Handlers =====
  
  setupEventHandlers() {
    if (!this.socket) return;

    this.socket.on('connect', this.handleConnect);
    this.socket.on('disconnect', this.handleDisconnect);
    this.socket.on('new_message', this.handleNewMessage);
    this.socket.on('message_sent', this.handleMessageSent); // ← CRITICAL FIX
    this.socket.on('user_online', this.handleUserPresence);
    this.socket.on('user_offline', this.handleUserPresence);
    this.socket.on('user_typing', this.handleTyping);
    
    // Handlers for updates
    this.socket.on('message_updated', this.handleMessageUpdate);
    this.socket.on('message_deleted', this.handleMessageDelete);
    this.socket.on('message_edited', this.handleMessageUpdate); // Also handle edits
    this.socket.on('message_reaction_updated', this.handleMessageUpdate); // And reactions

    // Error handling
    this.socket.on('connect_error', (error) => {
      console.error('WebSocket connection error:', error);
      this.notifyConnectionStateChange('error', { error: error.message });
    });

    this.socket.on('error', (error) => {
      console.error('WebSocket error:', error);
    });
  }

  handleConnect() {
    console.log('✅ Chat WebSocket connected');
    this.isConnected = true;
    this.notifyConnectionStateChange('connected');
  }

  handleDisconnect(reason) {
    console.log('⚠️ Chat WebSocket disconnected:', reason);
    this.isConnected = false;
    this.notifyConnectionStateChange('disconnected', { reason });
  }

  /**
   * Handle message sent confirmation from server
   */
  handleMessageSent(data) {
    console.log('📡 [DEBUG] WebSocket received message_sent:', {
      tempId: data.tempId,
      messageId: data.messageId,
      hasMessageData: !!data.messageData
    });
    
    const { tempId, messageId, messageData } = data;
    
    if (!tempId || !messageId) return;
    
    // Find which channel this message belongs to
    const channelId = messageData?.message?.channelId;
    if (!channelId) return;
    
    // Notify message subscribers about the confirmation
    const messageHandlers = this.messageHandlers.get(channelId);
    if (messageHandlers) {
      messageHandlers.forEach(callback => {
        try {
          callback({
            type: 'message_sent',
            tempId,
            messageId,
            message: messageData.message,
            channelId,
            timestamp: new Date()
          });
        } catch (error) {
          console.error('Error in message sent handler:', error);
        }
      });
    }
  }

  handleNewMessage(data) {
    console.log('📡 [DEBUG] WebSocket received new_message:', {
      channelId: data.message?.channelId,
      message: data.message,
      tempId: data.tempId
    });
    
    const channelId = data.message?.channelId;
    const message = data.message;
    
    if (!channelId || !message) return;
    
    // Notify message subscribers
    const messageHandlers = this.messageHandlers.get(channelId);
    if (messageHandlers) {
      messageHandlers.forEach(callback => {
        try {
          callback({
            type: 'new_message',
            channelId,
            message,
            tempId: data.tempId,
            timestamp: new Date()
          });
        } catch (error) {
          console.error('Error in message handler:', error);
        }
      });
    }
  }

  handleUserPresence(data) {
    const { userId, username, status, channelId = 'global' } = data;
    const eventType = status === 'online' ? 'user_online' : 'user_offline';
    
    // Notify channel subscribers
    const channelHandlers = this.channelHandlers.get(channelId);
    if (channelHandlers) {
      channelHandlers.forEach(callback => {
        try {
          callback({
            type: eventType,
            userId,
            username,
            status,
            channelId,
            timestamp: new Date()
          });
        } catch (error) {
          console.error('Error in presence handler:', error);
        }
      });
    }
  }

  handleTyping(data) {
    const { userId, username, channelId, isTyping } = data;
    
    // Notify channel subscribers
    const channelHandlers = this.channelHandlers.get(channelId);
    if (channelHandlers) {
      channelHandlers.forEach(callback => {
        try {
          callback({
            type: 'user_typing',
            userId,
            username,
            channelId,
            isTyping,
            timestamp: new Date()
          });
        } catch (error) {
          console.error('Error in typing handler:', error);
        }
      });
    }
  }

  /**
   * Handles server broadcast for updated messages (reactions, edits)
   */
  handleMessageUpdate(data) {
    const { channelId, message } = data;
    
    if (!channelId) return;
    
    // Notify both message and channel subscribers
    const messageHandlers = this.messageHandlers.get(channelId);
    if (messageHandlers) {
      messageHandlers.forEach(callback => {
        try {
          callback({
            type: 'message_updated',
            channelId,
            message,
            timestamp: new Date()
          });
        } catch (error) {
          console.error('Error in message update handler:', error);
        }
      });
    }
    
    // Also notify channel event subscribers
    const channelHandlers = this.channelHandlers.get(channelId);
    if (channelHandlers) {
      channelHandlers.forEach(callback => {
        try {
          callback({
            type: 'message_updated',
            channelId,
            message,
            timestamp: new Date()
          });
        } catch (error) {
          console.error('Error in channel handler for message update:', error);
        }
      });
    }
  }

  /**
   * Handles server broadcast for deleted messages
   */
  handleMessageDelete(data) {
    const { channelId, messageId } = data;
    
    if (!channelId || !messageId) return;
    
    // Notify both message and channel subscribers
    const messageHandlers = this.messageHandlers.get(channelId);
    if (messageHandlers) {
      messageHandlers.forEach(callback => {
        try {
          callback({
            type: 'message_deleted',
            channelId,
            messageId,
            timestamp: new Date()
          });
        } catch (error) {
          console.error('Error in message delete handler:', error);
        }
      });
    }
    
    // Also notify channel event subscribers
    const channelHandlers = this.channelHandlers.get(channelId);
    if (channelHandlers) {
      channelHandlers.forEach(callback => {
        try {
          callback({
            type: 'message_deleted',
            channelId,
            messageId,
            timestamp: new Date()
          });
        } catch (error) {
          console.error('Error in channel handler for message delete:', error);
        }
      });
    }
  }

  // ===== Helper Methods =====
  
  notifyConnectionStateChange(status, data = {}) {
    const event = {
      type: 'connection',
      status,
      timestamp: new Date(),
      ...data
    };

    this.connectionHandlers.forEach(callback => {
      try {
        callback(event);
      } catch (error) {
        console.error('Error in connection handler:', error);
      }
    });
  }

  /**
   * Check connection status
   */
  getStatus() {
    if (!this.socket) return 'disconnected';
    return this.socket.connected ? 'connected' : 'disconnected';
  }

  /**
   * Reconnect with new token (after refresh)
   */
  reconnectWithNewToken(newToken) {
    console.log('🔄 Reconnecting WebSocket with new token');
    
    // Update token in auth service first
    chatAuthService.clearChatTokens();
    localStorage.setItem('chat_token', newToken);
    
    // Disconnect and reconnect
    this.disconnect();
    setTimeout(() => this.connect(), 1000);
  }

  /**
   * Cleanup resources
   */
  destroy() {
    this.disconnect();
    this.messageHandlers.clear();
    this.channelHandlers.clear();
    this.connectionHandlers.clear();
  }
}

// Create singleton instance
const chatWebSocketService = new ChatWebSocketService();

export default chatWebSocketService;