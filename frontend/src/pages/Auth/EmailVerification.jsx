import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Header from '../../components/layout/Header';
import Banner from '../../components/common/Banner';
import { authService } from '../../services/authService';
import { useAuth } from '../../contexts/AuthContext';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { 
  EnvelopeIcon, 
  CheckCircleIcon, 
  ExclamationCircleIcon,
  ArrowRightIcon,
  ArrowLeftIcon,
  ShieldCheckIcon,
  
  InformationCircleIcon
} from '@heroicons/react/24/outline';

export default function EmailVerification() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [token, setToken] = useState(searchParams.get('token') || '');
  const [isVerified, setIsVerified] = useState(false);
  
  const { user, updateUser } = useAuth();

  // Touch device detection for mobile optimizations
  const isTouchDevice = typeof window !== 'undefined' && (
    'ontouchstart' in window || navigator.maxTouchPoints > 0
  );

  // Auto-verify if token is in URL
  useEffect(() => {
    const verifyFromUrl = async () => {
      if (token && !isVerified) {
        await handleVerify();
      }
    };

    verifyFromUrl();
  }, [token]);

  const handleSendVerification = useCallback(async () => {
    if (!user?.email) {
      setError('No email address found. Please log in again.');
      return;
    }

    setIsSending(true);
    setError('');
    setSuccess('');

    try {
      await authService.sendEmailVerification();
      setSuccess('Verification email sent! Please check your inbox and spam folder.');
    } catch (err) {
      console.error('Failed to send verification:', err);
      setError(err.response?.data?.message || 'Failed to send verification email. Please try again.');
    } finally {
      setIsSending(false);
    }
  }, [user?.email]);

  const handleVerify = useCallback(async (providedToken = token) => {
    const verifyToken = providedToken.trim();
    
    if (!verifyToken) {
      setError('Please enter a verification token');
      return;
    }

    setIsLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await authService.verifyEmail(verifyToken);
      setSuccess(response.message || 'Email verified successfully!');
      setIsVerified(true);
      
      // Update user verification status in context
      if (user && updateUser) {
        updateUser({ ...user, email_verified: true });
      }
      
      // Redirect to dashboard after a delay
      setTimeout(() => {
        navigate('/dashboard');
      }, 3000);
    } catch (err) {
      console.error('Email verification error:', err);
      setError(err.response?.data?.message || 'Invalid or expired verification token. Please request a new one.');
      setIsVerified(false);
    } finally {
      setIsLoading(false);
    }
  }, [token, user, updateUser, navigate]);

  const handlePasteToken = useCallback(async () => {
    try {
      const clipboardText = await navigator.clipboard.readText();
      const trimmedToken = clipboardText.trim();
      if (trimmedToken) {
        setToken(trimmedToken);
        // Auto-verify if token looks valid (e.g., has reasonable length)
        if (trimmedToken.length > 10) {
          handleVerify(trimmedToken);
        }
      }
    } catch (err) {
      console.error('Failed to read clipboard:', err);
      setError('Unable to paste from clipboard. Please type the token manually.');
    }
  }, [handleVerify]);

  const handleBackToLogin = useCallback(() => {
    navigate('/login');
  }, [navigate]);

  const handleGoToDashboard = useCallback(() => {
    navigate('/dashboard');
  }, [navigate]);

  // Format email for display (mask for privacy)
  const formatEmail = useCallback((email) => {
    if (!email) return '';
    const [local, domain] = email.split('@');
    if (local.length <= 2) return email;
    return `${local.substring(0, 2)}***@${domain}`;
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 dark:from-neutral-900 dark:to-neutral-950 transition-colors">
      <Header />
      
      <main className="mx-auto max-w-md py-6 sm:py-8 px-3 sm:px-4 lg:px-8">
        {/* Back button for mobile */}
        <button
          onClick={handleBackToLogin}
          className="inline-flex items-center text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-300 mb-6 sm:mb-8 group"
        >
          <ArrowLeftIcon className="h-4 w-4 mr-2 group-hover:-translate-x-1 transition-transform" />
          Back to Login
        </button>

        <div className="text-center mb-6 sm:mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-50 dark:bg-primary-900/20 rounded-full mb-4">
            <ShieldCheckIcon className="h-8 w-8 text-primary-600 dark:text-primary-400" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Verify Your Email
          </h1>
          <p className="text-gray-600 dark:text-gray-400 text-sm sm:text-base">
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
            className="mb-6"
            icon={ExclamationCircleIcon}
          />
        )}

        {/* Success Banner */}
        {success && (
          <Banner
            type="success"
            title="Success!"
            message={success}
            className="mb-6"
            icon={CheckCircleIcon}
            action={isVerified ? {
              text: 'Go to Dashboard',
              onClick: handleGoToDashboard
            } : undefined}
          />
        )}

        <div className="bg-white dark:bg-neutral-800 rounded-xl shadow-sm border border-gray-200 dark:border-neutral-700 p-4 sm:p-6">
          {isLoading ? (
            // Loading state
            <div className="text-center py-8">
              <LoadingSpinner 
                size="lg" 
                className="mx-auto mb-4" 
              />
              <p className="text-gray-700 dark:text-gray-300 font-medium mb-2">
                Verifying your email...
              </p>
              <p className="text-gray-500 dark:text-gray-400 text-sm">
                Please wait while we confirm your verification token
              </p>
            </div>
          ) : isVerified ? (
            // Success state
            <div className="text-center py-6">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-green-50 dark:bg-green-900/20 rounded-full mb-4">
                <CheckCircleIcon className="h-8 w-8 text-green-600 dark:text-green-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Email Verified Successfully!
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                Redirecting to dashboard in a few seconds...
              </p>
              <button
                onClick={handleGoToDashboard}
                className={`inline-flex items-center justify-center w-full py-3 px-4 bg-primary-500 hover:bg-primary-600 text-white font-medium rounded-lg transition-colors ${
                  isTouchDevice ? 'active:scale-98' : ''
                }`}
              >
                Go to Dashboard Now
                <ArrowRightIcon className="ml-2 h-4 w-4" />
              </button>
            </div>
          ) : (
            // Verification form
            <>
              <div className="flex items-start gap-3 mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                <InformationCircleIcon className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm text-blue-800 dark:text-blue-300">
                    We've sent a verification email to{' '}
                    <strong className="font-semibold">{user?.email ? formatEmail(user.email) : 'your email address'}</strong>.
                    Please check your inbox and spam folder.
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label htmlFor="token" className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
                    Verification Token
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      id="token"
                      value={token}
                      onChange={(e) => setToken(e.target.value)}
                      className={`w-full rounded-lg border bg-white dark:bg-neutral-700 py-3 px-4 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 text-sm transition-colors ${
                        error
                          ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
                          : 'border-gray-300 dark:border-neutral-600 focus:border-primary-500 focus:ring-primary-500'
                      } ${isTouchDevice ? 'text-base' : ''}`}
                      placeholder="Paste or enter your verification token"
                      disabled={isLoading || isSending}
                      autoComplete="one-time-code"
                      inputMode="text"
                      aria-describedby={error ? "token-error" : "token-help"}
                    />
                    {!token && isTouchDevice && (
                      <button
                        type="button"
                        onClick={handlePasteToken}
                        className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-1.5 text-xs font-medium text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-900/20 rounded border border-primary-200 dark:border-primary-800 hover:bg-primary-100 dark:hover:bg-primary-900/30 transition-colors"
                      >
                        Paste
                      </button>
                    )}
                  </div>
                  <p id="token-help" className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    Check your email for the verification token
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row gap-3">
                  <button
                    onClick={() => handleVerify()}
                    disabled={isLoading || !token.trim()}
                    className={`flex-1 inline-flex items-center justify-center py-3 px-4 rounded-lg font-medium transition-colors ${
                      isTouchDevice ? 'active:scale-98' : ''
                    } ${
                      !token.trim()
                        ? 'bg-gray-100 dark:bg-neutral-700 text-gray-400 dark:text-gray-500 cursor-not-allowed'
                        : 'bg-primary-500 hover:bg-primary-600 text-white disabled:opacity-50 disabled:cursor-not-allowed'
                    }`}
                  >
                    {isLoading ? (
                      <>
                        <LoadingSpinner size="sm" className="mr-2" />
                        Verifying...
                      </>
                    ) : (
                      'Verify Email'
                    )}
                  </button>
                  
                  <button
                    onClick={handleSendVerification}
                    disabled={isSending}
                    className={`inline-flex items-center justify-center py-3 px-4 rounded-lg font-medium transition-colors ${
                      isTouchDevice ? 'active:scale-98' : ''
                    } bg-gray-100 dark:bg-neutral-700 hover:bg-gray-200 dark:hover:bg-neutral-600 text-gray-700 dark:text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    {isSending ? (
                      <>
                        <LoadingSpinner size="sm" className="mr-2" />
                        Sending...
                      </>
                    ) : (
                      <>
                        <EnvelopeIcon className="h-4 w-4 mr-2" />
                        Resend Email
                      </>
                    )}
                  </button>
                </div>

                {/* Alternative verification methods */}
                <div className="pt-4 border-t border-gray-100 dark:border-neutral-700">
                  <p className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Having trouble?
                  </p>
                  <ul className="space-y-2 text-xs text-gray-600 dark:text-gray-400">
                    <li className="flex items-start gap-2">
                      <span className="text-gray-500 dark:text-gray-500 mt-0.5">•</span>
                      <span>Check your spam or junk folder</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-gray-500 dark:text-gray-500 mt-0.5">•</span>
                      <span>Make sure you entered the correct email address</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-gray-500 dark:text-gray-500 mt-0.5">•</span>
                      <span>Wait a few minutes - emails can sometimes be delayed</span>
                    </li>
                  </ul>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Quick links for mobile */}
        {isTouchDevice && !isVerified && (
          <div className="mt-6 grid grid-cols-2 gap-3">
            <button
              onClick={handleBackToLogin}
              className="inline-flex items-center justify-center py-2.5 px-4 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-neutral-700 rounded-lg hover:bg-gray-200 dark:hover:bg-neutral-600 transition-colors"
            >
              <ArrowLeftIcon className="h-4 w-4 mr-2" />
              Back to Login
            </button>
            <button
              onClick={() => navigate('/support')}
              className="inline-flex items-center justify-center py-2.5 px-4 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-neutral-700 rounded-lg hover:bg-gray-200 dark:hover:bg-neutral-600 transition-colors"
            >
              <EnvelopeIcon className="h-4 w-4 mr-2" />
              Need Help?
            </button>
          </div>
        )}

        {/* Additional guidance */}
        <div className="mt-6 text-center">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Email verification helps protect your account and ensures you receive important notifications.
          </p>
        </div>
      </main>
    </div>
  );
}