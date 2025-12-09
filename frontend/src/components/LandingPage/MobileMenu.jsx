import React from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { NAV_ITEMS } from '../../constants/data';
import { XMarkIcon } from '@heroicons/react/24/outline';

export default function MobileMenu({ activeNav, setActiveNav, theme = 'dark' }) {
  const bgClass = theme === 'dark' 
    ? 'bg-neutral-900/95 border-neutral-700' 
    : 'bg-white/95 border-gray-200';
  
  const textColor = theme === 'dark' ? 'text-neutral-300' : 'text-gray-700';
  const hoverTextColor = theme === 'dark' ? 'hover:text-white' : 'hover:text-gray-900';
  const borderColor = theme === 'dark' ? 'border-neutral-700' : 'border-gray-200';

  return (
    <AnimatePresence>
      {activeNav && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-40 md:hidden"
            onClick={() => setActiveNav(false)}
          />
          
          {/* Menu Panel */}
          <motion.div
            initial={{ opacity: 0, x: '100%' }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className={`fixed top-0 right-0 h-full w-4/5 max-w-sm ${bgClass} border-l ${borderColor} z-50 md:hidden shadow-2xl`}
          >
            {/* Header */}
            <div className={`flex items-center justify-between p-4 border-b ${borderColor}`}>
              <h2 className={`text-lg font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                Menu
              </h2>
              <button
                onClick={() => setActiveNav(false)}
                className={`p-2 rounded-lg ${
                  theme === 'dark' 
                    ? 'text-neutral-400 hover:text-white hover:bg-neutral-800' 
                    : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'
                }`}
                aria-label="Close menu"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>

            {/* Menu Content */}
            <div className="p-4 overflow-y-auto h-[calc(100%-4rem)]">
              <nav className="flex flex-col space-y-1">
                {NAV_ITEMS.map((item) => (
                  <Link 
                    key={item.name}
                    to={item.path}
                    className={`px-3 py-3 rounded-lg transition-colors duration-200 font-medium ${textColor} ${hoverTextColor} ${
                      theme === 'dark' 
                        ? 'hover:bg-neutral-800' 
                        : 'hover:bg-gray-100'
                    }`}
                    onClick={() => setActiveNav(false)}
                  >
                    {item.name}
                  </Link>
                ))}
                
                {/* Divider */}
                <div className={`h-px my-4 ${borderColor}`} />
                
                {/* Authentication Buttons */}
                <div className="space-y-3">
                  <Link 
                    to="/signup" 
                    className={`block w-full text-center px-4 py-3 bg-gradient-to-r from-purple-500 to-blue-500 rounded-lg hover:from-purple-600 hover:to-blue-600 transition-all duration-300 text-white font-medium`}
                    onClick={() => setActiveNav(false)}
                  >
                    Get Started
                  </Link>
                  <Link 
                    to="/login" 
                    className={`block w-full text-center px-4 py-3 border rounded-lg transition-all duration-300 font-medium ${
                      theme === 'dark'
                        ? 'border-neutral-600 text-neutral-300 hover:bg-neutral-800'
                        : 'border-gray-300 text-gray-700 hover:bg-gray-100'
                    }`}
                    onClick={() => setActiveNav(false)}
                  >
                    Sign In
                  </Link>
                </div>

                {/* Additional Info */}
                <div className={`mt-6 pt-4 border-t ${borderColor}`}>
                  <p className={`text-xs ${textColor} text-center`}>
                    OpenTournaments © {new Date().getFullYear()}
                  </p>
                  <div className="flex justify-center space-x-4 mt-3">
                    <a 
                      href="/privacy" 
                      className={`text-xs ${textColor} hover:underline`}
                      onClick={() => setActiveNav(false)}
                    >
                      Privacy
                    </a>
                    <a 
                      href="/terms" 
                      className={`text-xs ${textColor} hover:underline`}
                      onClick={() => setActiveNav(false)}
                    >
                      Terms
                    </a>
                    <a 
                      href="/help" 
                      className={`text-xs ${textColor} hover:underline`}
                      onClick={() => setActiveNav(false)}
                    >
                      Help
                    </a>
                  </div>
                </div>
              </nav>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}