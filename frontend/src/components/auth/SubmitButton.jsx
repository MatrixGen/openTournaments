/**
 * Reusable Submit Button for auth forms
 */
import React from 'react';

export default function SubmitButton({ disabled, children }) {
  return (
    <button
      type="submit"
      disabled={disabled}
      className={`w-full inline-flex items-center justify-center py-3 px-4 rounded-lg text-sm font-medium text-white shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 transition-all ${
        disabled
          ? "bg-gray-300 dark:bg-gray-600 cursor-not-allowed"
          : "bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700"
      }`}
    >
      {children}
    </button>
  );
}
