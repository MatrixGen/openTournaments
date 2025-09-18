import { Fragment } from 'react';
import { Popover, Transition } from '@headlessui/react';
import { Bars3Icon, XMarkIcon } from '@heroicons/react/24/outline';
import { useAuth } from '../../contexts/AuthContext';
import { Link } from 'react-router-dom';

const navigation = [
  { name: 'Browse Matches', href: '#' },
  { name: 'Leaderboard', href: '#' },
  { name: 'How it Works', href: '#' },
];

export default function Header() {
  const { user, isAuthenticated, logout } = useAuth();

  return (
    <Popover as="header" className="bg-neutral-800">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between py-6">
          
          {/* Logo */}
          <div className="flex-shrink-0">
            <Link to="/" className="text-2xl font-bold text-white">
              Open Tournaments
            </Link>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex md:items-center md:space-x-10">
            {isAuthenticated && navigation.map((item) => (
              <Link
                key={item.name}
                to={item.href}
                className="text-base font-medium text-white hover:text-primary-500"
              >
                {item.name}
              </Link>
            ))}

            {isAuthenticated && (
              <Link
                to="/create-tournament"
                className="ml-4 inline-flex items-center justify-center rounded-md bg-primary-500 px-4 py-2 text-base font-medium text-white hover:bg-primary-600"
              >
                Create Tournament
              </Link>
            )}
          </div>

          {/* User / Auth Buttons */}
          <div className="flex items-center space-x-4">
            {isAuthenticated ? (
              <div className="hidden md:flex items-center space-x-4">
                <span className="text-white">Welcome, {user?.username}</span>
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
                <span className="sr-only">Open menu</span>
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
        <Popover.Panel focus className="absolute inset-x-0 top-0 origin-top transform p-2 transition md:hidden">
          <div className="overflow-hidden rounded-lg bg-neutral-800 shadow-md ring-1 ring-black ring-opacity-5">
            <div className="flex items-center justify-between px-5 pt-4">
              <Link to="/" className="text-2xl font-bold text-white">
                Open Tournaments
              </Link>
              <Popover.Button className="inline-flex items-center justify-center rounded-md p-2 text-white hover:bg-neutral-700 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white">
                <span className="sr-only">Close menu</span>
                <XMarkIcon className="h-6 w-6" aria-hidden="true" />
              </Popover.Button>
            </div>
            <div className="pt-5 pb-6 px-5 space-y-1">
              {isAuthenticated ? (
                <>
                  {navigation.map((item) => (
                    <Link
                      key={item.name}
                      to={item.href}
                      className="block rounded-md px-3 py-2 text-base font-medium text-white hover:bg-neutral-700"
                    >
                      {item.name}
                    </Link>
                  ))}
                  <button
                    onClick={logout}
                    className="w-full text-left block rounded-md px-3 py-2 text-base font-medium text-white hover:bg-neutral-700"
                  >
                    Logout
                  </button>
                </>
              ) : (
                <>
                  <Link
                    to="/login"
                    className="block rounded-md px-3 py-2 text-base font-medium text-white hover:bg-neutral-700"
                  >
                    Sign in
                  </Link>
                  <Link
                    to="/signup"
                    className="block rounded-md px-3 py-2 text-base font-medium text-white hover:bg-neutral-700"
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
