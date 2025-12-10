import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'
import { AuthProvider } from './contexts/AuthContext'
import { NotificationProvider } from './contexts/NotificationContext';

import { ChatProvider } from './contexts/ChatContext';
import { ThemeProvider } from './contexts/ThemeContext'

// Service Worker Registration with better error handling
function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      const swUrl = '/sw.js';
      
      navigator.serviceWorker
        .register(swUrl)
        .then((registration) => {
          console.log('Service Worker registered with scope:', registration.scope);
          
          // Check for updates periodically
          setInterval(() => {
            registration.update();
          }, 60 * 60 * 1000); // Check every hour
          
          // Handle controller change (new service worker activated)
          navigator.serviceWorker.addEventListener('controllerchange', () => {
            console.log('New service worker activated');
            // Optionally reload the page
            window.location.reload();
          });
        })
        .catch((error) => {
          console.error('Service Worker registration failed:', error);
        });
    });
  }
}

// Call this function in your main app entry
registerServiceWorker();

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AuthProvider>
      <ChatProvider>
        <NotificationProvider>
          <ThemeProvider>
            <App />
          </ThemeProvider>
        </NotificationProvider>
      </ChatProvider>
    </AuthProvider>
  </React.StrictMode>,
)