import api from './api';

export const authService = {
  // ========== EXISTING METHODS (Maintained as-is) ==========
  login: async (credentials) => {
    const payload = {
      login: credentials.identifier, 
      password: credentials.password
    };
    
    const response = await api.post('/auth/login', payload);
    
    return response.data;
  },

  signup: async (userData) => {
    const response = await api.post('/auth/register', userData);
    return response.data;
  },

  getProfile: async () => {
    const response = await api.get('/users/profile');
    return response.data;
  },

  updateNotificationPreferences: async (preferences) => {
    const response = await api.put('/users/preferences/notifications', preferences);
    return response.data;
  },

  // ========== GOOGLE OAUTH METHODS ==========

  /**
   * Initiate Google OAuth flow
   * @param {string} redirectUri - Optional redirect URI after authentication
   * @param {string} platform - 'web' or 'mobile' (optional)
   */
  initiateGoogleAuth: (redirectUri = '/', platform = 'web') => {
    // Build Google OAuth URL with state parameter
    const state = btoa(JSON.stringify({ 
      redirect_uri: redirectUri,
      platform: platform,
      timestamp: Date.now()
    }));
    
    // Redirect to backend Google auth endpoint
    window.location.href = `${api.defaults.baseURL}/auth/google?state=${encodeURIComponent(state)}`;
  },

  /**
   * Handle Google OAuth callback (for web)
   * Extracts tokens from URL and stores them
   */
  handleGoogleCallback: () => {
    return new Promise((resolve, reject) => {
      try {
        const urlParams = new URLSearchParams(window.location.search);
        const platformToken = urlParams.get('platformToken');
        const error = urlParams.get('error');

        if (error) {
          reject(new Error(decodeURIComponent(error)));
          return;
        }

        if (platformToken) {
          // Store the token (adapt to your token storage method)
          localStorage.setItem('platformToken', platformToken);
          
          // Clear URL parameters
          window.history.replaceState({}, document.title, window.location.pathname);
          
          resolve({
            token: platformToken,
            source: 'google'
          });
        } else {
          reject(new Error('No authentication token found in callback'));
        }
      } catch (error) {
        reject(error);
      }
    });
  },

  /**
   * Direct Google authentication using ID token (for mobile apps or custom flows)
   * @param {string} idToken - Google ID token
   */
  authenticateWithGoogleToken: async (idToken) => {
    const response = await api.post('/auth/google/token', { idToken });
    return response.data;
  },

  /**
   * Link existing account to Google
   * @param {string} googleToken - Google ID token
   */
  linkGoogleAccount: async (googleToken) => {
    const response = await api.post('/auth/link/google', { googleToken });
    return response.data;
  },

  /**
   * Unlink Google account from profile
   */
  unlinkGoogleAccount: async () => {
    const response = await api.post('/auth/unlink/google');
    return response.data;
  },

  /**
   * Check if user is authenticated via Google OAuth
   */
  isGoogleUser: () => {
    const userData = localStorage.getItem('userData');
    if (userData) {
      try {
        const user = JSON.parse(userData);
        return user.oauth_provider === 'google';
      } catch {
        return false;
      }
    }
    return false;
  },

  // ========== CHAT TOKEN METHODS ==========

  /**
   * Refresh chat token
   */
  refreshChatToken: async (refreshToken) => {
    const response = await api.post('/auth/chat/refresh', { refreshToken });
    return response.data;
  },

  /**
   * Validate chat token
   */
  validateChatToken: async (chatToken) => {
    const response = await api.post('/auth/chat/validate', { chatToken });
    return response.data;
  },

  // ========== EXISTING VERIFICATION METHODS ==========
  sendEmailVerification: async () => {
    const response = await api.post('/auth/verification/email/send');
    return response.data;
  },

  verifyEmail: async (token) => {
    const response = await api.post('/auth/verification/email/verify', { token });
    return response.data;
  },

  sendPhoneVerification: async () => {
    const response = await api.post('/auth/verification/phone/send');
    return response.data;
  },

  verifyPhone: async (code) => {
    const response = await api.post('/auth/verification/phone/verify', { code });
    return response.data;
  },

  requestPasswordResetEmail: async (email) => {
    const response = await api.post('/auth/verification/password/reset/email', { email });
    return response.data;
  },

  requestPasswordResetSMS: async (phone) => {
    const response = await api.post('/auth/verification/password/reset/sms', { phone });
    return response.data;
  },

  resetPasswordWithToken: async (token, new_password) => {
    const response = await api.post('/auth/verification/password/reset/token', {
      token,
      new_password
    });
    return response.data;
  },

  resetPasswordWithCode: async (code, new_password) => {
    const response = await api.post('/auth/verification/password/reset/code', {
      code,
      new_password
    });
    return response.data;
  },

  // ========== HELPER METHODS ==========

  /**
   * Store authentication data
   */
  storeAuthData: (data) => {
    if (data.tokens && data.tokens.platform) {
      localStorage.setItem('platformToken', data.tokens.platform);
    }
    if (data.tokens && data.tokens.chat) {
      localStorage.setItem('chatToken', data.tokens.chat);
    }
    if (data.tokens && data.tokens.chatRefresh) {
      localStorage.setItem('chatRefreshToken', data.tokens.chatRefresh);
    }
    if (data.user) {
      localStorage.setItem('userData', JSON.stringify(data.user));
    }
  },

  /**
   * Clear all authentication data
   */
  clearAuthData: () => {
    localStorage.removeItem('platformToken');
    localStorage.removeItem('chatToken');
    localStorage.removeItem('chatRefreshToken');
    localStorage.removeItem('userData');
  },

  /**
   * Get stored authentication data
   */
  getStoredAuthData: () => {
    const platformToken = localStorage.getItem('platformToken');
    const chatToken = localStorage.getItem('chatToken');
    const chatRefreshToken = localStorage.getItem('chatRefreshToken');
    const userDataStr = localStorage.getItem('userData');
    
    let userData = null;
    try {
      userData = userDataStr ? JSON.parse(userDataStr) : null;
    } catch  {
      userData = null;
    }

    return {
      platformToken,
      chatToken,
      chatRefreshToken,
      user: userData
    };
  },

  /**
   * Check if user is authenticated
   */
  isAuthenticated: () => {
    const token = localStorage.getItem('platformToken');
    if (!token) return false;

    // Optional: Check token expiration
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      if (payload.exp && Date.now() >= payload.exp * 1000) {
        this.clearAuthData();
        return false;
      }
      return true;
    } catch  {
      return false;
    }
  }
};