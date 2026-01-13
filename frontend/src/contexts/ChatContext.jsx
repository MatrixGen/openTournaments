// ChatContext.js - WITH HYBRID VERIFICATION

import React, {
  createContext,
  useContext,
  useReducer,
  useCallback,
  useRef,
} from "react";
import chatService from "../services/chatService";
import chatWebSocketService from "../services/chatWebSocketService";
import { useAuth } from "./AuthContext";
import chatAuthService from "../services/chatAuthService";
import {
  createTempId,
  getSender,
  normalizeMessage,
  verifyMessageOnServer,
} from "./chat/chatHelpers";
import { useChatConnection } from "./chat/useChatConnection";
import { useChatMessages } from "./chat/useChatMessages";
import { useChatTyping } from "./chat/useChatTyping";

const ChatContext = createContext();

// --- INITIAL STATE ---
const initialState = {
  currentChannel: null,
  messages: [],
  isConnected: false,
  isLoading: false,
  error: null,
  typingUsers: [],
  onlineUsers: [],
};

// --- ACTION TYPES ---
const ACTION_TYPES = {
  SET_LOADING: "SET_LOADING",
  SET_ERROR: "SET_ERROR",
  CLEAR_ERROR: "CLEAR_ERROR",
  SET_CURRENT_CHANNEL: "SET_CURRENT_CHANNEL",
  CLEAR_CURRENT_CHANNEL: "CLEAR_CURRENT_CHANNEL",
  SET_MESSAGES: "SET_MESSAGES",
  ADD_MESSAGE: "ADD_MESSAGE",
  UPDATE_MESSAGE: "UPDATE_MESSAGE",
  REMOVE_OPTIMISTIC_MESSAGE: "REMOVE_OPTIMISTIC_MESSAGE",
  SET_CONNECTED: "SET_CONNECTED",
  ADD_TYPING_USER: "ADD_TYPING_USER",
  REMOVE_TYPING_USER: "REMOVE_TYPING_USER",
  SET_ONLINE_USERS: "SET_ONLINE_USERS",
  ADD_ONLINE_USER: "ADD_ONLINE_USER",
  REMOVE_ONLINE_USER: "REMOVE_ONLINE_USER",
  REMOVE_MESSAGE: "REMOVE_MESSAGE",
};

// --- REDUCER ---
function chatReducer(state, action) {
  console.log(`🔄 [REDUCER] ${action.type}`, {
    payload: action.payload,
    currentMessagesCount: state.messages.length,
  });

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

    case ACTION_TYPES.ADD_MESSAGE: {
      const { payload } = action;

      // First, try to find by tempId (for optimistic updates)
      let existingIndex = -1;

      if (payload.tempId) {
        existingIndex = state.messages.findIndex(
          (msg) => msg.tempId === payload.tempId
        );
      }

      // If not found by tempId, try by id (for server messages)
      if (existingIndex === -1 && payload.id) {
        existingIndex = state.messages.findIndex(
          (msg) => msg.id === payload.id
        );
      }

      // If still not found, try to match optimistic message by content and timing
      if (
        existingIndex === -1 &&
        payload.isOptimistic === false &&
        state.messages.length > 0
      ) {
        const recentOptimistic = state.messages.find(
          (msg) =>
            msg.isOptimistic === true &&
            !msg.isConfirmed &&
            msg.content === payload.content &&
            Math.abs(
              new Date(msg.created_at).getTime() -
                new Date(payload.created_at || payload.createdAt).getTime()
            ) < 5000
        );

        if (recentOptimistic) {
          existingIndex = state.messages.indexOf(recentOptimistic);
          console.log("🔍 Found matching optimistic message:", {
            optimisticTempId: recentOptimistic.tempId,
            serverId: payload.id,
          });
        }
      }

      if (existingIndex !== -1) {
        console.log("🔄 Replacing message at index:", existingIndex);
        const newMessages = [...state.messages];
        newMessages[existingIndex] = payload;
        return { ...state, messages: newMessages };
      }

      console.log("➕ Adding new message to end");
      return {
        ...state,
        messages: [...state.messages, payload],
      };
    }

    case ACTION_TYPES.UPDATE_MESSAGE: {
      const { tempId, id, updates } = action.payload;
      return {
        ...state,
        messages: state.messages.map((msg) =>
          (tempId && msg.tempId === tempId) || (id && msg.id === id)
            ? { ...msg, ...updates }
            : msg
        ),
      };
    }

    case ACTION_TYPES.REMOVE_OPTIMISTIC_MESSAGE:
      return {
        ...state,
        messages: state.messages.filter((msg) => msg.tempId !== action.payload),
      };

    case ACTION_TYPES.REMOVE_MESSAGE:
      return {
        ...state,
        messages: state.messages.filter((msg) => msg.id !== action.payload),
      };

    case ACTION_TYPES.SET_CONNECTED:
      return { ...state, isConnected: action.payload };

    case ACTION_TYPES.ADD_TYPING_USER:
      if (state.typingUsers.includes(action.payload)) return state;
      return {
        ...state,
        typingUsers: [...state.typingUsers, action.payload],
      };

    case ACTION_TYPES.REMOVE_TYPING_USER:
      return {
        ...state,
        typingUsers: state.typingUsers.filter(
          (userId) => userId !== action.payload
        ),
      };

    case ACTION_TYPES.SET_ONLINE_USERS:
      return { ...state, onlineUsers: action.payload };

    case ACTION_TYPES.ADD_ONLINE_USER:
      if (state.onlineUsers.includes(action.payload)) return state;
      return {
        ...state,
        onlineUsers: [...state.onlineUsers, action.payload],
      };

    case ACTION_TYPES.REMOVE_ONLINE_USER:
      return {
        ...state,
        onlineUsers: state.onlineUsers.filter(
          (userId) => userId !== action.payload
        ),
      };

    default:
      return state;
  }
}


// --- CHAT PROVIDER COMPONENT ---
export function ChatProvider({ children }) {
  const [state, dispatch] = useReducer(chatReducer, initialState);
  const { user, isAuthenticated } = useAuth();
  const [chatUser, setChatUser] = React.useState(null);

  // Refs for controlling lifecycle and state
  const initializationRef = useRef(false);
  const retryTimeoutRef = useRef(null);
  const messageSubscriptionsRef = useRef(new Map());
  const typingTimeoutRef = useRef(null);

  // Track pending messages with their details
  const pendingMessagesRef = useRef(new Map());

  // Simplified authentication check for chat tokens
  const checkChatAuth = useCallback(() => {
    return chatAuthService.hasChatAuth();
  }, []);

  // Handler for incoming WebSocket messages
  const handleWebSocketMessage = useCallback(
    (event) => {
      console.log("📥 WebSocket event:", event.type, {
        tempId: event.tempId,
        messageId: event.message?.id,
        hasParentMessage: !!event.message?.parentMessage,
        replyTo: event.message?.replyTo,
      });

      if (!event.type) return;

      switch (event.type) {
        case "new_message": {
          if (!event.message) return;

          const normalizedMessage = normalizeMessage({
            ...event.message,
            tempId: event.tempId,
            isConfirmed: true,
            isOptimistic: false,
          });

          console.log("📥 Processing new_message:", {
            id: normalizedMessage.id,
            tempId: normalizedMessage.tempId,
            isOptimistic: normalizedMessage.isOptimistic,
          });

          // Clean up timeout if this was an optimistic message
          if (normalizedMessage.tempId) {
            const pendingData = pendingMessagesRef.current.get(
              normalizedMessage.tempId
            );
            if (pendingData?.timeout) {
              clearTimeout(pendingData.timeout);
              console.log("🗑️ Cleared timeout for:", normalizedMessage.tempId);
            }
            pendingMessagesRef.current.delete(normalizedMessage.tempId);

            // Clean up blob URLs
            const existingMessage = state.messages.find(
              (m) => m.tempId === normalizedMessage.tempId
            );
            if (existingMessage?._blobUrl) {
              console.log(
                "🧹 Cleaning up blob URL for tempId:",
                normalizedMessage.tempId
              );
              setTimeout(() => {
                URL.revokeObjectURL(existingMessage._blobUrl);
              }, 1000);
            }
          }

          if (normalizedMessage.channel_id === state.currentChannel?.id) {
            dispatch({
              type: ACTION_TYPES.ADD_MESSAGE,
              payload: normalizedMessage,
            });
          }
          break;
        }

        case "message_sent": {
          console.log("✅ Message sent confirmation received:", {
            tempId: event.tempId,
            messageId: event.messageId,
            serverMessageId: event.message?.id,
          });

          // Clear timeout immediately
          const pendingData = pendingMessagesRef.current.get(event.tempId);
          if (pendingData?.timeout) {
            console.log("🗑️ Clearing timeout for:", event.tempId);
            clearTimeout(pendingData.timeout);
          }

          // Remove from pending set
          pendingMessagesRef.current.delete(event.tempId);

          if (event.tempId && event.messageId && event.message) {
            const normalizedMessage = normalizeMessage({
              ...event.message,
              id: event.messageId,
              tempId: event.tempId,
              isOptimistic: false,
              isConfirmed: true,
              failed: false,
            });

            // Update the optimistic message
            dispatch({
              type: ACTION_TYPES.UPDATE_MESSAGE,
              payload: {
                tempId: event.tempId,
                updates: normalizedMessage,
              },
            });
          }
          break;
        }

        case "message_updated": {
          if (
            event.message &&
            event.message.channelId === state.currentChannel?.id
          ) {
            dispatch({
              type: ACTION_TYPES.UPDATE_MESSAGE,
              payload: {
                id: event.message.id,
                updates: event.message,
              },
            });
          }
          break;
        }

        case "message_deleted": {
          if (event.channelId === state.currentChannel?.id && event.messageId) {
            dispatch({
              type: ACTION_TYPES.REMOVE_MESSAGE,
              payload: event.messageId,
            });
          }
          break;
        }

        case "user_online":
          console.log("👤 USER ONLINE:", {
            userId: event.userId,
            username: event.username,
            timestamp: new Date().toISOString(),
          });
          dispatch({
            type: ACTION_TYPES.ADD_ONLINE_USER,
            payload: event.userId,
          });
          break;

        case "user_offline":
          console.log("👤 USER OFFLINE:", {
            userId: event.userId,
            username: event.username,
            timestamp: new Date().toISOString(),
          });
          dispatch({
            type: ACTION_TYPES.REMOVE_ONLINE_USER,
            payload: event.userId,
          });
          break;

        case "online_users_update":
          console.log("👥 ONLINE USERS COUNT UPDATE:", {
            count: event.count,
            timestamp: new Date().toISOString(),
          });
          break;

        case "online_users_initial":
          console.log("👥 INITIAL ONLINE USERS:", {
            count: event.count,
            userIds: event.userIds,
            timestamp: new Date().toISOString(),
          });
          dispatch({
            type: ACTION_TYPES.SET_ONLINE_USERS,
            payload: event.userIds || [],
          });
          break;

        case "user_joined_channel":
          console.log("👤 USER JOINED CHANNEL:", {
            channelId: event.channelId,
            userId: event.user?.id,
            username: event.user?.username,
          });
          if (
            event.channelId === state.currentChannel?.id &&
            event.user?.id !== user?.id
          ) {
            dispatch({
              type: ACTION_TYPES.ADD_ONLINE_USER,
              payload: event.user.id,
            });
          }
          break;

        case "user_left_channel":
          console.log("👤 USER LEFT CHANNEL:", {
            channelId: event.channelId,
            userId: event.userId,
            username: event.username,
          });
          if (
            event.channelId === state.currentChannel?.id &&
            event.userId !== user?.id
          ) {
            dispatch({
              type: ACTION_TYPES.REMOVE_ONLINE_USER,
              payload: event.userId,
            });
          }
          break;

        case "user_typing":
          if (event.channelId === state.currentChannel?.id) {
            if (event.isTyping && event.userId !== user?.id) {
              dispatch({
                type: ACTION_TYPES.ADD_TYPING_USER,
                payload: event.userId,
              });

              setTimeout(() => {
                dispatch({
                  type: ACTION_TYPES.REMOVE_TYPING_USER,
                  payload: event.userId,
                });
              }, 3000);
            } else {
              dispatch({
                type: ACTION_TYPES.REMOVE_TYPING_USER,
                payload: event.userId,
              });
            }
          }
          break;

        default:
        // Unhandled events are silently ignored
      }
    },
    [state.currentChannel?.id, user?.id]
  );

  // Handler for connection status changes
  const handleConnectionChange = useCallback((event) => {
    console.log("🔌 Connection status:", event.status);

    switch (event.status) {
      case "connected":
        dispatch({ type: ACTION_TYPES.SET_CONNECTED, payload: true });
        dispatch({ type: ACTION_TYPES.CLEAR_ERROR });
        break;

      case "disconnected":
        dispatch({ type: ACTION_TYPES.SET_CONNECTED, payload: false });
        break;

      case "connecting":
        dispatch({ type: ACTION_TYPES.SET_CONNECTED, payload: false });
        break;

      case "error":
        dispatch({
          type: ACTION_TYPES.SET_ERROR,
          payload: `WebSocket error: ${event.error}`,
        });
        break;
    }
  }, []);

  // Core function to initialize the chat system
  const initializeChat = useCallback(async () => {
    if (initializationRef.current) return;

    initializationRef.current = true;
    dispatch({ type: ACTION_TYPES.SET_LOADING, payload: true });
    dispatch({ type: ACTION_TYPES.CLEAR_ERROR });

    try {
      if (!checkChatAuth()) {
        throw new Error("No chat authentication found. Please login again.");
      }

      try {
        const chatUserResponse = await chatService.getCurrentUser();
        setChatUser(chatUserResponse.data || chatUserResponse);
      } catch (err) {
        console.warn("Could not fetch chat user data:", err.message);
      }

      const serverUrl = import.meta.env.VITE_CHAT_API_URL;
      chatWebSocketService.connect(serverUrl);

      const unsubscribeConnection = chatWebSocketService.subscribeToConnection(
        handleConnectionChange
      );

      return () => {
        unsubscribeConnection();
        messageSubscriptionsRef.current.forEach((unsubscribe) => unsubscribe());
        messageSubscriptionsRef.current.clear();
      };
    } catch (error) {
      dispatch({ type: ACTION_TYPES.SET_ERROR, payload: error.message });

      if (isAuthenticated) {
        retryTimeoutRef.current = setTimeout(() => {
          initializationRef.current = false;
          initializeChat();
        }, 5000);
      }
    } finally {
      dispatch({ type: ACTION_TYPES.SET_LOADING, payload: false });
    }
  }, [checkChatAuth, handleConnectionChange, isAuthenticated]);

  useChatMessages({
    currentChannelId: state.currentChannel?.id,
    handleWebSocketMessage,
  });

  // Core function to clean up chat resources
  const cleanupChat = useCallback(() => {
    initializationRef.current = false;
    chatWebSocketService.disconnect();
    dispatch({ type: ACTION_TYPES.SET_CONNECTED, payload: false });
    dispatch({ type: ACTION_TYPES.CLEAR_CURRENT_CHANNEL });
    dispatch({ type: ACTION_TYPES.SET_ONLINE_USERS, payload: [] });

    messageSubscriptionsRef.current.forEach((unsubscribe) => unsubscribe());
    messageSubscriptionsRef.current.clear();

    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }

    // Clean up all pending message timeouts
    pendingMessagesRef.current.forEach((pendingData) => {
      if (pendingData.timeout) {
        clearTimeout(pendingData.timeout);
      }
    });
    pendingMessagesRef.current.clear();

    // Clean up all blob URLs from optimistic messages
    const currentMessages = state.messages;
    currentMessages.forEach((message) => {
      if (message._blobUrl) {
        URL.revokeObjectURL(message._blobUrl);
      }
    });
  }, []);

  const { retryConnection } = useChatConnection({
    isAuthenticated,
    user,
    initializeChat,
    cleanupChat,
    dispatch,
    ACTION_TYPES,
    initializationRef,
    retryTimeoutRef,
  });

  // Load channel messages
  const loadChannelMessages = useCallback(
    async (channelId) => {
      if (!channelId) throw new Error("Channel ID is required");
      if (!checkChatAuth()) throw new Error("Chat authentication required");

      try {
        dispatch({ type: ACTION_TYPES.SET_LOADING, payload: true });

        const response = await chatService.getChannelMessages(channelId);

        const potentialMessages =
          response?.data?.messages || response?.messages || response;
        const messages = Array.isArray(potentialMessages)
          ? potentialMessages
          : [];

        const normalizedMessages = messages.map(normalizeMessage);

        dispatch({
          type: ACTION_TYPES.SET_MESSAGES,
          payload: normalizedMessages,
        });

        return normalizedMessages;
      } catch (error) {
        const errorInfo = chatService.handleError(error);

        if (errorInfo.type === "AUTH_ERROR") {
          chatAuthService.clearChatTokens();
          window.dispatchEvent(new CustomEvent("chat-token-expired"));
        }

        throw error;
      } finally {
        dispatch({ type: ACTION_TYPES.SET_LOADING, payload: false });
      }
    },
    [checkChatAuth]
  );

  // MODIFIED: Send message with hybrid verification
  const sendMessage = useCallback(
    async (channelId, content, options = {}) => {
      console.log("📤 sendMessage called:", {
        channelId,
        sender: options.sender,
        contentPreview: content.substring(0, 30),
        replyTo: options.replyTo,
        tempId: options.tempId,
      });

      if (!channelId || !content?.trim())
        throw new Error("Channel ID and message content required");
      if (!chatWebSocketService.socket?.connected)
        throw new Error("WebSocket not connected");

      const tempId = options.tempId || createTempId("temp");
      const sender = options.sender || getSender(chatUser, user);
      const timestamp = new Date().toISOString();

      try {
        // Check for duplicate messages
        const now = Date.now();
        let isDuplicate = false;

        for (const [pendingData] of pendingMessagesRef.current.entries()) {
          if (
            pendingData.channelId === channelId &&
            pendingData.content === content.trim() &&
            pendingData.senderId === sender.id &&
            now - pendingData.timestamp < 2000
          ) {
            isDuplicate = true;
            break;
          }
        }

        if (isDuplicate) {
          console.warn("⚠️ Duplicate message detected:", {
            content: content.substring(0, 50),
          });
          return { success: false, error: "Duplicate message detected" };
        }

        // Create and dispatch the optimistic message
        const optimisticMessage = normalizeMessage({
          tempId,
          content: content.trim(),
          channel_id: channelId,
          sender,
          created_at: timestamp,
          isOptimistic: true,
          isConfirmed: false,
          verificationAttempts: 0,
          ...options,
        });

        console.log("📤 Optimistic message:", {
          id: optimisticMessage.id,
          tempId: optimisticMessage.tempId,
          sender: optimisticMessage.sender,
          hasReplyTo: !!optimisticMessage.replyTo,
          isConfirmed: optimisticMessage.isConfirmed,
        });

        // Store message details for verification
        pendingMessagesRef.current.set(tempId, {
          tempId,
          channelId,
          content: content.trim(),
          senderId: sender.id,
          sender,
          timestamp: now,
          created_at: timestamp,
          timeout: null,
          verificationAttempts: 0,
        });

        dispatch({
          type: ACTION_TYPES.ADD_MESSAGE,
          payload: optimisticMessage,
        });

        // Send via WebSocket
        const success = chatWebSocketService.sendMessage(
          channelId,
          content.trim(),
          {
            replyTo: options.replyTo,
            tempId: tempId,
            sender: optimisticMessage.sender,
          }
        );

        if (!success) {
          throw new Error("Failed to send message - WebSocket error");
        }

        // HYBRID VERIFICATION: Set a timeout to verify with server before marking as failed
        const verificationTimeout = setTimeout(async () => {
          const pendingData = pendingMessagesRef.current.get(tempId);
          
          if (!pendingData) {
            console.log("🔄 Message already resolved, skipping verification:", tempId);
            return;
          }

          console.log("⏰ Verification timeout triggered for:", tempId);
          
          // Increment verification attempts
          pendingData.verificationAttempts = (pendingData.verificationAttempts || 0) + 1;
          pendingMessagesRef.current.set(tempId, pendingData);

          // Update UI to show verification in progress
          dispatch({
            type: ACTION_TYPES.UPDATE_MESSAGE,
            payload: {
              tempId,
              updates: {
                verificationAttempts: pendingData.verificationAttempts,
                lastVerificationAttempt: new Date().toISOString(),
                isVerifying: true,
              },
            },
          });

          try {
            // VERIFY WITH SERVER via HTTP
            console.log("🔍 Verifying message with server...", {
              tempId,
              channelId,
              content: pendingData.content.substring(0, 30),
              attempts: pendingData.verificationAttempts,
            });

            const verification = await verifyMessageOnServer(
              channelId,
              tempId,
              pendingData.content,
              pendingData.sender,
              pendingData.created_at
            );

            if (verification.exists && verification.message) {
              // SERVER HAS THE MESSAGE! Update UI with server data
              console.log("✅ Server verification SUCCESS:", {
                tempId,
                serverId: verification.message.id,
              });

              const serverMessage = normalizeMessage({
                ...verification.message,
                tempId: tempId, // Keep tempId for matching
                isOptimistic: false,
                isConfirmed: true,
                failed: false,
                verificationAttempts: pendingData.verificationAttempts,
              });

              dispatch({
                type: ACTION_TYPES.UPDATE_MESSAGE,
                payload: {
                  tempId,
                  updates: serverMessage,
                },
              });

              // Clean up
              if (pendingData.timeout) {
                clearTimeout(pendingData.timeout);
              }
              pendingMessagesRef.current.delete(tempId);
              
              return;
            }

            // Message NOT found on server
            console.warn("❌ Server verification FAILED - message not found:", {
              tempId,
              attempts: pendingData.verificationAttempts,
            });

            // If we've tried verification multiple times, mark as failed
            if (pendingData.verificationAttempts >= 2) {
              console.error("💀 Max verification attempts reached, marking as failed:", tempId);
              
              dispatch({
                type: ACTION_TYPES.UPDATE_MESSAGE,
                payload: {
                  tempId,
                  updates: {
                    failed: true,
                    error: "Message not delivered. Please retry.",
                    isOptimistic: true,
                    isConfirmed: false,
                    verificationAttempts: pendingData.verificationAttempts,
                    isVerifying: false,
                  },
                },
              });

              // Clean up
              if (pendingData.timeout) {
                clearTimeout(pendingData.timeout);
              }
              pendingMessagesRef.current.delete(tempId);
            } else {
              // Schedule another verification attempt
              console.log("🔄 Scheduling another verification attempt:", {
                tempId,
                nextAttemptIn: 5000,
              });

              const nextTimeout = setTimeout(async () => {
                // Recursive call to verify again
                const innerPendingData = pendingMessagesRef.current.get(tempId);
                if (innerPendingData) {
                  // Trigger verification again
                  const verifyEvent = new CustomEvent('verify-message', {
                    detail: { tempId }
                  });
                  window.dispatchEvent(verifyEvent);
                }
              }, 5000);

              // Update pending data with new timeout
              pendingData.timeout = nextTimeout;
              pendingMessagesRef.current.set(tempId, pendingData);
            }

          } catch (verificationError) {
            console.error("❌ Verification error:", verificationError);
            
            // Even if verification fails, don't immediately mark as failed
            // Wait for another attempt or WebSocket confirmation
            if (pendingData.verificationAttempts >= 3) {
              dispatch({
                type: ACTION_TYPES.UPDATE_MESSAGE,
                payload: {
                  tempId,
                  updates: {
                    failed: true,
                    error: "Unable to verify message delivery. Please check your connection.",
                    isOptimistic: true,
                    isConfirmed: false,
                    verificationAttempts: pendingData.verificationAttempts,
                    isVerifying: false,
                  },
                },
              });

              pendingMessagesRef.current.delete(tempId);
            }
          }
        }, 5000); // Increased timeout to 5 seconds

        // Store timeout reference
        const pendingData = pendingMessagesRef.current.get(tempId);
        if (pendingData) {
          pendingData.timeout = verificationTimeout;
          pendingMessagesRef.current.set(tempId, pendingData);
        }

        return {
          success: true,
          tempId,
          message: optimisticMessage,
        };
      } catch (error) {
        console.error("Send message error:", error);

        // Clean up on error
        const pendingData = pendingMessagesRef.current.get(tempId);
        if (pendingData?.timeout) {
          clearTimeout(pendingData.timeout);
        }
        pendingMessagesRef.current.delete(tempId);

        // Mark as failed immediately only on WebSocket error
        dispatch({
          type: ACTION_TYPES.UPDATE_MESSAGE,
          payload: {
            tempId,
            updates: {
              failed: true,
              error: error.message,
              isOptimistic: true,
              isConfirmed: false,
            },
          },
        });

        throw error;
      }
    },
    [user, chatUser]
  );

  // Retry failed message
  const retryFailedMessage = useCallback(
    async (failedMessage) => {
      if (!state.currentChannel?.id) throw new Error("No current channel");

      // Remove the failed message
      dispatch({
        type: ACTION_TYPES.REMOVE_OPTIMISTIC_MESSAGE,
        payload: failedMessage.tempId,
      });

      // Clean up from pending map
      pendingMessagesRef.current.delete(failedMessage.tempId);

      // Resend with same tempId
      return await sendMessage(state.currentChannel.id, failedMessage.content, {
        tempId: failedMessage.tempId,
        replyTo: failedMessage.replyTo,
        sender: failedMessage.sender,
      });
    },
    [state.currentChannel?.id, sendMessage]
  );

  const { startTyping, stopTyping } = useChatTyping({
    currentChannelId: state.currentChannel?.id,
    typingTimeoutRef,
  });

  // Set the current channel
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
      ...channel,
    };

    dispatch({
      type: ACTION_TYPES.SET_CURRENT_CHANNEL,
      payload: normalizedChannel,
    });
  }, []);

  // retryConnection provided by useChatConnection

  // Clear error
  const clearError = useCallback(() => {
    dispatch({ type: ACTION_TYPES.CLEAR_ERROR });
  }, []);

  // Advanced chat features
  const handleReactToMessage = useCallback(async (messageId, emoji) => {
    try {
      return await chatService.toggleReaction(messageId, emoji);
    } catch (error) {
      console.error("Failed to toggle reaction:", error);
      throw error;
    }
  }, []);

  const handleEditMessage = useCallback(async (messageId, newContent) => {
    try {
      dispatch({
        type: ACTION_TYPES.UPDATE_MESSAGE,
        payload: {
          id: messageId,
          updates: {
            content: newContent,
            edited: true,
            isOptimistic: true,
          },
        },
      });

      const response = await chatService.editMessage(messageId, newContent);
      return response;
    } catch (error) {
      console.error("Failed to edit message:", error);
      alert("Failed to save edit. Please try again.");
      throw error;
    }
  }, []);

  const handleDeleteMessage = useCallback(async (messageId) => {
    try {
      dispatch({ type: ACTION_TYPES.REMOVE_MESSAGE, payload: messageId });
      const response = await chatService.deleteMessage(messageId);
      return response;
    } catch (error) {
      console.error("Failed to delete message:", error);
      alert("Failed to delete message. Please refresh.");
      throw error;
    }
  }, []);

  const handleSendMedia = useCallback(
    async (channelId, mediaFile, content = "", options = {}) => {
      console.log("📤 handleSendMedia:", {
        channelId,
        fileName: mediaFile.name,
        size: mediaFile.size,
      });

      if (!channelId || !mediaFile)
        throw new Error("Channel ID and media file required");

      const tempId = options.tempId || createTempId("media");
      const sender = getSender(chatUser, user);

      // Create blob URL for preview
      const blobUrl = URL.createObjectURL(mediaFile);

      // Create optimistic message
      const optimisticMessage = normalizeMessage({
        id: tempId,
        tempId,
        content: content.trim(),
        channel_id: channelId,
        sender,
        created_at: new Date().toISOString(),
        isOptimistic: true,
        isConfirmed: false,
        failed: false,
        verificationAttempts: 0,
        type: mediaFile.type.startsWith("image/")
          ? "image"
          : mediaFile.type.startsWith("video/")
          ? "video"
          : mediaFile.type.startsWith("audio/")
          ? "audio"
          : "file",
        mediaUrl: blobUrl,
        attachments: [
          {
            id: `temp-attachment-${tempId}`,
            url: blobUrl,
            type: mediaFile.type.startsWith("image/") ? "image" : "file",
            fileName: mediaFile.name,
            fileSize: mediaFile.size,
            mimeType: mediaFile.type,
            thumbnailUrl: mediaFile.type.startsWith("image/") ? blobUrl : null,
          },
        ],
        _blobUrl: blobUrl,
      });

      console.log("📤 Optimistic media message created:", { tempId });

      // Store for verification
      pendingMessagesRef.current.set(tempId, {
        tempId,
        channelId,
        content: content.trim(),
        senderId: sender.id,
        sender,
        timestamp: Date.now(),
        created_at: optimisticMessage.created_at,
        timeout: null,
        verificationAttempts: 0,
        isMedia: true,
        fileName: mediaFile.name,
      });

      // Add to UI
      dispatch({ type: ACTION_TYPES.ADD_MESSAGE, payload: optimisticMessage });

      try {
        // Upload via HTTP
        const response = await chatService.sendMessage(
          channelId,
          content,
          mediaFile,
          {
            replyTo: options.replyTo,
            type: optimisticMessage.type,
            fileName: mediaFile.name,
            fileSize: mediaFile.size,
            mimeType: mediaFile.type,
            originalName: mediaFile.name,
            tempId: tempId,
            timeout: 60000,
            onUploadProgress: options.onUploadProgress,
          }
        );

        console.log("✅ Media upload HTTP response:", {
          success: !!response,
          hasMessageInResponse: !!response.message,
          messageId: response.message?.id,
          tempId: tempId,
        });

        // If server returned the message, update immediately
        if (
          response.message &&
          response.message.id &&
          response.message.id !== tempId
        ) {
          console.log("🔄 Updating optimistic message with server response");

          const serverMessage = normalizeMessage({
            ...response.message,
            tempId: tempId,
            isOptimistic: false,
            isConfirmed: true,
            failed: false,
          });

          dispatch({
            type: ACTION_TYPES.UPDATE_MESSAGE,
            payload: {
              tempId: tempId,
              updates: serverMessage,
            },
          });

          // Clean up pending and blob URL
          pendingMessagesRef.current.delete(tempId);
          setTimeout(() => {
            URL.revokeObjectURL(blobUrl);
          }, 1000);
        } else {
          console.log("⏳ Waiting for WebSocket broadcast...");
          // WebSocket will handle the update
          // Set verification timeout for media too
          const verificationTimeout = setTimeout(async () => {
            const pendingData = pendingMessagesRef.current.get(tempId);
            if (pendingData) {
              // Similar verification logic as text messages
              // ... (would implement media-specific verification)
            }
          }, 20000); // Longer timeout for media uploads
          
          const pendingData = pendingMessagesRef.current.get(tempId);
          if (pendingData) {
            pendingData.timeout = verificationTimeout;
            pendingMessagesRef.current.set(tempId, pendingData);
          }
        }

        return response;
      } catch (error) {
        console.error("❌ Media upload failed:", error);

        // Mark as failed in UI
        dispatch({
          type: ACTION_TYPES.UPDATE_MESSAGE,
          payload: {
            tempId,
            updates: {
              failed: true,
              error: error.message,
              isOptimistic: true,
              isConfirmed: false,
            },
          },
        });

        // Clean up
        const pendingData = pendingMessagesRef.current.get(tempId);
        if (pendingData?.timeout) {
          clearTimeout(pendingData.timeout);
        }
        pendingMessagesRef.current.delete(tempId);
        
        setTimeout(() => {
          URL.revokeObjectURL(blobUrl);
        }, 1000);

        throw error;
      }
    },
    [user, chatUser, dispatch]
  );

  // --- CONTEXT VALUE ---

  const value = {
    // State
    currentChannel: state.currentChannel,
    messages: state.messages,
    isConnected: state.isConnected,
    isLoading: state.isLoading,
    error: state.error,
    typingUsers: state.typingUsers.filter((id) => id !== user?.id),
    onlineUsers: state.onlineUsers.filter((id) => id !== user?.id),

    // User data
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

    // Advanced features
    onReactToMessage: handleReactToMessage,
    onEditMessage: handleEditMessage,
    onDeleteMessage: handleDeleteMessage,
    onSendMedia: handleSendMedia,
  };

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
}

export function useChat() {
  const context = useContext(ChatContext);
  if (context === undefined) {
    throw new Error("useChat must be used within a ChatProvider");
  }
  return context;
}
