import React, { createContext, useContext, useReducer, useEffect } from 'react';
import { authService } from '../services/authService';
import { paymentService } from '../services/paymentService';

const AuthContext = createContext();

const initialState = {
  user: null,
  isAuthenticated: false,
  isLoading: true,
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
      };
    case 'LOGIN_FAILURE':
      return {
        ...state,
        user: null,
        isAuthenticated: false,
        isLoading: false,
      };
    case 'LOGOUT':
      return {
        ...state,
        user: null,
        isAuthenticated: false,
        isLoading: false,
      };
    case 'UPDATE_USER':
      return {
        ...state,
        user: { ...state.user, ...action.payload },
      };
    case 'STOP_LOADING':
      return { ...state, isLoading: false };
    default:
      return state;
  }
}

export function AuthProvider({ children }) {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // Check existing token on app load
  useEffect(() => {
  const token = localStorage.getItem('authToken');
  
  if (token) {
    // Verify the token is still valid by fetching user profile and wallet balance
    Promise.all([authService.getProfile(), paymentService.getWalletBalance()])
      .then(([profileResponse, walletResponse]) => {
        const userData = {
          ...profileResponse.user,
          wallet_balance: walletResponse.balance
        };
        
        dispatch({
          type: 'LOGIN_SUCCESS',
          payload: { user: userData },
        });
      })
      .catch(error => {
        console.error('Token validation failed:', error);
        localStorage.removeItem('authToken');
        dispatch({ type: 'LOGIN_FAILURE' });
      });
  } else {
    dispatch({ type: 'STOP_LOADING' });
  }
}, []);

  // Login
  const login = (userData, token) => {
    localStorage.setItem('authToken', token);
    dispatch({ type: 'LOGIN_SUCCESS', payload: { user: userData } });
  };

  // Logout
  const logout = () => {
    localStorage.removeItem('authToken');
    dispatch({ type: 'LOGOUT' });
  };

  // Update user details
  const updateUser = (userData) => {
    dispatch({ type: 'UPDATE_USER', payload: userData });
  };

  // Update only wallet balance
  const updateWalletBalance = (newBalance) => {
    if (state.user) {
      dispatch({
        type: 'UPDATE_USER',
        payload: { wallet_balance: parseFloat(newBalance).toFixed(2) },
      });
    }
  };

  const value = {
    ...state,
    login,
    logout,
    updateUser,
    updateWalletBalance,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
