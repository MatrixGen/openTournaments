import { PhoneIcon, InformationCircleIcon } from '@heroicons/react/24/outline';
import StepContainer from './StepContainer';

export default function PhoneStep({ formData, updateFormData }) {
  return (
    <StepContainer
      icon={PhoneIcon}
    >
      <div className="space-y-4">
        {/* Phone Number */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label htmlFor="phone_number" className="block text-sm font-medium text-gray-900 dark:text-gray-900 dark:text-white">
              Phone Number
            </label>
            <span className="text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-neutral-700 px-2 py-1 rounded">
              Optional
            </span>
          </div>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <PhoneIcon className="h-5 w-5 text-gray-400" />
            </div>
            <input
              id="phone_number"
              type="tel"
              value={formData.phone_number}
              onChange={(e) => updateFormData('phone_number', e.target.value)}
              placeholder="+1 (555) 123-4567"
              className="pl-10 w-full rounded-lg border border-gray-300 dark:border-neutral-600 bg-white dark:bg-neutral-700 py-3 px-4 text-gray-900 dark:text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:border-primary-500 focus:ring-primary-500 text-sm"
              autoComplete="tel"
              pattern="^\+[1-9]\d{1,14}$"
              title="Please enter a valid international phone number starting with +"
            />
          </div>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            Enter with country code (e.g., +255 for Tanzania)
          </p>
        </div>

        {/* Benefits */}
        <div className="border border-gray-200 dark:border-neutral-600 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <InformationCircleIcon className="h-5 w-5 text-gray-400 dark:text-gray-500 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-medium text-gray-900 dark:text-gray-900 dark:text-white mb-1">
                Why add a phone number?
              </h4>
              <ul className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
                <li className="flex items-start">
                  <span className="mr-1">•</span>
                  <span><strong>Two-factor authentication</strong> for enhanced security</span>
                </li>
                <li className="flex items-start">
                  <span className="mr-1">•</span>
                  <span><strong>Account recovery</strong> if you lose access to email</span>
                </li>
                <li className="flex items-start">
                  <span className="mr-1">•</span>
                  <span><strong>SMS notifications</strong> for important account activity</span>
                </li>
                <li className="flex items-start">
                  <span className="mr-1">•</span>
                  <span>You can add this later in your account settings</span>
                </li>
              </ul>
            </div>
          </div>
        </div>

       
      </div>
    </StepContainer>
  );
}