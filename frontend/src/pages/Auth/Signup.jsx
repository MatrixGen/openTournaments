import { useEffect, useState } from 'react';
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

  // Redirect if already logged in
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  const handleSignup = async (formData) => {
    setIsLoading(true);
    setError('');

    try {
      const { confirmPassword, ...submitData } = formData;
      const response = await authService.signup(submitData);

      login(response.user, response.token, formData.password);
      return true; // Success
    } catch (err) {
      console.error('Signup error:', err);
      const apiError = err.response?.data?.errors?.[0]?.msg ||
        err.response?.data?.message ||
        'Signup failed. Please try again.';
      setError(apiError);
      return false; // Failure
    } finally {
      setIsLoading(false);
    }
  };

  // Show loading spinner while checking authentication
  if (isAuthenticated === undefined) {
    return <LoadingSpinner fullPage={true} text="Checking authentication..." />;
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