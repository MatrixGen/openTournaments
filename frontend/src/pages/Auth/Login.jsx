import { useEffect, useState, useCallback, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { 
  EyeIcon, 
  EyeSlashIcon, 
  EnvelopeIcon,
  UserIcon,
  PhoneIcon,
  LockClosedIcon,
  KeyIcon,
  ArrowRightIcon,
  ShieldCheckIcon,
  DevicePhoneMobileIcon
} from '@heroicons/react/24/outline';
import { useAuth } from '../../contexts/AuthContext';
import { authService } from '../../services/authService';
import Banner from '../../components/common/Banner';
import LoadingSpinner from '../../components/common/LoadingSpinner';

// Enhanced validation schema
const loginSchema = z.object({
  identifier: z
    .string()
    .min(1, { message: 'Please enter your email, username, or phone number' })
    .refine(
      (val) => {
        const trimmed = val.trim();
        return (
          /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed) || // Email
          /^[a-zA-Z0-9_]{3,30}$/.test(trimmed) ||       // Username (3-30 chars, alphanumeric + underscore)
          /^\+?[1-9]\d{9,14}$/.test(trimmed)            // Phone with optional +, 10-15 digits
        );
      },
      { message: 'Please enter a valid email, username (3-30 chars), or phone number' }
    ),
  password: z
    .string()
    .min(1, { message: 'Password is required' })
    .min(8, { message: 'Password must be at least 8 characters' }),
  rememberMe: z.boolean().optional(),
});

export default function Login() {
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [identifierType, setIdentifierType] = useState('email'); // email, username, phone

  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  // Touch device detection
  const isTouchDevice = useMemo(() => 
    'ontouchstart' in window || navigator.maxTouchPoints > 0,
    []
  );

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  // Detect identifier type for better UX
  const detectIdentifierType = useCallback((value) => {
    const trimmed = value.trim();
    
    if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      return 'email';
    } else if (/^\+?[1-9]\d{9,14}$/.test(trimmed)) {
      return 'phone';
    } else if (/^[a-zA-Z0-9_]{3,30}$/.test(trimmed)) {
      return 'username';
    }
    return 'email'; // default
  }, []);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isValid, isDirty },
  } = useForm({
    resolver: zodResolver(loginSchema),
    mode: 'onChange',
    defaultValues: {
      identifier: '',
      password: '',
      rememberMe: false,
    },
  });

  const identifierValue = watch('identifier');
  
  // Update identifier type when user types
  useEffect(() => {
    if (identifierValue && identifierValue.length > 2) {
      setIdentifierType(detectIdentifierType(identifierValue));
    }
  }, [identifierValue, detectIdentifierType]);

  // Handle form submission
  const onSubmit = useCallback(async (data) => {
    setIsLoading(true);
    setError('');
    setSuccess('');

    try {
      // Clean and format identifier
      const cleanedData = {
        ...data,
        identifier: data.identifier.trim(),
      };

      const response = await authService.login(cleanedData);
// Pass the entire response object to the auth context
login(response); // or login(response) depending on your API structure
      // Store remember me preference
      if (data.rememberMe) {
        localStorage.setItem('rememberLogin', 'true');
      }

      setSuccess('Login successful! Redirecting to your dashboard...');
      
      // Delay redirect for better UX
      setTimeout(() => {
        navigate('/dashboard', { replace: true });
      }, 1500);
    } catch (err) {
      console.error('Login error:', err);
      
      // Enhanced error messages
      const status = err.response?.status;
      let message = 'Login failed. Please check your credentials and try again.';
      
      if (status === 401) {
        message = 'Invalid credentials. Please check your email/username and password.';
      } else if (status === 403) {
        message = 'Account not verified. Please check your email for verification.';
      } else if (status === 404) {
        message = 'Account not found. Please check your credentials or sign up.';
      } else if (status === 429) {
        message = 'Too many attempts. Please try again in a few minutes.';
      } else if (err.response?.data?.message) {
        message = err.response.data.message;
      }
      
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [login, navigate]);

  // Get identifier icon based on type
  const getIdentifierIcon = useMemo(() => {
    switch (identifierType) {
      case 'email': return EnvelopeIcon;
      case 'phone': return PhoneIcon;
      case 'username': return UserIcon;
      default: return EnvelopeIcon;
    }
  }, [identifierType]);

  // Get identifier placeholder based on type
  const getIdentifierPlaceholder = useMemo(() => {
    switch (identifierType) {
      case 'email': return 'name@example.com';
      case 'phone': return '+1 (555) 123-4567';
      case 'username': return 'username123';
      default: return 'name@example.com';
    }
  }, [identifierType]);

  if (isAuthenticated === undefined) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-neutral-900">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col justify-center bg-gradient-to-b from-gray-50 to-white dark:from-neutral-900 dark:to-neutral-950 transition-colors py-6 sm:py-12">
      {/* Main Container */}
      <div className="mx-auto w-full max-w-md px-4 sm:px-6 lg:px-8">
        {/* Brand/Header Section */}
        <div className="text-center mb-8 sm:mb-10">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-primary-50 dark:bg-primary-900/20 rounded-2xl mb-4">
            <ShieldCheckIcon className="h-7 w-7 text-primary-600 dark:text-primary-400" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
            Welcome Back
          </h1>
          <p className="mt-2 text-sm sm:text-base text-gray-600 dark:text-gray-400">
            Sign in to access your tournament dashboard
          </p>
        </div>

        {/* Form Card */}
        <div className="bg-white dark:bg-neutral-800 rounded-2xl shadow-lg border border-gray-200 dark:border-neutral-700 overflow-hidden">
          {/* Card Header */}
          <div className="px-6 sm:px-8 pt-6 sm:pt-8">
            <h2 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white">
              Sign In
            </h2>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
              Enter your credentials to continue
            </p>
          </div>

          {/* Form Content */}
          <div className="px-6 sm:px-8 py-6">
            {/* Error Banner */}
            {error && (
              <Banner
                type="error"
                title="Authentication Failed"
                message={error}
                onClose={() => setError('')}
                className="mb-6"
              />
            )}

            {/* Success Banner */}
            {success && (
              <Banner
                type="success"
                title="Success!"
                message={success}
                className="mb-6"
              />
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              {/* Identifier Field */}
              <div>
                <label htmlFor="identifier" className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
                  Email, Username, or Phone
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    {(() => {
                      const Icon = getIdentifierIcon;
                      return <Icon className="h-5 w-5 text-gray-400" />;
                    })()}
                  </div>
                  <input
                    id="identifier"
                    type="text"
                    autoComplete="username"
                    placeholder={getIdentifierPlaceholder}
                    className={`pl-10 w-full rounded-lg border bg-white dark:bg-neutral-700 py-3 px-4 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 text-sm transition-colors ${
                      errors.identifier
                        ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
                        : 'border-gray-300 dark:border-neutral-600 focus:border-primary-500 focus:ring-primary-500'
                    } ${isTouchDevice ? 'text-base' : ''}`}
                    {...register('identifier')}
                    aria-invalid={!!errors.identifier}
                    aria-describedby={errors.identifier ? "identifier-error" : undefined}
                  />
                </div>
                {errors.identifier && (
                  <p id="identifier-error" className="mt-2 text-sm text-red-600 dark:text-red-400">
                    {errors.identifier.message}
                  </p>
                )}
                <div className="mt-1 text-xs text-gray-500 dark:text-gray-400 flex items-center gap-2">
                  <span>Auto-detected: </span>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-100 dark:bg-neutral-700 rounded">
                    {(() => {
                      const Icon = getIdentifierIcon;
                      return <Icon className="h-3 w-3" />;
                    })()}
                    <span className="capitalize">{identifierType}</span>
                  </span>
                </div>
              </div>

              {/* Password Field */}
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
                  Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <LockClosedIcon className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    className={`pl-10 pr-10 w-full rounded-lg border bg-white dark:bg-neutral-700 py-3 px-4 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 text-sm transition-colors ${
                      errors.password
                        ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
                        : 'border-gray-300 dark:border-neutral-600 focus:border-primary-500 focus:ring-primary-500'
                    } ${isTouchDevice ? 'text-base' : ''}`}
                    {...register('password')}
                    aria-invalid={!!errors.password}
                    aria-describedby={errors.password ? "password-error" : undefined}
                  />
                  <button
                    type="button"
                    className={`absolute inset-y-0 right-0 pr-3 flex items-center ${
                      isTouchDevice ? 'p-3' : ''
                    } text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors`}
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? (
                      <EyeSlashIcon className="h-5 w-5" />
                    ) : (
                      <EyeIcon className="h-5 w-5" />
                    )}
                  </button>
                </div>
                {errors.password && (
                  <p id="password-error" className="mt-2 text-sm text-red-600 dark:text-red-400">
                    {errors.password.message}
                  </p>
                )}
              </div>

              {/* Options Row */}
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer group">
                  <input
                    type="checkbox"
                    id="rememberMe"
                    className={`w-4 h-4 rounded border-gray-300 dark:border-neutral-600 bg-white dark:bg-neutral-700 text-primary-500 focus:ring-primary-500 ${
                      isTouchDevice ? 'active:scale-95' : ''
                    }`}
                    {...register('rememberMe')}
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-white transition-colors">
                    Remember me
                  </span>
                </label>

                <Link
                  to="/password-reset"
                  className="text-sm font-medium text-primary-600 dark:text-primary-400 hover:text-primary-500 dark:hover:text-primary-300 hover:underline transition-colors"
                >
                  Forgot password?
                </Link>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading || !isValid || !isDirty}
                className={`w-full inline-flex items-center justify-center py-3 px-4 rounded-lg text-sm font-medium text-white shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 transition-all ${
                  isTouchDevice ? 'active:scale-98 min-h-12' : ''
                } ${
                  isLoading || !isValid || !isDirty
                    ? 'bg-gray-300 dark:bg-gray-600 cursor-not-allowed'
                    : 'bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700'
                }`}
              >
                {isLoading ? (
                  <>
                    <LoadingSpinner size="sm" className="mr-2" />
                    Signing In...
                  </>
                ) : (
                  <>
                    Sign In
                    <ArrowRightIcon className="ml-2 h-4 w-4" />
                  </>
                )}
              </button>
            </form>

          </div>

          {/* Card Footer */}
          <div className="px-6 sm:px-8 py-4 bg-gray-50 dark:bg-neutral-700/30 border-t border-gray-200 dark:border-neutral-700">
            <p className="text-center text-sm text-gray-600 dark:text-gray-400">
              Don't have an account?{' '}
              <Link
                to="/signup"
                className="font-semibold text-primary-600 dark:text-primary-400 hover:text-primary-500 dark:hover:text-primary-300 hover:underline transition-colors"
              >
                Create account
              </Link>
            </p>
          </div>
        </div>

        {/* Additional Links for Mobile */}
        {isTouchDevice && (
          <div className="mt-6 grid grid-cols-2 gap-3">
            <Link
              to="/signup"
              className="inline-flex items-center justify-center py-2.5 px-4 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-neutral-700 rounded-lg hover:bg-gray-200 dark:hover:bg-neutral-600 transition-colors"
            >
              Create Account
            </Link>
            <Link
              to="/support"
              className="inline-flex items-center justify-center py-2.5 px-4 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-neutral-700 rounded-lg hover:bg-gray-200 dark:hover:bg-neutral-600 transition-colors"
            >
              Need Help?
            </Link>
          </div>
        )}

        {/* Security Notice */}
        <div className="mt-8 text-center">
          <div className="inline-flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-neutral-800/50 px-4 py-2 rounded-full">
            <KeyIcon className="h-3 w-3" />
            <span>Your credentials are encrypted and securely transmitted</span>
          </div>
        </div>
      </div>
    </div>
  );
}