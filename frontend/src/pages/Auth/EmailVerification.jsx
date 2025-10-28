// src/components/EmailVerification.jsx
import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Header from '../../components/layout/Header';
import Banner from '../../components/common/Banner';
import { authService } from '../../services/authService';
import { useAuth } from '../../contexts/AuthContext';

export default function EmailVerification() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [token, setToken] = useState(searchParams.get('token') || '');
  
  const { user } = useAuth();

  useEffect(() => {
    // If token is provided in URL, verify immediately
    if (token) {
      handleVerify();
    }
  }, [token]);

  const handleSendVerification = async () => {
    setIsSending(true);
    setError('');
    setSuccess('');

    try {
      await authService.sendEmailVerification();
      setSuccess('Verification email sent! Please check your inbox.');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to send verification email.');
    } finally {
      setIsSending(false);
    }
  };

  const handleVerify = async () => {
    if (!token.trim()) {
      setError('Please enter a verification token');
      return;
    }

    setIsLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await authService.verifyEmail(token);
      setSuccess(response.message || 'Email verified successfully!');
      
      // Update user verification status
      if (user) {
        // You might want to update the user context here
      }
      
      // Redirect to dashboard after a delay
      setTimeout(() => {
        navigate('/dashboard');
      }, 2000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to verify email. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-900">
      
      <main className="mx-auto max-w-md py-8 px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white">Verify Your Email</h1>
          <p className="mt-2 text-gray-400">
            Please verify your email address to access all features
          </p>
        </div>

        {/* Error Banner */}
        {error && (
          <Banner
            type="error"
            title="Verification Error"
            message={error}
            onClose={() => setError('')}
          />
        )}

        {/* Success Banner */}
        {success && (
          <Banner
            type="success"
            title="Success!"
            message={success}
          />
        )}

        <div className="bg-neutral-800 rounded-lg shadow p-6">
          {!token ? (
            <>
              <p className="text-gray-400 mb-4">
                We've sent a verification email to <strong className="text-white">{user?.email}</strong>. 
                Please click the link in the email or enter the verification token below.
              </p>
              
              <div className="mb-4">
                <label htmlFor="token" className="block text-sm font-medium text-white mb-2">
                  Verification Token
                </label>
                <input
                  type="text"
                  id="token"
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  className="w-full rounded-md border border-neutral-600 bg-neutral-700 py-2 px-3 text-white placeholder-gray-400 focus:border-primary-500 focus:outline-none focus:ring-primary-500 sm:text-sm"
                  placeholder="Enter verification token"
                />
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={handleVerify}
                  disabled={isLoading || !token.trim()}
                  className="flex-1 bg-primary-500 hover:bg-primary-600 text-white font-medium py-2 px-4 rounded disabled:opacity-50 transition-colors"
                >
                  {isLoading ? 'Verifying...' : 'Verify Email'}
                </button>
                <button
                  onClick={handleSendVerification}
                  disabled={isSending}
                  className="flex-1 bg-neutral-700 hover:bg-neutral-600 text-white font-medium py-2 px-4 rounded disabled:opacity-50 transition-colors"
                >
                  {isSending ? 'Sending...' : 'Resend Email'}
                </button>
              </div>
            </>
          ) : (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto mb-4"></div>
              <p className="text-gray-400">Verifying your email...</p>
            </div>
          )}
        </div>

        {/* Info Banner for additional guidance */}
        <Banner
          type="info"
          title="Can't find the email?"
          message="Check your spam folder or make sure you entered the correct email address."
          className="mt-6"
        />
      </main>
    </div>
  );
}