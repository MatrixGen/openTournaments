import React, { createContext, useContext, useReducer, useEffect, useCallback, useRef } from 'react';
import chatAuthService from '../services/chatAuthService';

const AuthContext = createContext();

const initialState = {
  user: null,
  isAuthenticated: false,
  isLoading: true,
  chatInitialized: false,
};

function authReducer(state, action) {
  switch (action.type) {
    case 'LOGIN_START':
      return { ...state, isLoading: true };
    case 'LOGIN_SUCCESS':
      return {
        ...state,
        user: action.payload.user,
        isAuthenticated: true,
        isLoading: false,
        chatInitialized: action.payload.chatInitialized || false,
      };
    case 'LOGIN_FAILURE':
      return {
        ...state,
        user: null,
        isAuthenticated: false,
        isLoading: false,
        chatInitialized: false,
      };
    case 'LOGOUT':
      return {
        ...state,
        user: null,
        isAuthenticated: false,
        isLoading: false,
        chatInitialized: false,
      };
    case 'UPDATE_USER':
      return {
        ...state,
        user: { ...state.user, ...action.payload },
      };
    case 'SET_CHAT_INITIALIZED':
      return {
        ...state,
        chatInitialized: action.payload,
      };
    case 'STOP_LOADING':
      return { ...state, isLoading: false };
    default:
      return state;
  }
}

export function AuthProvider({ children }) {
  const [state, dispatch] = useReducer(authReducer, initialState);
  const isInitialMount = useRef(true);
  const hasCheckedAuth = useRef(false);

  // Login function - updated for new response structure
  const login = useCallback(async (responseData) => {
    try {
      // Extract user and tokens from response
      // Your backend now returns: { message, tokens: { platform, chat, chatRefresh }, user }
      const user = responseData.user;
      const platformToken = responseData.tokens?.platform;
      const chatToken = responseData.tokens?.chat;
      const chatRefreshToken = responseData.tokens?.chatRefresh;

      //console.log('current user:',user);
      

      if (!user || !platformToken) {
        throw new Error('Invalid login response');
      }

      // Store platform authentication data
      localStorage.setItem('authToken', platformToken);
      localStorage.setItem('userData', JSON.stringify(user));

      // Store chat tokens if provided
      if (chatToken) {
        localStorage.setItem('chat_token', chatToken);
      }
      if (chatRefreshToken) {
        localStorage.setItem('chat_refresh_token', chatRefreshToken);
      }

      // Update auth state
      dispatch({ 
        type: 'LOGIN_SUCCESS', 
        payload: { 
          user, 
          chatInitialized: !!chatToken // Chat is initialized if we have a chat token
        } 
      });

      return true;
    } catch  {
      dispatch({ type: 'LOGIN_FAILURE' });
      return false;
    }
  }, []);

  // Logout function
  const logout = useCallback(() => {
    try {
      // Clear all authentication data
      localStorage.removeItem('authToken');
      localStorage.removeItem('userData');
      localStorage.removeItem('chat_token');
      localStorage.removeItem('chat_refresh_token');

      // Clear chatAuthService tokens
      chatAuthService.clearAllTokens();

      // Dispatch logout
      dispatch({ type: 'LOGOUT' });

      // Redirect to login page
      window.location.href = '/login';
    } catch  {
      // error handling left blank as per request
    }
  }, []);

  // Update user profile
  const updateUser = useCallback((userData) => {
    const currentUser = state.user;
    if (!currentUser) return;

    const updatedUser = { ...currentUser, ...userData };
    dispatch({ type: 'UPDATE_USER', payload: userData });

    // Update localStorage
    localStorage.setItem('userData', JSON.stringify(updatedUser));
  }, [state.user]);

  // Check existing authentication on app load
  useEffect(() => {
    // Skip if we've already checked auth
    if (hasCheckedAuth.current) {
      return;
    }

    const checkAuth = () => {
      try {
        const token = localStorage.getItem('authToken');
        const userData = localStorage.getItem('userData');
        const chatToken = localStorage.getItem('chat_token');
        
        if (token && userData) {
          try {
            const user = JSON.parse(userData);
            
            dispatch({ 
              type: 'LOGIN_SUCCESS', 
              payload: { 
                user,
                chatInitialized: !!chatToken // Chat initialized if we have a chat token
              } 
            });
            
            hasCheckedAuth.current = true;
            return;
          } catch  {
            localStorage.removeItem('userData');
          }
        }
        
        dispatch({ type: 'STOP_LOADING' });
        hasCheckedAuth.current = true;
        
      } catch  {
        dispatch({ type: 'STOP_LOADING' });
        hasCheckedAuth.current = true;
      }
    };

    // Add a small delay on first mount
    if (isInitialMount.current) {
      const timer = setTimeout(() => {
        checkAuth();
        isInitialMount.current = false;
      }, 500);
      
      return () => clearTimeout(timer);
    } else {
      checkAuth();
    }
  }, []); // Empty dependency array - runs only once

  // Listen for chat token expiration
  useEffect(() => {
    const handleChatTokenExpired = () => {
      if (state.isAuthenticated) {
        // Only clear chat tokens, keep platform auth
        localStorage.removeItem('chat_token');
        localStorage.removeItem('chat_refresh_token');
        
        // Update state to reflect chat is no longer initialized
        dispatch({ type: 'SET_CHAT_INITIALIZED', payload: false });
      }
    };

    window.addEventListener('chat-token-expired', handleChatTokenExpired);
    
    return () => {
      window.removeEventListener('chat-token-expired', handleChatTokenExpired);
    };
  }, [state.isAuthenticated]);

  // Debug: Log state changes (REMOVED)
  // useEffect(() => { ... }, [state]);

  const value = {
    user: state.user,
    isAuthenticated: state.isAuthenticated,
    isLoading: state.isLoading,
    chatInitialized: state.chatInitialized,
    login,
    logout,
    updateUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}