/**
 * Reusable TextField component for auth forms
 */
import React from 'react';

export default function TextField({ 
  id, 
  label, 
  type = "text", 
  placeholder, 
  register, 
  error, 
  icon: Icon, 
  rightAction,
  autoComplete 
}) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
        {label}
      </label>
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Icon className="h-5 w-5 text-gray-400" />
        </div>
        <input
          id={id}
          type={type}
          autoComplete={autoComplete}
          placeholder={placeholder}
          className={`pl-10 ${rightAction ? "pr-10" : ""} w-full rounded-lg border bg-white dark:bg-neutral-700 py-3 px-4 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 text-sm transition-colors ${
            error
              ? "border-red-500 focus:border-red-500 focus:ring-red-500"
              : "border-gray-300 dark:border-neutral-600 focus:border-primary-500 focus:ring-primary-500"
          }`}
          {...register}
        />
        {rightAction}
      </div>
      {error && (
        <p className="mt-2 text-sm text-red-600 dark:text-red-400">
          {error.message}
        </p>
      )}
    </div>
  );
}
