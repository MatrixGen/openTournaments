// ErrorMessage.jsx
import React from 'react';

export default function ErrorMessage({ 
  message, 
  onRetry, 
  variant = 'error',
  className = '',
  showIcon = true 
}) {
  const variants = {
    error: {
      bg: 'bg-red-500/10',
      border: 'border-red-500/20',
      text: 'text-red-400',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      )
    },
    warning: {
      bg: 'bg-amber-500/10',
      border: 'border-amber-500/20',
      text: 'text-amber-400',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.998-.833-2.732 0L4.102 16.5c-.77.833.192 2.5 1.732 2.5z" />
        </svg>
      )
    },
    info: {
      bg: 'bg-blue-500/10',
      border: 'border-blue-500/20',
      text: 'text-blue-400',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      )
    },
    success: {
      bg: 'bg-green-500/10',
      border: 'border-green-500/20',
      text: 'text-green-400',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      )
    }
  };

  const currentVariant = variants[variant] || variants.error;

  return (
    <div className="fixed inset-0 flex items-center justify-center p-4">
  <div className={`rounded-lg p-4 ${currentVariant.bg} ${currentVariant.border} border ${className}`}>
    <div className="flex items-start">
      {showIcon && (
        <div className={`flex-shrink-0 ${currentVariant.text} mr-3`}>
          {currentVariant.icon}
        </div>
      )}
      <div className="flex-1">
        <p className={`text-sm font-medium ${currentVariant.text}`}>
          {message}
        </p>
        {onRetry && (
          <div className="mt-3">
            <button
              onClick={onRetry}
              className={`text-sm font-medium ${currentVariant.text} hover:opacity-80 transition-opacity`}
            >
              Try again
            </button>
          </div>
        )}
      </div>
    </div>
  </div>
</div>

  );
}