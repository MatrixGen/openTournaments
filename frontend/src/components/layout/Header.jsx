import { Fragment, useEffect, useState, useRef } from 'react';
import { Popover, Transition } from '@headlessui/react';
import { Bars3Icon, XMarkIcon } from '@heroicons/react/24/outline';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext'; // Import the useTheme hook
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Bell,
  Trophy,
  LayoutGrid,
  User,
  LogOut,
  Settings,
  Wallet,
  Crown,
  Sparkles,
  Zap,
  CircleHelp,
  Home,
  ChevronRight,
  Shield,
  CreditCard,
  Sun,
  Moon
} from 'lucide-react';
import { notificationService } from '../../services/notificationService';

const navigation = [
  { name: 'Browse Matches', href: '/browse-matches', icon: LayoutGrid, color: 'from-blue-600 to-indigo-600' },
  { name: 'My Tournaments', href: '/my-tournaments', icon: Crown, color: 'from-amber-600 to-orange-600' },
];

export default function Header() {
  const { user, isAuthenticated, logout } = useAuth();
  const { theme, toggleTheme } = useTheme(); // Get theme and toggle function from context
  
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const headerRef = useRef(null);
  const menuPanelRef = useRef(null);

  // Theme-based classes - Now using context theme
  const isDarkTheme = theme === 'dark';
  
  const headerBgClass = isDarkTheme
    ? isScrolled
      ? 'bg-gray-900/95 backdrop-blur-md border-gray-800'
      : 'bg-gray-900 border-transparent'
    : isScrolled
      ? 'bg-white/95 backdrop-blur-md border-gray-200'
      : 'bg-white border-transparent';
  
  const textColor = isDarkTheme ? 'text-gray-100' : 'text-gray-900';
  const subTextColor = isDarkTheme ? 'text-gray-400' : 'text-gray-600';
  const hoverBgClass = isDarkTheme ? 'hover:bg-gray-800' : 'hover:bg-gray-50';
  const borderClass = isDarkTheme ? 'border-gray-800' : 'border-gray-200';

  // Prevent body scroll when menu is open
  useEffect(() => {
    if (isMenuOpen) {
      // Save current scroll position
      const scrollY = window.scrollY;
      
      // Disable body scroll
      document.body.style.position = 'fixed';
      document.body.style.top = `-${scrollY}px`;
      document.body.style.width = '100%';
      document.body.style.overflow = 'hidden';
      
      return () => {
        // Re-enable body scroll
        document.body.style.position = '';
        document.body.style.top = '';
        document.body.style.width = '';
        document.body.style.overflow = '';
        window.scrollTo(0, scrollY);
      };
    }
  }, [isMenuOpen]);

  // Close menu on escape key press
  useEffect(() => {
    const handleEscapeKey = (event) => {
      if (event.key === 'Escape' && isMenuOpen) {
        setIsMenuOpen(false);
      }
    };

    document.addEventListener('keydown', handleEscapeKey);
    return () => document.removeEventListener('keydown', handleEscapeKey);
  }, [isMenuOpen]);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        isMenuOpen && 
        menuPanelRef.current && 
        !menuPanelRef.current.contains(event.target) &&
        !event.target.closest('[data-menu-button]')
      ) {
        setIsMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isMenuOpen]);

  // Scroll effect for header
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

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

  const isActiveRoute = (href) => {
    if (href === '/dashboard') return location.pathname === '/dashboard';
    return location.pathname.startsWith(href);
  };

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const handleMenuToggle = (open) => {
    setIsMenuOpen(open);
  };

  // Handle theme toggle
  const handleThemeToggle = () => {
    toggleTheme();
  };

  return (
    <Popover 
      as="header" 
      ref={headerRef}
      className={`fixed top-0 left-0 right-0 z-40 transition-all duration-300 border-b ${headerBgClass}`}

    >
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo - Simplified */}
          <div className="flex items-center">
            <Link 
              to="/dashboard" 
              className="flex items-center space-x-3 group"
            >
              <div className={`flex items-center justify-center w-9 h-9 rounded-lg ${
                isDarkTheme ? 'bg-blue-600' : 'bg-blue-600'
              }`}>
                <Trophy className="h-5 w-5 text-white" />
              </div>
              <div className="flex flex-col">
                <span className={`text-xl font-bold ${textColor}`}>
                  OT Arena
                </span>
                <span className={`text-xs ${subTextColor}`}>
                  Competitive Gaming
                </span>
              </div>
            </Link>
          </div>

          {/* Desktop Navigation - Center aligned */}
          <nav className="hidden lg:flex lg:items-center lg:space-x-1">
            {isAuthenticated &&
              navigation.map((item) => {
                const Icon = item.icon;
                const isActive = isActiveRoute(item.href);
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                      isActive
                        ? `bg-gradient-to-r ${item.color} text-white shadow-sm`
                        : `${subTextColor} hover:${textColor} ${hoverBgClass}`
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {item.name}
                  </Link>
                );
              })}
          </nav>

          {/* Desktop User Menu */}
          <div className="hidden lg:flex lg:items-center lg:space-x-2">
            {isAuthenticated ? (
              <>
                {/* Theme Toggle Button */}
                <button
                  onClick={handleThemeToggle}
                  className={`p-2 rounded-lg ${subTextColor} hover:${textColor} ${hoverBgClass} transition-colors`}
                  title={`Switch to ${isDarkTheme ? 'light' : 'dark'} mode`}
                  aria-label={`Switch to ${isDarkTheme ? 'light' : 'dark'} mode`}
                >
                  {isDarkTheme ? (
                    <Sun className="h-5 w-5" />
                  ) : (
                    <Moon className="h-5 w-5" />
                  )}
                </button>

                {/* Quick Actions */}
                <div className="flex items-center space-x-1 mr-3 border-r pr-3 border-gray-700">
                  <Link
                    to="/support"
                    className={`p-2 rounded-lg ${subTextColor} hover:${textColor} ${hoverBgClass} transition-colors`}
                    title="Support"
                  >
                    <CircleHelp className="h-5 w-5" />
                  </Link>
                  
                  <Link
                    to="/notifications"
                    className={`relative p-2 rounded-lg ${subTextColor} hover:${textColor} ${hoverBgClass} transition-colors`}
                    title="Notifications"
                  >
                    <Bell className="h-5 w-5" />
                    {unreadNotifications > 0 && (
                      <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                        {unreadNotifications > 9 ? '9+' : unreadNotifications}
                      </span>
                    )}
                  </Link>
                </div>

                {/* User Profile Dropdown */}
                <Popover className="relative">
                  <Popover.Button className={`flex items-center space-x-3 p-1 rounded-lg ${hoverBgClass} transition-all focus:outline-none`}>
                    <div className="flex items-center space-x-3">
                      <div className="flex items-center justify-center w-8 h-8 bg-blue-600 rounded-full">
                        <span className="text-sm font-semibold text-white">
                          {user?.username?.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div className="text-left">
                        <p className={`text-sm font-medium ${textColor}`}>
                          {user?.username}
                        </p>
                        <p className={`text-xs ${subTextColor}`}>
                          ${user?.wallet_balance || '0.00'}
                        </p>
                      </div>
                    </div>
                  </Popover.Button>

                  <Transition
                    as={Fragment}
                    enter="transition ease-out duration-100"
                    enterFrom="opacity-0 scale-95"
                    enterTo="opacity-100 scale-100"
                    leave="transition ease-in duration-75"
                    leaveFrom="opacity-100 scale-100"
                    leaveTo="opacity-0 scale-95"
                  >
                    <Popover.Panel className={`absolute right-0 mt-2 w-64 rounded-lg border shadow-lg z-50 ${
                      isDarkTheme 
                        ? 'bg-gray-800 border-gray-700' 
                        : 'bg-white border-gray-200'
                    }`}>
                      {/* User Info */}
                      <div className="p-4 border-b border-gray-700">
                        <div className="flex items-center space-x-3">
                          <div className="flex items-center justify-center w-10 h-10 bg-blue-600 rounded-lg">
                            <span className="text-base font-bold text-white">
                              {user?.username?.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm font-semibold ${textColor} truncate`}>
                              {user?.username}
                            </p>
                            <p className={`text-xs ${subTextColor} truncate`}>
                              {user?.email}
                            </p>
                          </div>
                        </div>
                      </div>
                      
                      {/* Menu Items */}
                      <div className="p-2">
                        <Link
                          to="/dashboard"
                          className={`flex items-center justify-between px-3 py-2 rounded-lg text-sm ${
                            isDarkTheme ? 'text-gray-300 hover:text-white' : 'text-gray-700 hover:text-gray-900'
                          } ${hoverBgClass} transition-colors`}
                        >
                          <div className="flex items-center gap-3">
                            <Home className="h-4 w-4 text-gray-500" />
                            <span>Dashboard</span>
                          </div>
                          <ChevronRight className="h-4 w-4 text-gray-500" />
                        </Link>
                        
                        {[
                          { icon: User, label: 'My Profile', href: '/my-profile' },
                          { icon: CreditCard, label: 'Wallet', href: '/wallet' },
                          { icon: Shield, label: 'Security', href: '/security' },
                          { icon: Settings, label: 'Settings', href: '/settings' },
                        ].map((item) => (
                          <Link
                            key={item.label}
                            to={item.href}
                            className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm ${
                              isDarkTheme ? 'text-gray-300 hover:text-white' : 'text-gray-700 hover:text-gray-900'
                            } ${hoverBgClass} transition-colors`}
                          >
                            <item.icon className="h-4 w-4 text-gray-500" />
                            <span>{item.label}</span>
                          </Link>
                        ))}

                        {/* Theme Toggle in Dropdown */}
                        <button
                          onClick={handleThemeToggle}
                          className={`flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm ${
                            isDarkTheme ? 'text-gray-300 hover:text-white' : 'text-gray-700 hover:text-gray-900'
                          } ${hoverBgClass} transition-colors`}
                        >
                          {isDarkTheme ? (
                            <>
                              <Sun className="h-4 w-4 text-gray-500" />
                              <span>Light Mode</span>
                            </>
                          ) : (
                            <>
                              <Moon className="h-4 w-4 text-gray-500" />
                              <span>Dark Mode</span>
                            </>
                          )}
                        </button>
                      </div>
                      
                      {/* Logout */}
                      <div className="p-2 border-t border-gray-700">
                        <button
                          onClick={handleLogout}
                          className={`flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm ${
                            isDarkTheme ? 'text-red-400 hover:text-red-300' : 'text-red-600 hover:text-red-700'
                          } ${hoverBgClass} transition-colors`}
                        >
                          <LogOut className="h-4 w-4" />
                          <span>Sign Out</span>
                        </button>
                      </div>
                    </Popover.Panel>
                  </Transition>
                </Popover>
              </>
            ) : (
              <>
                {/* Theme Toggle for non-authenticated users */}
                <button
                  onClick={handleThemeToggle}
                  className={`p-2 rounded-lg ${subTextColor} hover:${textColor} ${hoverBgClass} transition-colors mr-2`}
                  title={`Switch to ${isDarkTheme ? 'light' : 'dark'} mode`}
                  aria-label={`Switch to ${isDarkTheme ? 'light' : 'dark'} mode`}
                >
                  {isDarkTheme ? (
                    <Sun className="h-5 w-5" />
                  ) : (
                    <Moon className="h-5 w-5" />
                  )}
                </button>

                <div className="flex items-center space-x-4">
                  <Link
                    to="/login"
                    className={`${subTextColor} hover:${textColor} font-medium transition-colors`}
                  >
                    Sign In
                  </Link>
                  <Link
                    to="/signup"
                    className={`bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors`}
                  >
                    Get Started
                  </Link>
                </div>
              </>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="flex lg:hidden items-center space-x-2">
            {isAuthenticated && (
              <>
                <Link
                  to="/support"
                  className={`p-2 rounded-lg ${subTextColor} hover:${textColor} ${hoverBgClass}`}
                >
                  <CircleHelp className="h-5 w-5" />
                </Link>
                
                <Link
                  to="/notifications"
                  className="relative p-2 rounded-lg hover:bg-red-500/10"
                >
                  <Bell className={`h-5 w-5 ${
                    isDarkTheme ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-900'
                  }`} />
                  {unreadNotifications > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-4 w-4 flex items-center justify-center">
                      {unreadNotifications > 9 ? '9+' : unreadNotifications}
                    </span>
                  )}
                </Link>
              </>
            )}
            <button
              data-menu-button
              onClick={() => handleMenuToggle(true)}
              className={`p-2 rounded-lg ${
                isDarkTheme ? 'text-gray-400 hover:text-white hover:bg-gray-800' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'
              } transition-colors`}
              aria-label="Open menu"
            >
              <Bars3Icon className="h-6 w-6" aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu - Full screen overlay */}
      <Transition
        as={Fragment}
        show={isMenuOpen}
        enter="transition ease-out duration-300"
        enterFrom="opacity-0"
        enterTo="opacity-100"
        leave="transition ease-in duration-200"
        leaveFrom="opacity-100"
        leaveTo="opacity-0"
      >
        <div className="fixed inset-0 z-50 lg:hidden">
          {/* Backdrop - Click outside to close */}
          <div 
            className="fixed inset-0 bg-black/50 transition-opacity"
            onClick={() => handleMenuToggle(false)}
            aria-hidden="true"
          />
          
          {/* Menu Panel */}
          <div 
            ref={menuPanelRef}
            className="fixed inset-y-0 right-0 w-full max-w-xs transform transition-transform duration-300 ease-out"
          >
            <div className={`h-full w-full flex flex-col shadow-2xl ${
              isDarkTheme ? 'bg-gray-900' : 'bg-white'
            }`}>
              {/* Header */}
              <div className={`flex items-center justify-between p-6 border-b ${
                isDarkTheme ? 'border-gray-800' : 'border-gray-200'
              }`}>
                <div className="flex items-center space-x-3">
                  <div className={`flex items-center justify-center w-9 h-9 rounded-lg ${
                    isDarkTheme ? 'bg-blue-600' : 'bg-blue-600'
                  }`}>
                    <Trophy className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <div className={`text-lg font-bold ${textColor}`}>
                      OT Arena
                    </div>
                    <div className={`text-xs ${subTextColor}`}>
                      Competitive Gaming
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => handleMenuToggle(false)}
                  className={`p-2 rounded-lg ${
                    isDarkTheme ? 'text-gray-400 hover:text-white hover:bg-gray-800' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'
                  } transition-colors`}
                  aria-label="Close menu"
                >
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>

              {/* Scrollable Content */}
              <div className="flex-1 overflow-y-auto py-6 px-4">
                {/* User Info */}
                {isAuthenticated && (
                  <div className={`flex items-center space-x-3 p-4 mb-6 rounded-lg ${
                    isDarkTheme ? 'bg-gray-800' : 'bg-gray-50'
                  }`}>
                    <div className="flex items-center justify-center w-12 h-12 bg-blue-600 rounded-full">
                      <span className="text-base font-bold text-white">
                        {user?.username?.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div className="flex-1">
                      <div className={`font-semibold ${textColor}`}>
                        {user?.username}
                      </div>
                      <div className={`text-sm ${subTextColor}`}>
                        ${user?.wallet_balance || '0.00'} balance
                      </div>
                    </div>
                  </div>
                )}

                {/* Main Navigation */}
                <div className="mb-6">
                  <div className={`text-xs font-semibold uppercase tracking-wider ${subTextColor} mb-3 px-3`}>
                    Navigation
                  </div>
                  <div className="space-y-1">
                    {navigation.map((item) => {
                      const Icon = item.icon;
                      const isActive = isActiveRoute(item.href);
                      return (
                        <Link
                          key={item.name}
                          to={item.href}
                          onClick={() => handleMenuToggle(false)}
                          className={`flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium ${
                            isActive
                              ? 'bg-blue-50 text-blue-700 border-l-4 border-blue-600'
                              : `${subTextColor} hover:${textColor} ${hoverBgClass}`
                          } transition-colors`}
                        >
                          <Icon className="h-5 w-5" />
                          {item.name}
                        </Link>
                      );
                    })}
                  </div>
                </div>

                {/* Theme Toggle in Mobile Menu */}
                <div className="mb-6">
                  <div className={`text-xs font-semibold uppercase tracking-wider ${subTextColor} mb-3 px-3`}>
                    Appearance
                  </div>
                  <button
                    onClick={() => {
                      handleThemeToggle();
                      handleMenuToggle(false);
                    }}
                    className={`flex items-center gap-3 w-full px-3 py-3 rounded-lg text-sm ${
                      isDarkTheme ? 'text-gray-300 hover:text-white' : 'text-gray-700 hover:text-gray-900'
                    } ${hoverBgClass} transition-colors`}
                  >
                    {isDarkTheme ? (
                      <>
                        <Sun className="h-5 w-5 text-gray-500" />
                        <span>Switch to Light Mode</span>
                      </>
                    ) : (
                      <>
                        <Moon className="h-5 w-5 text-gray-500" />
                        <span>Switch to Dark Mode</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Account Links */}
                {isAuthenticated ? (
                  <div className="mb-6">
                    <div className={`text-xs font-semibold uppercase tracking-wider ${subTextColor} mb-3 px-3`}>
                      Account
                    </div>
                    <div className="space-y-1">
                      {[
                        { icon: User, label: 'My Profile', href: '/my-profile' },
                        { icon: CreditCard, label: 'Wallet & Balance', href: '/wallet' },
                        { icon: Shield, label: 'Security', href: '/security' },
                        { icon: Settings, label: 'Settings', href: '/settings' },
                      ].map((item) => (
                        <Link
                          key={item.label}
                          to={item.href}
                          onClick={() => handleMenuToggle(false)}
                          className={`flex items-center gap-3 px-3 py-3 rounded-lg text-sm ${
                            isDarkTheme ? 'text-gray-300 hover:text-white' : 'text-gray-700 hover:text-gray-900'
                          } ${hoverBgClass} transition-colors`}
                        >
                          <item.icon className="h-5 w-5 text-gray-500" />
                          {item.label}
                        </Link>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3 p-3">
                    <Link
                      to="/login"
                      onClick={() => handleMenuToggle(false)}
                      className={`block w-full text-center py-3 px-4 rounded-lg border text-sm font-medium ${
                        isDarkTheme 
                          ? 'border-gray-700 text-gray-300 hover:bg-gray-800' 
                          : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                      } transition-colors`}
                    >
                      Sign In
                    </Link>
                    <Link
                      to="/signup"
                      onClick={() => handleMenuToggle(false)}
                      className="block w-full text-center bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-lg transition-colors"
                    >
                      Create Account
                    </Link>
                  </div>
                )}

                {/* Logout Button */}
                {isAuthenticated && (
                  <div className="border-t pt-6 mt-6 border-gray-700">
                    <button
                      onClick={() => {
                        handleMenuToggle(false);
                        setTimeout(() => handleLogout(), 300);
                      }}
                      className={`flex items-center gap-3 w-full px-3 py-3 rounded-lg text-sm ${
                        isDarkTheme ? 'text-red-400 hover:text-red-300' : 'text-red-600 hover:text-red-700'
                      } ${hoverBgClass} transition-colors`}
                    >
                      <LogOut className="h-5 w-5" />
                      Sign Out
                    </button>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className={`p-4 border-t ${
                isDarkTheme ? 'border-gray-800' : 'border-gray-200'
              }`}>
                <div className={`text-xs ${subTextColor} text-center`}>
                  © {new Date().getFullYear()} OT Arena. All rights reserved.
                </div>
              </div>
            </div>
          </div>
        </div>
      </Transition>
    </Popover>
  );
}