import { LockClosedIcon, EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';
import { useState } from 'react';
import StepContainer from './StepContainer';

export default function PasswordStep({ formData, updateFormData }) {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <StepContainer
      icon={LockClosedIcon}
      title="Create your password"
      subtitle="Make it strong and secure"
      description="Your password is the key to your account. Make it unique!"
      tips={[
        "Minimum 8 characters",
        "Mix of letters, numbers, symbols",
        "Avoid common phrases"
      ]}
    >
      <div>
        <label htmlFor="password" className="block text-sm font-medium text-white mb-2">
          Your password
        </label>
        <div className="relative">
          <input
            id="password"
            type={showPassword ? 'text' : 'password'}
            value={formData.password}
            onChange={(e) => updateFormData('password', e.target.value)}
            placeholder="At least 8 characters"
            className="block w-full rounded-lg border border-neutral-600 bg-neutral-750 py-3 px-4 pr-10 text-white placeholder-gray-400 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 sm:text-sm transition-colors"
            autoFocus
          />
          <button
            type="button"
            className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-300 transition-colors"
            onClick={() => setShowPassword(!showPassword)}
          >
            {showPassword ? (
              <EyeSlashIcon className="h-5 w-5" aria-hidden="true" />
            ) : (
              <EyeIcon className="h-5 w-5" aria-hidden="true" />
            )}
          </button>
        </div>
      </div>
    </StepContainer>
  );
}