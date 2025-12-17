import axios from 'axios';
import chatAuthService from './chatAuthService';

// Simple configuration
const BASE_URL = `${import.meta.env.VITE_CHAT_API_URL}/api/v1`;
const TIMEOUT = 100000;

console.log('base url:', BASE_URL);

// Create Axios instance for chat API
const chatApi = axios.create({
  baseURL: BASE_URL,
  timeout: TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor - add chat token
chatApi.interceptors.request.use(
  (config) => {
    const token = chatAuthService.getChatToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor - handle common errors
chatApi.interceptors.response.use(
  (response) => response,
  (error) => {
    // Handle 401 Unauthorized - chat token expired
    if (error.response?.status === 401) {
      console.warn('Chat token expired or invalid');
      chatAuthService.clearChatTokens();
      if (window.dispatchEvent) {
        window.dispatchEvent(new CustomEvent('chat-token-expired'));
      }
    }
    return Promise.reject(error);
  }
);

// Simple API service
const chatService = {
  // === Auth (most auth now handled by backend) ===
  
  // Optional: Direct chat login (if needed for specific cases)
  login: async (credentials) => {
    const response = await chatApi.post('/auth/login', credentials);
    return response.data;
  },

  // Optional: Direct chat registration (if needed)
  register: async (userData) => {
    const response = await chatApi.post('/auth/register', userData);
    return response.data;
  },

  // === Users ===
  getCurrentUser: async () => {
    const response = await chatApi.get('/users/me');
    return response.data;
  },

  updateProfile: async (userData) => {
    const response = await chatApi.put('/users/me', userData);
    return response.data;
  },

  searchUsers: async (query, options = {}) => {
    const response = await chatApi.get('/users/search', {
      params: { query, ...options }
    });
    return response.data;
  },

  // === Channels ===
  getChannels: async (options = {}) => {
    const response = await chatApi.get('/channels', { params: options });
    return response.data;
  },

  createChannel: async (channelData) => {
    const response = await chatApi.post('/channels', channelData);
    return response.data;
  },

  getChannel: async (channelId) => {
    const response = await chatApi.get(`/channels/${channelId}`);
    return response.data;
  },

  updateChannel: async (channelId, updates) => {
    const response = await chatApi.put(`/channels/${channelId}`, updates);
    return response.data;
  },

  joinChannel: async (channelId) => {
    const response = await chatApi.post(`/channels/${channelId}/join`);
    return response.data;
  },

  leaveChannel: async (channelId) => {
    const response = await chatApi.post(`/channels/${channelId}/leave`);
    return response.data;
  },

  getChannelMembers: async (channelId, options = {}) => {
    const response = await chatApi.get(`/channels/${channelId}/members`, {
      params: options
    });
    return response.data;
  },

  // === Messages ===
  getChannelMessages: async (channelId, params = {}) => {
    const response = await chatApi.get(`/messages/${channelId}/messages`, {
      params
    });
    return response.data;
  },

  /**
 * Send a message (text or media)
 * @param {string} channelId - Channel ID
 * @param {string} content - Message content
 * @param {File} [file] - Optional media file
 * @param {Object} [options] - Additional options
 * @param {string} [options.type='text'] - Message type (text, image, video, audio, file)
 * @param {string} [options.replyTo] - Message ID to reply to
 * @param {string} [options.mediaCaption] - Caption for media message
 * @param {string} [options.fileName] - File name
 * @param {number} [options.fileSize] - File size in bytes
 * @param {string} [options.mimeType] - File MIME type
 * @returns {Promise} - API response
 */
sendMessage: async (channelId, content, file = null, options = {}) => {
  const { 
    type = 'text', 
    replyTo, 
    mediaCaption,
    fileName,
    fileSize,
    mimeType,
    originalName,
    timeout,
    onUploadProgress // Get the progress callback
  } = options;
  
  if (file) {
    // Create FormData for file upload with ALL required fields
    const formData = new FormData();
    
    // Add file with correct field name
    formData.append('file', file);
    
    // Add content and metadata
    if (content) formData.append('content', content);
    if (type) formData.append('type', type);
    if (replyTo) formData.append('replyTo', replyTo);
    if (mediaCaption) formData.append('mediaCaption', mediaCaption);
    
    // Add required metadata fields for Attachment model
    formData.append('fileName', fileName || file.name);
    formData.append('fileSize', (fileSize || file.size).toString());
    formData.append('mimeType', mimeType || file.type);
    formData.append('originalName', originalName || file.name);
    
    const config = {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      timeout: timeout || 60000,
      onUploadProgress: onUploadProgress, // Pass progress callback to Axios
    };
    
    const response = await chatApi.post(`/messages/${channelId}/messages`, formData, config);
    const message = response.data.data.message;
    console.log('media response:',message)
    
    return {...response.data,message:message};
  } else {
    // Text-only message
    const response = await chatApi.post(`/messages/${channelId}/messages`, {
      content,
      type,
      replyTo,
      mediaCaption,
    });
    return response.data;
  }
},

  /**
   * Get unread message count for a channel
   * @param {string} channelId - Channel ID
   * @returns {Promise} - API response with unreadCount
   */
  getUnreadCount: async (channelId) => {
    const response = await chatApi.get(`/messages/${channelId}/messages/unread-count`);
    return response.data;
  },

  /**
   * Mark messages as read
   * @param {string} channelId - Channel ID
   * @param {Array<string>} messageIds - Array of message IDs to mark as read
   * @returns {Promise} - API response
   */
  markMessagesAsRead: async (channelId, messageIds = []) => {
    const response = await chatApi.post(`/messages/${channelId}/messages/read`, {
      messageIds
    });
    return response.data;
  },

  /**
   * Get a specific message by ID
   * @param {string} messageId - Message ID
   * @returns {Promise} - API response with message
   */
  getMessage: async (messageId) => {
    const response = await chatApi.get(`/messages/${messageId}`);
    return response.data;
  },

  /**
   * Delete a message (soft delete)
   * @param {string} messageId - Message ID
   * @returns {Promise} - API response
   */
  deleteMessage: async (messageId) => {
    const response = await chatApi.delete(`/messages/${messageId}`);
    return response.data;
  },

  /**
   * Edit a message
   * @param {string} messageId - Message ID
   * @param {string} content - New message content
   * @returns {Promise} - API response with updated message
   */
  editMessage: async (messageId, content) => {
    const response = await chatApi.put(`/messages/${messageId}/edit`, { content });
    return response.data;
  },

  /**
   * Toggle reaction on a message
   * @param {string} messageId - Message ID
   * @param {string} emoji - Emoji to add/remove
   * @returns {Promise} - API response with reaction and message
   */
  toggleReaction: async (messageId, emoji) => {
    const response = await chatApi.post(`/messages/${messageId}/react`, { emoji });
    return response.data;
  },

  /**
   * Get all reactions for a message
   * @param {string} messageId - Message ID
   * @returns {Promise} - API response with reactions
   */
  getMessageReactions: async (messageId) => {
    const response = await chatApi.get(`/messages/${messageId}/reactions`);
    return response.data;
  },

  // === Presence ===
  updatePresence: async (status = 'online') => {
    const response = await chatApi.put('/presence', { status });
    return response.data;
  },

  // === Typing indicators ===
  sendTypingIndicator: async (channelId) => {
    await chatApi.post(`/typing/${channelId}`);
  },

  // === Upload Utilities ===
  
  /**
 * Upload a file to get URL (for direct uploads if needed)
 * @param {File} file - File to upload
 * @param {string} [type='file'] - File type
 * @returns {Promise} - API response with file URL
 */
uploadFile: async (file, type = 'file') => {
  const formData = new FormData();
  formData.append('file', file); // Changed from 'media' to 'file'
  formData.append('type', type);
  formData.append('fileName', file.name);
  formData.append('fileSize', file.size.toString());
  formData.append('mimeType', file.type);
  formData.append('originalName', file.name);
  
  const response = await chatApi.post('/uploads', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
    timeout: 60000,
  });
  return response.data;
},

  /**
   * Validate file before upload
   * @param {File} file - File to validate
   * @param {string} [expectedType='file'] - Expected file type
   * @returns {Object} - Validation result
   */
  validateFile: (file, expectedType = 'file') => {
    const validations = {
      image: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
      video: ['video/mp4', 'video/quicktime', 'video/webm'],
      audio: ['audio/mpeg', 'audio/wav', 'audio/ogg'],
      file: [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'text/plain',
      ],
    };

    const maxSizes = {
      image: 10 * 1024 * 1024, // 10MB
      video: 100 * 1024 * 1024, // 100MB
      audio: 50 * 1024 * 1024, // 50MB
      file: 50 * 1024 * 1024, // 50MB
    };

    const type = expectedType.toLowerCase();
    const allowedTypes = validations[type] || validations.file;
    const maxSize = maxSizes[type] || maxSizes.file;

    if (!allowedTypes.includes(file.type)) {
      return {
        valid: false,
        error: `File type ${file.type} not allowed for ${type} messages`,
        allowedTypes,
      };
    }

    if (file.size > maxSize) {
      return {
        valid: false,
        error: `File too large. Max size: ${maxSize / (1024 * 1024)}MB`,
        maxSize,
      };
    }

    return { valid: true, file };
  },

  /**
   * Get file preview URL (for images/videos)
   * @param {File} file - File to preview
   * @returns {string} - Object URL for preview
   */
  getFilePreview: (file) => {
    if (!file) return null;
    
    if (file.type.startsWith('image/') || file.type.startsWith('video/')) {
      return URL.createObjectURL(file);
    }
    return null;
  },

  /**
   * Revoke file preview URL
   * @param {string} previewUrl - URL to revoke
   */
  revokeFilePreview: (previewUrl) => {
    if (previewUrl && previewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(previewUrl);
    }
  },

  // === Message Utilities ===
  
  /**
   * Format message timestamp
   * @param {string|Date} timestamp - Message timestamp
   * @param {Object} [options] - Formatting options
   * @returns {string} - Formatted timestamp
   */
  formatTimestamp: (timestamp, options = {}) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffHours = diffMs / (1000 * 60 * 60);
    
    const defaultOptions = {
      timeOnly: false,
      relative: true,
    };
    
    const opts = { ...defaultOptions, ...options };
    
    if (opts.relative) {
      if (diffHours < 1) {
        const diffMinutes = Math.floor(diffMs / (1000 * 60));
        if (diffMinutes < 1) return 'Just now';
        if (diffMinutes === 1) return '1 minute ago';
        return `${diffMinutes} minutes ago`;
      }
      
      if (diffHours < 24) {
        const hours = Math.floor(diffHours);
        if (hours === 1) return '1 hour ago';
        return `${hours} hours ago`;
      }
    }
    
    if (opts.timeOnly) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    
    if (diffHours < 24) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    
    if (diffHours < 48) {
      return `Yesterday ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    }
    
    return date.toLocaleDateString([], { 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  },

  /**
   * Check if message is from current user
   * @param {Object} message - Message object
   * @param {string} currentUserId - Current user ID
   * @returns {boolean} - True if message is from current user
   */
  isMessageFromUser: (message, currentUserId) => {
    if (!message || !currentUserId) return false;
    
    // Check all possible user ID fields
    const messageUserId = 
      message.userId || 
      message.user?.id || 
      message.sender?.id || 
      message.sender_id;
    
    return messageUserId === currentUserId;
  },

  /**
   * Group messages by date
   * @param {Array} messages - Array of messages
   * @returns {Object} - Messages grouped by date
   */
  groupMessagesByDate: (messages) => {
    if (!messages || !Array.isArray(messages)) return {};
    
    return messages.reduce((groups, message) => {
      const date = new Date(message.createdAt || message.created_at);
      const dateKey = date.toLocaleDateString();
      
      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      
      groups[dateKey].push(message);
      return groups;
    }, {});
  },

  // === Error Handling ===
  handleError: (error) => {
    if (error.response) {
      // Server responded with error
      console.error('Chat API Error:', {
        status: error.response.status,
        message: error.response.data?.message || 'Unknown error',
        data: error.response.data
      });
      
      // Special handling for common errors
      switch (error.response.status) {
        case 401:
          return {
            type: 'AUTH_ERROR',
            message: 'Session expired. Please login again.',
            originalError: error
          };
        case 403:
          return {
            type: 'FORBIDDEN',
            message: 'You do not have permission for this action.',
            originalError: error
          };
        case 404:
          return {
            type: 'NOT_FOUND',
            message: 'Resource not found.',
            originalError: error
          };
        case 422:
          return {
            type: 'VALIDATION_ERROR',
            message: error.response.data?.message || 'Validation failed',
            violations: error.response.data?.data?.violations || [],
            originalError: error
          };
        case 423:
          return {
            type: 'USER_MUTED',
            message: 'You are temporarily muted for violating community guidelines.',
            originalError: error
          };
        case 429:
          return {
            type: 'RATE_LIMIT',
            message: 'Too many requests. Please slow down.',
            originalError: error
          };
        default:
          return {
            type: 'API_ERROR',
            status: error.response.status,
            message: error.response.data?.message || 'API request failed',
            originalError: error
          };
      }
    } else if (error.request) {
      // No response received
      console.error('No response from chat server:', error.request);
      return {
        type: 'NETWORK_ERROR',
        message: 'Cannot connect to chat server',
        originalError: error
      };
    } else {
      // Request setup error
      console.error('Chat request setup error:', error.message);
      return {
        type: 'REQUEST_ERROR',
        message: 'Failed to prepare chat request',
        originalError: error
      };
    }
  },

  // === Connection check ===
  checkConnection: async () => {
    try {
      const response = await chatApi.get('/health');
      return {
        connected: true,
        status: response.status,
        data: response.data
      };
    } catch (error) {
      return {
        connected: false,
        error: this.handleError(error)
      };
    }
  },

  // === Optional: Refresh chat token via backend ===
  refreshTokenViaBackend: async () => {
    // Implementation depends on your backend setup
    throw new Error('Refresh token endpoint not implemented');
  }
};

export default chatService;