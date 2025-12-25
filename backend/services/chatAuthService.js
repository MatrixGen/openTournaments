const axios = require('axios');

class ChatAuthService {
  constructor() {
    this.chatBaseUrl = process.env.CHAT_BACKEND_URL;
    this.defaultPassword = process.env.CHAT_DEFAULT_PASSWORD || 'auto-generated-password-123';
  }

  /**
   * Register a user in the chat system
   */
  async registerChatUser(userData) {
    try {
      const payload = {
        email: userData.email,
        username: userData.username,
        password: userData.password || this.defaultPassword,
        platform_user_id: userData.id,
        oauth_provider: userData.oauth_provider || 'none',
        profilePicture: userData.avatar_url
      };

      // Remove password for OAuth users if chat backend supports it
      if (userData.oauth_provider && userData.oauth_provider !== 'none') {
        delete payload.password;
        payload.oauth_id = userData.oauth_id;
        payload.oauth_provider = userData.oauth_provider;
      }

      const response = await axios.post(`${this.chatBaseUrl}/api/v1/auth/register`, payload);

      return response.data;
    } catch (error) {
      console.error('Chat registration failed:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Login a user in the chat system
   */
  async loginChatUser(email, password, oauthProvider = 'none') {
    try {
      let payload = { email };
      
      // For OAuth users without passwords, use token-based login if available
      if (oauthProvider !== 'none' && !password) {
        payload = {
          email,
          oauth_provider: oauthProvider
        };
        
        // Try OAuth login endpoint if available
        try {
          const response = await axios.post(`${this.chatBaseUrl}/api/v1/auth/oauth-login`, payload);
          return response.data;
        } catch (oauthError) {
          console.warn('OAuth login endpoint not available, falling back to password login');
        }
      }

      // Fallback to password login
      payload.password = password || this.defaultPassword;
      const response = await axios.post(`${this.chatBaseUrl}/api/v1/auth/login`, payload);

      return response.data;
    } catch (error) {
      console.error('Chat login failed:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Get or create chat token for a platform user
   */
  async getChatTokenForUser(platformUser, platformPassword) {
    try {
      // First try to login
      const loginResult = await this.loginChatUser(
        platformUser.email, 
        platformPassword, 
        platformUser.oauth_provider
      );
      
      // If login successful but user needs registration info, update chat profile
      if (loginResult.data && !loginResult.data.profile_complete) {
        await this.updateChatUserProfile(platformUser, loginResult.data.token);
      }
      
      return loginResult;
    } catch (loginError) {
      // If login fails (user doesn't exist), try to register
      if (loginError.response?.status === 401 || loginError.response?.status === 404) {
        return await this.registerChatUser({
          id: platformUser.id,
          email: platformUser.email,
          username: platformUser.username,
          password: platformPassword,
          avatar_url: platformUser.avatar_url,
          oauth_provider: platformUser.oauth_provider,
          oauth_id: platformUser.google_id
        });
      }
      throw loginError;
    }
  }

  /**
   * Get chat token for Google OAuth user
   */
  async getChatTokenForGoogleUser(platformUser) {
    try {
      // Try OAuth login first
      const loginResult = await this.loginChatUser(
        platformUser.email, 
        null, 
        'google'
      );
      
      // Update profile if needed
      if (loginResult.data && !loginResult.data.profile_complete) {
        await this.updateChatUserProfile(platformUser, loginResult.data.token);
      }
      
      return loginResult;
    } catch (loginError) {
      // If OAuth login fails, register the user
      if (loginError.response?.status === 401 || loginError.response?.status === 404) {
        return await this.registerChatUser({
          id: platformUser.id,
          email: platformUser.email,
          username: platformUser.username,
          // No password for Google users
          avatar_url: platformUser.avatar_url,
          oauth_provider: 'google',
          oauth_id: platformUser.google_id
        });
      }
      
      // For other errors, try with default password as fallback
      try {
        return await this.getChatTokenForUser(platformUser, this.defaultPassword);
      } catch (fallbackError) {
        console.error('All chat auth attempts failed for Google user:', fallbackError.message);
        throw loginError; // Throw original error
      }
    }
  }

  /**
   * Update chat user profile information
   */
  async updateChatUserProfile(platformUser, chatToken) {
    try {
      const response = await axios.put(
        `${this.chatBaseUrl}/api/v1/users/profile`,
        {
          username: platformUser.username,
          profilePicture: platformUser.avatar_url,
          platform_user_id: platformUser.id
        },
        {
          headers: {
            Authorization: `Bearer ${chatToken}`
          }
        }
      );
      
      return response.data;
    } catch (error) {
      console.warn('Failed to update chat user profile:', error.message);
      // This is non-critical, so don't throw
    }
  }

  /**
   * Add user to default channels
   */
  async addUserToDefaultChannels(email, chatToken) {
    try {
      const defaultChannels = process.env.CHAT_DEFAULT_CHANNELS 
        ? process.env.CHAT_DEFAULT_CHANNELS.split(',') 
        : ['general', 'announcements'];
      
      const promises = defaultChannels.map(async (channel) => {
        try {
          await axios.post(
            `${this.chatBaseUrl}/api/v1/channels/${channel}/join`,
            {},
            {
              headers: {
                Authorization: `Bearer ${chatToken}`,
                'X-User-Email': email
              }
            }
          );
        } catch (channelError) {
          console.warn(`Failed to add user to channel ${channel}:`, channelError.message);
        }
      });
      
      await Promise.all(promises);
      console.log(`Added user ${email} to default channels`);
    } catch (error) {
      console.error('Failed to add user to default channels:', error.message);
    }
  }

  /**
   * Exchange platform token for chat token
   */
  async exchangeToken(platformToken) {
    try {
      const response = await axios.post(`${this.chatBaseUrl}/api/v1/auth/exchange-token`, {
        platform_token: platformToken
      });

      return response.data;
    } catch (error) {
      console.error('Token exchange failed:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Validate chat token
   */
  async validateChatToken(chatToken) {
    try {
      const response = await axios.get(`${this.chatBaseUrl}/api/v1/auth/validate`, {
        headers: { Authorization: `Bearer ${chatToken}` }
      });

      return response.data;
    } catch (error) {
      console.error('Token validation failed:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Refresh chat token
   */
  async refreshChatToken(refreshToken) {
    try {
      const response = await axios.post(`${this.chatBaseUrl}/api/v1/auth/refresh`, {
        refreshToken
      });

      return response.data;
    } catch (error) {
      console.error('Token refresh failed:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Unlink chat account (when user removes Google OAuth)
   */
  async unlinkChatAccount(platformUserId) {
    try {
      const response = await axios.delete(
        `${this.chatBaseUrl}/api/v1/users/${platformUserId}/unlink-oauth`,
        {
          headers: {
            'X-Platform-API-Key': process.env.CHAT_API_KEY
          }
        }
      );

      return response.data;
    } catch (error) {
      console.error('Failed to unlink chat account:', error.response?.data || error.message);
      // Don't throw - this is not critical
      return { success: false, message: 'Chat account unlinking failed' };
    }
  }

  /**
   * Link chat account to OAuth
   */
  async linkChatAccountToOAuth(platformUserId, oauthProvider, oauthId) {
    try {
      const response = await axios.post(
        `${this.chatBaseUrl}/api/v1/users/${platformUserId}/link-oauth`,
        {
          oauth_provider: oauthProvider,
          oauth_id: oauthId
        },
        {
          headers: {
            'X-Platform-API-Key': process.env.CHAT_API_KEY
          }
        }
      );

      return response.data;
    } catch (error) {
      console.error('Failed to link chat account to OAuth:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Get chat user by platform ID
   */
  async getChatUserByPlatformId(platformUserId) {
    try {
      const response = await axios.get(
        `${this.chatBaseUrl}/api/v1/users/platform/${platformUserId}`,
        {
          headers: {
            'X-Platform-API-Key': process.env.CHAT_API_KEY
          }
        }
      );

      return response.data;
    } catch (error) {
      if (error.response?.status === 404) {
        return null; // User not found in chat system
      }
      console.error('Failed to get chat user:', error.response?.data || error.message);
      throw error;
    }
  }
}

module.exports = new ChatAuthService();