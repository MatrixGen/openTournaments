// src/pages/Auth/OAuthCallbackPage.jsx
import { useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

function OAuthCallback() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { login } = useAuth();
  const hasProcessed = useRef(false);

  useEffect(() => {
    // Prevent double execution in React Strict Mode
    if (hasProcessed.current) return;
    hasProcessed.current = true;

    console.log('=== OAUTH CALLBACK STARTED ===');
    
    // Extract parameters from URL
    const token = searchParams.get('token');
    const userJson = searchParams.get('user');
    
    console.log('Token from URL:', token ? 'Present ✓' : 'Missing ✗');
    console.log('User data from URL:', userJson ? 'Present ✓' : 'Missing ✗');
    
    // Validate required parameters
    if (!token || !userJson) {
      console.error('Missing required parameters in URL');
      navigate('/login');
      return;
    }
    
    try {
      // 1. Parse user data
      const user = JSON.parse(decodeURIComponent(userJson));
      console.log('User parsed successfully:', {
        id: user.id,
        email: user.email,
        username: user.username
      });
      
      // 2. Prepare data in the format AuthContext.login() expects
      const loginData = {
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
          phone_number: user.phone_number,
          wallet_balance: user.wallet_balance,
          role: user.role,
          chatUserId: user.chatUserId,
          oauth_provider: user.oauth_provider,
          email_verified: user.email_verified,
          has_password:user.has_password,
        },
        tokens: {
          platform: token, // This will be stored as 'authToken' in localStorage
          // Note: chat tokens are not provided in OAuth, will be initialized separately
          chat: null,
          chatRefresh: null
        }
      };
      
      console.log('Login data prepared:', loginData);
      
      // 3. Call AuthContext login function
      console.log('Calling AuthContext.login()...');
      const loginSuccess = login(loginData);
      
      if (!loginSuccess) {
        throw new Error('AuthContext.login() failed');
      }
      
      console.log('AuthContext.login() successful');
      
      // 4. Verify storage
      const storedToken = localStorage.getItem('authToken');
      const storedUser = localStorage.getItem('userData');
      
      console.log('Storage verification:', {
        authToken: storedToken ? 'Stored ✓' : 'Missing ✗',
        userData: storedUser ? 'Stored ✓' : 'Missing ✗'
      });
      
      // 5. Clear sensitive data from URL (security best practice)
      window.history.replaceState({}, document.title, '/oauth-callback');
      
      // 6. Redirect to dashboard with small delay for state updates
      console.log('Redirecting to /dashboard...');
      setTimeout(() => {
        navigate('/dashboard', { replace: true });
      }, 100);
      
    } catch (error) {
      console.error('Error in OAuth callback:', error);
      console.error('Error details:', {
        message: error.message,
        stack: error.stack,
        tokenLength: token?.length,
        userJsonPreview: userJson?.substring(0, 100)
      });
      
      // Clear any partial data on error
      localStorage.removeItem('authToken');
      localStorage.removeItem('userData');
      localStorage.removeItem('platformToken'); // Clean up old key if exists
      
      // Redirect to login with error state
      navigate('/login', { 
        state: { 
          error: 'Authentication failed. Please try again.' 
        } 
      });
    }
  }, [navigate, searchParams, login]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 dark:bg-neutral-900 p-4">
      <div className="max-w-md w-full text-center space-y-6">
        {/* Loading animation */}
        <div className="relative">
          <div className="h-24 w-24 rounded-full border-4 border-gray-200 dark:border-neutral-700 mx-auto"></div>
          <div className="h-24 w-24 rounded-full border-4 border-t-primary-500 border-r-transparent border-b-transparent border-l-transparent animate-spin absolute top-0 left-1/2 transform -translate-x-1/2"></div>
        </div>
        
        {/* Status message */}
        <div className="space-y-3">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-900 dark:text-white">
            Completing Sign In
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            Please wait while we secure your account...
          </p>
        </div>
        
        {/* Progress indicator */}
        <div className="w-full bg-gray-200 dark:bg-neutral-700 rounded-full h-2">
          <div className="bg-primary-500 h-2 rounded-full animate-pulse"></div>
        </div>
        
      </div>
    </div>
  );
}

export default OAuthCallback;