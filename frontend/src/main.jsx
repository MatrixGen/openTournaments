import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'
import { AuthProvider } from './contexts/AuthContext'
import { NotificationProvider } from './contexts/NotificationContext';

import { ChatProvider } from './contexts/ChatContext';


ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AuthProvider>
      <ChatProvider>
        <NotificationProvider>
          <App />
        </NotificationProvider>
      </ChatProvider>
    </AuthProvider>
  </React.StrictMode>,
)