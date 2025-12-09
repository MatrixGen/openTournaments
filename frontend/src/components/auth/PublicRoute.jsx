import { useAuth } from '../../contexts/AuthContext';
import { Navigate } from 'react-router-dom';

export default function PublicRoute({ children }) {
  const { isAuthenticated, isLoading } = useAuth();

  // While checking token
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto mb-4"></div>
          <p className="text-white text-lg">Loading...</p>
        </div>
      </div>
    );
  }

  // If user is logged in, send them to dashboard
  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  // Otherwise show landing page
  return children;
}
