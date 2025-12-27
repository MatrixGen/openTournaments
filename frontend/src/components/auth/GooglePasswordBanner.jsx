// components/auth/GooglePasswordBanner.jsx
import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { userService } from '../../services/userService';
import Banner from '../common/Banner';

const GooglePasswordBanner = () => {
  const { user, updateUser } = useAuth();
  const [showForm, setShowForm] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Don't show if user already has password or isn't Google user
  if (!user || user.oauth_provider !== 'google' || user.has_password) {
    return null;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    // Validate passwords match
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    // Validate password strength
    const validation = userService.validateGooglePassword(password);
    if (!validation.valid) {
      setError(validation.errors[0]);
      return;
    }

    setLoading(true);
    
    try {
      // Use the service method
      const result = await userService.addGooglePassword(password);
      
      if (result.success) {
        // Update user in auth context
        if (updateUser) {
          updateUser({ hasPassword: true });
        }
        
        // Clear form
        setPassword('');
        setConfirmPassword('');
        setShowForm(false);
        
        // Show success (you can add toast notification here)
        console.log(result.message);
      } else {
        setError(result.error);
      }
    } catch {
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  if (!showForm) {
    return (
      <Banner
        type="warning"
        title="Action Required: Set Password"
        message="Add a password to unlock chat features and secure your account."
        action={{
          text: 'Set Password',
          onClick: () => setShowForm(true)
        }}
        className="mb-6"
        dismissible={false}
      />
    );
  }

  return (
    <div className="mb-6">
      <Banner
        type="warning"
        title="Create Password"
        message={
          <div className="space-y-3">
            <p className="text-sm text-amber-700">
              Password requirements:
              <ul className="list-disc list-inside mt-1 text-xs">
                <li>At least 8 characters</li>
                <li>One uppercase letter</li>
                <li>One lowercase letter</li>
                <li>One number</li>
              </ul>
            </p>
            
            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your new password"
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500"
                  required
                  disabled={loading}
                />
              </div>
              
              <div>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm password"
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500"
                  required
                  disabled={loading}
                />
              </div>
              
              {error && (
                <div className="text-red-600 text-sm bg-red-50 p-2 rounded">
                  {error}
                </div>
              )}
              
              <div className="flex space-x-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="bg-amber-600 hover:bg-amber-700 text-white text-sm font-medium py-2 px-4 rounded transition-colors disabled:opacity-50"
                >
                  {loading ? 'Setting...' : 'Set Password'}
                </button>
                
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    setError('');
                  }}
                  className="bg-gray-200 hover:bg-gray-300 text-gray-800 text-sm font-medium py-2 px-4 rounded transition-colors"
                  disabled={loading}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        }
        className="mb-6"
        dismissible={false}
      />
    </div>
  );
};

export default GooglePasswordBanner;