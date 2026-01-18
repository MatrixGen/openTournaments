// components/GoogleAuthButton.jsx
import React, { useCallback, useMemo, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { useNavigate } from 'react-router-dom';
import { authService } from '../../services/authService';
import { useAuth } from '../../contexts/AuthContext';

const GoogleAuthButton = ({ redirectUri = '/dashboard', className = '' }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const { loginWithFirebase } = useAuth();
  const navigate = useNavigate();

  const isNative = useMemo(() => {
    try {
      return Capacitor.isNativePlatform();
    } catch {
      return false;
    }
  }, []);

  const handleGoogleSignIn = useCallback(async () => {
    if (isLoading) return;

    setIsLoading(true);
    setErrorMsg('');

    try {
      let result;

      if (isNative) {
        try {
          const { FirebaseAuthentication } = await import('@capacitor-firebase/authentication');

          const googleResult = await FirebaseAuthentication.signInWithGoogle();

          const idToken = googleResult?.credential?.idToken;
          const accessToken = googleResult?.credential?.accessToken ?? null;

          if (!idToken) throw new Error('No ID token received from Google Sign-In');

          result = await authService.signInWithGoogleNative(idToken, accessToken);
        } catch (nativeError) {
          console.error('Native Google Sign-In failed:', nativeError);
          // Fallback to web auth if native fails
          result = await authService.signInWithGoogle();
        }
      } else {
        result = await authService.signInWithGoogle();
      }

      if (result?.success) {
        await loginWithFirebase(result);
        navigate(redirectUri, { replace: true });
      } else {
        throw new Error(result?.message || 'Sign in failed. Please try again.');
      }
    } catch (err) {
      console.error('Google Sign-In failed:', err);

      let message = 'Sign in failed. Please try again.';

      if (err?.code === 'auth/popup-closed-by-user') {
        message = 'Sign in cancelled.';
      } else if (err?.code === 'auth/network-request-failed') {
        message = 'Network error. Please check your connection.';
      } else if (err?.code === 'auth/popup-blocked') {
        // Try redirect method if popup is blocked
        try {
          await authService.signInWithGoogleRedirect();
          return; // Redirect will happen
        } catch {
          message = 'Please allow popups for this site to sign in with Google.';
        }
      } else if (err?.message) {
        message = err.message;
      }

      setErrorMsg(message);
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, isNative, loginWithFirebase, navigate, redirectUri]);

  return (
    <div className={`w-full flex flex-col items-center ${className}`}>
      <button
        type="button"
        onClick={handleGoogleSignIn}
        disabled={isLoading}
        aria-label="Sign in with Google"
        className="
          w-full max-w-[320px]
          inline-flex items-center justify-center gap-3
          rounded-lg border border-gray-200 bg-white
          px-5 py-3
          text-[15px] font-medium text-gray-900
          shadow-sm
          transition
          hover:shadow-md
          active:scale-[0.98]
          disabled:cursor-not-allowed disabled:opacity-70
          dark:bg-neutral-800 dark:border-neutral-700 dark:text-white
        "
      >
        {isLoading ? (
          <span
            className="
              h-5 w-5
              rounded-full
              border-2 border-gray-300 border-t-blue-500
              animate-spin
            "
            aria-hidden="true"
          />
        ) : (
          <img
            src="https://developers.google.com/identity/images/g-logo.png"
            alt=""
            className="h-5 w-5"
            loading="lazy"
            decoding="async"
          />
        )}

        <span>{isLoading ? 'Signing in...' : 'Continue with Google'}</span>
      </button>

      {!!errorMsg && (
        <p className="mt-2 max-w-[320px] text-center text-sm text-red-600 dark:text-red-400">
          {errorMsg}
        </p>
      )}
    </div>
  );
};

export default GoogleAuthButton;
