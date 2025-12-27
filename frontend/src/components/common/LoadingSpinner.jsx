// src/components/LoadingSpinner.jsx
import OtArenaIcon from '../icons/OtArenaIcon';

export default function LoadingSpinner({ 
  size = 'md', 
  fullPage = false, 
  text = 'Loading...',
  className = '' 
}) {

  // Size classes applied to the container wrapper
  const sizeContainerClasses = {
    sm: 'w-6 h-6',
    md: 'w-12 h-12', // Slightly larger base size for better visibility
    lg: 'w-16 h-16',
    xl: 'w-24 h-24'
  };
  
  // Text sizing to match spinner size
  const textSizeClasses = {
     sm: 'text-xs',
     md: 'text-sm',
     lg: 'text-base',
     xl: 'text-lg'
  };

  const spinner = (
    // Outer Wrapper: Handles the slow rotation and sizing
    <div className={`
        relative flex items-center justify-center
        ${sizeContainerClasses[size]} 
        animate-spin-slow
        ${className}
    `}>
      {/* Inner Icon: Handles the breathing pulse and coloring */}
      <OtArenaIcon
        className={`
          w-full h-full
          animate-pulse-scale
          text-[#370052] dark:text-[#a855f7]
          # Optional: Add a slight drop shadow for depth in light mode
          drop-shadow-sm dark:drop-shadow-none
        `}
        aria-hidden="true"
      />
    </div>
  );

  if (fullPage) {
    return (
      // Added dark:bg-neutral-900 for better dark mode support
      <div className="min-h-screen w-full flex flex-col items-center justify-center bg-gray-50 dark:bg-neutral-900 space-y-4 z-50">
        {spinner}
        {text && (
          <p className={`text-gray-600 dark:text-gray-300 tracking-wider font-medium animate-pulse ${textSizeClasses[size]}`}>
            {text}
          </p>
        )}
      </div>
    );
  }

  return spinner;
}