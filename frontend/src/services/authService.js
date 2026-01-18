// services/authService.js
import api from "./api";
import firebaseAuthService from "./firebaseAuthService";

export const authService = {
  /* ============================================================
   * 1) FIREBASE AUTH (PRIMARY / RECOMMENDED)
   * ============================================================ */

  /**
   * Sign in with Google using Firebase (popup)
   * @returns {Promise<{success: boolean, user: Object, chat: Object}>}
   */
  signInWithGoogle: async () => {
    const result = await firebaseAuthService.signIn("google");
    if (result.success && !result.redirect) {
      authService.storeFirebaseAuthData(result);
    }
    return result;
  },

  /**
   * Sign in with Google using redirect (for browsers that block popups)
   */
  signInWithGoogleRedirect: async () => {
    return firebaseAuthService.signIn("google-redirect");
  },

  /**
   * Handle Google redirect result
   * Call this on app load to check for redirect results
   */
  handleGoogleRedirect: async () => {
    const redirectResult = await firebaseAuthService.handleRedirectResult();
    if (redirectResult) {
      const sessionData = await firebaseAuthService.createSession(
        redirectResult.idToken
      );
      authService.storeFirebaseAuthData(sessionData);
      return { success: true, ...sessionData };
    }
    return null;
  },

  /**
   * Sign in with Google native (for Capacitor apps)
   * @param {string} idToken - Google ID token from native plugin
   * @param {string|null} accessToken - Google access token (optional)
   */
  signInWithGoogleNative: async (idToken, accessToken = null) => {
    const result = await firebaseAuthService.signIn("google-native", {
      idToken,
      accessToken,
    });
    if (result.success) {
      authService.storeFirebaseAuthData(result);
    }
    return result;
  },

  // ============================================
  // EMAIL/PASSWORD FIREBASE AUTH
  // ============================================

  /**
   * Sign in with email and password using Firebase
   * @param {string} email - User email
   * @param {string} password - User password
   * @returns {Promise<{success: boolean, user: Object, chat: Object, needsEmailVerification: boolean}>}
   */
  signInWithEmail: async (email, password) => {
    const result = await firebaseAuthService.signIn("email", { email, password });
    if (result.success) {
      authService.storeFirebaseAuthData(result);
    }
    return result;
  },

  /**
   * Sign up with email and password using Firebase
   * @param {string} email - User email
   * @param {string} password - User password
   * @param {Object} options - Additional options
   * @param {string} options.displayName - User display name (optional)
   * @returns {Promise<{success: boolean, user: Object, chat: Object, needsEmailVerification: boolean, verificationSent: boolean}>}
   */
  signUpWithEmail: async (email, password, options = {}) => {
    const result = await firebaseAuthService.signIn("email-signup", {
      email,
      password,
      displayName: options.displayName,
      sendVerification: true,
    });
    if (result.success) {
      authService.storeFirebaseAuthData(result);
    }
    return result;
  },

  /**
   * Send password reset email
   * @param {string} email - User email
   * @returns {Promise<{success: boolean}>}
   */
  sendPasswordResetEmail: async (email) => {
    return firebaseAuthService.sendPasswordReset(email);
  },

  /**
   * Resend email verification to current user
   * @returns {Promise<{success: boolean}>}
   */
  resendEmailVerification: async () => {
    return firebaseAuthService.resendEmailVerification();
  },

  // ============================================
  // END EMAIL/PASSWORD AUTH
  // ============================================

  /**
   * Get current session from platform (using Firebase token)
   */
  getFirebaseSession: async () => {
    return firebaseAuthService.getSession();
  },

  /**
   * Firebase-based logout
   */
  firebaseLogout: async () => {
    await firebaseAuthService.signOut();
    authService.clearAuthData();
  },

  /**
   * Check if user has an active Firebase session
   */
  hasFirebaseSession: () => {
    return firebaseAuthService.isSignedIn();
  },

  /**
   * Get Firebase user info
   */
  getFirebaseUser: () => {
    return firebaseAuthService.getFirebaseUserInfo();
  },

  /**
   * Store authentication data from Firebase session (platform + chat tokens)
   */
  storeFirebaseAuthData: (sessionData) => {
    // Store user
    if (sessionData?.user) {
      localStorage.setItem("userData", JSON.stringify(sessionData.user));
      localStorage.setItem("authType", "firebase");
    }

    // Store chat tokens (FIXED: use chat.token not chat.accessToken)
    const chatToken = sessionData?.chat?.token || sessionData?.chat?.accessToken;
    const chatRefreshToken = sessionData?.chat?.refreshToken;

    if (chatToken) {
      localStorage.setItem("chat_token", chatToken);
    }
    if (chatRefreshToken) {
      localStorage.setItem("chat_refresh_token", chatRefreshToken);
    }

    // Optional cleanup: if a previous bug stored "undefined"
    if (localStorage.getItem("chat_token") === "undefined") {
      localStorage.removeItem("chat_token");
    }
  },

  /**
   * Get stored auth data (Firebase + legacy compatible)
   */
  getStoredAuthData: () => {
    const platformToken = localStorage.getItem("platformToken");

    const chatToken =
      localStorage.getItem("chat_token") || localStorage.getItem("chatToken");

    const chatRefreshToken =
      localStorage.getItem("chat_refresh_token") ||
      localStorage.getItem("chatRefreshToken");

    const userDataStr = localStorage.getItem("userData");

    let userData = null;
    try {
      userData = userDataStr ? JSON.parse(userDataStr) : null;
    } catch {
      userData = null;
    }

    return {
      platformToken,
      chatToken,
      chatRefreshToken,
      user: userData,
    };
  },

  /**
   * Clear all authentication data (Firebase + legacy keys)
   */
  clearAuthData: () => {
    // Platform
    localStorage.removeItem("platformToken");
    localStorage.removeItem("authToken");

    // Chat (new + old)
    localStorage.removeItem("chat_token");
    localStorage.removeItem("chat_refresh_token");
    localStorage.removeItem("chatToken");
    localStorage.removeItem("chatRefreshToken");

    // User
    localStorage.removeItem("userData");
    localStorage.removeItem("authType");
  },

  /**
   * Check if user is authenticated
   * - Firebase: requires userData + firebase signed in
   * - Legacy: checks JWT expiration on platform token
   */
  isAuthenticated: () => {
    const authType = localStorage.getItem("authType");

    // Firebase authentication
    if (authType === "firebase") {
      const userData = localStorage.getItem("userData");
      return !!userData && firebaseAuthService.isSignedIn();
    }

    // Legacy JWT authentication
    const token =
      localStorage.getItem("platformToken") || localStorage.getItem("authToken");
    if (!token) return false;

    try {
      const payload = JSON.parse(atob(token.split(".")[1]));
      if (payload.exp && Date.now() >= payload.exp * 1000) {
        authService.clearAuthData();
        return false;
      }
      return true;
    } catch {
      return false;
    }
  },

  /* ============================================================
   * 2) LEGACY AUTH (BACKWARD COMPATIBILITY)
   *    - Keep here to avoid mixing with Firebase flow
   * ============================================================ */

  // Legacy username/password login
  login: async (credentials) => {
    const payload = {
      login: credentials.identifier,
      password: credentials.password,
    };
    const response = await api.post("/auth/login", payload);
    return response.data;
  },

  // Legacy signup
  signup: async (userData) => {
    const response = await api.post("/auth/register", userData);
    return response.data;
  },

  // Legacy profile
  getProfile: async () => {
    const response = await api.get("/user/profile");
    return response.data;
  },

  updateNotificationPreferences: async (preferences) => {
    const response = await api.put("/user/preferences/notifications", preferences);
    return response.data;
  },

  /* ---------- Legacy Google OAuth (non-Firebase) ---------- */

  initiateGoogleAuth: (redirectUri = "/", platform = "web") => {
    const state = btoa(
      JSON.stringify({
        redirect_uri: redirectUri,
        platform,
        timestamp: Date.now(),
      })
    );

    window.location.href = `${api.defaults.baseURL}/auth/google?state=${encodeURIComponent(
      state
    )}`;
  },

  handleGoogleCallback: () => {
    return new Promise((resolve, reject) => {
      try {
        const urlParams = new URLSearchParams(window.location.search);
        const platformToken = urlParams.get("platformToken");
        const error = urlParams.get("error");

        if (error) {
          reject(new Error(decodeURIComponent(error)));
          return;
        }

        if (platformToken) {
          localStorage.setItem("platformToken", platformToken);
          window.history.replaceState({}, document.title, window.location.pathname);
          resolve({ token: platformToken, source: "google" });
        } else {
          reject(new Error("No authentication token found in callback"));
        }
      } catch (error) {
        reject(error);
      }
    });
  },

  authenticateWithGoogleToken: async (idToken) => {
    const response = await api.post("/auth/google/token", { idToken });
    return response.data;
  },

  linkGoogleAccount: async (googleToken) => {
    const response = await api.post("/auth/link/google", { googleToken });
    return response.data;
  },

  unlinkGoogleAccount: async () => {
    const response = await api.post("/auth/unlink/google");
    return response.data;
  },

  isGoogleUser: () => {
    const userData = localStorage.getItem("userData");
    if (!userData) return false;
    try {
      const user = JSON.parse(userData);
      return user.oauth_provider === "google";
    } catch {
      return false;
    }
  },

  /* ---------- Legacy Chat token endpoints (if still used) ---------- */

  refreshChatToken: async (refreshToken) => {
    const response = await api.post("/auth/chat/refresh", { refreshToken });
    return response.data;
  },

  validateChatToken: async (chatToken) => {
    const response = await api.post("/auth/chat/validate", { chatToken });
    return response.data;
  },

  /* ---------- Legacy verification endpoints ---------- */

  sendEmailVerification: async () => {
    const response = await api.post("/auth/verification/email/send");
    return response.data;
  },

  verifyEmail: async (token) => {
    const response = await api.post("/auth/verification/email/verify", { token });
    return response.data;
  },

  sendPhoneVerification: async () => {
    const response = await api.post("/auth/verification/phone/send");
    return response.data;
  },

  verifyPhone: async (code) => {
    const response = await api.post("/auth/verification/phone/verify", { code });
    return response.data;
  },

  requestPasswordResetEmail: async (email) => {
    const response = await api.post("/auth/verification/password/reset/email", {
      email,
    });
    return response.data;
  },

  requestPasswordResetSMS: async (phone) => {
    const response = await api.post("/auth/verification/password/reset/sms", {
      phone,
    });
    return response.data;
  },

  resetPasswordWithToken: async (token, new_password) => {
    const response = await api.post("/auth/verification/password/reset/token", {
      token,
      new_password,
    });
    return response.data;
  },

  resetPasswordWithCode: async (code, new_password) => {
    const response = await api.post("/auth/verification/password/reset/code", {
      code,
      new_password,
    });
    return response.data;
  },

  /**
   * Legacy storeAuthData helper (ONLY for old flows)
   * Leave it here so Firebase section stays clean.
   */
  storeAuthData: (data) => {
    if (data?.tokens?.platform) {
      localStorage.setItem("platformToken", data.tokens.platform);
    }
    if (data?.tokens?.chat) {
      localStorage.setItem("chatToken", data.tokens.chat);
    }
    if (data?.tokens?.chatRefresh) {
      localStorage.setItem("chatRefreshToken", data.tokens.chatRefresh);
    }
    if (data?.user) {
      localStorage.setItem("userData", JSON.stringify(data.user));
    }
  },
};
