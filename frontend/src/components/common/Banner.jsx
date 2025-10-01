import { Link } from 'react-router-dom';
import React, { useRef, useEffect } from 'react';
import {
  InformationCircleIcon,
  ExclamationTriangleIcon,
  XCircleIcon,
  CheckCircleIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';

export default function Banner({
  type = 'info',
  title,
  message,
  action,
  onClose,
  className = '',
  children,
  dismissible = true,
  autoDismiss = false,
  onAutoDismiss,
  duration = 5000,
  swipeToDismiss = true // New prop to enable/disable swipe
}) {
  const styles = {
    info: {
      background: 'bg-blue-50 dark:bg-blue-900/20',
      border: 'border-blue-200 dark:border-blue-800',
      gradient: 'from-blue-50 to-blue-25 dark:from-blue-900/10 dark:to-blue-900/5',
      title: 'text-blue-900 dark:text-blue-100',
      text: 'text-blue-700 dark:text-blue-300',
      icon: 'text-blue-500 dark:text-blue-400',
      button: 'bg-blue-600 hover:bg-blue-700 text-white focus:ring-blue-500',
      accent: 'bg-blue-500'
    },
    warning: {
      background: 'bg-amber-50 dark:bg-amber-900/20',
      border: 'border-amber-200 dark:border-amber-800',
      gradient: 'from-amber-50 to-amber-25 dark:from-amber-900/10 dark:to-amber-900/5',
      title: 'text-amber-900 dark:text-amber-100',
      text: 'text-amber-700 dark:text-amber-300',
      icon: 'text-amber-500 dark:text-amber-400',
      button: 'bg-amber-600 hover:bg-amber-700 text-white focus:ring-amber-500',
      accent: 'bg-amber-500'
    },
    error: {
      background: 'bg-red-50 dark:bg-red-900/20',
      border: 'border-red-200 dark:border-red-800',
      gradient: 'from-red-50 to-red-25 dark:from-red-900/10 dark:to-red-900/5',
      title: 'text-red-900 dark:text-red-100',
      text: 'text-red-700 dark:text-red-300',
      icon: 'text-red-500 dark:text-red-400',
      button: 'bg-red-600 hover:bg-red-700 text-white focus:ring-red-500',
      accent: 'bg-red-500'
    },
    success: {
      background: 'bg-green-50 dark:bg-green-900/20',
      border: 'border-green-200 dark:border-green-800',
      gradient: 'from-green-50 to-green-25 dark:from-green-900/10 dark:to-green-900/5',
      title: 'text-green-900 dark:text-green-100',
      text: 'text-green-700 dark:text-green-300',
      icon: 'text-green-500 dark:text-green-400',
      button: 'bg-green-600 hover:bg-green-700 text-white focus:ring-green-500',
      accent: 'bg-green-500'
    }
  };

  const style = styles[type] || styles.info;
  const icons = {
    info: InformationCircleIcon,
    warning: ExclamationTriangleIcon,
    error: XCircleIcon,
    success: CheckCircleIcon
  };
  const Icon = icons[type];

  // Swipe to dismiss functionality
  const bannerRef = useRef(null);
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);
  const touchEndX = useRef(0);
  const touchEndY = useRef(0);
  const isSwiping = useRef(false);

  const handleTouchStart = (e) => {
    if (!swipeToDismiss || !dismissible || !onClose) return;
    
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
    isSwiping.current = false;
  };

  const handleTouchMove = (e) => {
    if (!swipeToDismiss || !dismissible || !onClose) return;
    
    touchEndX.current = e.touches[0].clientX;
    touchEndY.current = e.touches[0].clientY;
    
    const diffX = touchStartX.current - touchEndX.current;
    const diffY = touchStartY.current - touchEndY.current;
    
    // Only consider it swiping if horizontal movement is dominant
    if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > 10) {
      isSwiping.current = true;
      
      // Apply transform for visual feedback
      if (bannerRef.current) {
        const translateX = Math.max(-diffX, -100); // Limit max translation
        bannerRef.current.style.transform = `translateX(${translateX}px)`;
        bannerRef.current.style.opacity = `${1 - Math.abs(translateX) / 100}`;
      }
    }
  };

  const handleTouchEnd = () => {
    if (!swipeToDismiss || !dismissible || !onClose || !isSwiping.current) {
      resetSwipe();
      return;
    }
    
    const diffX = touchStartX.current - touchEndX.current;
    
    // If swiped more than 40% of the banner width, dismiss it
    if (bannerRef.current && Math.abs(diffX) > bannerRef.current.offsetWidth * 0.4) {
      // Animate out
      bannerRef.current.style.transform = `translateX(${diffX > 0 ? '-' : ''}100%)`;
      bannerRef.current.style.opacity = '0';
      
      // Call onClose after animation
      setTimeout(() => {
        onClose();
      }, 300);
    } else {
      // Reset position with smooth animation
      resetSwipe();
    }
    
    isSwiping.current = false;
  };

  const resetSwipe = () => {
    if (bannerRef.current) {
      bannerRef.current.style.transform = 'translateX(0)';
      bannerRef.current.style.opacity = '1';
    }
  };

  // Auto-dismiss functionality
  React.useEffect(() => {
    if (autoDismiss && onAutoDismiss) {
      const timer = setTimeout(() => {
        onAutoDismiss();
      }, duration);
      
      return () => clearTimeout(timer);
    }
  }, [autoDismiss, onAutoDismiss, duration]);

  return (
    <div 
      ref={bannerRef}
      className={`
        relative rounded-xl border-l-4 ${style.border} ${style.background}
        bg-gradient-to-r ${style.gradient} shadow-sm hover:shadow-md
        transition-all duration-300 ease-in-out cursor-grab active:cursor-grabbing
        ${className}
      `}
      style={{ 
        borderLeftColor: 'currentColor',
        borderLeftWidth: '4px',
        transition: 'transform 0.3s ease, opacity 0.3s ease'
      }}
      role="alert"
      aria-live="polite"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Progress bar for auto-dismiss */}
      {autoDismiss && (
        <div className="absolute top-0 left-0 right-0 h-1 bg-gray-200 dark:bg-gray-700 rounded-t-xl overflow-hidden">
          <div 
            className={`h-full ${style.accent} transition-all duration-300 ease-out`}
            style={{ 
              width: autoDismiss ? '100%' : '0%',
              animation: autoDismiss ? `shrinkWidth ${duration}ms linear forwards` : 'none'
            }}
          />
        </div>
      )}

      {/* Swipe hint for mobile */}
      {swipeToDismiss && dismissible && onClose && (
        <div className="absolute top-2 right-2 sm:hidden">
          <div className="flex space-x-1 opacity-40">
            <div className="w-1 h-1 bg-current rounded-full animate-pulse"></div>
            <div className="w-1 h-1 bg-current rounded-full animate-pulse" style={{ animationDelay: '0.1s' }}></div>
            <div className="w-1 h-1 bg-current rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
          </div>
        </div>
      )}

      <div className="p-4 sm:p-5">
        <div className="flex items-start gap-3 sm:gap-4">
          {/* Icon */}
          <div className="flex-shrink-0 pt-0.5">
            <Icon className={`h-5 w-5 sm:h-6 sm:w-6 ${style.icon}`} aria-hidden="true" />
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
              <div className="flex-1 min-w-0">
                {title && (
                  <h3 className={`text-sm font-semibold ${style.title} mb-1`}>
                    {title}
                  </h3>
                )}
                {message && (
                  <div className={`text-sm ${style.text} ${title ? 'mt-1' : ''}`}>
                    {typeof message === 'string' ? (
                      <p className="leading-relaxed">{message}</p>
                    ) : (
                      message
                    )}
                  </div>
                )}
                {children && (
                  <div className="mt-3">
                    {children}
                  </div>
                )}
              </div>

              {/* Actions */}
              {(action || (dismissible && onClose)) && (
                <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
                  {action && (
                    action.to ? (
                      <Link
                        to={action.to}
                        className={`
                          inline-flex items-center justify-center px-3 py-1.5 sm:px-4 sm:py-2
                          text-xs sm:text-sm font-medium rounded-lg transition-all duration-200
                          ${style.button} focus:outline-none focus:ring-2 focus:ring-offset-2
                          hover:scale-105 active:scale-95
                        `}
                      >
                        {action.text}
                      </Link>
                    ) : (
                      <button
                        onClick={action.onClick}
                        className={`
                          inline-flex items-center justify-center px-3 py-1.5 sm:px-4 sm:py-2
                          text-xs sm:text-sm font-medium rounded-lg transition-all duration-200
                          ${style.button} focus:outline-none focus:ring-2 focus:ring-offset-2
                          hover:scale-105 active:scale-95
                        `}
                      >
                        {action.text}
                      </button>
                    )
                  )}

                  {dismissible && onClose && (
                    <button
                      onClick={onClose}
                      className={`
                        inline-flex items-center justify-center p-1.5 rounded-lg
                        text-gray-400 hover:text-gray-600 dark:hover:text-gray-300
                        hover:bg-gray-100 dark:hover:bg-gray-800
                        transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-gray-400
                        hover:scale-110 active:scale-95
                      `}
                      aria-label="Close banner"
                    >
                      <XMarkIcon className="h-4 w-4 sm:h-5 sm:w-5" />
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes shrinkWidth {
          from { width: 100%; }
          to { width: 0%; }
        }
        
        /* Hide swipe hint after first interaction */
        @media (max-width: 640px) {
          .cursor-grab:active ~ [class*="sm:hidden"] {
            opacity: 0 !important;
          }
        }
      `}</style>
    </div>
  );
}