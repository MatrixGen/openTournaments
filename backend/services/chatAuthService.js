const axios = require('axios');

class ChatAuthService {
  constructor() {
    this.chatBaseUrl = process.env.CHAT_BACKEND_URL
  }

  /**
   * Register a user in the chat system
   */
  async registerChatUser(userData) {
    try {
      const response = await axios.post(`${this.chatBaseUrl}/api/v1/auth/register`, {
        email: userData.email,
        username: userData.username,
        password: userData.password || 'auto-generated-password',
        platform_user_id: userData.id,
        //profilePicture: userData.avatar_url
      });

      return response.data;
    } catch (error) {
      console.error('Chat registration failed:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Login a user in the chat system
   */
  async loginChatUser(email, password) {
    try {
      const response = await axios.post(`${this.chatBaseUrl}/api/v1/auth/login`, {
        email,
        password: password || 'auto-generated-password'
      });

      return response.data;
    } catch (error) {
      console.error('Chat login failed:', error.response?.data || error.message);
      throw error;
    }
  }

  async addUserToChannel(email, password) {
    try {
      const response = await axios.post(`${this.chatBaseUrl}/api/v1/auth/login`, {
        email,
        password: password || 'auto-generated-password'
      });

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
      return await this.loginChatUser(platformUser.email, platformPassword);
    } catch (loginError) {
      // If login fails (user doesn't exist), try to register
      if (loginError.response?.status === 401 || loginError.response?.status === 404) {
        return await this.registerChatUser({
          id: platformUser.id,
          email: platformUser.email,
          username: platformUser.username,
          password: platformPassword,
          avatar_url: platformUser.avatar_url
        });
      }
      throw loginError;
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
}

module.exports = new ChatAuthService();