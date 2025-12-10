// hooks/useRoutePreload.js
import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

export function useRoutePreload() {
  const location = useLocation();
  
  useEffect(() => {
    // Preload likely next routes based on current location
    const preloadMap = {
      '/dashboard': ['/tournaments', '/notifications'],
      '/tournaments': ['/create-tournament', '/my-tournaments'],
      '/wallet': ['/deposit', '/transactions'],
    };
    
    const routesToPreload = preloadMap[location.pathname] || [];
    
    routesToPreload.forEach(route => {
      // Dynamically import based on route
      switch(route) {
        case '/tournaments':
          import('../pages/Tournaments/Tournaments');
          break;
        case '/notifications':
          import('../pages/Notifications');
          break;
        // Add more cases as needed
      }
    });
  }, [location.pathname]);
}