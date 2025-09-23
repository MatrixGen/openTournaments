// src/components/VerificationBanner.jsx
import { useAuth } from '../../contexts/AuthContext';
import { Link } from 'react-router-dom';

export default function VerificationBanner() {
  const { user } = useAuth();

  if (!user || user.email_verified) {
    return null;
  }

  return (
    <div className="bg-yellow-500/20 border border-yellow-500/30 rounded-lg p-4 mb-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-yellow-300 font-medium">Email Verification Required</h3>
          <p className="text-yellow-200 text-sm mt-1">
            Please verify your email address to access all features.
          </p>
        </div>
        <Link
          to="/verify-email"
          className="bg-yellow-500 hover:bg-yellow-600 text-white font-medium py-2 px-4 rounded text-sm"
        >
          Verify Email
        </Link>
      </div>
    </div>
  );
}