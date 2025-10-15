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

// Validation schema
const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address.'),
  password: z.string().min(1, 'Password is required.'),
});

export default function Login() {
  const [showPassword, setShowPassword] = useState(false);
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
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data) => {
    setIsLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await authService.login(data);

      // Include password to initialize chat session
      login(response.user, response.token, data.password);

      setSuccess('Login successful! Redirecting...');

      // Small delay for smooth UX before redirect
      setTimeout(() => {
        navigate('/dashboard');
      }, 1000);
    } catch (err) {
      console.error('Login error:', err);

      const apiError =
        err.response?.data?.message || 'Login failed. Please try again.';

      setError(apiError);
    } finally {
      setIsLoading(false);
    }
  };


  // Show loading spinner while checking authentication
  if (isAuthenticated === undefined) {
    return <LoadingSpinner />;
  }

  return (
    <div className="flex min-h-screen flex-col justify-center bg-neutral-900 py-12 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="mt-6 text-center text-3xl font-bold tracking-tight text-white">
          Sign in to your account
        </h2>
        <p className="mt-2 text-center text-sm text-gray-400">
          Or{' '}
          <Link
            to="/signup"
            className="font-medium text-primary-500 hover:text-primary-400 hover:underline transition"
          >
            create a new account
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
              title="Login Failed"
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

          <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-white">
                Email address
              </label>
              <div className="mt-1">
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder="you@example.com"
                  className="block w-full rounded-md border border-neutral-600 bg-neutral-700 py-2 px-3 text-white placeholder-gray-400 focus:border-primary-500 focus:ring-2 focus:ring-primary-500 sm:text-sm transition"
                  {...register('email')}
                />
                {errors.email && (
                  <p className="mt-2 text-sm text-red-400">{errors.email.message}</p>
                )}
              </div>
            </div>

            {/* Password */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-white">
                Password
              </label>
              <div className="relative mt-1">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  className="block w-full rounded-md border border-neutral-600 bg-neutral-700 py-2 px-3 pr-10 text-white placeholder-gray-400 focus:border-primary-500 focus:ring-2 focus:ring-primary-500 sm:text-sm transition"
                  {...register('password')}
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-200 transition"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeSlashIcon className="h-5 w-5" aria-hidden="true" />
                  ) : (
                    <EyeIcon className="h-5 w-5" aria-hidden="true" />
                  )}
                </button>
                {errors.password && (
                  <p className="mt-2 text-sm text-red-400">{errors.password.message}</p>
                )}
              </div>
            </div>

            {/* Remember Me + Forgot Password */}
            <div className="flex items-center justify-between">
              <label className="flex items-center space-x-2">
                <input
                  id="remember-me"
                  type="checkbox"
                  className="h-4 w-4 rounded border-neutral-600 bg-neutral-700 text-primary-500 focus:ring-primary-500"
                />
                <span className="text-sm text-gray-300">Remember me</span>
              </label>

              <Link
                to="/password-reset"
                className="text-sm font-medium text-primary-500 hover:text-primary-400 hover:underline transition"
              >
                Forgot your password?
              </Link>
            </div>

            {/* Submit Button */}
            <div>
              <button
                type="submit"
                disabled={isLoading}
                className="flex w-full items-center justify-center rounded-md bg-primary-500 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-primary-600 focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 focus:ring-offset-neutral-900 disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                {isLoading ? (
                  <span className="flex items-center space-x-2">
                    <LoadingSpinner size="sm" />
                    <span>Signing in...</span>
                  </span>
                ) : (
                  'Sign in'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}