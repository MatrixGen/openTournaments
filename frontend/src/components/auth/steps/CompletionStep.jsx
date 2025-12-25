import { useNavigate } from 'react-router-dom';
import { CheckCircleIcon, ArrowRightIcon, EnvelopeIcon } from '@heroicons/react/24/outline';
import StepContainer from './StepContainer';

export default function CompletionStep() {
  const navigate = useNavigate();

  return (
    <StepContainer
      icon={CheckCircleIcon}
      title="Account Created Successfully"
      subtitle="Your tournament account is ready"
      description="We've sent a verification email to your address. Please check your inbox and click the verification link to activate your account."
    >
      <div className="space-y-6">
        {/* Success Message */}
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <CheckCircleIcon className="h-5 w-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-semibold text-green-800 dark:text-green-300 mb-1">
                Account Created
              </h4>
              <p className="text-xs text-green-700 dark:text-green-400">
                Your account has been created successfully. You can now access your dashboard.
              </p>
            </div>
          </div>
        </div>

        {/* Email Verification */}
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <EnvelopeIcon className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-semibold text-blue-800 dark:text-blue-300 mb-1">
                Email Verification
              </h4>
              <p className="text-xs text-blue-700 dark:text-blue-400 mb-2">
                Check your email inbox for a verification link. Click the link to activate your account.
              </p>
              <div className="text-xs text-blue-600 dark:text-blue-400 space-y-1">
                <p className="flex items-center">
                  <span className="mr-1">•</span>
                  <span>Look in your inbox or spam folder</span>
                </p>
                <p className="flex items-center">
                  <span className="mr-1">•</span>
                  <span>Verification link expires in 24 hours</span>
                </p>
                <p className="flex items-center">
                  <span className="mr-1">•</span>
                  <span>Some features require verified email</span>
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Next Steps */}
        <div>
          <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-900 dark:text-white mb-3">
            Next Steps
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              onClick={() => navigate('/dashboard')}
              className="inline-flex items-center justify-center py-3 px-4 bg-primary-500 hover:bg-primary-600 text-gray-900 dark:text-white text-sm font-medium rounded-lg transition-colors"
            >
              Go to Dashboard
              <ArrowRightIcon className="ml-2 h-4 w-4" />
            </button>
            <button
              onClick={() => navigate('/tournaments')}
              className="inline-flex items-center justify-center py-3 px-4 bg-gray-100 dark:bg-neutral-700 hover:bg-gray-200 dark:hover:bg-neutral-600 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-lg transition-colors"
            >
              Browse Tournaments
            </button>
          </div>
        </div>

        {/* Support */}
        <div className="text-center pt-4 border-t border-gray-200 dark:border-neutral-700">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Need help?{' '}
            <a href="/support" className="text-primary-600 dark:text-primary-400 hover:underline">
              Contact Support
            </a>
          </p>
        </div>
      </div>
    </StepContainer>
  );
}