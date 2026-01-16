import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  InformationCircleIcon,
  ExclamationTriangleIcon,
  XCircleIcon,
  CheckCircleIcon,
  XMarkIcon
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
  swipeToDismiss = true,
  compact = false
}) {
  const styles = {
    info: {
      background: 'bg-blue-50 dark:bg-blue-900/20',
      border: 'border-blue-200 dark:border-blue-800',
      text: 'text-blue-800 dark:text-blue-200',
      icon: 'text-blue-500 dark:text-blue-400',
      accent: 'bg-blue-500'
    },
    warning: {
      background: 'bg-amber-50 dark:bg-amber-900/20',
      border: 'border-amber-200 dark:border-amber-800',
      text: 'text-amber-800 dark:text-amber-200',
      icon: 'text-amber-500 dark:text-amber-400',
      accent: 'bg-amber-500'
    },
    error: {
      background: 'bg-red-50 dark:bg-red-900/20',
      border: 'border-red-200 dark:border-red-800',
      text: 'text-red-800 dark:text-red-200',
      icon: 'text-red-500 dark:text-red-400',
      accent: 'bg-red-500'
    },
    success: {
      background: 'bg-green-50 dark:bg-green-900/20',
      border: 'border-green-200 dark:border-green-800',
      text: 'text-green-800 dark:text-green-200',
      icon: 'text-green-500 dark:text-green-400',
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
  const Icon = icons[type] || InformationCircleIcon;

  const bannerRef = useRef(null);
  const startXRef = useRef(0);
  const dragDistanceRef = useRef(0);
  const isDraggingRef = useRef(false);
  const [isDragging, setIsDragging] = useState(false);

  const beginDrag = (clientX) => {
    if (!swipeToDismiss || !dismissible || !onClose) return false;

    isDraggingRef.current = true;
    setIsDragging(true);
    startXRef.current = clientX;
    dragDistanceRef.current = 0;

    if (bannerRef.current) {
      bannerRef.current.style.transition = 'none';
    }

    return true;
  };

  const updateDrag = (clientX) => {
    if (!isDraggingRef.current || !swipeToDismiss || !dismissible || !onClose) return;

    const distance = clientX - startXRef.current;
    dragDistanceRef.current = distance;

    if (bannerRef.current) {
      bannerRef.current.style.transform = `translateX(${distance}px)`;
      const opacity = 1 - Math.min(Math.abs(distance) / 200, 0.5);
      bannerRef.current.style.opacity = opacity.toString();
    }
  };

  const resetSwipe = () => {
    if (bannerRef.current) {
      bannerRef.current.style.transform = 'translateX(0)';
      bannerRef.current.style.opacity = '1';
    }
    dragDistanceRef.current = 0;
  };

  const endDrag = () => {
    if (!isDraggingRef.current) {
      resetSwipe();
      return;
    }

    isDraggingRef.current = false;
    setIsDragging(false);

    if (bannerRef.current) {
      bannerRef.current.style.transition = 'transform 0.3s ease, opacity 0.3s ease';
    }

    const swipeThreshold = 100;
    const distance = Math.abs(dragDistanceRef.current);

    if (distance > swipeThreshold) {
      const direction = dragDistanceRef.current > 0 ? 1 : -1;
      if (bannerRef.current) {
        bannerRef.current.style.transform = `translateX(${direction * window.innerWidth}px)`;
        bannerRef.current.style.opacity = '0';
      }

      setTimeout(() => {
        if (onClose) onClose();
      }, 300);
    } else {
      resetSwipe();
    }
  };

  const handleTouchStart = (e) => {
    beginDrag(e.touches[0].clientX);
  };

  const handleTouchMove = (e) => {
    if (!isDraggingRef.current) return;

    const touchX = e.touches[0].clientX;
    const distance = touchX - startXRef.current;
    if (Math.abs(distance) > 10) {
      e.preventDefault();
    }

    updateDrag(touchX);
  };

  const handleTouchEnd = () => {
    endDrag();
  };

  const handleMouseMove = (e) => {
    if (!isDraggingRef.current) return;
    updateDrag(e.clientX);
  };

  const handleMouseUp = () => {
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
    endDrag();
  };

  const handleMouseDown = (e) => {
    if (!beginDrag(e.clientX)) return;
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  useEffect(() => {
    if (autoDismiss && onAutoDismiss) {
      const timer = setTimeout(() => {
        onAutoDismiss();
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [autoDismiss, onAutoDismiss, duration]);

  useEffect(() => {
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  return (
    <div
      ref={bannerRef}
      className={`
        relative rounded-md border ${style.border} ${style.background}
        transition-all duration-300 ease-in-out select-none
        ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}
        ${compact ? 'text-xs' : 'text-xs sm:text-sm'}
        ${className}
      `}
      style={{
        transition: 'transform 0.3s ease, opacity 0.3s ease',
        touchAction: 'pan-y'
      }}
      role="alert"
      aria-live="polite"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onMouseDown={handleMouseDown}
    >
      {autoDismiss && (
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-black/5 dark:bg-white/10 rounded-t-md overflow-hidden">
          <div
            className={`h-full ${style.accent}`}
            style={{
              width: autoDismiss ? '100%' : '0%',
              animation: autoDismiss ? `shrinkWidth ${duration}ms linear forwards` : 'none'
            }}
          />
        </div>
      )}

      <div className={`${compact ? 'px-2 py-1.5' : 'px-3 py-2'}`}>
        <div className="flex items-start gap-2">
          <div className="flex-shrink-0 pt-0.5">
            <Icon
              className={`${compact ? 'h-3 w-3' : 'h-4 w-4'} ${style.icon}`}
              aria-hidden="true"
            />
          </div>

          <div className="flex-1 min-w-0">
            {title && (
              <h3 className={`font-semibold ${style.text} leading-tight`}>
                {title}
              </h3>
            )}
            {message && (
              <div className={`${style.text} ${title ? 'mt-0.5' : ''} leading-relaxed break-words`}>
                {typeof message === 'string' ? (
                  <p className={`${compact ? 'text-xs' : 'text-xs sm:text-sm'}`}>{message}</p>
                ) : (
                  <div className={`${compact ? 'text-xs' : 'text-xs sm:text-sm'}`}>{message}</div>
                )}
              </div>
            )}
            {children && <div className={`${compact ? 'mt-1' : 'mt-1.5'}`}>{children}</div>}
          </div>

          {(action || (dismissible && onClose)) && (
            <div className="flex items-center gap-1 flex-shrink-0">
              {action && (
                action.to ? (
                  <Link
                    to={action.to}
                    className={`
                      inline-flex items-center justify-center
                      ${compact ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs'}
                      font-medium rounded
                      ${style.accent} text-white
                      hover:opacity-90 focus:outline-none focus:ring-1 focus:ring-offset-1
                    `}
                  >
                    {action.text}
                  </Link>
                ) : (
                  <button
                    onClick={action.onClick}
                    className={`
                      inline-flex items-center justify-center
                      ${compact ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs'}
                      font-medium rounded
                      ${style.accent} text-white
                      hover:opacity-90 focus:outline-none focus:ring-1 focus:ring-offset-1
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
                    inline-flex items-center justify-center p-1 rounded
                    text-gray-400 hover:text-gray-600 dark:hover:text-gray-300
                    hover:bg-gray-100 dark:hover:bg-gray-800
                    transition-colors duration-200 focus:outline-none focus:ring-1 focus:ring-gray-400
                  `}
                  aria-label="Close banner"
                >
                  <XMarkIcon className={`${compact ? 'h-2.5 w-2.5' : 'h-3.5 w-3.5'}`} />
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      <style>
        {`
          @keyframes shrinkWidth {
            from { width: 100%; }
            to { width: 0%; }
          }
        `}
      </style>
    </div>
  );
}
