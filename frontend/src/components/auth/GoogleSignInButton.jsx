/**
 * Google Sign-In Button Component
 * 
 * A reusable button for Google Sign-In using Firebase Authentication.
 * Works on both web and native (Capacitor) platforms.
 * 
 * Usage:
 * <GoogleSignInButton onSuccess={handleSuccess} onError={handleError} />
 */

import React, { useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { authService } from '../services/authService';
import { useAuth } from '../contexts/AuthContext';

// Google "G" logo as inline SVG
const GoogleLogo = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
    <path
      d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z"
      fill="#4285F4"
    />
    <path
      d="M9.003 18c2.43 0 4.467-.806 5.956-2.18l-2.909-2.26c-.806.54-1.836.86-3.047.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009.003 18z"
      fill="#34A853"
    />
    <path
      d="M3.964 10.712A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.33z"
      fill="#FBBC05"
    />
    <path
      d="M9.003 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.464.891 11.428 0 9.002 0A8.997 8.997 0 00.957 4.958L3.964 7.29c.708-2.127 2.692-3.71 5.036-3.71z"
      fill="#EA4335"
    />
  </svg>
);

const GoogleSignInButton = ({ 
  onSuccess, 
  onError, 
  className = '',
  disabled = false,
  text = 'Sign in with Google',
  fullWidth = false,
  variant = 'default' // 'default', 'outline', 'minimal'
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const { loginWithFirebase } = useAuth();

  const handleClick = async () => {
    if (isLoading || disabled) return;
    
    setIsLoading(true);
    
    try {
      let result;
      
      // Check if running on native platform
      if (Capacitor.isNativePlatform()) {
        // For native, we need to use the Capacitor Firebase plugin
        // This requires @capacitor-firebase/authentication to be set up
        try {
          const { FirebaseAuthentication } = await import('@capacitor-firebase/authentication');
          
          // Sign in with Google using native dialog
          const googleResult = await FirebaseAuthentication.signInWithGoogle();
          
          if (googleResult.credential?.idToken) {
            // Use the native token for Firebase auth
            result = await authService.signInWithGoogleNative(
              googleResult.credential.idToken,
              googleResult.credential.accessToken
            );
          } else {
            throw new Error('No ID token received from Google Sign-In');
          }
        } catch (nativeError) {
          console.error('Native Google Sign-In failed:', nativeError);
          throw nativeError;
        }
      } else {
        // Web: Use Firebase popup
        result = await authService.signInWithGoogle();
      }

      if (result.success) {
        // Update auth context
        await loginWithFirebase(result);
        
        if (onSuccess) {
          onSuccess(result);
        }
      }
    } catch (error) {
      console.error('Google Sign-In failed:', error);
      
      if (onError) {
        onError(error);
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Base styles
  const baseStyles = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '12px',
    padding: '10px 24px',
    borderRadius: '4px',
    fontSize: '14px',
    fontWeight: '500',
    cursor: disabled || isLoading ? 'not-allowed' : 'pointer',
    transition: 'all 0.2s ease',
    opacity: disabled || isLoading ? 0.6 : 1,
    width: fullWidth ? '100%' : 'auto',
  };

  // Variant styles
  const variantStyles = {
    default: {
      backgroundColor: '#ffffff',
      color: '#757575',
      border: '1px solid #dadce0',
      boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
    },
    outline: {
      backgroundColor: 'transparent',
      color: '#757575',
      border: '2px solid #dadce0',
    },
    minimal: {
      backgroundColor: 'transparent',
      color: '#1a73e8',
      border: 'none',
    }
  };

  const buttonStyles = {
    ...baseStyles,
    ...variantStyles[variant],
  };

  return (
    <button
      onClick={handleClick}
      disabled={disabled || isLoading}
      style={buttonStyles}
      className={className}
      type="button"
    >
      {isLoading ? (
        <span style={{ 
          width: '18px', 
          height: '18px', 
          border: '2px solid #dadce0', 
          borderTopColor: '#4285F4', 
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }} />
      ) : (
        <GoogleLogo />
      )}
      <span>{isLoading ? 'Signing in...' : text}</span>
      
      {/* Inline keyframes for spinner */}
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </button>
  );
};

export default GoogleSignInButton;
