import React from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { NAV_ITEMS } from '../../constants/data';

export default function MobileMenu({ activeNav, setActiveNav }) {
  return (
    <AnimatePresence>
      {activeNav && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          className="md:hidden absolute top-full left-0 right-0 bg-neutral-900/95 backdrop-blur-md border-b border-neutral-700 z-50"
        >
          <div className="container mx-auto px-6 py-4">
            <nav className="flex flex-col space-y-4">
              {NAV_ITEMS.map((item) => (
                <Link 
                  key={item.name}
                  to={item.path}
                  className="text-neutral-300 hover:text-white transition-colors duration-300 font-medium py-2"
                  onClick={() => setActiveNav(false)}
                >
                  {item.name}
                </Link>
              ))}
              <div className="pt-4 border-t border-neutral-700">
                <Link 
                  to="/signup" 
                  className="block w-full text-center px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg hover:from-purple-700 hover:to-blue-700 transition-all duration-300 mb-3"
                  onClick={() => setActiveNav(false)}
                >
                  Get Started
                </Link>
                <Link 
                  to="/login" 
                  className="block w-full text-center px-6 py-3 border border-neutral-600 rounded-lg hover:bg-neutral-800/50 transition-all duration-300"
                  onClick={() => setActiveNav(false)}
                >
                  Sign In
                </Link>
              </div>
            </nav>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}