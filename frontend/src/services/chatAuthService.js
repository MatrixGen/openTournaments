import { chatService } from './chatService';

// Error types for better error handling
export class ChatAuthError extends Error {
  constructor(message, code, originalError) {
    super(message);
    this.name = 'ChatAuthError';
    this.code = code;
    this.originalError = originalError;
  }
}

export class TokenRefreshError extends ChatAuthError {
  constructor(message = 'Token refresh failed', originalError) {
    super(message, 'TOKEN_REFRESH_FAILED', originalError);
    this.name = 'TokenRefreshError';
  }
}

export class InitializationError extends ChatAuthError {
  constructor(message = 'Chat auth initialization failed', originalError) {
    super(message, 'INITIALIZATION_FAILED', originalError);
    this.name = 'InitializationError';
  }
}

class ChatAuthService {
  constructor() {
    this.isInitialized = false;
    this.isInitializing = false;
    this.retryCount = 0;
    this.maxRetries = 3;
    this.retryDelay = 1000;
    
    // Token validation
    this.tokenCheckInterval = null;
    this.TOKEN_CHECK_INTERVAL = 60000; // Check token every minute
    
    // Event listeners for auth state changes
    this.authStateListeners = new Set();
    
    // Secure storage keys
    this.STORAGE_KEYS = {
      CHAT_TOKEN: 'chat_token',
      CHAT_REFRESH_TOKEN: 'chat_refresh_token',
      CHAT_TOKEN_EXPIRY: 'chat_token_expiry',
      CHAT_USER_ID: 'chat_user_id'
    };
  }

  // ===== Public Methods =====

  /**
   * Initialize chat authentication when user logs into main app
   */
  async initializeChatAuth(userData, password) {
    if (this.isInitialized) {
      console.debug('Chat auth already initialized');
      return true;
    }

    if (this.isInitializing) {
      console.debug('Chat auth initialization in progress');
      await this.waitForInitialization();
      return this.isInitialized;
    }

    this.isInitializing = true;
    this.retryCount = 0;

    try {
      await this.executeWithRetry(() => this.authenticateUser(userData, password));
      
      this.isInitialized = true;
      this.startTokenMonitoring();
      this.notifyAuthStateChange('initialized');
      
      console.log('✅ Chat auth initialized successfully');
      return true;
    } catch (error) {
      console.error('❌ Chat auth initialization failed:', error);
      this.notifyAuthStateChange('error', error);
      throw new InitializationError('Failed to initialize chat authentication', error);
    } finally {
      this.isInitializing = false;
    }
  }

  /**
   * Ensure chat authentication is valid and refresh if needed
   */
  async ensureChatAuth(userData, password) {
    if (!this.isChatAuthenticated()) {
      console.log('🔐 No chat token found, initializing auth...');
      return await this.initializeChatAuth(userData, password);
    }

    try {
      // Verify token is still valid
      await this.validateCurrentToken();
      return true;
    } catch (validationError) {
      console.warn('⚠️ Chat token validation failed:', validationError);
      
      try {
        // Attempt to refresh token
        await this.refreshChatToken();
        return true;
      } catch (refreshError) {
        console.warn('⚠️ Chat token refresh failed, re-authenticating...');
        return await this.initializeChatAuth(userData, password);
      }
    }
  }

  /**
   * Login to chat system
   */
  async chatLogin(email, password) {
    try {
      const response = await chatService.login({
        email: email.trim().toLowerCase(),
        password
      });
      
      this.storeChatTokens(response);
      this.notifyAuthStateChange('logged_in');
      
      return response;
    } catch (error) {
      console.error('❌ Chat login failed:', error);
      this.notifyAuthStateChange('login_failed', error);
      throw new ChatAuthError('Chat login failed', 'LOGIN_FAILED', error);
    }
  }

  /**
   * Register with chat system
   */
  async chatRegister(userData, password) {
    try {
      const registerData = this.buildRegistrationData(userData, password);
      const response = await chatService.register(registerData);
      
      this.storeChatTokens(response);
      this.notifyAuthStateChange('registered');
      
      return response;
    } catch (error) {
      console.error('❌ Chat registration failed:', error);
      this.notifyAuthStateChange('registration_failed', error);
      throw new ChatAuthError('Chat registration failed', 'REGISTRATION_FAILED', error);
    }
  }

  /**
   * Refresh chat token
   */
  async refreshChatToken() {
    const refreshToken = this.getStoredRefreshToken();
    
    if (!refreshToken) {
      throw new TokenRefreshError('No refresh token available');
    }

    try {
      const response = await chatService.refreshToken({ refreshToken });
      this.storeChatTokens(response);
      this.notifyAuthStateChange('token_refreshed');
      
      console.debug('✅ Chat token refreshed successfully');
      return response;
    } catch (error) {
      console.error('❌ Chat token refresh failed:', error);
      this.clearChatTokens();
      this.notifyAuthStateChange('token_refresh_failed', error);
      throw new TokenRefreshError('Token refresh failed', error);
    }
  }

  /**
   * Logout from chat system
   */
  async chatLogout() {
    try {
      await chatService.logout();
    } catch (error) {
      console.warn('⚠️ Chat logout API call failed:', error);
      // Continue with local logout even if API call fails
    } finally {
      this.performLocalLogout();
    }
  }

  /**
   * Check if user is authenticated with chat system
   */
  isChatAuthenticated() {
    const token = this.getChatToken();
    const expiry = this.getTokenExpiry();
    
    if (!token) return false;
    
    // Check if token is expired or about to expire (within 5 minutes)
    if (expiry && Date.now() >= (expiry - 300000)) {
      console.debug('🕒 Chat token expired or near expiry');
      return false;
    }
    
    return true;
  }

  /**
   * Get current chat token
   */
  getChatToken() {
    return this.getSecureStorage(this.STORAGE_KEYS.CHAT_TOKEN);
  }

  /**
   * Add auth state change listener
   */
  onAuthStateChange(callback) {
    this.authStateListeners.add(callback);
    
    // Return unsubscribe function
    return () => {
      this.authStateListeners.delete(callback);
    };
  }

  // ===== Private Methods =====

  /**
   * Authenticate user with retry logic
   */
  async authenticateUser(userData, password) {
    // Try login first
    try {
      await this.chatLogin(userData.email, password);
      return;
    } catch (loginError) {
      console.log('🔐 Chat login failed, attempting registration...');
      
      // If login fails with 401/404, try registration
      if (this.shouldAttemptRegistration(loginError)) {
        await this.chatRegister(userData, password);
        
        return;
      }
      
      // Re-throw if it's not a "user not found" type error
      throw loginError;
    }
  }

  /**
   * Execute function with retry logic
   */
  async executeWithRetry(operation) {
    let lastError;

    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;
        
        if (attempt < this.maxRetries && this.isRetryableError(error)) {
          const delay = this.retryDelay * attempt;
          console.warn(`🔄 Chat auth attempt ${attempt} failed, retrying in ${delay}ms...`);
          await this.delay(delay);
          continue;
        }
      }
    }

    throw lastError;
  }

  /**
   * Validate current token by making API call
   */
  async validateCurrentToken() {
    try {
      await chatService.getCurrentUser();
      return true;
    } catch (error) {
      if (error.response?.status === 401) {
        throw new ChatAuthError('Token validation failed', 'TOKEN_INVALID', error);
      }
      // For other errors, we don't invalidate the token - might be network issues
      console.warn('⚠️ Token validation check failed (non-auth error):', error);
      return true;
    }
  }

  /**
   * Store chat authentication tokens securely
   */
  storeChatTokens(response) {
    console.debug('🔐 Storing chat tokens:', {
      hasData: !!response.data,
      keys: response.data ? Object.keys(response.data) : []
    });

    // Extract tokens - adjust these paths based on your API response structure
    const token = response.data?.token || response.data?.accessToken;
    const refreshToken = response.data?.refreshToken;
    const expiresIn = response.data?.expiresIn || 3600; // Default 1 hour
    const userId = response.data?.userId || response.data?.id;

    if (!token) {
      throw new ChatAuthError('No token received in response');
    }

    // Calculate token expiry
    const tokenExpiry = Date.now() + (expiresIn * 1000);

    try {
      // Store tokens securely
      this.setSecureStorage(this.STORAGE_KEYS.CHAT_TOKEN, token);
      
      if (refreshToken) {
        this.setSecureStorage(this.STORAGE_KEYS.CHAT_REFRESH_TOKEN, refreshToken);
      }
      
      this.setSecureStorage(this.STORAGE_KEYS.CHAT_TOKEN_EXPIRY, tokenExpiry.toString());
      
      if (userId) {
        this.setSecureStorage(this.STORAGE_KEYS.CHAT_USER_ID, userId);
      }

      console.debug('✅ Chat tokens stored securely');
    } catch (storageError) {
      console.error('❌ Failed to store chat tokens:', storageError);
      throw new ChatAuthError('Failed to store authentication tokens', 'STORAGE_ERROR', storageError);
    }
  }

  /**
   * Perform local logout cleanup
   */
  performLocalLogout() {
    this.clearChatTokens();
    this.isInitialized = false;
    this.stopTokenMonitoring();
    this.notifyAuthStateChange('logged_out');
    
    console.log('✅ Chat logout completed');
  }

  /**
   * Clear all chat tokens
   */
  clearChatTokens() {
    Object.values(this.STORAGE_KEYS).forEach(key => {
      this.removeSecureStorage(key);
    });
  }

  /**
   * Start token expiry monitoring
   */
  startTokenMonitoring() {
    this.stopTokenMonitoring(); // Clear existing interval
    
    this.tokenCheckInterval = setInterval(() => {
      if (!this.isChatAuthenticated()) {
        console.debug('🕒 Chat token expired, notifying...');
        this.notifyAuthStateChange('token_expired');
      }
    }, this.TOKEN_CHECK_INTERVAL);
  }

  /**
   * Stop token monitoring
   */
  stopTokenMonitoring() {
    if (this.tokenCheckInterval) {
      clearInterval(this.tokenCheckInterval);
      this.tokenCheckInterval = null;
    }
  }

  // ===== Helper Methods =====

  buildRegistrationData(userData, password) {
    return {
      email: userData.email.trim().toLowerCase(),
      password: password,
      username: userData.username || `user_${userData.id}`,
      // Include any additional registration fields your API expects
      ...(userData.first_name && { firstName: userData.first_name }),
      ...(userData.last_name && { lastName: userData.last_name })
    };
  }

  getStoredRefreshToken() {
    return this.getSecureStorage(this.STORAGE_KEYS.CHAT_REFRESH_TOKEN);
  }

  getTokenExpiry() {
    const expiry = this.getSecureStorage(this.STORAGE_KEYS.CHAT_TOKEN_EXPIRY);
    return expiry ? parseInt(expiry, 10) : null;
  }

  shouldAttemptRegistration(error) {
    const status = error.status;
    // Attempt registration for "user not found" or "invalid credentials" errors
    return status !== 401 || status === 404;
  }

  isRetryableError(error) {
    // Retry on network errors or 5xx server errors
    return !error.response || error.response.status >= 500;
  }

  waitForInitialization() {
    return new Promise((resolve) => {
      const checkInterval = setInterval(() => {
        if (!this.isInitializing) {
          clearInterval(checkInterval);
          resolve();
        }
      }, 100);
    });
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // ===== Secure Storage Methods =====

  setSecureStorage(key, value) {
    try {
      localStorage.setItem(key, value);
    } catch (error) {
      console.error(`❌ Failed to store ${key} in localStorage:`, error);
      throw error;
    }
  }

  getSecureStorage(key) {
    try {
      return localStorage.getItem(key);
    } catch (error) {
      console.error(`❌ Failed to retrieve ${key} from localStorage:`, error);
      return null;
    }
  }

  removeSecureStorage(key) {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.error(`❌ Failed to remove ${key} from localStorage:`, error);
    }
  }

  // ===== Event Notification =====

  notifyAuthStateChange(state, error = null) {
    const event = {
      state,
      timestamp: Date.now(),
      isAuthenticated: this.isChatAuthenticated(),
      error
    };

    this.authStateListeners.forEach(callback => {
      try {
        callback(event);
      } catch (listenerError) {
        console.error('Error in auth state listener:', listenerError);
      }
    });
  }

  // ===== Cleanup =====

  destroy() {
    this.stopTokenMonitoring();
    this.authStateListeners.clear();
    this.isInitialized = false;
    this.isInitializing = false;
  }
}

// Export both singleton and class for testing
export { ChatAuthService };
export default new ChatAuthService();