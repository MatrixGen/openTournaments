import { Fragment, useEffect, useState } from 'react';
import { Popover, Transition } from '@headlessui/react';
import { Bars3Icon, XMarkIcon } from '@heroicons/react/24/outline';
import { useAuth } from '../../contexts/AuthContext';
import { Link } from 'react-router-dom';
import {
  Bell,
  ListOrdered,
  Trophy,
  HelpCircle,
  LayoutGrid,
} from 'lucide-react';
import { notificationService } from '../../services/notificationService';

const navigation = [
  { name: 'Browse Matches', href: '/browse-matches', icon: LayoutGrid },
  { name: 'Leaderboard', href: '#', icon: Trophy },
  { name: 'How it Works', href: '#', icon: HelpCircle },
  { name: 'My Tournaments', href: '/my-tournaments', icon: ListOrdered },
];

export default function Header() {
  const { user, isAuthenticated, logout } = useAuth();
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

  return (
    <Popover as="header" className="sticky top-0 z-50 bg-neutral-800">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between py-6">
          {/* Logo */}
          <Link to="/dashboard" className="text-2xl font-bold text-white">
            Open Tournaments
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex md:items-center md:space-x-8">
            {isAuthenticated &&
              navigation.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    className="flex items-center gap-2 text-base font-medium text-white hover:text-primary-500"
                  >
                    <Icon className="h-5 w-5" />
                    {item.name}
                  </Link>
                );
              })}

            {isAuthenticated && (
              <>
                <Link
                  to="/notifications"
                  className="relative flex items-center text-base font-medium text-white hover:text-primary-500"
                >
                  <Bell className="h-5 w-5" />
                  {unreadNotifications > 0 && (
                    <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                      {unreadNotifications > 9 ? '9+' : unreadNotifications}
                    </span>
                  )}
                </Link>
              </>
            )}
          </div>

          {/* User / Auth Buttons */}
          <div className="flex items-center space-x-4">
            {isAuthenticated ? (
              <div className="hidden md:flex items-center space-x-4">
                <span className="text-white">Hi, {user?.username}</span>
                <button
                  onClick={logout}
                  className="rounded-md bg-primary-500 px-4 py-2 text-base font-medium text-white hover:bg-primary-600"
                >
                  Logout
                </button>
              </div>
            ) : (
              <div className="hidden md:flex items-center space-x-4">
                <Link
                  to="/login"
                  className="text-base font-medium text-white hover:text-primary-500"
                >
                  Sign in
                </Link>
                <Link
                  to="/signup"
                  className="rounded-md bg-primary-500 px-4 py-2 text-base font-medium text-white hover:bg-primary-600"
                >
                  Sign up
                </Link>
              </div>
            )}

            {/* Mobile menu button */}
            <div className="md:hidden">
              <Popover.Button className="inline-flex items-center justify-center rounded-md p-2 text-white hover:bg-neutral-700 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white">
                <Bars3Icon className="h-6 w-6" aria-hidden="true" />
              </Popover.Button>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      <Transition
        as={Fragment}
        enter="duration-150 ease-out"
        enterFrom="opacity-0 scale-95"
        enterTo="opacity-100 scale-100"
        leave="duration-100 ease-in"
        leaveFrom="opacity-100 scale-100"
        leaveTo="opacity-0 scale-95"
      >
        <Popover.Panel
          focus
          className="absolute inset-x-0 top-0 origin-top transform p-4 transition md:hidden z-50"
        >
          <div className="overflow-hidden rounded-lg bg-neutral-800 shadow-lg ring-1 ring-black ring-opacity-5">
            <div className="flex items-center justify-between px-5 pt-4">
              <Link to="/" className="text-2xl font-bold text-white">
                Open Tournaments
              </Link>
              <Popover.Button className="inline-flex items-center justify-center rounded-md p-2 text-white hover:bg-neutral-700 focus:outline-none">
                <XMarkIcon className="h-6 w-6" aria-hidden="true" />
              </Popover.Button>
            </div>

            <div className="mt-5 px-2 pb-6 space-y-2">
              {navigation.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    className="flex items-center gap-2 w-full rounded-md px-3 py-3 text-base font-medium text-white hover:bg-neutral-700"
                  >
                    <Icon className="h-5 w-5" />
                    {item.name}
                  </Link>
                );
              })}

              {isAuthenticated && (
                <>
                  
                  <Link
                    to="/notifications"
                    className="relative flex items-center gap-2 w-full rounded-md px-3 py-3 text-base font-medium text-white hover:bg-neutral-700"
                  >
                    <Bell className="h-5 w-5" />
                    Notifications
                    {unreadNotifications > 0 && (
                      <span className="absolute right-2 top-2 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                        {unreadNotifications > 9 ? '9+' : unreadNotifications}
                      </span>
                    )}
                  </Link>

                  <button
                    onClick={logout}
                    className="w-full text-left block rounded-md px-3 py-3 text-base font-medium text-white hover:bg-neutral-700"
                  >
                    Logout
                  </button>
                </>
              )}

              {!isAuthenticated && (
                <>
                  <Link
                    to="/login"
                    className="block w-full rounded-md px-3 py-3 text-base font-medium text-white hover:bg-neutral-700"
                  >
                    Sign in
                  </Link>
                  <Link
                    to="/signup"
                    className="block w-full rounded-md bg-primary-500 px-3 py-3 text-base font-medium text-white hover:bg-primary-600 text-center"
                  >
                    Sign up
                  </Link>
                </>
              )}
            </div>
          </div>
        </Popover.Panel>
      </Transition>
    </Popover>
  );
}
