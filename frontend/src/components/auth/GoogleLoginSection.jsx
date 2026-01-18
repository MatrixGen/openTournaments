/**
 * Google Login Section
 */
import React from 'react';
import GoogleAuthButton from './GoogleAuthButton';

export default function GoogleLoginSection({ onSwitchToLegacy }) {
  return (
    <div className="space-y-6">
      <GoogleAuthButton className="w-full" />
      
      {/* Switch to Legacy */}
      <div className="relative pt-4">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-gray-200 dark:border-neutral-600" />
        </div>
        <div className="relative flex justify-center text-xs">
          <button
            type="button"
            onClick={onSwitchToLegacy}
            className="px-3 bg-white dark:bg-neutral-800 text-gray-500 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
          >
            Use username or phone instead
          </button>
        </div>
      </div>
    </div>
  );
}
