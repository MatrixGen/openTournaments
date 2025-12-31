import { io } from "socket.io-client";
import chatAuthService from "./chatAuthService";

class ChatWebSocketService {
  constructor() {
    this.socket = null;
    this.isConnected = false;

    // Event handlers
    this.messageHandlers = new Map(); // channelId -> Set of callbacks
    this.channelHandlers = new Map(); // channelId -> Set of callbacks
    this.connectionHandlers = new Set(); // Global connection callbacks

    // Bind methods
    this.handleConnect = this.handleConnect.bind(this);
    this.handleDisconnect = this.handleDisconnect.bind(this);
    this.handleNewMessage = this.handleNewMessage.bind(this);
    this.handleMessageSent = this.handleMessageSent.bind(this);
    this.handleTyping = this.handleTyping.bind(this);

    // Presence handlers
    this.handleUserOnline = this.handleUserOnline.bind(this);
    this.handleUserOffline = this.handleUserOffline.bind(this);
    this.handleOnlineUsersUpdate = this.handleOnlineUsersUpdate.bind(this);
    this.handleOnlineUsersInitial = this.handleOnlineUsersInitial.bind(this);
    this.handleUserJoinedChannel = this.handleUserJoinedChannel.bind(this);
    this.handleUserLeftChannel = this.handleUserLeftChannel.bind(this);

    // Message update handlers
    this.handleMessageUpdate = this.handleMessageUpdate.bind(this);
    this.handleMessageDelete = this.handleMessageDelete.bind(this);
    this.handleMessageEdited = this.handleMessageEdited.bind(this);
    this.handleReactionUpdate = this.handleReactionUpdate.bind(this);
  }

  // ===== Public Methods =====

  /**
   * Connect to chat WebSocket server
   */
  connect(serverUrl = null) {
    if (this.socket?.connected) {
      console.log("✅ Chat WebSocket already connected");
      setInterval(() => {
        this.socket?.emit("heartbeat", { timestamp: Date.now() });
      }, 30000);
      return;
    }

    // In frontend WebSocket service, after connection:

    // Get chat token from auth service
    const token = chatAuthService.getChatToken();
    if (!token) {
      console.warn("⚠️ No chat token available, cannot connect WebSocket");
      return;
    }

    // Determine server URL
    const wsUrl =
      serverUrl || import.meta.env.VITE_CHAT_API_URL || window.location.origin;

    console.log(`🔗 Connecting to chat WebSocket at: ${wsUrl}`);

    try {
      this.socket = io(wsUrl, {
        transports: ["websocket", "polling"],
        auth: { token },
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
      });

      this.setupEventHandlers();
    } catch (error) {
      console.error("❌ Failed to create WebSocket connection:", error);
    }
  }

  /**
   * Disconnect from WebSocket server
   */
  disconnect() {
    console.log("🛑 Disconnecting WebSocket");

    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }

    this.isConnected = false;
    this.notifyConnectionStateChange("disconnected");
  }

  /**
   * Send a chat message (text-only)
   */
  sendMessage(channelId, content, options = {}) {
    console.log("📡 [CLIENT] WebSocket sending:", {
      channelId,
      content: content.substring(0, 50),
      options,
      hasTempId: !!options.tempId,
      tempId: options.tempId,
    });

    if (!this.socket?.connected) {
      console.warn("WebSocket not connected");
      return false;
    }

    if (!channelId || !content) {
      console.warn("Invalid message parameters");
      return false;
    }

    try {
      this.socket.emit("send_message", {
        channelId,
        content,
        timestamp: Date.now(),
        ...options,
      });

      return options.tempId || null;
    } catch (error) {
      console.error("Failed to send message:", error);
      return false;
    }
  }

  /**
   * Start typing indicator
   */
  startTyping(channelId) {
    if (this.socket?.connected && channelId) {
      this.socket.emit("typing_start", { channelId });
    }
  }

  /**
   * Stop typing indicator
   */
  stopTyping(channelId) {
    if (this.socket?.connected && channelId) {
      this.socket.emit("typing_stop", { channelId });
    }
  }

  /**
   * Join a channel
   */
  joinChannel(channelId) {
    if (this.socket?.connected && channelId) {
      this.socket.emit("join_channel", { channelId });
    }
  }

  /**
   * Leave a channel
   */
  leaveChannel(channelId) {
    if (this.socket?.connected && channelId) {
      this.socket.emit("leave_channel", { channelId });
    }
  }

  /**
   * Manually request online users (can be called from UI)
   */
  getOnlineUsers(channelId = null) {
    if (!this.socket?.connected) {
      console.warn("⚠️ WebSocket not connected");
      return Promise.reject(new Error("WebSocket not connected"));
    }

    return new Promise((resolve, reject) => {
      this.socket.emit("get_online_users", { channelId }, (response) => {
        if (response?.success) {
          resolve(response);
        } else {
          reject(new Error(response?.error || "Failed to get online users"));
        }
      });
    });
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

  // ===== Event Handlers Setup =====

  setupEventHandlers() {
    if (!this.socket) return;

    // Connection events
    this.socket.on("connect", this.handleConnect);
    this.socket.on("disconnect", this.handleDisconnect);
    this.socket.on("connected", (data) => {
      console.log("✅ Server connection confirmed:", data);
    });

    // Message events
    this.socket.on("new_message", this.handleNewMessage);
    this.socket.on("message_sent", this.handleMessageSent);
    this.socket.on("message_updated", this.handleMessageUpdate);
    this.socket.on("message_deleted", this.handleMessageDelete);
    this.socket.on("message_edited", this.handleMessageEdited);
    this.socket.on("message_reaction_updated", this.handleReactionUpdate);

    // Presence events
    this.socket.on("user_online", this.handleUserOnline);
    this.socket.on("user_offline", this.handleUserOffline);
    this.socket.on("online_users_update", this.handleOnlineUsersUpdate);
    this.socket.on("online_users_initial", this.handleOnlineUsersInitial);
    this.socket.on("user_joined_channel", this.handleUserJoinedChannel);
    this.socket.on("user_left_channel", this.handleUserLeftChannel);

    // Typing events
    this.socket.on("user_typing", this.handleTyping);

    // Error events
    this.socket.on("connect_error", (error) => {
      console.error("WebSocket connection error:", error);
      this.notifyConnectionStateChange("error", { error: error.message });
    });

    this.socket.on("error", (error) => {
      console.error("WebSocket error:", error);
    });

    this.socket.on("message_error", (data) => {
      console.error("Message error from server:", data);
      this.notifyMessageError(data);
    });
  }

  // ===== Connection Handlers =====

  handleConnect() {
    console.log("✅ Chat WebSocket connected");
    this.isConnected = true;
    this.notifyConnectionStateChange("connected");

    // Request initial online users
    this.requestOnlineUsers();

    // Notify of successful connection
    this.notifyChannelHandlers("global", {
      type: "connected",
      timestamp: new Date(),
    });
  }

  handleDisconnect(reason) {
    console.log("⚠️ Chat WebSocket disconnected:", reason);
    this.isConnected = false;
    this.notifyConnectionStateChange("disconnected", { reason });

    // Notify all channels of disconnection
    this.notifyChannelHandlers("global", {
      type: "disconnected",
      reason,
      timestamp: new Date(),
    });
  }

  requestOnlineUsers() {
    if (!this.socket?.connected) return;

    console.log("👥 [CLIENT] Requesting online users...");

    this.socket.emit("get_online_users", {}, (response) => {
      if (response?.success) {
        console.log("👥 [CLIENT] Online users received:", {
          count: response.count,
          userIds: response.userIds,
        });

        this.notifyPresenceEvent("online_users_initial", {
          count: response.count,
          userIds: response.userIds || [],
        });
      } else {
        console.warn("⚠️ Failed to get online users:", response?.error);
      }
    });
  }

  // ===== Message Handlers =====

  handleMessageSent(data) {
    console.log("📡 [CLIENT] Message sent confirmation:", {
      tempId: data.tempId,
      messageId: data.messageId,
      hasMessageData: !!data.messageData,
    });

    const { tempId, messageId, messageData } = data;

    if (!tempId || !messageId) return;

    const channelId = messageData?.message?.channelId;
    if (!channelId) return;

    // Notify message subscribers
    this.notifyMessageHandlers(channelId, {
      type: "message_sent",
      tempId,
      messageId,
      message: messageData?.message,
      channelId,
      timestamp: new Date(),
    });
  }

  handleNewMessage(data) {
    console.log("📡 [CLIENT] New message received:", {
      channelId: data.message?.channelId,
      messageId: data.message?.id,
      tempId: data.tempId,
    });

    const channelId = data.message?.channelId;
    if (!channelId || !data.message) return;

    this.notifyMessageHandlers(channelId, {
      type: "new_message",
      channelId,
      message: data.message,
      tempId: data.tempId,
      timestamp: new Date(),
    });
  }

  handleMessageUpdate(data) {
    const { channelId, message } = data;
    if (!channelId || !message) return;

    this.notifyMessageHandlers(channelId, {
      type: "message_updated",
      channelId,
      message,
      timestamp: new Date(),
    });
  }

  handleMessageEdited(data) {
    const { channelId, message } = data;
    if (!channelId || !message) return;

    this.notifyMessageHandlers(channelId, {
      type: "message_edited",
      channelId,
      message,
      timestamp: new Date(),
    });
  }

  handleReactionUpdate(data) {
    const { channelId, messageId, reactions } = data;
    if (!channelId || !messageId) return;

    this.notifyMessageHandlers(channelId, {
      type: "message_reaction_updated",
      channelId,
      messageId,
      reactions,
      timestamp: new Date(),
    });
  }

  handleMessageDelete(data) {
    const { channelId, messageId } = data;
    if (!channelId || !messageId) return;

    this.notifyMessageHandlers(channelId, {
      type: "message_deleted",
      channelId,
      messageId,
      timestamp: new Date(),
    });
  }

  // ===== Presence Handlers =====

  handleUserOnline(data) {
    console.log("👤 [CLIENT] User online:", {
      userId: data.userId,
      username: data.username,
      channelId: data.channelId,
    });

    this.notifyPresenceEvent("user_online", data);
  }

  handleUserOffline(data) {
    console.log("👤 [CLIENT] User offline:", {
      userId: data.userId,
      username: data.username,
      channelId: data.channelId,
    });

    this.notifyPresenceEvent("user_offline", data);
  }

  handleOnlineUsersUpdate(data) {
    console.log("👥 [CLIENT] Online users update:", {
      count: data.count,
      channelId: data.channelId,
    });

    this.notifyPresenceEvent("online_users_update", data);
  }

  handleOnlineUsersInitial(data) {
    console.log("👥 [CLIENT] Initial online users:", {
      count: data.count,
      userIds: data.userIds,
      channelId: data.channelId,
    });

    this.notifyPresenceEvent("online_users_initial", data);
  }

  handleUserJoinedChannel(data) {
    console.log("👤 [CLIENT] User joined channel:", {
      channelId: data.channelId,
      userId: data.user?.id,
      username: data.user?.username,
    });

    this.notifyPresenceEvent("user_joined_channel", data);
  }

  handleUserLeftChannel(data) {
    console.log("👤 [CLIENT] User left channel:", {
      channelId: data.channelId,
      userId: data.userId,
      username: data.username,
    });

    this.notifyPresenceEvent("user_left_channel", data);
  }

  // ===== Typing Handler =====

  handleTyping(data) {
    console.log("⌨️ [CLIENT] User typing:", {
      userId: data.userId,
      channelId: data.channelId,
      isTyping: data.isTyping,
    });

    const { channelId } = data;
    if (!channelId) return;

    this.notifyChannelHandlers(channelId, {
      type: "user_typing",
      ...data,
      timestamp: new Date(),
    });
  }

  // ===== Notification Helpers =====

  notifyPresenceEvent(eventType, data) {
    const event = {
      type: eventType,
      ...data,
      timestamp: new Date(),
    };

    // Notify global handlers
    this.notifyChannelHandlers("global", event);

    // Notify specific channel handlers if channelId is provided
    if (data.channelId && data.channelId !== "global") {
      this.notifyChannelHandlers(data.channelId, event);
    }
  }

  notifyMessageHandlers(channelId, event) {
    const handlers = this.messageHandlers.get(channelId);
    if (!handlers) return;

    handlers.forEach((callback) => {
      try {
        callback(event);
      } catch (error) {
        console.error(
          `Error in message handler for channel ${channelId}:`,
          error
        );
      }
    });
  }

  notifyChannelHandlers(channelId, event) {
    const handlers = this.channelHandlers.get(channelId);
    if (!handlers) return;

    handlers.forEach((callback) => {
      try {
        callback(event);
      } catch (error) {
        console.error(
          `Error in channel handler for channel ${channelId}:`,
          error
        );
      }
    });
  }

  notifyConnectionStateChange(status, data = {}) {
    const event = {
      type: "connection",
      status,
      timestamp: new Date(),
      ...data,
    };

    this.connectionHandlers.forEach((callback) => {
      try {
        callback(event);
      } catch (error) {
        console.error("Error in connection handler:", error);
      }
    });
  }

  notifyMessageError(data) {
    // Notify all message handlers of error
    this.messageHandlers.forEach((handlers, channelId) => {
      handlers.forEach((callback) => {
        try {
          callback({
            type: "message_error",
            ...data,
            channelId,
            timestamp: new Date(),
          });
        } catch (error) {
          console.error("Error in message error handler:", error);
        }
      });
    });
  }

  // ===== Utility Methods =====

  /**
   * Check connection status
   */
  getStatus() {
    if (!this.socket) return "disconnected";
    return this.socket.connected ? "connected" : "disconnected";
  }

  /**
   * Reconnect with new token (after refresh)
   */
  reconnectWithNewToken(newToken) {
    console.log("🔄 Reconnecting WebSocket with new token");

    // Update token in auth service
    chatAuthService.clearChatTokens();
    localStorage.setItem("chat_token", newToken);

    // Disconnect and reconnect
    this.disconnect();
    setTimeout(() => this.connect(), 1000);
  }

  /**
   * Check if socket is connected
   */
  isSocketConnected() {
    return this.socket?.connected || false;
  }

  /**
   * Get socket ID
   */
  getSocketId() {
    return this.socket?.id;
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
