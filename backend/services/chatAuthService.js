const axios = require('axios');
const crypto = require('crypto');

class ChatAuthService {
  constructor() {
    this.chatBaseUrl = process.env.CHAT_BACKEND_URL;
    this.encryptionKey = process.env.CHAT_PASSWORD_ENCRYPTION_KEY || 
                         process.env.JWT_SECRET || 
                         'default-encryption-key-32-bytes-long!!!';
  }

  /**
   * Encrypt password for storage
   */
  encryptPassword(password) {
    try {
      const iv = crypto.randomBytes(16);
      const key = crypto.scryptSync(this.encryptionKey, 'salt', 32);
      const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
      
      let encrypted = cipher.update(password, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      
      // Format: iv:encrypted
      return `${iv.toString('hex')}:${encrypted}`;
    } catch (error) {
      console.error('Password encryption failed:', error);
      throw error;
    }
  }

  /**
   * Decrypt stored password
   */
  decryptPassword(encryptedData) {
    try {
      const [ivHex, encrypted] = encryptedData.split(':');
      if (!ivHex || !encrypted) {
        throw new Error('Invalid encrypted data format');
      }
      
      const iv = Buffer.from(ivHex, 'hex');
      const key = crypto.scryptSync(this.encryptionKey, 'salt', 32);
      const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
      
      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      return decrypted;
    } catch (error) {
      console.error('Password decryption failed:', error);
      throw error;
    }
  }

  /**
   * Store chat password for Google user in verification_token field
   */
  async storeChatPasswordForGoogleUser(userId, password) {
    try {
      const { User } = require('../models');
      
      // Encrypt the password
      const encryptedData = this.encryptPassword(password);
      
      // Store in verification_token field (unused for Google users)
      await User.update(
        { verification_token: encryptedData },
        { where: { id: userId } }
      );
      
      console.log(`✅ Chat password stored for user ${userId}`);
      return true;
    } catch (error) {
      console.error('Failed to store chat password:', error);
      throw error;
    }
  }

  /**
   * Get stored chat password for Google user
   */
  async getStoredChatPassword(userId) {
    try {
      const { User } = require('../models');
      
      const user = await User.findByPk(userId, {
        attributes: ['verification_token', 'oauth_provider']
      });
      
      // Only Google users should have chat passwords stored
      if (!user || user.oauth_provider !== 'google' || !user.verification_token) {
        return null;
      }
      
      // Decrypt and return the password
      return this.decryptPassword(user.verification_token);
    } catch (error) {
      console.error('Failed to get stored chat password:', error);
      return null;
    }
  }

  /**
   * Register user in chat system
   */
  async registerChatUser(userData) {
    try {
      if (!userData.password) {
        throw new Error('Password required for chat registration');
      }

      const response = await axios.post(`${this.chatBaseUrl}/api/v1/auth/register`, {
        email: userData.email,
        username: userData.username,
        password: userData.password,
        platform_user_id: userData.id,
        profilePicture: userData.avatar_url,
        metadata: {
          oauth_provider: userData.oauth_provider || 'none',
          platform: 'tournament-platform'
        }
      });

      console.log(`✅ Chat user registered: ${userData.email}`);
      return response.data;
    } catch (error) {
      console.error('Chat registration failed:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Login user in chat system
   */
  async loginChatUser(email, password) {
    try {
      if (!password) {
        throw new Error('Password required for chat login');
      }

      const response = await axios.post(`${this.chatBaseUrl}/api/v1/auth/login`, {
        email,
        password
      });

      console.log(`✅ Chat login successful: ${email}`);
      return response.data;
    } catch (error) {
      console.error('Chat login failed:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Get or create chat token for any user
   */
  async getChatTokenForUser(user, password) {
    try {
      // First try to login
      const loginResult = await this.loginChatUser(user.email, password);
      
      // Update profile if needed
      if (loginResult.data && !loginResult.data.profile_complete) {
        await this.updateChatUserProfile(user, loginResult.data.token);
      }
      
      return loginResult;
    } catch (loginError) {
      // If login fails (user doesn't exist), register
      if (loginError.response?.status === 401 || loginError.response?.status === 404) {
        return await this.registerChatUser({
          id: user.id,
          email: user.email,
          username: user.username,
          password: password,
          avatar_url: user.avatar_url,
          oauth_provider: user.oauth_provider || 'none'
        });
      }
      throw loginError;
    }
  }

  /**
   * Get chat token for Google user using stored password
   */
  async getChatTokenForGoogleUser(user) {
    try {
      // Get stored password from verification_token field
      const storedPassword = await this.getStoredChatPassword(user.id);
      
      if (!storedPassword) {
        // If no password stored, user hasn't set one yet
        console.log(`⚠️ No chat password stored for Google user: ${user.email}`);
        throw new Error('Google user must set password first to access chat');
      }

      // Use stored password for chat authentication
      return await this.getChatTokenForUser(user, storedPassword);
    } catch (error) {
      console.error('Failed to get chat token for Google user:', error.message);
      throw error;
    }
  }

  /**
   * Initialize chat for Google user (when they set password)
   */
  async initializeChatForGoogleUser(user, plainPassword) {
    try {
      console.log(`🚀 Initializing chat for Google user: ${user.email}`);
      
      // 1. Store the password in verification_token field
      await this.storeChatPasswordForGoogleUser(user.id, plainPassword);
      
      // 2. Try to register in chat system
      try {
        const result = await this.registerChatUser({
          id: user.id,
          email: user.email,
          username: user.username,
          password: plainPassword,
          avatar_url: user.avatar_url,
          oauth_provider: 'google'
        });
        
        console.log(`✅ Chat initialized successfully for ${user.email}`);
        return result;
      } catch (registerError) {
        // If registration fails with 409 (user already exists), try to login
        if (registerError.response?.status === 409) {
          console.log(`🔄 Chat user already exists, attempting login: ${user.email}`);
          return await this.loginChatUser(user.email, plainPassword);
        }
        throw registerError;
      }
    } catch (error) {
      console.error('Failed to initialize chat for Google user:', error.message);
      throw error;
    }
  }

  /**
   * Check if Google user has chat password set
   */
  async hasChatPassword(userId) {
    try {
      const password = await this.getStoredChatPassword(userId);
      return !!password;
    } catch (error) {
      return false;
    }
  }

  /**
   * Update chat user profile
   */
  async updateChatUserProfile(user, chatToken) {
    try {
      const response = await axios.put(
        `${this.chatBaseUrl}/api/v1/users/profile`,
        {
          username: user.username,
          profilePicture: user.avatar_url,
          platform_user_id: user.id
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
      return null;
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
   * Clear chat tokens (client-side)
   */
  clearAllTokens() {
    console.log('Clearing chat tokens');
  }
}

module.exports = new ChatAuthService();