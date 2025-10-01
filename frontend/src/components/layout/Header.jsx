import { Fragment, useEffect, useState } from 'react';
import { Popover, Transition } from '@headlessui/react';
import { Bars3Icon, XMarkIcon } from '@heroicons/react/24/outline';
import { useAuth } from '../../contexts/AuthContext';
import { Link, useLocation } from 'react-router-dom';
import {
  Bell,
  ListOrdered,
  Trophy,
  HelpCircle,
  LayoutGrid,
  User,
  LogOut,
  Settings,
  Wallet
} from 'lucide-react';
import { notificationService } from '../../services/notificationService';

const navigation = [
  { name: 'Browse Matches', href: '/browse-matches', icon: LayoutGrid },
  //{ name: 'Leaderboard', href: '/leaderboard', icon: Trophy },
  //{ name: 'How it Works', href: '/how-it-works', icon: HelpCircle },
  { name: 'My Tournaments', href: '/my-tournaments', icon: ListOrdered },
];

export default function Header() {
  const { user, isAuthenticated, logout } = useAuth();
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const location = useLocation();

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
    return location.pathname === href;
  };

  return (
    <Popover as="header" className="sticky top-0 z-50 bg-neutral-900/95 backdrop-blur-md border-b border-neutral-800">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center">
            <Link to="/dashboard" className="flex items-center space-x-3">
              <div className="flex items-center justify-center w-8 h-8 bg-gradient-to-br from-primary-500 to-purple-600 rounded-lg">
                <Trophy className="h-5 w-5 text-white" />
              </div>
              <span className="text-xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
                OpenTournaments
              </span>
            </Link>
          </div>

          {/* Desktop Navigation */}
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
                        ? 'bg-primary-500/20 text-primary-400 border border-primary-500/30'
                        : 'text-gray-300 hover:text-white hover:bg-neutral-800'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {item.name}
                  </Link>
                );
              })}
          </nav>

          {/* Desktop User Menu */}
          <div className="hidden lg:flex lg:items-center lg:space-x-4">
            {isAuthenticated ? (
              <>
                {/* Notifications */}
                <Link
                  to="/notifications"
                  className="relative p-2 text-gray-400 hover:text-white transition-colors rounded-lg hover:bg-neutral-800"
                >
                  <Bell className="h-5 w-5" />
                  {unreadNotifications > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center border-2 border-neutral-900">
                      {unreadNotifications > 9 ? '9+' : unreadNotifications}
                    </span>
                  )}
                </Link>

                {/* User Menu Dropdown */}
                <Popover className="relative">
                  <Popover.Button className="flex items-center space-x-3 p-2 rounded-lg hover:bg-neutral-800 transition-colors">
                    <div className="flex items-center space-x-3">
                      <div className="flex items-center justify-center w-8 h-8 bg-gradient-to-br from-primary-500 to-purple-600 rounded-full">
                        <span className="text-sm font-medium text-white">
                          {user?.username?.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div className="text-left hidden sm:block">
                        <p className="text-sm font-medium text-white">{user?.username}</p>
                        <p className="text-xs text-gray-400">${user?.wallet_balance || '0.00'}</p>
                      </div>
                    </div>
                  </Popover.Button>

                  <Transition
                    as={Fragment}
                    enter="transition ease-out duration-200"
                    enterFrom="opacity-0 translate-y-1"
                    enterTo="opacity-100 translate-y-0"
                    leave="transition ease-in duration-150"
                    leaveFrom="opacity-100 translate-y-0"
                    leaveTo="opacity-0 translate-y-1"
                  >
                    <Popover.Panel className="absolute right-0 mt-2 w-64 rounded-xl bg-neutral-800 border border-neutral-700 shadow-xl z-50">
                      <div className="p-4 border-b border-neutral-700">
                        <p className="text-sm font-medium text-white">{user?.username}</p>
                        <p className="text-xs text-gray-400">{user?.email}</p>
                      </div>
                      
                      <div className="p-2">
                        <Link
                          to="/my-profile"
                          className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-300 hover:text-white hover:bg-neutral-700 transition-colors"
                        >
                          <User className="h-4 w-4" />
                          My Profile
                        </Link>
                        <Link
                          to="/wallet"
                          className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-300 hover:text-white hover:bg-neutral-700 transition-colors"
                        >
                          <Wallet className="h-4 w-4" />
                          Wallet: ${user?.wallet_balance || '0.00'}
                        </Link>
                        <Link
                          to="/settings"
                          className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-300 hover:text-white hover:bg-neutral-700 transition-colors"
                        >
                          <Settings className="h-4 w-4" />
                          Settings
                        </Link>
                      </div>
                      
                      <div className="p-2 border-t border-neutral-700">
                        <button
                          onClick={logout}
                          className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors"
                        >
                          <LogOut className="h-4 w-4" />
                          Sign Out
                        </button>
                      </div>
                    </Popover.Panel>
                  </Transition>
                </Popover>
              </>
            ) : (
              <div className="flex items-center space-x-3">
                <Link
                  to="/login"
                  className="text-gray-300 hover:text-white font-medium transition-colors"
                >
                  Sign In
                </Link>
                <Link
                  to="/signup"
                  className="bg-gradient-to-r from-primary-500 to-purple-600 hover:from-primary-600 hover:to-purple-700 text-white font-medium py-2 px-4 rounded-lg transition-all duration-200"
                >
                  Get Started
                </Link>
              </div>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="flex lg:hidden items-center space-x-2">
            {isAuthenticated && (
              <Link
                to="/notifications"
                className="relative p-2 text-gray-400 hover:text-white transition-colors"
              >
                <Bell className="h-5 w-5" />
                {unreadNotifications > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-4 w-4 flex items-center justify-center border border-neutral-900">
                    {unreadNotifications > 9 ? '9+' : unreadNotifications}
                  </span>
                )}
              </Link>
            )}
            
            <Popover.Button className="inline-flex items-center justify-center p-2 rounded-lg text-gray-400 hover:text-white hover:bg-neutral-800 transition-colors">
              <Bars3Icon className="h-6 w-6" aria-hidden="true" />
            </Popover.Button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      <Transition
        as={Fragment}
        enter="duration-200 ease-out"
        enterFrom="opacity-0 scale-95"
        enterTo="opacity-100 scale-100"
        leave="duration-150 ease-in"
        leaveFrom="opacity-100 scale-100"
        leaveTo="opacity-0 scale-95"
      >
        <Popover.Panel className="absolute inset-x-0 top-0 origin-top transform p-4 transition lg:hidden z-50">
          <div className="overflow-hidden rounded-2xl bg-neutral-800 shadow-2xl ring-1 ring-black ring-opacity-5 border border-neutral-700">
            <div className="flex items-center justify-between px-6 pt-5 pb-4">
              <Link to="/dashboard" className="flex items-center space-x-3">
                <div className="flex items-center justify-center w-8 h-8 bg-gradient-to-br from-primary-500 to-purple-600 rounded-lg">
                  <Trophy className="h-5 w-5 text-white" />
                </div>
                <span className="text-xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
                  OpenTournaments
                </span>
              </Link>
              <Popover.Button className="inline-flex items-center justify-center p-2 rounded-lg text-gray-400 hover:text-white hover:bg-neutral-700 transition-colors">
                <XMarkIcon className="h-6 w-6" aria-hidden="true" />
              </Popover.Button>
            </div>

            <div className="px-4 pb-6">
              {/* User Info */}
              {isAuthenticated && (
                <div className="flex items-center space-x-3 p-4 mb-4 bg-neutral-700/50 rounded-xl">
                  <div className="flex items-center justify-center w-10 h-10 bg-gradient-to-br from-primary-500 to-purple-600 rounded-full">
                    <span className="text-sm font-medium text-white">
                      {user?.username?.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">{user?.username}</p>
                    <p className="text-xs text-gray-400 truncate">${user?.wallet_balance || '0.00'} balance</p>
                  </div>
                </div>
              )}

              {/* Navigation Links */}
              <nav className="space-y-2 mb-6">
                {navigation.map((item) => {
                  const Icon = item.icon;
                  const isActive = isActiveRoute(item.href);
                  return (
                    <Link
                      key={item.name}
                      to={item.href}
                      className={`flex items-center gap-3 w-full px-4 py-3 rounded-xl text-base font-medium transition-all duration-200 ${
                        isActive
                          ? 'bg-primary-500/20 text-primary-400 border border-primary-500/30'
                          : 'text-gray-300 hover:text-white hover:bg-neutral-700'
                      }`}
                    >
                      <Icon className="h-5 w-5" />
                      {item.name}
                    </Link>
                  );
                })}
              </nav>

              {/* Auth Links */}
              {isAuthenticated ? (
                <div className="space-y-2">
                  <Link
                    to="/my-profile"
                    className="flex items-center gap-3 w-full px-4 py-3 rounded-xl text-base font-medium text-gray-300 hover:text-white hover:bg-neutral-700 transition-colors"
                  >
                    <User className="h-5 w-5" />
                    My Profile
                  </Link>
                  <Link
                    to="/wallet"
                    className="flex items-center gap-3 w-full px-4 py-3 rounded-xl text-base font-medium text-gray-300 hover:text-white hover:bg-neutral-700 transition-colors"
                  >
                    <Wallet className="h-5 w-5" />
                    Wallet
                  </Link>
                  <button
                    onClick={logout}
                    className="flex items-center gap-3 w-full px-4 py-3 rounded-xl text-base font-medium text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors"
                  >
                    <LogOut className="h-5 w-5" />
                    Sign Out
                  </button>
                </div>
              ) : (
                <div className="space-y-3 pt-4 border-t border-neutral-700">
                  <Link
                    to="/login"
                    className="block w-full text-center px-4 py-3 rounded-xl text-base font-medium text-gray-300 hover:text-white hover:bg-neutral-700 transition-colors"
                  >
                    Sign In
                  </Link>
                  <Link
                    to="/signup"
                    className="block w-full text-center bg-gradient-to-r from-primary-500 to-purple-600 hover:from-primary-600 hover:to-purple-700 text-white font-medium py-3 px-4 rounded-xl transition-all duration-200"
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