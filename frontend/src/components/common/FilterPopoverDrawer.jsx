import { useEffect, useMemo, useRef, useState } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';

const DEFAULT_AUTO_CLOSE_MS = 6000;
const DEFAULT_WIDTH = 320;
const TRANSITION_MS = 180;

const FilterPopoverDrawer = ({
  isOpen,
  onClose,
  anchorRef,
  title = 'Filters',
  children,
  footer,
  width = DEFAULT_WIDTH,
  autoCloseMs = DEFAULT_AUTO_CLOSE_MS,
  mobileOnly = true,
  maxWidthClass = 'max-w-sm',
}) => {
  const timerRef = useRef(null);
  const [isVisible, setIsVisible] = useState(false);
  const [shouldRender, setShouldRender] = useState(false);

  const anchorRect = useMemo(() => {
    if (!anchorRef?.current) return null;
    return anchorRef.current.getBoundingClientRect();
  }, [anchorRef, isOpen]);

  useEffect(() => {
    if (isOpen) {
      setShouldRender(true);
      requestAnimationFrame(() => setIsVisible(true));
    } else if (shouldRender) {
      setIsVisible(false);
      const hideTimer = setTimeout(() => {
        setShouldRender(false);
      }, TRANSITION_MS);
      return () => clearTimeout(hideTimer);
    }
    return undefined;
  }, [isOpen, shouldRender]);

  useEffect(() => {
    if (!isOpen) return;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(onClose, autoCloseMs);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [autoCloseMs, isOpen, onClose]);

  if (!shouldRender) return null;

  const positionStyle = anchorRect
    ? {
        top: Math.min(anchorRect.bottom + 8, window.innerHeight - 16),
        left: Math.min(
          Math.max(anchorRect.left, 16),
          window.innerWidth - width - 16
        ),
      }
    : { top: 72, left: 16 };

  const containerClassName = mobileOnly
    ? 'fixed inset-0 z-50 md:hidden pointer-events-none'
    : 'fixed inset-0 z-50 pointer-events-none';

  return (
    <div className={containerClassName}>
      <button
        type="button"
        onClick={onClose}
        className="absolute inset-0 pointer-events-auto bg-transparent"
        aria-label="Close filters"
      />
      <div
        className={`absolute w-[90vw] ${maxWidthClass} bg-white dark:bg-neutral-800 shadow-xl rounded-xl border border-gray-200 dark:border-neutral-700 pointer-events-auto transition-all duration-200 ease-out origin-top-left ${
          isVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
        }`}
        style={positionStyle}
        onMouseMove={() => {
          if (timerRef.current) clearTimeout(timerRef.current);
          timerRef.current = setTimeout(onClose, autoCloseMs);
        }}
        onKeyDown={() => {
          if (timerRef.current) clearTimeout(timerRef.current);
          timerRef.current = setTimeout(onClose, autoCloseMs);
        }}
      >
        <div className="px-4 py-3 border-b border-gray-200 dark:border-neutral-700 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">{title}</h3>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-white"
          >
            <XMarkIcon className="h-4 w-4" />
          </button>
        </div>

        <div className="px-4 py-3 space-y-3">{children}</div>
        {footer && <div className="px-4 pb-3">{footer}</div>}
      </div>
    </div>
  );
};

export default FilterPopoverDrawer;
