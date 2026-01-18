// components/GoogleAuthButton.jsx
import React, { useState, useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { authService } from '../../services/authService';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

const GoogleAuthButton = ({ redirectUri = '/dashboard' }) => {
  const [isMobile, setIsMobile] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const { loginWithFirebase } = useAuth();
  const navigate = useNavigate();
  
  useEffect(() => {
    // Check if device is mobile on mount and on resize
    const checkIfMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    
    checkIfMobile();
    window.addEventListener('resize', checkIfMobile);
    
    return () => window.removeEventListener('resize', checkIfMobile);
  }, []);

  const handleGoogleSignIn = async () => {
    if (isLoading) return;
    
    setIsLoading(true);
    setErrorMsg(null);
    
    try {
      let result;
      
      // Check if running on native platform (Capacitor)
      if (Capacitor.isNativePlatform()) {
        try {
          // Use native Firebase authentication
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
          // Fall back to web-based auth if native fails
          result = await authService.signInWithGoogle();
        }
      } else {
        // Web: Use Firebase popup
        result = await authService.signInWithGoogle();
      }

      if (result.success) {
        // Update auth context
        await loginWithFirebase(result);
        
        // Navigate to redirect URI
        navigate(redirectUri, { replace: true });
      }
    } catch (err) {
      console.error('Google Sign-In failed:', err);
      
      // Handle specific error codes
      let errorMessage = 'Sign in failed. Please try again.';
      
      if (err.code === 'auth/popup-closed-by-user') {
        errorMessage = 'Sign in cancelled.';
      } else if (err.code === 'auth/network-request-failed') {
        errorMessage = 'Network error. Please check your connection.';
      } else if (err.code === 'auth/popup-blocked') {
        // Try redirect method if popup is blocked
        try {
          await authService.signInWithGoogleRedirect();
          return; // Redirect will happen
        } catch {
          errorMessage = 'Please allow popups for this site to sign in with Google.';
        }
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      setErrorMsg(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // Mobile-optimized touch target (minimum 44x44px recommended by Apple/Google)
  const mobileStyles = {
    container: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: isMobile ? '14px 24px' : '12px 20px',
      backgroundColor: '#fff',
      border: '1px solid #ddd',
      borderRadius: '8px', // Slightly larger radius for modern look
      cursor: 'pointer',
      fontWeight: '500',
      width: '100%', // Full width on mobile
      maxWidth: isMobile ? '100%' : '280px',
      minHeight: '44px', // Minimum touch target height
      boxShadow: isMobile ? '0 2px 4px rgba(0,0,0,0.1)' : 'none',
      transition: 'all 0.2s ease',
      fontSize: isMobile ? '16px' : '14px', // Larger text on mobile
      userSelect: 'none',
      WebkitTapHighlightColor: 'transparent', // Remove tap highlight on mobile
    },
    hover: {
      //backgroundColor: '#f8f8f8',
      boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
    },
    active: {
     // backgroundColor: '#f0f0f0',
      transform: 'scale(0.98)',
    }
  };

  const [buttonStyle, setButtonStyle] = useState(mobileStyles.container);

  return (
    <div style={{ width: '100%' }}>
      <button
        onClick={handleGoogleSignIn}
        className="google-signin-btn"
        style={{
          ...buttonStyle,
          opacity: isLoading ? 0.7 : 1,
          cursor: isLoading ? 'not-allowed' : 'pointer',
        }}
        onMouseEnter={() => !isLoading && setButtonStyle({ ...mobileStyles.container, ...mobileStyles.hover })}
        onMouseLeave={() => setButtonStyle(mobileStyles.container)}
        onMouseDown={() => !isLoading && setButtonStyle({ ...mobileStyles.container, ...mobileStyles.active })}
        onMouseUp={() => !isLoading && setButtonStyle({ ...mobileStyles.container, ...mobileStyles.hover })}
        onTouchStart={() => !isLoading && setButtonStyle({ ...mobileStyles.container, ...mobileStyles.active })}
        onTouchEnd={() => setButtonStyle(mobileStyles.container)}
        aria-label="Sign in with Google"
        type="button"
        disabled={isLoading}
      >
        {isLoading ? (
          <span
            style={{
              width: isMobile ? '22px' : '20px',
              height: isMobile ? '22px' : '20px',
              marginRight: '12px',
              border: '2px solid #ddd',
              borderTopColor: '#4285F4',
              borderRadius: '50%',
              display: 'inline-block',
              animation: 'google-btn-spin 1s linear infinite',
            }}
          />
        ) : (
          <img
            src="https://developers.google.com/identity/images/g-logo.png"
            alt="Google"
            style={{
              width: isMobile ? '22px' : '20px',
              height: isMobile ? '22px' : '20px',
              marginRight: '12px',
            }}
            loading="lazy"
            decoding="async"
          />
        )}
        {isLoading ? 'Signing in...' : 'Continue with Google'}
      </button>
      
      {errorMsg && (
        <p style={{
          color: '#dc2626',
          fontSize: '14px',
          marginTop: '8px',
          textAlign: 'center',
        }}>
          {errorMsg}
        </p>
      )}
      
      <style>{`
        @keyframes google-btn-spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default GoogleAuthButton;