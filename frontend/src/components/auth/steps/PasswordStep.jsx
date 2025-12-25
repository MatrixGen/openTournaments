import { LockClosedIcon, EyeIcon, EyeSlashIcon, ShieldCheckIcon } from '@heroicons/react/24/outline';
import { useState, useCallback, useEffect } from 'react';
import StepContainer from './StepContainer';

export default function PasswordStep({ formData, updateFormData }) {
  const [showPassword, setShowPassword] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState(0);

  const calculatePasswordStrength = useCallback((password) => {
    let strength = 0;
    if (password.length >= 8) strength += 1;
    if (/[A-Z]/.test(password)) strength += 1;
    if (/[a-z]/.test(password)) strength += 1;
    if (/[0-9]/.test(password)) strength += 1;
    if (/[^A-Za-z0-9]/.test(password)) strength += 1;
    return Math.min(5, strength);
  }, []);

  useEffect(() => {
    setPasswordStrength(calculatePasswordStrength(formData.password));
  }, [formData.password, calculatePasswordStrength]);

  const getStrengthColor = () => {
    if (passwordStrength <= 1) return 'bg-red-500 dark:bg-red-400';
    if (passwordStrength <= 3) return 'bg-yellow-500 dark:bg-yellow-400';
    return 'bg-green-500 dark:bg-green-400';
  };

  const getStrengthText = () => {
    if (passwordStrength <= 1) return 'Very Weak';
    if (passwordStrength <= 2) return 'Weak';
    if (passwordStrength <= 3) return 'Good';
    if (passwordStrength <= 4) return 'Strong';
    return 'Very Strong';
  };

  return (
    <StepContainer
      icon={LockClosedIcon}
      title="Account Security"
      subtitle="Create a strong password"
      description="Your password must be at least 8 characters long and include a mix of letters, numbers, and symbols for maximum security."
    >
      <div className="space-y-4">
        {/* Password Input */}
        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-900 dark:text-gray-900 dark:text-white mb-2">
            Password *
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <LockClosedIcon className="h-5 w-5 text-gray-400" />
            </div>
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              value={formData.password}
              onChange={(e) => updateFormData('password', e.target.value)}
              placeholder="Minimum 8 characters"
              className="pl-10 pr-10 w-full rounded-lg border border-gray-300 dark:border-neutral-600 bg-white dark:bg-neutral-700 py-3 px-4 text-gray-900 dark:text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:border-primary-500 focus:ring-primary-500 text-sm"
              required
              minLength="8"
              autoComplete="new-password"
              autoFocus
            />
            <button
              type="button"
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
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

          {/* Password Strength */}
          {formData.password && (
            <div className="mt-2">
              <div className="flex justify-between text-xs text-gray-600 dark:text-gray-400 mb-1">
                <span>Password Strength</span>
                <span className={`font-medium ${
                  passwordStrength <= 1 ? 'text-red-600 dark:text-red-400' :
                  passwordStrength <= 3 ? 'text-yellow-600 dark:text-yellow-400' :
                  'text-green-600 dark:text-green-400'
                }`}>
                  {getStrengthText()}
                </span>
              </div>
              <div className="h-1.5 bg-gray-200 dark:bg-neutral-700 rounded-full overflow-hidden">
                <div
                  className={`h-full ${getStrengthColor()} transition-all duration-300`}
                  style={{ width: `${(passwordStrength / 5) * 100}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Requirements */}
        <div className="bg-gray-50 dark:bg-neutral-700/30 border border-gray-200 dark:border-neutral-600 rounded-lg p-4">
          <h4 className="text-sm font-medium text-gray-900 dark:text-gray-900 dark:text-white mb-2 flex items-center gap-2">
            <ShieldCheckIcon className="h-4 w-4 text-gray-500" />
            Password Requirements
          </h4>
          <ul className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
            <li className={`flex items-center ${formData.password.length >= 8 ? 'text-green-600 dark:text-green-400' : ''}`}>
              <span className="mr-2">•</span>
              <span>At least 8 characters long</span>
            </li>
            <li className={`flex items-center ${/[A-Z]/.test(formData.password) ? 'text-green-600 dark:text-green-400' : ''}`}>
              <span className="mr-2">•</span>
              <span>Contains uppercase letter (A-Z)</span>
            </li>
            <li className={`flex items-center ${/[a-z]/.test(formData.password) ? 'text-green-600 dark:text-green-400' : ''}`}>
              <span className="mr-2">•</span>
              <span>Contains lowercase letter (a-z)</span>
            </li>
            <li className={`flex items-center ${/[0-9]/.test(formData.password) ? 'text-green-600 dark:text-green-400' : ''}`}>
              <span className="mr-2">•</span>
              <span>Contains number (0-9)</span>
            </li>
            <li className={`flex items-center ${/[^A-Za-z0-9]/.test(formData.password) ? 'text-green-600 dark:text-green-400' : ''}`}>
              <span className="mr-2">•</span>
              <span>Contains special character (@#$%^&*)</span>
            </li>
          </ul>
        </div>

        {/* Security Note */}
        <div className="text-xs text-gray-500 dark:text-gray-400">
          <p>
            <strong>Important:</strong> Never share your password. Use a unique password that you don't use on other websites.
          </p>
        </div>
      </div>
    </StepContainer>
  );
}