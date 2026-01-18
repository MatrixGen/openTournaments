/**
 * Firebase Email Verification Banner
 * 
 * Shows a non-blocking banner when a Firebase-authenticated user
 * hasn't verified their email yet. Includes a resend button.
 */
import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { authService } from '../../services/authService';
import firebaseAuthService from '../../services/firebaseAuthService';
import { EnvelopeIcon, CheckCircleIcon, ExclamationCircleIcon } from '@heroicons/react/24/outline';

export default function FirebaseEmailVerificationBanner() {
  const { user, authType } = useAuth();
  const [isResending, setIsResending] = useState(false);
  const [resendStatus, setResendStatus] = useState(null); // 'success' | 'error' | null

  // Only show for Firebase email auth users who haven't verified
  if (!user || authType !== 'firebase') {
    return null;
  }

  // Check Firebase user's email verification status
  const firebaseUser = firebaseAuthService.getFirebaseUserInfo();
  if (!firebaseUser || firebaseUser.emailVerified) {
    return null;
  }

  // Don't show for Google/OAuth users (they're auto-verified)
  if (firebaseUser.providerId === 'google.com') {
    return null;
  }

  const handleResend = async () => {
    setIsResending(true);
    setResendStatus(null);
    
    try {
      await authService.resendEmailVerification();
      setResendStatus('success');
      // Clear success message after 5 seconds
      setTimeout(() => setResendStatus(null), 5000);
    } catch (error) {
      console.error('Resend verification failed:', error);
      setResendStatus('error');
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="bg-amber-50 dark:bg-amber-900/30 border-l-4 border-amber-400 p-4 mb-4">
      <div className="flex items-start">
        <div className="flex-shrink-0">
          <EnvelopeIcon className="h-5 w-5 text-amber-400" aria-hidden="true" />
        </div>
        <div className="ml-3 flex-1">
          <h3 className="text-sm font-medium text-amber-800 dark:text-amber-200">
            Verify Your Email
          </h3>
          <div className="mt-1 text-sm text-amber-700 dark:text-amber-300">
            <p>
              We sent a verification email to <strong>{firebaseUser.email}</strong>.
              Please check your inbox and click the link to verify your account.
            </p>
          </div>
          
          <div className="mt-3 flex items-center gap-3">
            <button
              onClick={handleResend}
              disabled={isResending || resendStatus === 'success'}
              className="inline-flex items-center px-3 py-1.5 text-sm font-medium rounded-md
                text-amber-800 dark:text-amber-200 bg-amber-100 dark:bg-amber-800/50
                hover:bg-amber-200 dark:hover:bg-amber-800/70
                disabled:opacity-50 disabled:cursor-not-allowed
                transition-colors"
            >
              {isResending ? (
                <>
                  <span className="animate-spin mr-2 h-4 w-4 border-2 border-amber-800 border-t-transparent rounded-full" />
                  Sending...
                </>
              ) : (
                'Resend Verification Email'
              )}
            </button>
            
            {resendStatus === 'success' && (
              <span className="inline-flex items-center text-sm text-green-600 dark:text-green-400">
                <CheckCircleIcon className="h-4 w-4 mr-1" />
                Email sent!
              </span>
            )}
            
            {resendStatus === 'error' && (
              <span className="inline-flex items-center text-sm text-red-600 dark:text-red-400">
                <ExclamationCircleIcon className="h-4 w-4 mr-1" />
                Failed to send. Try again later.
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
