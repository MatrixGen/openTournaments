// services/chatAuthService.js
class ChatAuthService {
  constructor() {
    this.STORAGE_KEYS = {
      CHAT_TOKEN: "chat_token",
      CHAT_REFRESH_TOKEN: "chat_refresh_token",
      PLATFORM_TOKEN: "token",
      USER_DATA: "user",
      CHAT_USER_DATA: "chat_user", // optional but useful
    };
  }

  storeTokens(response) {
    try {
      // 1) platform token (if your backend includes it in some responses)
      // support multiple possible shapes defensively
      const platformToken =
        response?.tokens?.platform ||
        response?.token ||
        response?.platformToken;

      if (platformToken) {
        localStorage.setItem(this.STORAGE_KEYS.PLATFORM_TOKEN, platformToken);
      }

      // 2) chat tokens (matches your payload)
      const chatToken = response?.chat?.token || response?.tokens?.chat;
      const chatRefresh =
        response?.chat?.refreshToken || response?.tokens?.chatRefresh;

      if (chatToken) {
        localStorage.setItem(this.STORAGE_KEYS.CHAT_TOKEN, chatToken);
      }
      if (chatRefresh) {
        localStorage.setItem(this.STORAGE_KEYS.CHAT_REFRESH_TOKEN, chatRefresh);
      }

      // 3) store platform user + chat user (both exist in your payload)
      if (response?.user) {
        localStorage.setItem(
          this.STORAGE_KEYS.USER_DATA,
          JSON.stringify(response.user)
        );
      }
      if (response?.chat?.user) {
        localStorage.setItem(
          this.STORAGE_KEYS.CHAT_USER_DATA,
          JSON.stringify(response.chat.user)
        );
      }

      console.log("✅ Tokens stored successfully");
    } catch (error) {
      console.error("❌ Failed to store tokens:", error);
    }
  }

  getChatToken() {
    return localStorage.getItem(this.STORAGE_KEYS.CHAT_TOKEN);
  }

  getPlatformToken() {
    return localStorage.getItem(this.STORAGE_KEYS.PLATFORM_TOKEN);
  }

  getUserData() {
    const raw = localStorage.getItem(this.STORAGE_KEYS.USER_DATA);
    return raw ? JSON.parse(raw) : null;
  }

  getChatUserData() {
    const raw = localStorage.getItem(this.STORAGE_KEYS.CHAT_USER_DATA);
    return raw ? JSON.parse(raw) : null;
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

  clearChatTokens() {
    localStorage.removeItem(this.STORAGE_KEYS.CHAT_TOKEN);
    localStorage.removeItem(this.STORAGE_KEYS.CHAT_REFRESH_TOKEN);
    localStorage.removeItem(this.STORAGE_KEYS.CHAT_USER_DATA);
    console.log("✅ Chat tokens cleared");
  }

  getChatAuthHeader() {
    const token = this.getChatToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  getPlatformAuthHeader() {
    const token = this.getPlatformToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
  }
}

export default new ChatAuthService();
