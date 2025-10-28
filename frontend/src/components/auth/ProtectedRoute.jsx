import { useAuth } from '../../contexts/AuthContext';
import { Navigate, useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';

export default function ProtectedRoute({ children }) {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();
  const [showLoader, setShowLoader] = useState(true);
  const [isRedirecting, setIsRedirecting] = useState(false);

  // Delay loader appearance to prevent flash on quick authentication
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowLoader(isLoading);
    }, 300);

    return () => clearTimeout(timer);
  }, [isLoading]);

  // Show redirecting state before actual navigation
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      setIsRedirecting(true);
    }
  }, [isLoading, isAuthenticated]);

  // Handle the redirect with a slight delay for better UX
  if (isRedirecting) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto mb-4"></div>
          <p className="text-white text-lg">Redirecting to login...</p>
        </div>
      </div>
    );
  }

  // Show elegant loader only after delay
  if (isLoading && showLoader) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto mb-4"></div>
          <p className="text-white text-lg">Checking authentication...</p>
          <p className="text-neutral-400 text-sm mt-2">Please wait a moment</p>
        </div>
      </div>
    );
  }

  // If not authenticated, redirect to login page with smooth transition
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // If authenticated, render the child components
  return children;
}