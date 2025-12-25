// components/GoogleAuthButton.jsx
import React, { useState, useEffect } from 'react';
import { authService } from '../../services/authService';

const GoogleAuthButton = ({ redirectUri = '/dashboard', platform = 'web' }) => {
  const [isMobile, setIsMobile] = useState(false);
  
  useEffect(() => {
    // Check if device is mobile on mount and on resize
    const checkIfMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    
    checkIfMobile();
    window.addEventListener('resize', checkIfMobile);
    
    return () => window.removeEventListener('resize', checkIfMobile);
  }, []);

  const handleGoogleSignIn = () => {
    authService.initiateGoogleAuth(redirectUri, platform);
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
    <button
      onClick={handleGoogleSignIn}
      className="google-signin-btn"
      style={buttonStyle}
      onMouseEnter={() => setButtonStyle({ ...mobileStyles.container, ...mobileStyles.hover })}
      onMouseLeave={() => setButtonStyle(mobileStyles.container)}
      onMouseDown={() => setButtonStyle({ ...mobileStyles.container, ...mobileStyles.active })}
      onMouseUp={() => setButtonStyle({ ...mobileStyles.container, ...mobileStyles.hover })}
      onTouchStart={() => setButtonStyle({ ...mobileStyles.container, ...mobileStyles.active })}
      onTouchEnd={() => setButtonStyle(mobileStyles.container)}
      aria-label="Sign in with Google"
      type="button"
    >
      <img 
        src="https://developers.google.com/identity/images/g-logo.png" 
        alt="Google" 
        style={{ 
          width: isMobile ? '22px' : '20px', 
          height: isMobile ? '22px' : '20px',
          marginRight: '12px'
        }}
        loading="lazy"
        decoding="async"
      />
      Continue with Google
    </button>
  );
};

export default GoogleAuthButton;