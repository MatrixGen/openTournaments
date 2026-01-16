import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useState, useEffect, useMemo } from 'react';
import { notificationService } from '../../services/notificationService';

export default function MobileBottomNav() {
  const location = useLocation();
  const { user, isAuthenticated } = useAuth();
  const [isVisible, setIsVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);
  const [unreadNotifications, setUnreadNotifications] = useState(0);

  useEffect(() => {
      if (isAuthenticated) {
        const loadUnreadCount = async () => {
          try {
            const response = await notificationService.getUnreadCount();
            setUnreadNotifications(response.count || 0);
          } catch (err) {
            console.error('Failed to load notification count:', err);
          }
        };
        loadUnreadCount();
      }
    }, [isAuthenticated]);

  // Memoize navigation items to prevent unnecessary recreations
  const navigationItems = useMemo(() => [
    {
      name: 'Home',
      href: '/',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      ),
      activeIcon: (
        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
          <path d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      )
    },
    {
      name: 'Tournaments',
      href: '/tournaments',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
        </svg>
      ),
      activeIcon: (
        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
          <path d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
        </svg>
      )
    },
    {
      name: 'MyTournaments',
      href: '/my-tournaments',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      activeIcon: (
        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
          <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      )
    },
    {
      name: 'Squads',
      href: '/squads',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
      ),
      activeIcon: (
        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
          <path d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
      ),
     // badge:`${unreadNotifications}` 
    },
    {
      name: 'Discover',
      href: `/users`,
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      ),
      activeIcon: (
        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
          <path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      )
    },
  ], [user?.id,unreadNotifications]);

  // Calculate active index based on current location
  const activeIndex = useMemo(() => {
    return navigationItems.findIndex(item => {
      if (item.href === '/') {
        return location.pathname === '/';
      }
      return location.pathname.startsWith(item.href);
    });
  }, [location.pathname, navigationItems]);

  // Hide nav on scroll down, show on scroll up
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      
      if (currentScrollY > lastScrollY && currentScrollY > 100) {
        setIsVisible(false);
      } else if (currentScrollY < lastScrollY) {
        setIsVisible(true);
      }
      
      setLastScrollY(currentScrollY);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [lastScrollY]);

  // Check if a path is active
  const isActive = (path) => {
    if (path === '/') {
      return location.pathname === '/';
    }
    return location.pathname.startsWith(path);
  };

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className={`
      md:hidden fixed bottom-0 left-4 right-4 z-50
      transition-all duration-300 ease-in-out
      ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0'}
    `}>
      {/* Background with glass morphism effect */}
      <div className="
        bg-white/90 dark:bg-neutral-900/90
        backdrop-blur-xl
        rounded-2xl
        border border-white/20 dark:border-neutral-700/50
        shadow-2xl shadow-black/20
      ">
        <div className="flex justify-around items-center p-1">
          {navigationItems.map((item, index) => {
            const active = index === activeIndex;
            
            return (
              <Link
                key={item.name}
                to={item.href}
                className={`
                  relative flex flex-col items-center justify-center
                  w-full py-3 px-2 rounded-xl
                  transition-all duration-300 ease-out
                  transform hover:scale-105 active:scale-95
                  ${active 
                    ? 'text-blue-600 dark:text-blue-400 bg-white/50 dark:bg-neutral-800/50 shadow-lg' 
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-900 dark:text-white'
                  }
                `}
              >
                {/* Active indicator dot */}
                {active && (
                  <div className="
                    absolute -top-1 w-1.5 h-1.5
                    bg-blue-500 rounded-full
                    animate-pulse
                  " />
                )}
                
                <div className="relative">
                  {/* Icon with smooth transition */}
                  <div className={`
                    transition-all duration-300 ease-out
                    ${active ? 'scale-110' : 'scale-100'}
                  `}>
                    {active ? item.activeIcon : item.icon}
                  </div>
                  
                  {/* Badge with animation */}
                  {item.badge > 0 && (
                    <span className={`
                      absolute -top-2 -right-2
                      min-w-5 h-5 px-1
                      bg-red-500 text-gray-900 dark:text-white
                      rounded-full text-xs
                      flex items-center justify-center
                      font-semibold
                      transition-all duration-300 ease-out
                      ${active ? 'scale-110' : 'scale-100'}
                      animate-pulse
                    `}>
                      {item.badge > 9 ? '9+' : item.badge}
                    </span>
                  )}
                </div>
                
                {/* Label with smooth animation */}
                <span className={`
                  text-xs font-medium mt-1
                  transition-all duration-300 ease-out
                  ${active ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-1 absolute'}
                `}>
                  {item.name}
                </span>
                
                {/* Hover effect */}
                <div className={`
                  absolute inset-0 rounded-xl
                  bg-gradient-to-r from-blue-500/10 to-purple-500/10
                  opacity-0 hover:opacity-100
                  transition-opacity duration-300
                  pointer-events-none
                `} />
              </Link>
            );
          })}
        </div>
        
        {/* Floating indicator */}
        <div 
          className="
            absolute bottom-1
            h-0.5 bg-blue-500 rounded-full
            transition-all duration-500 ease-out
            shadow-lg shadow-blue-500/50
          "
          style={{
            width: `${100 / navigationItems.length}%`,
            transform: `translateX(${activeIndex * 100}%)`
          }}
        />
      </div>
      
      {/* Safe area spacer for iOS */}
      <div className="h-4" />
    </div>
  );
}
