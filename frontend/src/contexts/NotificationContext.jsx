
import React, { createContext, useContext, useReducer } from 'react';
import websocketService from '../services/websocketService';

const NotificationContext = createContext();

const initialState = {
  notifications: [],
  unreadCount: 0
};

function notificationReducer(state, action) {
  switch (action.type) {
    case 'ADD_NOTIFICATION':
      return {
        ...state,
        notifications: [action.payload, ...state.notifications],
        unreadCount: state.unreadCount + 1
      };
    case 'MARK_AS_READ':
      return {
        ...state,
        notifications: state.notifications.map(n => 
          n.id === action.payload ? { ...n, is_read: true } : n
        ),
        unreadCount: Math.max(0, state.unreadCount - 1)
      };
    case 'MARK_ALL_READ':
      return {
        ...state,
        notifications: state.notifications.map(n => ({ ...n, is_read: true })),
        unreadCount: 0
      };
    case 'SET_NOTIFICATIONS':
      return {
        notifications: action.payload.notifications,
        unreadCount: action.payload.unreadCount
      };
    default:
      return state;
  }
}

export function NotificationProvider({ children }) {
  const [state, dispatch] = useReducer(notificationReducer, initialState);

  // Subscribe to WebSocket notifications
  React.useEffect(() => {
    const unsubscribe = websocketService.subscribe('notification', (data) => {
      dispatch({ type: 'ADD_NOTIFICATION', payload: data });
    });
    
    return unsubscribe;
  }, []);

  const markAsRead = (id) => {
    dispatch({ type: 'MARK_AS_READ', payload: id });
  };

  const markAllAsRead = () => {
    dispatch({ type: 'MARK_ALL_READ' });
  };

  const value = {
    ...state,
    markAsRead,
    markAllAsRead
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
}