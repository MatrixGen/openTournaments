import { Fragment, useEffect, useState, useRef } from 'react';
import { Popover, Transition } from '@headlessui/react';
import { Bars3Icon, XMarkIcon } from '@heroicons/react/24/outline';
import { useAuth } from '../../contexts/AuthContext';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Bell,
  ListOrdered,
  Trophy,
  HelpCircle,
  LayoutGrid,
  User,
  LogOut,
  Settings,
  Wallet,
  MessageCircle,
  Crown,
  Sparkles,
  Search,
  Zap,
  Gamepad2
} from 'lucide-react';
import { notificationService } from '../../services/notificationService';

const navigation = [
  { name: 'Browse Matches', href: '/browse-matches', icon: LayoutGrid, color: 'from-blue-500 to-cyan-500' },
  { name: 'My Tournaments', href: '/my-tournaments', icon: Crown, color: 'from-amber-500 to-orange-500' },
];

export default function Header() {
  const { user, isAuthenticated, logout } = useAuth();
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [unreadChats, setUnreadChats] = useState(0);
  const [isScrolled, setIsScrolled] = useState(false);
  const [isHovering, setIsHovering] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const headerRef = useRef(null);

  // Scroll effect for header
  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.scrollY;
      setIsScrolled(scrollTop > 20);
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

  const toggleChatSidebar = () => {
    window.dispatchEvent(new CustomEvent('toggleChatSidebar'));
  };

  const isActiveRoute = (href) => {
    if (href === '/dashboard') return location.pathname === '/dashboard';
    return location.pathname.startsWith(href);
  };

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  return (
    <Popover 
      as="header" 
      ref={headerRef}
      className={`sticky top-0 z-50 transition-all duration-500 ease-out ${
        isScrolled 
          ? 'bg-neutral-900/95 backdrop-blur-xl border-b border-white/10 shadow-2xl shadow-black/30' 
          : 'bg-gradient-to-b from-neutral-900/80 to-transparent backdrop-blur-lg'
      }`}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
    >
      {/* Animated background effect */}
      <div className={`absolute inset-0 bg-gradient-to-r from-primary-500/5 via-purple-500/5 to-cyan-500/5 transition-opacity duration-700 ${
        isHovering ? 'opacity-100' : 'opacity-0'
      }`} />
      
      {/* Floating particles effect */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className={`absolute top-0 left-1/4 w-2 h-2 bg-primary-500/30 rounded-full blur-sm transition-all duration-1000 ${
          isHovering ? 'opacity-100 animate-pulse' : 'opacity-0'
        }`} />
        <div className={`absolute top-0 right-1/3 w-1 h-1 bg-purple-500/40 rounded-full blur-sm transition-all duration-1200 delay-200 ${
          isHovering ? 'opacity-100 animate-bounce' : 'opacity-0'
        }`} />
      </div>

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Enhanced Logo */}
          <div className="flex items-center group">
            <Link 
              to="/dashboard" 
              className="flex items-center space-x-3 transform transition-all duration-300 hover:scale-105"
            >
              <div className="relative">
                <div className="flex items-center justify-center w-10 h-10 bg-gradient-to-br from-primary-500 via-purple-600 to-cyan-500 rounded-xl shadow-lg shadow-primary-500/25 group-hover:shadow-primary-500/40 transition-all duration-500">
                  <Trophy className="h-6 w-6 text-white" />
                  <Sparkles className="absolute -top-1 -right-1 h-3 w-3 text-yellow-300 animate-pulse" />
                </div>
                <div className="absolute inset-0 bg-gradient-to-r from-primary-500 to-purple-600 rounded-xl blur opacity-75 group-hover:opacity-100 transition-opacity duration-500" />
              </div>
              <div className="flex flex-col">
                <span className="text-xl font-bold bg-gradient-to-r from-white via-gray-200 to-gray-400 bg-clip-text text-transparent">
                  OpenTournaments
                </span>
                <span className="text-xs bg-gradient-to-r from-primary-400 to-cyan-400 bg-clip-text text-transparent font-medium">
                  Competitive Gaming
                </span>
              </div>
            </Link>
          </div>

          {/* Enhanced Desktop Navigation */}
          <nav className="hidden lg:flex lg:items-center lg:space-x-2">
            {isAuthenticated &&
              navigation.map((item) => {
                const Icon = item.icon;
                const isActive = isActiveRoute(item.href);
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    className={`group relative flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300 transform hover:scale-105 ${
                      isActive
                        ? `bg-gradient-to-r ${item.color} text-white shadow-lg scale-105`
                        : 'text-gray-300 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    {/* Animated background for active state */}
                    {isActive && (
                      <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent rounded-xl blur-sm" />
                    )}
                    
                    <Icon className={`h-4 w-4 transition-transform duration-300 ${
                      isActive ? 'scale-110' : 'group-hover:scale-110'
                    }`} />
                    <span className="relative">{item.name}</span>
                    
                    {/* Hover effect */}
                    <div className={`absolute inset-0 rounded-xl bg-gradient-to-r ${item.color} opacity-0 group-hover:opacity-10 transition-opacity duration-300`} />
                  </Link>
                );
              })}
          </nav>

          {/* Enhanced Desktop User Menu */}
          <div className="hidden lg:flex lg:items-center lg:space-x-3">
            {isAuthenticated ? (
              <>
                {/* Search Button */}
                <button className="p-2.5 text-gray-400 hover:text-white transition-all duration-300 rounded-xl hover:bg-white/5 transform hover:scale-110">
                  <Search className="h-5 w-5" />
                </button>


                {/* Enhanced Notifications */}
                <Link
                  to="/notifications"
                  className="relative p-2.5 text-gray-400 hover:text-white transition-all duration-300 rounded-xl hover:bg-red-500/10 transform hover:scale-110 group"
                >
                  <Bell className="h-5 w-5 transition-transform group-hover:scale-110" />
                  {unreadNotifications > 0 && (
                    <span className="absolute -top-1 -right-1 bg-gradient-to-r from-red-500 to-pink-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center border-2 border-neutral-900 shadow-lg animate-pulse">
                      {unreadNotifications > 9 ? '9+' : unreadNotifications}
                    </span>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-r from-red-500/20 to-pink-500/20 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                </Link>

                {/* Enhanced User Menu Dropdown */}
                <Popover className="relative">
                  <Popover.Button className="flex items-center space-x-3 p-2 rounded-xl hover:bg-white/5 transition-all duration-300 transform hover:scale-105 group">
                    <div className="flex items-center space-x-3">
                      <div className="relative">
                        <div className="flex items-center justify-center w-10 h-10 bg-gradient-to-br from-primary-500 via-purple-600 to-cyan-500 rounded-full shadow-lg group-hover:shadow-primary-500/25 transition-all duration-500">
                          <span className="text-sm font-bold text-white">
                            {user?.username?.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-gradient-to-r from-green-400 to-cyan-400 rounded-full border-2 border-neutral-900 shadow-lg" />
                      </div>
                      <div className="text-left hidden sm:block">
                        <p className="text-sm font-semibold text-white flex items-center gap-1">
                          {user?.username}
                          <Zap className="h-3 w-3 text-yellow-400" />
                        </p>
                        <p className="text-xs bg-gradient-to-r from-primary-400 to-cyan-400 bg-clip-text text-transparent font-medium">
                          ${user?.wallet_balance || '0.00'} balance
                        </p>
                      </div>
                    </div>
                  </Popover.Button>

                  <Transition
                    as={Fragment}
                    enter="transition ease-out duration-300"
                    enterFrom="opacity-0 scale-95 translate-y-2"
                    enterTo="opacity-100 scale-100 translate-y-0"
                    leave="transition ease-in duration-200"
                    leaveFrom="opacity-100 scale-100 translate-y-0"
                    leaveTo="opacity-0 scale-95 translate-y-2"
                  >
                    <Popover.Panel className="absolute right-0 mt-3 w-80 rounded-2xl bg-neutral-800/95 backdrop-blur-xl border border-white/10 shadow-2xl shadow-black/50 z-50 overflow-hidden">
                      {/* Header with gradient */}
                      <div className="bg-gradient-to-r from-primary-500/20 via-purple-500/20 to-cyan-500/20 p-6 border-b border-white/10">
                        <div className="flex items-center space-x-4">
                          <div className="flex items-center justify-center w-14 h-14 bg-gradient-to-br from-primary-500 to-purple-600 rounded-xl shadow-lg">
                            <span className="text-lg font-bold text-white">
                              {user?.username?.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div className="flex-1">
                            <p className="text-lg font-bold text-white">{user?.username}</p>
                            <p className="text-sm text-gray-300">{user?.email}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <div className="px-2 py-1 bg-gradient-to-r from-primary-500/20 to-cyan-500/20 rounded-full border border-primary-500/30">
                                <span className="text-xs bg-gradient-to-r from-primary-400 to-cyan-400 bg-clip-text text-transparent font-semibold">
                                  Pro Gamer
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      {/* Menu Items */}
                      <div className="p-3">
                        {[
                          { icon: User, label: 'My Profile', href: '/my-profile' },
                          { icon: Wallet, label: 'Wallet & Balance', href: '/wallet' },
                          { icon: Settings, label: 'Settings', href: '/settings' },
                          { icon: Gamepad2, label: 'My Tournaments', href: '/my-tournaments' },
                          { icon: Crown, label: 'Achievements', href: '/achievements' },
                        ].map((item) => (
                          <Link
                            key={item.label}
                            to={item.href}
                            className="flex items-center gap-4 px-3 py-3 rounded-xl text-sm text-gray-300 hover:text-white hover:bg-white/5 transition-all duration-200 group"
                          >
                            <item.icon className="h-4 w-4 text-gray-400 group-hover:text-primary-400 transition-colors" />
                            <span>{item.label}</span>
                          </Link>
                        ))}
                      </div>
                      
                      {/* Footer with logout */}
                      <div className="p-3 border-t border-white/10">
                        <button
                          onClick={handleLogout}
                          className="flex items-center gap-4 w-full px-3 py-3 rounded-xl text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-all duration-200 group"
                        >
                          <LogOut className="h-4 w-4 transition-transform group-hover:scale-110" />
                          <span>Sign Out</span>
                        </button>
                      </div>
                    </Popover.Panel>
                  </Transition>
                </Popover>
              </>
            ) : (
              <div className="flex items-center space-x-4">
                <Link
                  to="/login"
                  className="text-gray-300 hover:text-white font-medium transition-all duration-300 hover:scale-105"
                >
                  Sign In
                </Link>
                <Link
                  to="/signup"
                  className="relative bg-gradient-to-r from-primary-500 to-purple-600 hover:from-primary-600 hover:to-purple-700 text-white font-medium py-2.5 px-6 rounded-xl transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-primary-500/25"
                >
                  <span className="relative">Get Started</span>
                  <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent rounded-xl opacity-0 hover:opacity-100 transition-opacity duration-300" />
                </Link>
              </div>
            )}
          </div>

          {/* Enhanced Mobile menu button */}
          <div className="flex lg:hidden items-center space-x-2">
            {isAuthenticated && (
              <>
                
                {/* Enhanced Mobile Notifications */}
                <Link
                  to="/notifications"
                  className="relative p-2.5 text-gray-400 hover:text-white transition-all duration-300 rounded-xl hover:bg-red-500/10 transform hover:scale-110"
                >
                  <Bell className="h-5 w-5" />
                  {unreadNotifications > 0 && (
                    <span className="absolute -top-1 -right-1 bg-gradient-to-r from-red-500 to-pink-500 text-white text-xs rounded-full h-4 w-4 flex items-center justify-center border border-neutral-900 shadow-lg animate-pulse">
                      {unreadNotifications > 9 ? '9+' : unreadNotifications}
                    </span>
                  )}
                </Link>
              </>
            )}
            
            <Popover.Button className="inline-flex items-center justify-center p-2.5 rounded-xl text-gray-400 hover:text-white hover:bg-white/5 transition-all duration-300 transform hover:scale-110">
              <Bars3Icon className="h-6 w-6" aria-hidden="true" />
            </Popover.Button>
          </div>
        </div>
      </div>

      {/* Enhanced Mobile Menu */}
      <Transition
        as={Fragment}
        enter="transition ease-out duration-300"
        enterFrom="opacity-0 scale-95 translate-y-4"
        enterTo="opacity-100 scale-100 translate-y-0"
        leave="transition ease-in duration-200"
        leaveFrom="opacity-100 scale-100 translate-y-0"
        leaveTo="opacity-0 scale-95 translate-y-4"
      >
        <Popover.Panel className="absolute inset-x-0 top-0 origin-top transform p-4 transition lg:hidden z-50">
          <div className="overflow-hidden rounded-2xl bg-neutral-800/95 backdrop-blur-xl shadow-2xl ring-1 ring-black ring-opacity-5 border border-white/10">
            {/* Mobile Header */}
            <div className="flex items-center justify-between px-6 pt-5 pb-4 bg-gradient-to-r from-primary-500/10 to-purple-500/10">
              <Link to="/dashboard" className="flex items-center space-x-3">
                <div className="flex items-center justify-center w-10 h-10 bg-gradient-to-br from-primary-500 to-purple-600 rounded-xl shadow-lg">
                  <Trophy className="h-6 w-6 text-white" />
                </div>
                <div className="flex flex-col">
                  <span className="text-xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
                    OpenTournaments
                  </span>
                  <span className="text-xs bg-gradient-to-r from-primary-400 to-cyan-400 bg-clip-text text-transparent">
                    Competitive Gaming
                  </span>
                </div>
              </Link>
              <Popover.Button className="inline-flex items-center justify-center p-2 rounded-xl text-gray-400 hover:text-white hover:bg-white/5 transition-colors">
                <XMarkIcon className="h-6 w-6" aria-hidden="true" />
              </Popover.Button>
            </div>

            <div className="px-4 pb-6">
              {/* Enhanced User Info */}
              {isAuthenticated && (
                <div className="flex items-center space-x-4 p-4 mb-4 bg-gradient-to-r from-primary-500/10 to-purple-500/10 rounded-xl border border-white/10">
                  <div className="relative">
                    <div className="flex items-center justify-center w-12 h-12 bg-gradient-to-br from-primary-500 to-purple-600 rounded-full shadow-lg">
                      <span className="text-sm font-bold text-white">
                        {user?.username?.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-400 rounded-full border-2 border-neutral-800" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-white truncate">{user?.username}</p>
                    <p className="text-xs bg-gradient-to-r from-primary-400 to-cyan-400 bg-clip-text text-transparent font-medium">
                      ${user?.wallet_balance || '0.00'} balance
                    </p>
                  </div>
                </div>
              )}

              {/* Enhanced Navigation Links */}
              <nav className="space-y-2 mb-6">
                {navigation.map((item) => {
                  const Icon = item.icon;
                  const isActive = isActiveRoute(item.href);
                  return (
                    <Link
                      key={item.name}
                      to={item.href}
                      className={`group flex items-center gap-4 w-full px-4 py-3 rounded-xl text-base font-semibold transition-all duration-300 ${
                        isActive
                          ? `bg-gradient-to-r ${item.color} text-white shadow-lg transform scale-105`
                          : 'text-gray-300 hover:text-white hover:bg-white/5'
                      }`}
                    >
                      <Icon className={`h-5 w-5 transition-transform ${isActive ? 'scale-110' : 'group-hover:scale-110'}`} />
                      {item.name}
                    </Link>
                  );
                })}
              </nav>

              {/* Enhanced Auth Links */}
              {isAuthenticated ? (
                <div className="space-y-2">
                  {[
                    { icon: User, label: 'My Profile', href: '/my-profile' },
                    { icon: Wallet, label: 'Wallet', href: '/wallet' },
                    { icon: Settings, label: 'Settings', href: '/settings' },
                    { icon: Gamepad2, label: 'My Games', href: '/my-games' },
                  ].map((item) => (
                    <Link
                      key={item.label}
                      to={item.href}
                      className="flex items-center gap-4 w-full px-4 py-3 rounded-xl text-base font-medium text-gray-300 hover:text-white hover:bg-white/5 transition-all duration-200 group"
                    >
                      <item.icon className="h-5 w-5 text-gray-400 group-hover:text-primary-400 transition-colors" />
                      {item.label}
                    </Link>
                  ))}
                  <button
                    onClick={handleLogout}
                    className="flex items-center gap-4 w-full px-4 py-3 rounded-xl text-base font-medium text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-all duration-200 group"
                  >
                    <LogOut className="h-5 w-5 transition-transform group-hover:scale-110" />
                    Sign Out
                  </button>
                </div>
              ) : (
                <div className="space-y-3 pt-4 border-t border-white/10">
                  <Link
                    to="/login"
                    className="block w-full text-center px-4 py-3 rounded-xl text-base font-medium text-gray-300 hover:text-white hover:bg-white/5 transition-all duration-200"
                  >
                    Sign In
                  </Link>
                  <Link
                    to="/signup"
                    className="block w-full text-center bg-gradient-to-r from-primary-500 to-purple-600 hover:from-primary-600 hover:to-purple-700 text-white font-medium py-3 px-4 rounded-xl transition-all duration-200 shadow-lg hover:shadow-primary-500/25"
                  >
                    Get Started
                  </Link>
                </div>
              )}
            </div>
          </div>
        </Popover.Panel>
      </Transition>
    </Popover>
  );
}