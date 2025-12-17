// services/chatAuthService.js

// Simplified Chat Authentication Service
// Now that backend handles chat authentication, this service only manages tokens
class ChatAuthService {
  constructor() {
    // Simple token storage keys
    this.STORAGE_KEYS = {
      CHAT_TOKEN: "chat_token",
      CHAT_REFRESH_TOKEN: "chat_refresh_token",
      PLATFORM_TOKEN: "token",
      USER_DATA: "user",
    };
  }

  // ===== Public Methods =====

  /**
   * Store authentication tokens from backend response
   */
  storeTokens(response) {
    try {
      const { tokens, user } = response;

      // Store platform token
      if (tokens.platform) {
        localStorage.setItem(this.STORAGE_KEYS.PLATFORM_TOKEN, tokens.platform);
      }

      // Store chat tokens
      if (tokens.chat) {
        localStorage.setItem(this.STORAGE_KEYS.CHAT_TOKEN, tokens.chat);
      }

      if (tokens.chatRefresh) {
        localStorage.setItem(
          this.STORAGE_KEYS.CHAT_REFRESH_TOKEN,
          tokens.chatRefresh
        );
      }

      // Store user data
      if (user) {
        localStorage.setItem(this.STORAGE_KEYS.USER_DATA, JSON.stringify(user));
      }

      console.log("✅ Tokens stored successfully");
    } catch (error) {
      console.error("❌ Failed to store tokens:", error);
    }
  }

  /**
   * Get chat token for API calls
   */
  // services/chatAuthService.js - Updated methods

  getChatToken() {
    return localStorage.getItem("chat_token");
  }

  getPlatformToken() {
    return localStorage.getItem("authToken");
  }

  getUserData() {
    const userData = localStorage.getItem("userData");
    return userData ? JSON.parse(userData) : null;
  }

  hasChatAuth() {
    return !!this.getChatToken();
  }

  isAuthenticated() {
    return !!this.getPlatformToken() && !!this.getChatToken();
  }

  
  clearAllTokens() {
    try {
      Object.values(this.STORAGE_KEYS).forEach((key) => {
        localStorage.removeItem(key);
      });
      console.log("✅ All tokens cleared");
    } catch (error) {
      console.error("❌ Failed to clear tokens:", error);
    }
  }

  /**
   * Clear only chat tokens (keep platform auth)
   */
  clearChatTokens() {
    localStorage.removeItem(this.STORAGE_KEYS.CHAT_TOKEN);
    localStorage.removeItem(this.STORAGE_KEYS.CHAT_REFRESH_TOKEN);
    console.log("✅ Chat tokens cleared");
  }

  /**
   * Get authorization header for chat API calls
   */
  getChatAuthHeader() {
    const token = this.getChatToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  /**
   * Get authorization header for platform API calls
   */
  getPlatformAuthHeader() {
    const token = this.getPlatformToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  /**
   * Update user data in storage
   */
  updateUserData(updates) {
    try {
      const currentUser = this.getUserData();
      if (currentUser) {
        const updatedUser = { ...currentUser, ...updates };
        localStorage.setItem(
          this.STORAGE_KEYS.USER_DATA,
          JSON.stringify(updatedUser)
        );
        return updatedUser;
      }
    } catch (error) {
      console.error("Failed to update user data:", error);
    }
    return null;
  }

  /**
   * Check if chat token needs refresh (simple check)
   */
  needsTokenRefresh() {
    // This is a simple implementation - in production, you might want to
    // check token expiry or rely on 401 responses from API calls
    return false;
  }
}

// Export singleton instance
export default new ChatAuthService();
