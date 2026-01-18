import React, {
  createContext,
  useContext,
  useReducer,
  useEffect,
  useCallback,
  useRef,
} from "react";
import { Capacitor } from "@capacitor/core";

import chatAuthService from "../services/chatAuthService";
import firebaseAuthService from "../services/firebaseAuthService";
import { authService } from "../services/authService";
import { initPushNotifications } from "../push";
import { notificationService } from "../services/notificationService";

const AuthContext = createContext();

const initialState = {
  user: null,
  isAuthenticated: false,
  isLoading: true,
  chatInitialized: false,
  authType: null, // 'firebase' or 'legacy'
};

function authReducer(state, action) {
  switch (action.type) {
    case "LOGIN_START":
      return { ...state, isLoading: true };

    case "LOGIN_SUCCESS":
      return {
        ...state,
        user: action.payload.user,
        isAuthenticated: true,
        isLoading: false,
        chatInitialized: action.payload.chatInitialized || false,
        authType: action.payload.authType || "legacy",
      };

    case "LOGIN_FAILURE":
      return {
        ...state,
        user: null,
        isAuthenticated: false,
        isLoading: false,
        chatInitialized: false,
        authType: null,
      };

    case "LOGOUT":
      return {
        ...state,
        user: null,
        isAuthenticated: false,
        isLoading: false,
        chatInitialized: false,
        authType: null,
      };

    case "UPDATE_USER":
      return {
        ...state,
        user: { ...state.user, ...action.payload },
      };

    case "SET_CHAT_INITIALIZED":
      return {
        ...state,
        chatInitialized: action.payload,
      };

    case "STOP_LOADING":
      return { ...state, isLoading: false };

    default:
      return state;
  }
}

export function AuthProvider({ children }) {
  const [state, dispatch] = useReducer(authReducer, initialState);

  const isInitialMount = useRef(true);
  const hasCheckedAuth = useRef(false);

  /**
   * Fire-and-forget push token sync.
   * This should NOT block login.
   */
  const syncPushTokenNonBlocking = useCallback(() => {
    initPushNotifications(async (fcmToken) => {
      try {
        const platform = Capacitor.getPlatform();
        await notificationService.sendFcmToken({
          token: fcmToken,
          platform,
        });
      } catch (err) {
        console.warn("FCM sync failed (non-blocking):", err);
      }
    });
  }, []);

  /**
   * ✅ Firebase login entry: update state only.
   * Token storage is owned by services:
   * - authService.storeFirebaseAuthData(sessionData) stores user/authType (and may store platform tokens if any)
   * - chatAuthService.storeTokens(sessionData) stores chat_token + refresh
   */
  const loginWithFirebase = useCallback(
    async (sessionData) => {
      try {
        const user = sessionData?.user;
        if (!user) throw new Error("Invalid session data (missing user)");

        // 1) Store user/authType ONLY via authService (single place for user/authType)
        authService.storeFirebaseAuthData(sessionData);

        // 2) Store chat tokens ONLY via chatAuthService (single source of truth)
        chatAuthService.storeTokens(sessionData);

        // 3) Fire-and-forget push sync
        syncPushTokenNonBlocking();

        // 4) Update state
        dispatch({
          type: "LOGIN_SUCCESS",
          payload: {
            user,
            chatInitialized: !!chatAuthService.getChatToken(),
            authType: "firebase",
          },
        });

        return true;
      } catch (error) {
        console.error("Firebase login failed:", error);
        dispatch({ type: "LOGIN_FAILURE" });
        return false;
      }
    },
    [syncPushTokenNonBlocking]
  );

  /**
   * ✅ Legacy login entry: update state only.
   * We still store platform authToken + userData here (legacy),
   * but chat tokens are stored ONLY by chatAuthService to avoid duplication.
   */
  const login = useCallback(
    async (responseData) => {
      try {
        const user = responseData?.user;
        const platformToken = responseData?.tokens?.platform;

        if (!user || !platformToken) {
          throw new Error("Invalid login response (missing user/platform token)");
        }

        // Legacy platform auth
        localStorage.setItem("authToken", platformToken);
        localStorage.setItem("userData", JSON.stringify(user));
        localStorage.setItem("authType", "legacy");

        // Chat tokens stored in ONE place only
        chatAuthService.storeTokens(responseData);

        // Push sync
        syncPushTokenNonBlocking();

        dispatch({
          type: "LOGIN_SUCCESS",
          payload: {
            user,
            chatInitialized: !!chatAuthService.getChatToken(),
            authType: "legacy",
          },
        });

        return true;
      } catch (err) {
        console.error("Legacy login failed:", err);
        dispatch({ type: "LOGIN_FAILURE" });
        return false;
      }
    },
    [syncPushTokenNonBlocking]
  );

  /**
   * Logout
   */
  const logout = useCallback(async () => {
    try {
      const authType = localStorage.getItem("authType");

      // Clear platform + user
      localStorage.removeItem("authToken");
      localStorage.removeItem("userData");
      localStorage.removeItem("authType");

      // Clear chat tokens in ONE place
      chatAuthService.clearAllTokens();

      // Firebase signout if needed
      if (authType === "firebase") {
        try {
          await firebaseAuthService.signOut();
        } catch (firebaseError) {
          console.warn("Firebase sign out failed:", firebaseError);
        }
      }

      dispatch({ type: "LOGOUT" });
      window.location.href = "/login";
    } catch (error) {
      console.error("Logout error:", error);
      dispatch({ type: "LOGOUT" });
      window.location.href = "/login";
    }
  }, []);

  /**
   * Update user profile in state + storage
   */
  const updateUser = useCallback(
    (userData) => {
      const currentUser = state.user;
      if (!currentUser) return;

      const updatedUser = { ...currentUser, ...userData };
      dispatch({ type: "UPDATE_USER", payload: userData });

      localStorage.setItem("userData", JSON.stringify(updatedUser));
    },
    [state.user]
  );

  /**
   * Check existing auth on app load
   */
  useEffect(() => {
    if (hasCheckedAuth.current) return;

    const checkAuth = async () => {
      try {
        // 0) Handle Firebase redirect result first
        try {
          const redirectResult = await authService.handleGoogleRedirect();
          if (redirectResult) {
            // Store user/authType (and fix any token storage inside authService)
            authService.storeFirebaseAuthData(redirectResult);

            // Store chat tokens in ONE place
            chatAuthService.storeTokens(redirectResult);

            dispatch({
              type: "LOGIN_SUCCESS",
              payload: {
                user: redirectResult.user,
                chatInitialized: !!chatAuthService.getChatToken(),
                authType: "firebase",
              },
            });

            hasCheckedAuth.current = true;
            return;
          }
        } catch {
          // no redirect result
        }

        const authType = localStorage.getItem("authType");
        const userDataRaw = localStorage.getItem("userData");

        // 1) Firebase session (if marked firebase)
        if (authType === "firebase" && userDataRaw) {
          if (firebaseAuthService.isSignedIn()) {
            try {
              const user = JSON.parse(userDataRaw);
              dispatch({
                type: "LOGIN_SUCCESS",
                payload: {
                  user,
                  chatInitialized: !!chatAuthService.getChatToken(),
                  authType: "firebase",
                },
              });
              hasCheckedAuth.current = true;
              return;
            } catch {
              localStorage.removeItem("userData");
            }
          } else {
            // Firebase not signed in anymore → clear
            authService.clearAuthData?.();
            chatAuthService.clearAllTokens();
          }
        }

        // 2) Legacy JWT auth
        const legacyToken = localStorage.getItem("authToken");
        if (legacyToken && userDataRaw) {
          try {
            const user = JSON.parse(userDataRaw);
            dispatch({
              type: "LOGIN_SUCCESS",
              payload: {
                user,
                chatInitialized: !!chatAuthService.getChatToken(),
                authType: "legacy",
              },
            });
            hasCheckedAuth.current = true;
            return;
          } catch {
            localStorage.removeItem("userData");
          }
        }

        dispatch({ type: "STOP_LOADING" });
        hasCheckedAuth.current = true;
      } catch {
        dispatch({ type: "STOP_LOADING" });
        hasCheckedAuth.current = true;
      }
    };

    // Small delay on first mount
    if (isInitialMount.current) {
      const timer = setTimeout(() => {
        checkAuth();
        isInitialMount.current = false;
      }, 500);

      return () => clearTimeout(timer);
    }

    checkAuth();
  }, []);

  /**
   * Listen for chat token expiration (emitted by chat axios interceptor)
   */
  useEffect(() => {
    const handleChatTokenExpired = () => {
      if (!state.isAuthenticated) return;

      // Clear chat tokens in ONE place
      chatAuthService.clearChatTokens();

      // Update state only
      dispatch({ type: "SET_CHAT_INITIALIZED", payload: false });
    };

    window.addEventListener("chat-token-expired", handleChatTokenExpired);
    return () => {
      window.removeEventListener("chat-token-expired", handleChatTokenExpired);
    };
  }, [state.isAuthenticated]);

  const value = {
    user: state.user,
    isAuthenticated: state.isAuthenticated,
    isLoading: state.isLoading,
    chatInitialized: state.chatInitialized,
    authType: state.authType,
    login,
    loginWithFirebase,
    logout,
    updateUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
