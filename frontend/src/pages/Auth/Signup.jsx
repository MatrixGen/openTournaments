import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';
import { useAuth } from '../../contexts/AuthContext';
import { authService } from '../../services/authService';
import Banner from '../../components/common/Banner';
import LoadingSpinner from '../../components/common/LoadingSpinner';

// ✅ Validation schema
const signupSchema = z
  .object({
    username: z.string().min(3, 'Username must be at least 3 characters.'),
    email: z.string().email('Please enter a valid email address.'),
    phone_number: z.string().optional(),
    password: z.string().min(8, 'Password must be at least 8 characters.'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match.",
    path: ['confirmPassword'],
  });

export default function Signup() {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  // Redirect if already logged in
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(signupSchema),
  });

  const onSubmit = async (formData) => {
    const { confirmPassword, ...submitData } = formData;
    setIsLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await authService.signup(submitData);
      login(response.user, response.token);
      setSuccess('Account created successfully! Redirecting to dashboard...');
      
      // Small delay to show success message
      setTimeout(() => {
        navigate('/dashboard');
      }, 1500);
    } catch (err) {
      console.error('Signup error:', err);

      // Handle different error sources gracefully
      const apiError =
        err.response?.data?.errors?.[0]?.msg ||
        err.response?.data?.message ||
        'Signup failed. Please try again.';
      setError(apiError);
    } finally {
      setIsLoading(false);
    }
  };

  // ✅ Helper input field component
  const InputField = ({
    id,
    label,
    type = 'text',
    autoComplete,
    registerField,
    errorMessage,
    showToggle,
    toggleState,
    setToggleState,
    placeholder = '',
  }) => (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-white">
        {label}
      </label>
      <div className="relative mt-1">
        <input
          id={id}
          type={showToggle && toggleState ? 'text' : type}
          autoComplete={autoComplete}
          placeholder={placeholder}
          className="block w-full rounded-md border border-neutral-600 bg-neutral-700 py-2 px-3 pr-10 text-white placeholder-gray-400 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500 sm:text-sm transition-colors"
          {...registerField}
        />
        {showToggle && (
          <button
            type="button"
            className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-300 transition-colors"
            onClick={() => setToggleState(!toggleState)}
          >
            {toggleState ? (
              <EyeSlashIcon className="h-5 w-5" aria-hidden="true" />
            ) : (
              <EyeIcon className="h-5 w-5" aria-hidden="true" />
            )}
          </button>
        )}
        {errorMessage && (
          <p className="mt-2 text-sm text-red-400">{errorMessage}</p>
        )}
      </div>
    </div>
  );

  // Show loading spinner while checking authentication
  if (isAuthenticated === undefined) {
    return <LoadingSpinner fullPage={true} text="Checking authentication..." />;
  }

  return (
    <div className="flex min-h-screen flex-col justify-center bg-neutral-900 py-12 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <h2 className="mt-6 text-3xl font-bold tracking-tight text-white">
          Create your account
        </h2>
        <p className="mt-2 text-sm text-gray-400">
          Or{' '}
          <Link
            to="/login"
            className="font-medium text-primary-500 hover:text-primary-400 hover:underline transition-colors"
          >
            sign in to your existing account
          </Link>
        </p>
      </div>

      {/* Form */}
      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-neutral-800 py-8 px-4 shadow sm:rounded-lg sm:px-10">
          {/* Error Banner */}
          {error && (
            <Banner
              type="error"
              title="Signup Failed"
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

          {/* Info Banner */}
          <Banner
            type="info"
            message="All fields except phone number are required. Phone verification can be completed later."
            className="mb-6"
          />

          <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
            <InputField
              id="username"
              label="Username"
              autoComplete="username"
              registerField={register('username')}
              errorMessage={errors.username?.message}
              placeholder="Enter your username"
            />
            
            <InputField
              id="email"
              label="Email address"
              type="email"
              autoComplete="email"
              registerField={register('email')}
              errorMessage={errors.email?.message}
              placeholder="you@example.com"
            />
            
            <InputField
              id="phoneNumber"
              label="Phone number (optional)"
              type="tel"
              autoComplete="tel"
              registerField={register('phone_number')}
              errorMessage={errors.phone_number?.message}
              placeholder="+1234567890"
            />
            
            <InputField
              id="password"
              label="Password"
              type="password"
              autoComplete="new-password"
              registerField={register('password')}
              errorMessage={errors.password?.message}
              showToggle
              toggleState={showPassword}
              setToggleState={setShowPassword}
              placeholder="At least 8 characters"
            />
            
            <InputField
              id="confirmPassword"
              label="Confirm Password"
              type="password"
              autoComplete="new-password"
              registerField={register('confirmPassword')}
              errorMessage={errors.confirmPassword?.message}
              showToggle
              toggleState={showConfirmPassword}
              setToggleState={setShowConfirmPassword}
              placeholder="Confirm your password"
            />

            {/* Additional Info */}
            <Banner
              type="info"
              message="After signing up, you'll receive an email verification link. You can also verify your phone number later in your account settings."
              showIcon={true}
            />

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="flex w-full justify-center items-center rounded-md bg-primary-500 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 focus:ring-offset-neutral-900 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading ? (
                <span className="flex items-center space-x-2">
                  <LoadingSpinner size="sm" />
                  <span>Creating account...</span>
                </span>
              ) : (
                'Sign up'
              )}
            </button>
          </form>

          {/* Terms Notice */}
          <Banner
            type="info"
            message="By creating an account, you agree to our Terms of Service and Privacy Policy."
            className="mt-6"
          />
        </div>
      </div>
    </div>
  );
}