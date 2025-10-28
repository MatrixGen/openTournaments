import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import Header from '../../components/layout/Header';
import { authService } from '../../services/authService';

export default function PasswordReset() {
  const [searchParams] = useSearchParams();
  const [step, setStep] = useState(searchParams.get('token') ? 'reset' : 'request');
  const [method, setMethod] = useState('email');
  const [formData, setFormData] = useState({
    email: '',
    phone: '',
    token: searchParams.get('token') || '',
    code: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [resetContact, setResetContact] = useState(''); 

  const handleRequestReset = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setSuccess('');

    try {
      if (method === 'email') {
        await authService.requestPasswordResetEmail(formData.email);
        setResetContact(formData.email);
        setSuccess('Password reset instructions have been sent to your email.');
        setStep('reset');
      } else {
        await authService.requestPasswordResetSMS(formData.phone);
        setResetContact(formData.phone);
        setSuccess('Password reset code has been sent to your phone.');
        setStep('reset');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to request password reset.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setSuccess('');

    // Password validation
    if (formData.newPassword !== formData.confirmPassword) {
      setError('Passwords do not match.');
      setIsLoading(false);
      return;
    }

    if (formData.newPassword.length < 8) {
      setError('Password must be at least 8 characters long.');
      setIsLoading(false);
      return;
    }

    try {
      if (method === 'email') {
        // Email flow: Use token from URL or form
        await authService.resetPasswordWithToken(formData.token, formData.newPassword);
      } else {
        // SMS flow: Use phone number from request step and code from form
        await authService.resetPasswordWithCode(resetContact, formData.code, formData.newPassword);
      }
      
      setSuccess('Password reset successfully! Redirecting to login...');
      
      setTimeout(() => {
        window.location.href = '/login';
      }, 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to reset password.');
    } finally {
      setIsLoading(false);
    }
  };

  const updateFormData = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="min-h-screen bg-neutral-900">
     
      <main className="mx-auto max-w-md py-8 px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white">
            {step === 'request' ? 'Reset Your Password' : 'Create New Password'}
          </h1>
          <p className="mt-2 text-gray-400">
            {step === 'request' 
              ? 'Choose how you want to reset your password'
              : 'Enter your new password'
            }
          </p>
        </div>

        {error && (
          <div className="mb-6 rounded-md bg-red-800/50 py-3 px-4 text-sm text-red-200">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-6 rounded-md bg-green-800/50 py-3 px-4 text-sm text-green-200">
            {success}
          </div>
        )}

        <div className="bg-neutral-800 rounded-lg shadow p-6">
          {step === 'request' ? (
            <form onSubmit={handleRequestReset}>
              <div className="flex mb-4 border-b border-neutral-700">
                <button
                  type="button"
                  onClick={() => setMethod('email')}
                  className={`flex-1 py-2 text-center font-medium ${
                    method === 'email'
                      ? 'text-primary-500 border-b-2 border-primary-500'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  Email
                </button>
                <button
                  type="button"
                  onClick={() => setMethod('sms')}
                  className={`flex-1 py-2 text-center font-medium ${
                    method === 'sms'
                      ? 'text-primary-500 border-b-2 border-primary-500'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  SMS
                </button>
              </div>

              <div className="mb-4">
                <label htmlFor="contact" className="block text-sm font-medium text-white mb-2">
                  {method === 'email' ? 'Email Address' : 'Phone Number'}
                </label>
                <input
                  type={method === 'email' ? 'email' : 'tel'}
                  id="contact"
                  value={method === 'email' ? formData.email : formData.phone}
                  onChange={(e) => updateFormData(method === 'email' ? 'email' : 'phone', e.target.value)}
                  className="w-full rounded-md border border-neutral-600 bg-neutral-700 py-2 px-3 text-white placeholder-gray-400 focus:border-primary-500 focus:outline-none focus:ring-primary-500 sm:text-sm"
                  placeholder={method === 'email' ? 'your@email.com' : '+255123456789'}
                  required
                />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-primary-500 hover:bg-primary-600 text-white font-medium py-2 px-4 rounded disabled:opacity-50"
              >
                {isLoading ? 'Sending...' : 'Send Reset Instructions'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleResetPassword}>
              {method === 'email' ? (
                <div className="mb-4">
                  <label htmlFor="token" className="block text-sm font-medium text-white mb-2">
                    Verification Token
                  </label>
                  <input
                    type="text"
                    id="token"
                    value={formData.token}
                    onChange={(e) => updateFormData('token', e.target.value)}
                    className="w-full rounded-md border border-neutral-600 bg-neutral-700 py-2 px-3 text-white placeholder-gray-400 focus:border-primary-500 focus:outline-none focus:ring-primary-500 sm:text-sm"
                    placeholder="Enter token from email"
                    required
                  />
                  <p className="mt-1 text-xs text-gray-400">
                    Check your email for the reset token. If you came from an email link, this should be pre-filled.
                  </p>
                </div>
              ) : (
                <div className="mb-4">
                  <label htmlFor="code" className="block text-sm font-medium text-white mb-2">
                    Verification Code
                  </label>
                  <input
                    type="text"
                    id="code"
                    value={formData.code}
                    onChange={(e) => updateFormData('code', e.target.value)}
                    className="w-full rounded-md border border-neutral-600 bg-neutral-700 py-2 px-3 text-white placeholder-gray-400 focus:border-primary-500 focus:outline-none focus:ring-primary-500 sm:text-sm"
                    placeholder="Enter 6-digit code from SMS"
                    required
                    maxLength={6}
                  />
                  <p className="mt-1 text-xs text-gray-400">
                    We sent a 6-digit code to {resetContact}
                  </p>
                </div>
              )}

              <div className="mb-4">
                <label htmlFor="newPassword" className="block text-sm font-medium text-white mb-2">
                  New Password
                </label>
                <input
                  type="password"
                  id="newPassword"
                  value={formData.newPassword}
                  onChange={(e) => updateFormData('newPassword', e.target.value)}
                  className="w-full rounded-md border border-neutral-600 bg-neutral-700 py-2 px-3 text-white placeholder-gray-400 focus:border-primary-500 focus:outline-none focus:ring-primary-500 sm:text-sm"
                  placeholder="Enter new password"
                  required
                  minLength="8"
                />
              </div>

              <div className="mb-6">
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-white mb-2">
                  Confirm New Password
                </label>
                <input
                  type="password"
                  id="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={(e) => updateFormData('confirmPassword', e.target.value)}
                  className="w-full rounded-md border border-neutral-600 bg-neutral-700 py-2 px-3 text-white placeholder-gray-400 focus:border-primary-500 focus:outline-none focus:ring-primary-500 sm:text-sm"
                  placeholder="Confirm new password"
                  required
                  minLength="8"
                />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-primary-500 hover:bg-primary-600 text-white font-medium py-2 px-4 rounded disabled:opacity-50"
              >
                {isLoading ? 'Resetting...' : 'Reset Password'}
              </button>
            </form>
          )}
        </div>

        <div className="text-center mt-6">
          <a href="/login" className="text-primary-500 hover:text-primary-400 text-sm font-medium">
            Back to Login
          </a>
        </div>

        {step === 'reset' && method === 'sms' && (
          <div className="text-center mt-4">
            <button
              type="button"
              onClick={() => setStep('request')}
              className="text-primary-500 hover:text-primary-400 text-sm font-medium"
            >
              Didn't receive the code? Try again
            </button>
          </div>
        )}
      </main>
    </div>
  );
}