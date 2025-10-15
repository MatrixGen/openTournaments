import React, { createContext, useContext, useReducer, useEffect } from 'react';
import { authService } from '../services/authService';
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

  // Initialize chat authentication when user logs in
  const initializeChatForUser = async (userData, password) => {
    try {
      await chatAuthService.ensureChatAuth(userData, password);
      dispatch({ type: 'SET_CHAT_INITIALIZED', payload: true });
      return true;
    } catch (error) {
      console.error('Failed to initialize chat system:', error);
      dispatch({ type: 'SET_CHAT_INITIALIZED', payload: false });
      return false;
    }
  };

  // Login function - now includes chat initialization
  const login = async (userData, token, password) => {
  localStorage.setItem('authToken', token);
  localStorage.setItem('userData', JSON.stringify(userData));

  dispatch({ 
    type: 'LOGIN_SUCCESS', 
    payload: { user: userData, chatInitialized: false } 
  });

  // Initialize chat auth properly
  try {
    console.log('Initializing chat authentication...');
    await chatAuthService.ensureChatAuth(userData, password);
    console.log('✅ Chat system authentication successful');

    // Now mark chat as initialized
    dispatch({ type: 'SET_CHAT_INITIALIZED', payload: true });
  } catch (err) {
    console.error('❌ Chat system initialization failed:', err);
  }
};

  // Logout function - includes chat logout
  const logout = () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('userData');
    chatAuthService.chatLogout();
    dispatch({ type: 'LOGOUT' });
  };

  // Check existing authentication on app load
  useEffect(() => {
    const token = localStorage.getItem('authToken');
    const userData = localStorage.getItem('userData');

    if (token && userData) {
      // Validate the main app token
      authService.getProfile()
        .then(response => {
          const user = response.user;
          dispatch({ 
            type: 'LOGIN_SUCCESS', 
            payload: { 
              user,
              chatInitialized: chatAuthService.isChatAuthenticated()
            } 
          });

          // Try to refresh chat auth in background
          if (chatAuthService.isChatAuthenticated()) {
            chatAuthService.refreshChatToken().catch(error => {
              console.log('Background chat token refresh failed, will reinitialize when needed');
            });
          }
        })
        .catch(error => {
          console.error('Token validation failed:', error);
          logout();
        });
    } else {
      dispatch({ type: 'STOP_LOADING' });
    }
  }, []);

  const updateUser = (userData) => {
    dispatch({ type: 'UPDATE_USER', payload: userData });
  };

  const value = {
    ...state,
    login,
    logout,
    updateUser,
    initializeChatForUser,
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