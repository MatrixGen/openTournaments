class ChatWebSocketService {
  constructor() {
    this.socket = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectInterval = 3000;
    this.reconnectBackoffFactor = 1.5;
    this.maxReconnectInterval = 30000;
    
    this.messageHandlers = new Map();
    this.channelHandlers = new Map();
    this.connectionHandlers = new Set();
    
    this.token = null;
    this.isIntentionalDisconnect = false;
    this.connectionState = 'disconnected'; // 'connecting', 'connected', 'disconnecting', 'disconnected'
    
    this.heartbeatInterval = null;
    this.heartbeatTimeout = null;
    this.HEARTBEAT_INTERVAL = 30000; // 30 seconds
    this.HEARTBEAT_TIMEOUT = 5000; // 5 seconds to wait for pong
    
    this.pendingMessages = new Map(); // For message queuing and retry
    this.messageIdCounter = 0;
    
    // Bind methods to maintain context
    this.handleOpen = this.handleOpen.bind(this);
    this.handleMessage = this.handleMessage.bind(this);
    this.handleClose = this.handleClose.bind(this);
    this.handleError = this.handleError.bind(this);
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
      const wsUrl = this.constructWebSocketUrl(token);
      console.log(`🔗 Attempting WebSocket connection to: ${wsUrl.replace(token, '***')}`);
      
      this.socket = new WebSocket(wsUrl);
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
    this.clearHeartbeat();

    if (this.socket) {
      try {
        this.socket.close(1000, reason);
      } catch (error) {
        console.warn('Error during WebSocket close:', error);
      }
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
      type: 'send_message',
      channel_id: channelId,
      content: content,
      message_id: messageId,
      timestamp: Date.now(),
      ...options
    };

    return this.sendWithConfirmation(message);
  }

  // ===== Connection Management =====
  isConnected() {
    return this.socket && this.socket.readyState === WebSocket.OPEN;
  }

  getConnectionStatus() {
    if (!this.socket) return this.connectionState;
    
    switch (this.socket.readyState) {
      case WebSocket.CONNECTING: return 'connecting';
      case WebSocket.OPEN: return 'connected';
      case WebSocket.CLOSING: return 'disconnecting';
      case WebSocket.CLOSED: return 'disconnected';
      default: return 'unknown';
    }
  }

  reconnectWithNewToken(newToken) {
    console.log('🔄 Reconnecting with new token');
    this.token = newToken;
    this.disconnect('Token refresh');
    setTimeout(() => this.connect(newToken), 500);
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
    this.socket.onopen = this.handleOpen;
    this.socket.onmessage = this.handleMessage;
    this.socket.onclose = this.handleClose;
    this.socket.onerror = this.handleError;
  }

  handleOpen() {
    console.log('✅ Chat WebSocket connected successfully');
    this.connectionState = 'connected';
    this.reconnectAttempts = 0;
    this.startHeartbeat();
    this.notifyConnectionStateChange();
    this.flushQueuedMessages();
  }

  handleMessage(event) {
    try {
      const message = JSON.parse(event.data);
      this.validateAndRouteMessage(message);
    } catch (error) {
      console.error('❌ Error parsing WebSocket message:', error, event.data);
      this.notifyError('message_parse_error', { error, rawData: event.data });
    }
  }

  handleClose(event) {
    console.warn('⚠️ Chat WebSocket disconnected:', {
      code: event.code,
      reason: event.reason,
      wasClean: event.wasClean
    });

    this.clearHeartbeat();
    this.connectionState = 'disconnected';
    this.notifyConnectionStateChange(event);

    if (!this.isIntentionalDisconnect && this.token) {
      this.attemptReconnect();
    }
  }

  handleError(error) {
    console.error('❌ Chat WebSocket error:', {
      error,
      readyState: this.socket?.readyState,
      connectionState: this.connectionState
    });
    
    this.notifyError('websocket_error', { error, readyState: this.socket?.readyState });
  }

  validateAndRouteMessage(message) {
    if (!message || !message.type) {
      console.warn('📨 Received malformed message:', message);
      return;
    }

    // Handle system messages first
    if (this.handleSystemMessage(message)) {
      return;
    }

    // Route channel-specific messages
    if (message.channel_id) {
      this.routeChannelMessage(message);
    } else {
      console.warn('📨 Message missing channel_id:', message);
    }
  }

  handleSystemMessage(message) {
    switch (message.type) {
      case 'pong':
        this.handlePong();
        return true;
      case 'message_ack':
        this.handleMessageAck(message);
        return true;
      case 'error':
        console.error('📨 Server error message:', message);
        this.notifyError('server_error', message);
        return true;
      default:
        return false;
    }
  }

  routeChannelMessage(message) {
    const { type, channel_id } = message;
    
    // Message events (new_message, message_updated, message_deleted)
    if (type.startsWith('message_')) {
      this.notifyMessageHandlers(channel_id, message);
    }
    // Channel events (user_joined, user_left, channel_updated)
    else if (type.startsWith('user_') || type.startsWith('channel_')) {
      this.notifyChannelHandlers(channel_id, message);
    }
    else {
      console.log('📨 Unhandled message type:', type, message);
    }
  }

  // ===== Heartbeat Mechanism =====
  startHeartbeat() {
    this.clearHeartbeat();
    
    this.heartbeatInterval = setInterval(() => {
      if (this.isConnected()) {
        this.sendPing();
        this.startHeartbeatTimeout();
      }
    }, this.HEARTBEAT_INTERVAL);
  }

  sendPing() {
    try {
      this.socket.send(JSON.stringify({ type: 'ping', timestamp: Date.now() }));
    } catch (error) {
      console.error('Error sending ping:', error);
    }
  }

  handlePong() {
    this.clearHeartbeatTimeout();
  }

  startHeartbeatTimeout() {
    this.heartbeatTimeout = setTimeout(() => {
      console.warn('❤️‍🩹 Heartbeat timeout - connection may be dead');
      this.handleConnectionFailure('Heartbeat timeout');
    }, this.HEARTBEAT_TIMEOUT);
  }

  clearHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
    this.clearHeartbeatTimeout();
  }

  clearHeartbeatTimeout() {
    if (this.heartbeatTimeout) {
      clearTimeout(this.heartbeatTimeout);
      this.heartbeatTimeout = null;
    }
  }

  // ===== Reconnection Logic =====
  attemptReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts || this.isIntentionalDisconnect) {
      console.error('❌ Max reconnect attempts reached or intentional disconnect');
      this.notifyConnectionStateChange({ 
        type: 'connection_failed', 
        message: 'Unable to connect to chat server' 
      });
      return;
    }

    this.reconnectAttempts++;
    const delay = this.calculateReconnectDelay();
    
    console.log(`🔄 Reconnecting in ${delay}ms... attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts}`);
    
    setTimeout(() => {
      if (!this.isIntentionalDisconnect && this.token) {
        this.connect(this.token);
      }
    }, delay);
  }

  calculateReconnectDelay() {
    const delay = this.reconnectInterval * Math.pow(this.reconnectBackoffFactor, this.reconnectAttempts - 1);
    return Math.min(delay, this.maxReconnectInterval);
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

  sendWithConfirmation(message) {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Message confirmation timeout'));
      }, 10000);

      // Temporary handler for ack
      const ackHandler = (ackMessage) => {
        if (ackMessage.message_id === message.message_id) {
          clearTimeout(timeout);
          resolve(ackMessage);
        }
      };

      // For now, we'll simulate immediate success since ACK mechanism depends on server
      try {
        this.socket.send(JSON.stringify(message));
        // In real implementation, wait for ack from server
        setTimeout(() => {
          resolve({ success: true, message_id: message.message_id });
        }, 100);
      } catch (error) {
        clearTimeout(timeout);
        reject(error);
      }
    });
  }

  handleMessageAck(ackMessage) {
    // Handle message acknowledgements from server
    console.log('✅ Message acknowledged:', ackMessage);
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

  constructWebSocketUrl(token) {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = /*process.env.REACT_APP_WS_HOST || */'localhost:5000';
    return `${protocol}//${host}/ws?token=${encodeURIComponent(token)}`;
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
    this.attemptReconnect();
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
    this.clearHeartbeat();
  }
}

// Create singleton instance
const chatWebSocketService = new ChatWebSocketService();

// Export both singleton and class for testing
export { ChatWebSocketService };
export default chatWebSocketService;