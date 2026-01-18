import { UserIcon, EnvelopeIcon } from '@heroicons/react/24/outline';
import StepContainer from './StepContainer';

export default function UsernameEmailStep({ formData, updateFormData }) {
  return (
    <StepContainer
      icon={UserIcon}
      title="Account Information"
    >
      <div className="space-y-4">
        {/* Username */}
        <div>
          <label htmlFor="username" className="block text-sm font-medium text-gray-900 dark:text-gray-900 dark:text-white mb-2">
            Username *
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <UserIcon className="h-5 w-5 text-gray-400" />
            </div>
            <input
              id="username"
              type="text"
              value={formData.username}
              onChange={(e) => updateFormData('username', e.target.value)}
              placeholder="Choose a username (3-20 characters)"
              className="pl-10 w-full rounded-lg border border-gray-300 dark:border-neutral-600 bg-white dark:bg-neutral-700 py-3 px-4 text-gray-900 dark:text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:border-primary-500 focus:ring-primary-500 text-sm"
              required
              minLength="3"
              maxLength="20"
              pattern="^[a-zA-Z0-9_]+$"
              title="Only letters, numbers, and underscores are allowed"
              autoComplete="username"
              autoFocus
            />
          </div>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            This will be your unique identifier on the platform.
          </p>
        </div>

        {/* Email */}
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-900 dark:text-gray-900 dark:text-white mb-2">
            Email Address *
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <EnvelopeIcon className="h-5 w-5 text-gray-400" />
            </div>
            <input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => updateFormData('email', e.target.value)}
              placeholder="your.email@example.com"
              className="pl-10 w-full rounded-lg border border-gray-300 dark:border-neutral-600 bg-white dark:bg-neutral-700 py-3 px-4 text-gray-900 dark:text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:border-primary-500 focus:ring-primary-500 text-sm"
              required
              autoComplete="email"
            />
          </div>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            We'll send a verification email to this address.
          </p>
        </div>

      </div>
    </StepContainer>
  );
}