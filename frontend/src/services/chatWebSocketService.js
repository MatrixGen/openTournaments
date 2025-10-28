import { io } from 'socket.io-client';

class ChatWebSocketService {
  constructor() {
    this.socket = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectInterval = 3000;
    
    this.messageHandlers = new Map();
    this.channelHandlers = new Map();
    this.connectionHandlers = new Set();
    
    this.token = null;
    this.isIntentionalDisconnect = false;
    this.connectionState = 'disconnected';
    
    this.pendingMessages = new Map();
    this.messageIdCounter = 0;
    
    // Bind methods to maintain context
    this.handleConnect = this.handleConnect.bind(this);
    this.handleDisconnect = this.handleDisconnect.bind(this);
    this.handleConnectError = this.handleConnectError.bind(this);
    this.handleNewMessage = this.handleNewMessage.bind(this);
    this.handleUserOnline = this.handleUserOnline.bind(this);
    this.handleUserOffline = this.handleUserOffline.bind(this);
    this.handleUserTyping = this.handleUserTyping.bind(this);
  }

  // ===== Public Methods =====
  connect(token) {
    if (this.isConnected()) {
      console.log('✅ Chat WebSocket already connected');
      return true;
    }

    if (this.connectionState === 'connecting') {
      console.log('🔄 WebSocket connection in progress...');
      return false;
    }

    this.token = token;
    this.isIntentionalDisconnect = false;
    this.connectionState = 'connecting';

    // Validate token
    if (!this.validateToken(token)) {
      this.handleConnectionFailure('Invalid token provided');
      return false;
    }

    try {
      const serverUrl = this.getServerUrl();
      console.log(`🔗 Attempting Socket.IO connection to: ${serverUrl}`);
      
      this.socket = io(serverUrl, {
        transports: ['websocket'],
        reconnection: true,
        reconnectionAttempts: this.maxReconnectAttempts,
        reconnectionDelay: this.reconnectInterval,
        auth: { token }
      });

      this.setupEventHandlers();
      return true;
    } catch (error) {
      this.handleConnectionFailure(`Connection failed: ${error.message}`, error);
      return false;
    }
  }

  disconnect(reason = 'Intentional disconnect') {
    console.log(`🛑 Disconnecting WebSocket: ${reason}`);
    this.connectionState = 'disconnecting';
    this.isIntentionalDisconnect = true;

    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }

    this.connectionState = 'disconnected';
    this.reconnectAttempts = 0;
    this.notifyConnectionStateChange();
  }

  sendMessage(channelId, content, options = {}) {
    if (!this.isConnected()) {
      console.warn('Message queued: WebSocket not connected');
      return this.queueMessage(channelId, content, options);
    }

    if (!this.validateMessageParams(channelId, content)) {
      return Promise.reject(new Error('Invalid message parameters'));
    }

    const messageId = this.generateMessageId();
    const message = {
      channelId,
      content,
      tempId: messageId,
      ...options
    };

    return new Promise((resolve, reject) => {
      this.socket.emit('send_message', message, (response) => {
        if (response && response.success) {
          resolve(response);
        } else {
          reject(new Error(response?.error || 'Failed to send message'));
        }
      });
    });
  }

  // ===== Connection Management =====
  isConnected() {
    return this.socket && this.socket.connected;
  }

  getConnectionStatus() {
    if (!this.socket) return this.connectionState;
    
    if (this.socket.connected) return 'connected';
    if (this.socket.connecting) return 'connecting';
    if (this.socket.disconnected) return 'disconnected';
    return 'unknown';
  }

  reconnectWithNewToken(newToken) {
    console.log('🔄 Reconnecting with new token');
    this.token = newToken;
    this.disconnect('Token refresh');
    setTimeout(() => this.connect(newToken), 500);
  }

  // ===== Typing Indicators =====
  startTyping(channelId) {
    if (this.isConnected()) {
      this.socket.emit('typing_start', { channelId });
    }
  }

  stopTyping(channelId) {
    if (this.isConnected()) {
      this.socket.emit('typing_stop', { channelId });
    }
  }

  // ===== Subscription Management =====
  subscribeToChannel(channelId, callback) {
    if (!this.messageHandlers.has(channelId)) {
      this.messageHandlers.set(channelId, new Set());
    }
    this.messageHandlers.get(channelId).add(callback);
    
    return () => this.unsubscribeFromChannel(channelId, callback);
  }

  unsubscribeFromChannel(channelId, callback) {
    const handlers = this.messageHandlers.get(channelId);
    if (handlers) {
      handlers.delete(callback);
      if (handlers.size === 0) {
        this.messageHandlers.delete(channelId);
      }
    }
  }

  subscribeToChannelEvents(channelId, callback) {
    if (!this.channelHandlers.has(channelId)) {
      this.channelHandlers.set(channelId, new Set());
    }
    this.channelHandlers.get(channelId).add(callback);
    
    return () => this.unsubscribeFromChannelEvents(channelId, callback);
  }

  unsubscribeFromChannelEvents(channelId, callback) {
    const handlers = this.channelHandlers.get(channelId);
    if (handlers) {
      handlers.delete(callback);
      if (handlers.size === 0) {
        this.channelHandlers.delete(channelId);
      }
    }
  }

  subscribeToConnectionEvents(callback) {
    this.connectionHandlers.add(callback);
    return () => this.connectionHandlers.delete(callback);
  }

  // ===== Private Methods =====
  setupEventHandlers() {
    this.socket.on('connect', this.handleConnect);
    this.socket.on('disconnect', this.handleDisconnect);
    this.socket.on('connect_error', this.handleConnectError);
    this.socket.on('new_message', this.handleNewMessage);
    this.socket.on('user_online', this.handleUserOnline);
    this.socket.on('user_offline', this.handleUserOffline);
    this.socket.on('user_typing', this.handleUserTyping);
    
    // Handle reconnection events
    this.socket.on('reconnecting', (attempt) => {
      console.log(`🔄 Reconnecting... attempt ${attempt}/${this.maxReconnectAttempts}`);
      this.connectionState = 'connecting';
      this.notifyConnectionStateChange({ attempt });
    });

    this.socket.on('reconnect_failed', () => {
      console.error('❌ Max reconnect attempts reached');
      this.connectionState = 'disconnected';
      this.notifyConnectionStateChange({ 
        type: 'connection_failed', 
        message: 'Unable to connect to chat server' 
      });
    });

    this.socket.on('reconnect', (attempt) => {
      console.log(`✅ Reconnected after ${attempt} attempts`);
      this.connectionState = 'connected';
      this.reconnectAttempts = 0;
      this.notifyConnectionStateChange();
      this.flushQueuedMessages();
    });
  }

  handleConnect() {
    console.log('✅ Chat WebSocket connected successfully');
    this.connectionState = 'connected';
    this.reconnectAttempts = 0;
    this.notifyConnectionStateChange();
    this.flushQueuedMessages();
    
    // Join channels after connection
    if (this.socket) {
      this.socket.emit('join_channels');
    }
  }

  handleDisconnect(reason) {
    console.warn('⚠️ Chat WebSocket disconnected:', reason);
    this.connectionState = 'disconnected';
    this.notifyConnectionStateChange({ reason });

    if (!this.isIntentionalDisconnect && this.token) {
      console.log(`🔄 Socket.IO will attempt reconnection automatically`);
    }
  }

  handleConnectError(error) {
    console.error('❌ Chat WebSocket connection error:', error.message);
    this.notifyError('connection_error', { error });
  }

  handleNewMessage(data) {
    const { message, tempId } = data;
    this.notifyMessageHandlers(message.channelId, {
      type: 'new_message',
      channel_id: message.channelId,
      message: message,
      tempId
    });
  }

  handleUserOnline(data) {
    const { userId, username, status } = data;
    this.notifyChannelHandlers('global', {
      type: 'user_online',
      userId,
      username,
      status
    });
  }

  handleUserOffline(data) {
    const { userId, username, status, lastSeen } = data;
    this.notifyChannelHandlers('global', {
      type: 'user_offline',
      userId,
      username,
      status,
      lastSeen
    });
  }

  handleUserTyping(data) {
    const { userId, username, channelId, isTyping } = data;
    this.notifyChannelHandlers(channelId, {
      type: 'user_typing',
      userId,
      username,
      channelId,
      isTyping
    });
  }

  // ===== Message Queuing & Retry =====
  queueMessage(channelId, content, options) {
    const messageId = this.generateMessageId();
    const queuedMessage = {
      channelId,
      content,
      options,
      timestamp: Date.now(),
      attempts: 0,
      maxAttempts: 3
    };

    this.pendingMessages.set(messageId, queuedMessage);
    return Promise.reject(new Error('Message queued - waiting for connection'));
  }

  flushQueuedMessages() {
    if (this.pendingMessages.size === 0) return;

    console.log(`📤 Flushing ${this.pendingMessages.size} queued messages`);
    
    for (const [messageId, message] of this.pendingMessages) {
      setTimeout(() => {
        this.sendMessage(message.channelId, message.content, message.options)
          .then(() => this.pendingMessages.delete(messageId))
          .catch(error => {
            console.warn('Failed to send queued message:', error);
            message.attempts++;
            if (message.attempts >= message.maxAttempts) {
              this.pendingMessages.delete(messageId);
            }
          });
      }, 100);
    }
  }

  // ===== Validation Methods =====
    validateToken(token) {
      return token && typeof token === 'string' && token.length > 10;
    }

    validateMessageParams(channelId, content) {
      return channelId && 
            typeof channelId === 'string' && 
            content && 
            (typeof content === 'string' || typeof content === 'object');
    }

    getServerUrl() {
      try {
        // 1. Check Vite env
        if (typeof import.meta !== 'undefined' && import.meta.env?.API_CHAT_URL) {
          return import.meta.env.API_CHAT_URL;
        }

        // 2. Check CRA or Webpack env
        if (typeof process !== 'undefined' && process.env) {
          return process.env.REACT_APP_SERVER_URL || process.env.SERVER_URL;
        }

        // 3. Safe fallback: explicitly use backend port, not window.location.host
        const protocol = window.location.protocol === 'https:' ? 'https' : 'http';
        const host = 'localhost:4000'; 

        console.log('Connecting to backend host:', host);

        return `${protocol}://${host}`;

      } catch (error) {
        console.warn('⚠️ getServerUrl() failed, using fallback:', error);
        return 'http://localhost:4000';
      }
    }

  // ===== Notification Methods =====
    notifyMessageHandlers(channelId, message) {
      const handlers = this.messageHandlers.get(channelId);
      if (handlers) {
        handlers.forEach(callback => {
          try {
            callback(message);
          } catch (error) {
            console.error('Error in message handler:', error);
          }
        });
      }
    }

    notifyChannelHandlers(channelId, event) {
      const handlers = this.channelHandlers.get(channelId);
      if (handlers) {
        handlers.forEach(callback => {
          try {
            callback(event);
          } catch (error) {
            console.error('Error in channel handler:', error);
          }
        });
      }
    }

    notifyConnectionStateChange(event = {}) {
      const state = {
        status: this.getConnectionStatus(),
        reconnectAttempts: this.reconnectAttempts,
        maxReconnectAttempts: this.maxReconnectAttempts,
        timestamp: Date.now(),
        ...event
      };

      this.connectionHandlers.forEach(callback => {
        try {
          callback(state);
        } catch (error) {
          console.error('Error in connection handler:', error);
        }
      });
    }

    notifyError(errorType, details) {
      this.notifyConnectionStateChange({
        type: 'error',
        errorType,
        ...details
      });
    }

    handleConnectionFailure(message, error = null) {

      console.error(`🚫 Connection failed: ${message}`, error);
      this.connectionState = 'disconnected';
      this.notifyError('connection_failed', { message, error });
      
    }

    generateMessageId() {
      return `msg_${Date.now()}_${++this.messageIdCounter}`;
    }

    // ===== Cleanup =====
    destroy() {
      this.disconnect('Service destroyed');
      this.messageHandlers.clear();
      this.channelHandlers.clear();
      this.connectionHandlers.clear();
      this.pendingMessages.clear();
    }
  }

// Create singleton instance
const chatWebSocketService = new ChatWebSocketService();

// Export both singleton and class for testing
export { ChatWebSocketService };
export default chatWebSocketService;