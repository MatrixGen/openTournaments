// src/components/LoadingSpinner.jsx
import Header from '../layout/Header';

export default function LoadingSpinner({ 
  size = 'md', 
  fullPage = false, 
  text = 'Loading...',
  className = '' 
}) {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-8 w-8',
    lg: 'h-12 w-12',
    xl: 'h-16 w-16'
  };

  const spinner = (
    <div className={`animate-spin rounded-full border-b-2 border-primary-500 ${sizeClasses[size]} ${className}`} />
  );

  if (fullPage) {
    return (
      <div className="min-h-screen bg-neutral-900">
        
        <div className="flex flex-col items-center justify-center h-64 space-y-4">
          {spinner}
          {text && <p className="text-gray-400">{text}</p>}
        </div>
      </div>
    );
  }

  return spinner;
}