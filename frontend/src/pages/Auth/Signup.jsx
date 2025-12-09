import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { authService } from '../../services/authService';
import SignupWizard from '../../components/auth/SignupWizard';
import LoadingSpinner from '../../components/common/LoadingSpinner';

export default function Signup() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  
  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  const handleSignup = useCallback(async (formData) => {
    setIsLoading(true);
    setError('');

    try {
      const { phone_number, ...submitData } = formData;
      
      // Only include phone if provided
      if (phone_number && phone_number.trim()) {
        submitData.phone_number = phone_number.trim();
      }

      const response = await authService.signup(submitData);
      login(response.user, response.token, formData.password);
      return true;
    } catch (err) {
      console.error('Signup error:', err);
      const apiError = err.response?.data?.errors?.[0]?.msg ||
        err.response?.data?.message ||
        'Unable to create account. Please check your information and try again.';
      setError(apiError);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [login]);

  if (isAuthenticated === undefined) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-neutral-900">
        <LoadingSpinner 
          size="lg" 
          text="Checking authentication status..." 
        />
      </div>
    );
  }

  return (
    <SignupWizard 
      onSignup={handleSignup}
      error={error}
      isLoading={isLoading}
      onErrorClear={() => setError('')}
    />
  );
}