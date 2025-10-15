import axios from 'axios';
import chatAuthService from './chatAuthService';

// Configuration
const CHAT_CONFIG = {
  BASE_URL:  'http://localhost:4000/api/v1',
  TIMEOUT: 10000,
  MAX_RETRIES: 1,
};

// Error classes for better error handling
export class ChatServiceError extends Error {
  constructor(message, code, originalError) {
    super(message);
    this.name = 'ChatServiceError';
    this.code = code;
    this.originalError = originalError;
  }
}

export class AuthenticationError extends ChatServiceError {
  constructor(message = 'Authentication failed', originalError) {
    super(message, 'AUTH_ERROR', originalError);
    this.name = 'AuthenticationError';
  }
}

export class NetworkError extends ChatServiceError {
  constructor(message = 'Network error occurred', originalError) {
    super(message, 'NETWORK_ERROR', originalError);
    this.name = 'NetworkError';
  }
}

// Create dedicated Axios instance for chat API
const chatApi = axios.create({
  baseURL: CHAT_CONFIG.BASE_URL,
  timeout: CHAT_CONFIG.TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor with enhanced logging
chatApi.interceptors.request.use(
  (config) => {
    const token = chatAuthService.getChatToken();
    
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Add request ID for tracing
    config.headers['X-Request-ID'] = generateRequestId();
    
    console.debug(`[Chat API] ${config.method?.toUpperCase()} ${config.url}`, {
      hasToken: !!token,
      timestamp: new Date().toISOString(),
    });

    return config;
  },
  (error) => {
    console.error('[Chat API] Request configuration error:', error);
    return Promise.reject(new NetworkError('Request configuration failed', error));
  }
);

// Response interceptor with enhanced error handling
chatApi.interceptors.response.use(
  (response) => {
    console.debug(`[Chat API] ${response.config.method?.toUpperCase()} ${response.config.url} - Success`);
    return response;
  },
  async (error) => {
    const originalRequest = error.config;
    const isNetworkError = !error.response;
    
    console.error('[Chat API] Response error:', {
      url: originalRequest?.url,
      method: originalRequest?.method,
      status: error.response?.status,
      networkError: isNetworkError,
    });

    // Handle network errors
    if (isNetworkError) {
      return Promise.reject(new NetworkError('Network connection failed', error));
    }

    // Handle token expiration (401)
    if (error.response?.status === 401 && !originalRequest._retry) {
      return handleTokenRefresh(originalRequest, error);
    }

    // Handle other HTTP errors
    return handleHttpError(error);
  }
);

// ====== Helper Functions ======
function generateRequestId() {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

async function handleTokenRefresh(originalRequest, error) {
  originalRequest._retry = true;

  try {
    console.debug('[Chat API] Attempting token refresh...');
    await chatAuthService.refreshChatToken();
    const newToken = chatAuthService.getChatToken();
    
    if (!newToken) {
      throw new AuthenticationError('No token available after refresh');
    }

    originalRequest.headers.Authorization = `Bearer ${newToken}`;
    console.debug('[Chat API] Token refresh successful, retrying request');
    
    return chatApi(originalRequest);
  } catch (refreshError) {
    console.error('[Chat API] Token refresh failed:', refreshError);
    chatAuthService.clearChatTokens();
    
    // Dispatch event for auth listeners
    window.dispatchEvent(new CustomEvent('chat-auth-failed'));
    
    return Promise.reject(new AuthenticationError('Session expired', refreshError));
  }
}

function handleHttpError(error) {
  const { status, data } = error.response || {};
  
  switch (status) {
    case 400:
      return Promise.reject(new ChatServiceError(
        data?.message || 'Bad request',
        'VALIDATION_ERROR',
        error
      ));
    case 403:
      return Promise.reject(new ChatServiceError(
        data?.message || 'Access forbidden',
        'FORBIDDEN',
        error
      ));
    case 404:
      return Promise.reject(new ChatServiceError(
        data?.message || 'Resource not found',
        'NOT_FOUND',
        error
      ));
    case 429:
      return Promise.reject(new ChatServiceError(
        data?.message || 'Rate limit exceeded',
        'RATE_LIMIT',
        error
      ));
    case 500:
      return Promise.reject(new ChatServiceError(
        data?.message || 'Internal server error',
        'SERVER_ERROR',
        error
      ));
    default:
      return Promise.reject(new ChatServiceError(
        data?.message || 'Request failed',
        'UNKNOWN_ERROR',
        error
      ));
  }
}

// Safe API call wrapper with retry logic
async function makeApiCall(apiCall, retries = CHAT_CONFIG.MAX_RETRIES) {
  try {
    return await apiCall();
  } catch (error) {
    if (retries > 0 && shouldRetry(error)) {
      console.warn(`[Chat API] Retrying request, attempts left: ${retries}`);
      await new Promise(resolve => setTimeout(resolve, 1000 * (CHAT_CONFIG.MAX_RETRIES - retries + 1)));
      return makeApiCall(apiCall, retries - 1);
    }
    throw error;
  }
}

function shouldRetry(error) {
  return error instanceof NetworkError || 
         error.code === 'SERVER_ERROR' ||
         error.code === 'RATE_LIMIT';
}

// ====== Chat Service ======
export const chatService = {
  // === Auth ===
  register: async (userData) => 
    makeApiCall(() => chatApi.post('/auth/register', userData).then(response => response.data)),

  login: async (credentials) => 
    makeApiCall(() => chatApi.post('/auth/login', credentials).then(response => response.data)),

  refreshToken: async (tokenData) => 
    makeApiCall(() => chatApi.post('/auth/refresh', tokenData).then(response => response.data)),

  logout: async () => 
    makeApiCall(() => chatApi.post('/auth/logout').then(response => response.data)),

  // === Users ===
  getCurrentUser: async () => 
    makeApiCall(() => chatApi.get('/users/me').then(response => response.data)),

  updateProfile: async (userData) => 
    makeApiCall(() => chatApi.put('/users/me', userData).then(response => response.data)),

  searchUsers: async (query, options = {}) => 
    makeApiCall(() => 
      chatApi.get('/users/search', { 
        params: { query, ...options } 
      }).then(response => response.data)
    ),

  // === Channels ===
  getChannels: async (options = {}) => 
    makeApiCall(() => 
      chatApi.get('/channels', { params: options }).then(response => response.data)
    ),

  createChannel: async (channelData) => 
    makeApiCall(() => chatApi.post('/channels', channelData).then(response => response.data)),

  getChannel: async (channelId) => 
    makeApiCall(() => chatApi.get(`/channels/${channelId}`).then(response => response.data)),

  updateChannel: async (channelId, updates) => 
    makeApiCall(() => chatApi.put(`/channels/${channelId}`, updates).then(response => response.data)),

  joinChannel: async (channelId) => 
    makeApiCall(() => chatApi.post(`/channels/${channelId}/join`).then(response => response.data)),

  leaveChannel: async (channelId) => 
    makeApiCall(() => chatApi.post(`/channels/${channelId}/leave`).then(response => response.data)),

  getChannelMembers: async (channelId, options = {}) => 
    makeApiCall(() => 
      chatApi.get(`/channels/${channelId}/members`, { params: options }).then(response => response.data)
    ),

  // === Messages ===
  getChannelMessages: async (channelId, params = {}) => 
    makeApiCall(() => 
      chatApi.get(`/messages/${channelId}/messages`, { params }).then(response => response.data)
    ),

  sendMessage: async (channelId, content, options = {}) => 
    makeApiCall(() => 
      chatApi.post(`/messages/${channelId}/messages`, { content, ...options }).then(response => response.data)
    ),

  markMessagesAsRead: async (channelId, messageIds = []) => 
    makeApiCall(() => 
      chatApi.post(`/messages/${channelId}/messages/read`, { messageIds }).then(response => response.data)
    ),

  // === Moderation ===
  reportMessage: async (messageId, reason, additionalData = {}) => 
    makeApiCall(() => 
      chatApi.post('/moderation/reports', { 
        message_id: messageId, 
        reason,
        ...additionalData 
      }).then(response => response.data)
    ),

  getReports: async (options = {}) => 
    makeApiCall(() => 
      chatApi.get('/moderation/reports', { params: options }).then(response => response.data)
    ),

  resolveReport: async (reportId, resolutionData = {}) => 
    makeApiCall(() => 
      chatApi.patch(`/moderation/reports/${reportId}/resolve`, resolutionData).then(response => response.data)
    ),

  blockUser: async (userId, reason = '') => 
    makeApiCall(() => 
      chatApi.post(`/moderation/users/${userId}/block`, { reason }).then(response => response.data)
    ),

  unblockUser: async (userId) => 
    makeApiCall(() => 
      chatApi.post(`/moderation/users/${userId}/unblock`).then(response => response.data)
    ),

  getModerationDashboard: async () => 
    makeApiCall(() => chatApi.get('/moderation/dashboard').then(response => response.data)),

  deleteMessage: async (messageId, reason = '') => 
    makeApiCall(() => 
      chatApi.delete(`/moderation/messages/${messageId}`, { 
        data: { reason } 
      }).then(response => response.data)
    ),

  getViolations: async (options = {}) => 
    makeApiCall(() => 
      chatApi.get('/moderation/violations', { params: options }).then(response => response.data)
    ),
};

// Utility functions
export const chatServiceUtils = {
  isChatServiceError: (error) => error instanceof ChatServiceError,
  isAuthenticationError: (error) => error instanceof AuthenticationError,
  isNetworkError: (error) => error instanceof NetworkError,
  extractErrorCode: (error) => error.code || 'UNKNOWN_ERROR',
};

export default chatService;