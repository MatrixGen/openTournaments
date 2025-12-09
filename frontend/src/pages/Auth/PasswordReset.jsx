import { useState, useCallback, useMemo, useEffect } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import Header from '../../components/layout/Header';
import { authService } from '../../services/authService';
import Banner from '../../components/common/Banner';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import {
  EnvelopeIcon,
  DevicePhoneMobileIcon,
  LockClosedIcon,
  KeyIcon,
  ArrowLeftIcon,
  CheckCircleIcon,
  ShieldCheckIcon,
  ClockIcon,
  EyeIcon,
  EyeSlashIcon,
} from '@heroicons/react/24/outline';

export default function PasswordReset() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [step, setStep] = useState(searchParams.get('token') ? 'reset' : 'request');
  const [method, setMethod] = useState('email');
  const [formData, setFormData] = useState({
    email: '',
    phone: '',
    token: searchParams.get('token') || '',
    code: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [showPassword, setShowPassword] = useState({
    newPassword: false,
    confirmPassword: false,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [resetContact, setResetContact] = useState('');
  const [passwordStrength, setPasswordStrength] = useState(0);
  const [cooldown, setCooldown] = useState(0);

  // Touch device detection for mobile optimizations
  const isTouchDevice = useMemo(() =>
    'ontouchstart' in window || navigator.maxTouchPoints > 0,
    []
  );

  // Cooldown timer for resend
  useEffect(() => {
    if (cooldown > 0) {
      const timer = setTimeout(() => setCooldown(cooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [cooldown]);

  // Calculate password strength
  const calculatePasswordStrength = useCallback((password) => {
    let strength = 0;
    if (password.length >= 8) strength += 1;
    if (/[A-Z]/.test(password)) strength += 1;
    if (/[a-z]/.test(password)) strength += 1;
    if (/[0-9]/.test(password)) strength += 1;
    if (/[^A-Za-z0-9]/.test(password)) strength += 1;
    return Math.min(5, strength);
  }, []);

  // Update password strength on change
  useEffect(() => {
    setPasswordStrength(calculatePasswordStrength(formData.newPassword));
  }, [formData.newPassword, calculatePasswordStrength]);

  const updateFormData = useCallback((field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (error) setError('');
  }, [error]);

  const togglePasswordVisibility = useCallback((field) => {
    setShowPassword(prev => ({ ...prev, [field]: !prev[field] }));
  }, []);

  const handleRequestReset = useCallback(async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setSuccess('');

    const contact = method === 'email' ? formData.email.trim() : formData.phone.trim();

    if (!contact) {
      setError(method === 'email' ? 'Please enter your email address' : 'Please enter your phone number');
      setIsLoading(false);
      return;
    }

    try {
      if (method === 'email') {
        await authService.requestPasswordResetEmail(contact);
        setResetContact(formData.email);
        setSuccess(`Password reset instructions have been sent to ${formatEmailForDisplay(formData.email)}`);
      } else {
        await authService.requestPasswordResetSMS(contact);
        setResetContact(formData.phone);
        setSuccess(`Password reset code has been sent to ${formatPhoneForDisplay(formData.phone)}`);
      }
      setCooldown(60); // 60-second cooldown for resend
      setStep('reset');
    } catch (err) {
      console.error('Password reset request error:', err);
      const status = err.response?.status;
      let message = 'Failed to request password reset. Please try again.';

      if (status === 404) {
        message = method === 'email' 
          ? 'No account found with this email address.' 
          : 'No account found with this phone number.';
      } else if (status === 429) {
        message = 'Too many attempts. Please wait a few minutes before trying again.';
      } else if (err.response?.data?.message) {
        message = err.response.data.message;
      }

      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [method, formData.email, formData.phone]);

  const handleResetPassword = useCallback(async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setSuccess('');

    // Validation
    if (method === 'email' && !formData.token.trim()) {
      setError('Please enter the verification token from your email.');
      setIsLoading(false);
      return;
    }

    if (method === 'sms' && !formData.code.trim()) {
      setError('Please enter the verification code from your SMS.');
      setIsLoading(false);
      return;
    }

    if (formData.newPassword.length < 8) {
      setError('Password must be at least 8 characters long.');
      setIsLoading(false);
      return;
    }

    if (formData.newPassword !== formData.confirmPassword) {
      setError('Passwords do not match. Please try again.');
      setIsLoading(false);
      return;
    }

    try {
      if (method === 'email') {
        await authService.resetPasswordWithToken(formData.token, formData.newPassword);
      } else {
        await authService.resetPasswordWithCode(resetContact, formData.code, formData.newPassword);
      }

      setSuccess('Password reset successfully! Redirecting to login...');

      setTimeout(() => {
        navigate('/login', { state: { passwordResetSuccess: true } });
      }, 3000);
    } catch (err) {
      console.error('Password reset error:', err);
      const status = err.response?.status;
      let message = 'Failed to reset password. Please try again.';

      if (status === 400) {
        message = 'Invalid or expired verification code. Please request a new one.';
      } else if (status === 401) {
        message = 'Invalid verification credentials. Please check and try again.';
      } else if (err.response?.data?.message) {
        message = err.response.data.message;
      }

      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [method, formData, resetContact, navigate]);

  const handleResendCode = useCallback(async () => {
    if (cooldown > 0) return;

    setIsLoading(true);
    setError('');
    setSuccess('');

    try {
      if (method === 'email') {
        await authService.requestPasswordResetEmail(resetContact);
        setSuccess('New verification email sent!');
      } else {
        await authService.requestPasswordResetSMS(resetContact);
        setSuccess('New verification code sent!');
      }
      setCooldown(60);
    } catch  {
      setError('Failed to resend verification. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [method, resetContact, cooldown]);

  const formatEmailForDisplay = useCallback((email) => {
    if (!email) return '';
    const [local, domain] = email.split('@');
    if (local.length <= 2) return email;
    return `${local.substring(0, 2)}***@${domain}`;
  }, []);

  const formatPhoneForDisplay = useCallback((phone) => {
    if (!phone) return '';
    // Show last 4 digits only for privacy
    const visible = phone.slice(-4);
    return `••••••${visible}`;
  }, []);

  const getPasswordStrengthColor = useMemo(() => {
    if (passwordStrength <= 1) return 'bg-red-500';
    if (passwordStrength <= 3) return 'bg-yellow-500';
    return 'bg-green-500';
  }, [passwordStrength]);

  const getPasswordStrengthText = useMemo(() => {
    if (passwordStrength <= 1) return 'Very Weak';
    if (passwordStrength <= 2) return 'Weak';
    if (passwordStrength <= 3) return 'Good';
    if (passwordStrength <= 4) return 'Strong';
    return 'Very Strong';
  }, [passwordStrength]);

  // Method selection tabs
  const methodTabs = useMemo(() => [
    {
      id: 'email',
      label: 'Email',
      icon: EnvelopeIcon,
      description: 'Receive reset instructions via email',
    },
    {
      id: 'sms',
      label: 'SMS',
      icon: DevicePhoneMobileIcon,
      description: 'Receive a verification code via SMS',
    },
  ], []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white dark:from-neutral-900 dark:to-neutral-950 transition-colors">
      <Header />
      
      <main className="mx-auto max-w-md py-6 sm:py-8 px-3 sm:px-4 lg:px-8">
        {/* Back button */}
        <Link
          to="/login"
          className="inline-flex items-center text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-300 mb-6 sm:mb-8 group"
        >
          <ArrowLeftIcon className="h-4 w-4 mr-2 group-hover:-translate-x-1 transition-transform" />
          Back to Login
        </Link>

        {/* Header */}
        <div className="text-center mb-6 sm:mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-50 dark:bg-primary-900/20 rounded-full mb-4">
            <KeyIcon className="h-8 w-8 text-primary-600 dark:text-primary-400" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
            {step === 'request' ? 'Reset Your Password' : 'Create New Password'}
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400 text-sm sm:text-base">
            {step === 'request'
              ? 'Choose how you want to reset your password'
              : 'Enter your new password to continue'
            }
          </p>
        </div>

        {/* Error Banner */}
        {error && (
          <Banner
            type="error"
            title="Reset Failed"
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

        {/* Main Form Card */}
        <div className="bg-white dark:bg-neutral-800 rounded-xl shadow-sm border border-gray-200 dark:border-neutral-700 p-4 sm:p-6">
          {/* Step 1: Request Reset */}
          {step === 'request' ? (
            <form onSubmit={handleRequestReset}>
              {/* Method Selection Tabs */}
              <div className="mb-6">
                <div className="flex border-b border-gray-200 dark:border-neutral-700">
                  {methodTabs.map((tab) => {
                    const Icon = tab.icon;
                    const isActive = method === tab.id;
                    
                    return (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => setMethod(tab.id)}
                        className={`flex-1 flex flex-col items-center py-3 px-2 text-sm font-medium transition-colors ${
                          isActive
                            ? 'text-primary-600 dark:text-primary-400 border-b-2 border-primary-500'
                            : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                        }`}
                      >
                        <Icon className={`h-5 w-5 mb-1 ${isActive ? 'opacity-100' : 'opacity-70'}`} />
                        <span>{tab.label}</span>
                      </button>
                    );
                  })}
                </div>
                <p className="mt-2 text-center text-xs text-gray-500 dark:text-gray-400">
                  {methodTabs.find(tab => tab.id === method)?.description}
                </p>
              </div>

              {/* Contact Input */}
              <div className="mb-6">
                <label htmlFor="contact" className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
                  {method === 'email' ? 'Email Address' : 'Phone Number'}
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    {method === 'email' ? (
                      <EnvelopeIcon className="h-5 w-5 text-gray-400" />
                    ) : (
                      <DevicePhoneMobileIcon className="h-5 w-5 text-gray-400" />
                    )}
                  </div>
                  <input
                    type={method === 'email' ? 'email' : 'tel'}
                    id="contact"
                    value={method === 'email' ? formData.email : formData.phone}
                    onChange={(e) => updateFormData(method === 'email' ? 'email' : 'phone', e.target.value)}
                    className={`pl-10 w-full rounded-lg border bg-white dark:bg-neutral-700 py-3 px-4 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 text-sm transition-colors ${
                      isTouchDevice ? 'text-base' : ''
                    } border-gray-300 dark:border-neutral-600 focus:border-primary-500 focus:ring-primary-500`}
                    placeholder={method === 'email' ? 'name@example.com' : '+1 (555) 123-4567'}
                    required
                  />
                </div>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  {method === 'email'
                    ? 'We will send reset instructions to this email'
                    : 'We will send a verification code to this number'
                  }
                </p>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading}
                className={`w-full inline-flex items-center justify-center py-3 px-4 rounded-lg text-sm font-medium text-white shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all ${
                  isTouchDevice ? 'active:scale-98 min-h-12' : ''
                } ${
                  isLoading
                    ? 'bg-gray-400 dark:bg-gray-600 cursor-not-allowed'
                    : 'bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700'
                }`}
              >
                {isLoading ? (
                  <>
                    <LoadingSpinner size="sm" className="mr-2" />
                    Sending...
                  </>
                ) : (
                  'Send Reset Instructions'
                )}
              </button>
            </form>
          ) : (
            /* Step 2: Reset Password */
            <form onSubmit={handleResetPassword}>
              {/* Verification Input */}
              <div className="mb-6">
                <label htmlFor="verification" className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
                  {method === 'email' ? 'Verification Token' : 'Verification Code'}
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <ShieldCheckIcon className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    id="verification"
                    value={method === 'email' ? formData.token : formData.code}
                    onChange={(e) => updateFormData(method === 'email' ? 'token' : 'code', e.target.value)}
                    className={`pl-10 w-full rounded-lg border bg-white dark:bg-neutral-700 py-3 px-4 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 text-sm transition-colors ${
                      isTouchDevice ? 'text-base' : ''
                    } border-gray-300 dark:border-neutral-600 focus:border-primary-500 focus:ring-primary-500`}
                    placeholder={method === 'email' ? 'Enter token from email' : 'Enter 6-digit code'}
                    required
                    maxLength={method === 'email' ? undefined : 6}
                  />
                </div>
                <div className="flex justify-between items-center mt-1">
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {method === 'email'
                      ? 'Check your email for the reset token'
                      : `Sent to ${formatPhoneForDisplay(resetContact)}`
                    }
                  </p>
                  {method === 'sms' && (
                    <button
                      type="button"
                      onClick={handleResendCode}
                      disabled={cooldown > 0 || isLoading}
                      className="text-xs font-medium text-primary-600 dark:text-primary-400 hover:text-primary-500 dark:hover:text-primary-300 disabled:text-gray-400 dark:disabled:text-gray-500"
                    >
                      {cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend code'}
                    </button>
                  )}
                </div>
              </div>

              {/* New Password */}
              <div className="mb-4">
                <label htmlFor="newPassword" className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
                  New Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <LockClosedIcon className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type={showPassword.newPassword ? 'text' : 'password'}
                    id="newPassword"
                    value={formData.newPassword}
                    onChange={(e) => updateFormData('newPassword', e.target.value)}
                    className={`pl-10 pr-10 w-full rounded-lg border bg-white dark:bg-neutral-700 py-3 px-4 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 text-sm transition-colors ${
                      isTouchDevice ? 'text-base' : ''
                    } border-gray-300 dark:border-neutral-600 focus:border-primary-500 focus:ring-primary-500`}
                    placeholder="Enter new password"
                    required
                    minLength="8"
                  />
                  <button
                    type="button"
                    className={`absolute inset-y-0 right-0 pr-3 flex items-center ${
                      isTouchDevice ? 'p-3' : ''
                    } text-gray-400 hover:text-gray-600 dark:hover:text-gray-300`}
                    onClick={() => togglePasswordVisibility('newPassword')}
                  >
                    {showPassword.newPassword ? (
                      <EyeSlashIcon className="h-5 w-5" />
                    ) : (
                      <EyeIcon className="h-5 w-5" />
                    )}
                  </button>
                </div>

                {/* Password Strength Indicator */}
                {formData.newPassword && (
                  <div className="mt-2">
                    <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
                      <span>Password Strength</span>
                      <span className={`font-medium ${
                        passwordStrength <= 1 ? 'text-red-600 dark:text-red-400' :
                        passwordStrength <= 3 ? 'text-yellow-600 dark:text-yellow-400' :
                        'text-green-600 dark:text-green-400'
                      }`}>
                        {getPasswordStrengthText}
                      </span>
                    </div>
                    <div className="h-1.5 bg-gray-200 dark:bg-neutral-700 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${getPasswordStrengthColor} transition-all duration-300`}
                        style={{ width: `${(passwordStrength / 5) * 100}%` }}
                      />
                    </div>
                    <ul className="mt-2 text-xs text-gray-500 dark:text-gray-400 space-y-0.5">
                      <li className={`flex items-center ${formData.newPassword.length >= 8 ? 'text-green-600 dark:text-green-400' : ''}`}>
                        <span className="mr-1">•</span>
                        At least 8 characters
                      </li>
                      <li className={`flex items-center ${/[A-Z]/.test(formData.newPassword) ? 'text-green-600 dark:text-green-400' : ''}`}>
                        <span className="mr-1">•</span>
                        Contains uppercase letter
                      </li>
                      <li className={`flex items-center ${/[0-9]/.test(formData.newPassword) ? 'text-green-600 dark:text-green-400' : ''}`}>
                        <span className="mr-1">•</span>
                        Contains number
                      </li>
                    </ul>
                  </div>
                )}
              </div>

              {/* Confirm Password */}
              <div className="mb-6">
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
                  Confirm New Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <LockClosedIcon className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type={showPassword.confirmPassword ? 'text' : 'password'}
                    id="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={(e) => updateFormData('confirmPassword', e.target.value)}
                    className={`pl-10 pr-10 w-full rounded-lg border bg-white dark:bg-neutral-700 py-3 px-4 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 text-sm transition-colors ${
                      isTouchDevice ? 'text-base' : ''
                    } border-gray-300 dark:border-neutral-600 focus:border-primary-500 focus:ring-primary-500`}
                    placeholder="Confirm new password"
                    required
                    minLength="8"
                  />
                  <button
                    type="button"
                    className={`absolute inset-y-0 right-0 pr-3 flex items-center ${
                      isTouchDevice ? 'p-3' : ''
                    } text-gray-400 hover:text-gray-600 dark:hover:text-gray-300`}
                    onClick={() => togglePasswordVisibility('confirmPassword')}
                  >
                    {showPassword.confirmPassword ? (
                      <EyeSlashIcon className="h-5 w-5" />
                    ) : (
                      <EyeIcon className="h-5 w-5" />
                    )}
                  </button>
                </div>
                {formData.confirmPassword && formData.newPassword !== formData.confirmPassword && (
                  <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                    Passwords do not match
                  </p>
                )}
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading || formData.newPassword !== formData.confirmPassword || formData.newPassword.length < 8}
                className={`w-full inline-flex items-center justify-center py-3 px-4 rounded-lg text-sm font-medium text-white shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all ${
                  isTouchDevice ? 'active:scale-98 min-h-12' : ''
                } ${
                  isLoading || formData.newPassword !== formData.confirmPassword || formData.newPassword.length < 8
                    ? 'bg-gray-400 dark:bg-gray-600 cursor-not-allowed'
                    : 'bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700'
                }`}
              >
                {isLoading ? (
                  <>
                    <LoadingSpinner size="sm" className="mr-2" />
                    Resetting...
                  </>
                ) : (
                  'Reset Password'
                )}
              </button>
            </form>
          )}

          {/* Resend/Back links */}
          {step === 'reset' && (
            <div className="mt-6 pt-6 border-t border-gray-200 dark:border-neutral-700">
              <button
                type="button"
                onClick={() => setStep('request')}
                className="text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-300 w-full text-center"
              >
                ← Use different {method === 'email' ? 'email' : 'phone number'}
              </button>
            </div>
          )}
        </div>

        {/* Security Note */}
        <div className="mt-6 text-center">
          <div className="inline-flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-neutral-800/50 px-4 py-2 rounded-full">
            <ShieldCheckIcon className="h-3 w-3" />
            <span>Your password reset is encrypted and secure</span>
          </div>
        </div>
      </main>
    </div>
  );
}