import { useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  UserIcon,
  PhoneIcon,
  LockClosedIcon,
  CheckCircleIcon,
  ArrowLeftIcon,
  ChevronRightIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import Banner from '../../components/common/Banner';

// Import steps
import UsernameEmailStep from './steps/UsernameEmailStep';
import PhoneStep from './steps/PhoneStep';
import PasswordStep from './steps/PasswordStep';
import CompletionStep from './steps/CompletionStep';
import GoogleAuthButton from './GoogleAuthButton';

const steps = [
  { id: 'credentials', label: 'Account Details', component: UsernameEmailStep },
  { id: 'phone', label: 'Phone (Optional)', component: PhoneStep },
  { id: 'password', label: 'Security', component: PasswordStep },
  { id: 'complete', label: 'Complete', component: CompletionStep },
];

export default function SignupWizard({ onSignup, error, isLoading, onErrorClear }) {
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    phone_number: '',
    password: '',
  });
  const navigate = useNavigate();

  // Touch device detection
  const isTouchDevice = useMemo(() => 
    'ontouchstart' in window || navigator.maxTouchPoints > 0,
    []
  );

  const updateFormData = useCallback((field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (error) onErrorClear();
  }, [error, onErrorClear]);

  const nextStep = useCallback(() => {
    setCurrentStep(prev => Math.min(prev + 1, steps.length - 1));
  }, []);

  const prevStep = useCallback(() => {
    setCurrentStep(prev => Math.max(prev - 1, 0));
  }, []);

  const handleSubmit = useCallback(async () => {
    const success = await onSignup(formData);
    if (success) {
      setCurrentStep(steps.length - 1); // Go to completion step
    }
  }, [formData, onSignup]);

  const CurrentStepComponent = steps[currentStep].component;

  // Calculate progress percentage
  const progressPercentage = useMemo(() => 
    ((currentStep + 1) / steps.length) * 100,
    [currentStep]
  );

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white dark:from-neutral-900 dark:to-neutral-950 transition-colors">
      {/* Header */}
      <div className="bg-white dark:bg-neutral-800 border-b border-gray-200 dark:border-neutral-700">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <button
            onClick={() => navigate('/login')}
            className="inline-flex items-center text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-300"
          >
            <ArrowLeftIcon className="h-4 w-4 mr-2" />
            Back to Login
          </button>
        </div>
      </div>

      <main className="max-w-4xl mx-auto px-4 py-8 sm:py-12">
        {/* Progress Bar */}
        {currentStep < steps.length - 1 && (
          <div className="mb-8 sm:mb-12">
            <div className="flex justify-between mb-2">
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-900 dark:text-white">
                Create Account
              </h1>
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Step {currentStep + 1} of {steps.length - 1}
              </span>
            </div>
            <div className="h-2 bg-gray-200 dark:bg-neutral-700 rounded-full overflow-hidden">
              <div 
                className="h-full bg-primary-500 transition-all duration-300"
                style={{ width: `${progressPercentage}%` }}
              />
            </div>
            <div className="flex justify-between mt-4">
              {steps.slice(0, -1).map((step, index) => (
                <div
                  key={step.id}
                  className={`flex flex-col items-center ${
                    index <= currentStep ? 'text-primary-600 dark:text-primary-400' : 'text-gray-400 dark:text-gray-500'
                  }`}
                >
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium mb-1 ${
                    index <= currentStep 
                      ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300'
                      : 'bg-gray-100 dark:bg-neutral-700 text-gray-500 dark:text-gray-400'
                  }`}>
                    {index + 1}
                  </div>
                  <span className="text-xs font-medium truncate max-w-20">
                    {step.label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Error Banner */}
        {error && (
          <Banner
            type="error"
            title="Registration Issue"
            message={error}
            onClose={onErrorClear}
            className="mb-6"
          />
        )}

        {/* Step Content */}
        <div className="bg-white dark:bg-neutral-800 rounded-xl shadow-sm border border-gray-200 dark:border-neutral-700 overflow-hidden">
          <CurrentStepComponent
            formData={formData}
            updateFormData={updateFormData}
            onNext={nextStep}
            onPrev={prevStep}
            onSubmit={handleSubmit}
            isLoading={isLoading}
            currentStep={currentStep}
            totalSteps={steps.length}
          />

          {/* Navigation Footer */}
          {currentStep < steps.length - 1 && (
            <div className="px-6 py-4 bg-gray-50 dark:bg-neutral-700/30 border-t border-gray-200 dark:border-neutral-700">
              {/* Mobile layout: Vertical stack */}
              <div className="block md:hidden space-y-4">
                {/* Previous/Continue buttons */}
                <div className={`grid ${currentStep > 0 ? 'grid-cols-2' : 'grid-cols-1'} gap-3`}>
                  {currentStep > 0 && (
                    <button
                      type="button"
                      onClick={prevStep}
                      className="inline-flex items-center justify-center py-2.5 px-4 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-neutral-700 rounded-lg hover:bg-gray-200 dark:hover:bg-neutral-600 transition-colors active:scale-98"
                    >
                      <ArrowLeftIcon className="h-4 w-4 mr-2" />
                      Previous
                    </button>
                  )}
                  
                  {currentStep < steps.length - 2 ? (
                    <button
                      type="button"
                      onClick={nextStep}
                      className={`inline-flex items-center justify-center py-2.5 px-4 rounded-lg text-sm font-medium bg-primary-500 hover:bg-primary-600 text-gray-900 dark:text-white transition-colors active:scale-98 ${currentStep > 0 ? '' : 'col-span-1'}`}
                      disabled={isLoading}
                    >
                      Continue
                      <ChevronRightIcon className="ml-2 h-4 w-4" />
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handleSubmit}
                      disabled={isLoading || !formData.password}
                      className={`inline-flex items-center justify-center py-2.5 px-4 rounded-lg text-sm font-medium active:scale-98 ${
                        isLoading || !formData.password
                          ? 'bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                          : 'bg-green-600 hover:bg-green-700 text-gray-900 dark:text-white'
                      } transition-colors ${currentStep > 0 ? '' : 'col-span-1'}`}
                    >
                      {isLoading ? (
                        <>
                          <LoadingSpinner size="sm" className="mr-2" />
                          Creating...
                        </>
                      ) : (
                        <>
                          <CheckCircleIcon className="h-4 w-4 mr-2" />
                          Create Account
                        </>
                      )}
                    </button>
                  )}
                </div>
                
                {/* Google Auth Button on mobile - CENTERED */}
                <div className="pt-4 border-t border-gray-200 dark:border-neutral-600">
                  <div className="text-center mb-3">
                    <span className="text-xs text-gray-500 dark:text-gray-400">Or sign up with</span>
                  </div>
                  <div className="flex justify-center">
                    <div className="w-full max-w-xs">
                      <GoogleAuthButton />
                    </div>
                  </div>
                </div>
              </div>

              {/* Desktop layout: Horizontal */}
              <div className="hidden md:flex justify-between items-center">
                {currentStep > 0 ? (
                  <button
                    type="button"
                    onClick={prevStep}
                    className="inline-flex items-center text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-900 dark:text-white"
                  >
                    <ArrowLeftIcon className="h-4 w-4 mr-2" />
                    Previous
                  </button>
                ) : (
                  <div /> // Empty div for spacing
                )}
                
                <div className="flex items-center justify-center space-x-4 mt-6 py-2">
                  <div className="text-center">
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      Or sign up with
                    </span>
                  </div>
                  <GoogleAuthButton />
                </div>

                {currentStep < steps.length - 2 ? (
                  <button
                    type="button"
                    onClick={nextStep}
                    className="inline-flex items-center px-4 py-2 rounded-lg text-sm font-medium bg-primary-500 hover:bg-primary-600 text-gray-900 dark:text-white transition-colors"
                    disabled={isLoading}
                  >
                    Continue
                    <ChevronRightIcon className="ml-2 h-4 w-4" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={isLoading || !formData.password}
                    className={`inline-flex items-center px-4 py-2 rounded-lg text-sm font-medium ${
                      isLoading || !formData.password
                        ? 'bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                        : 'bg-green-600 hover:bg-green-700 text-gray-900 dark:text-white'
                    } transition-colors`}
                  >
                    {isLoading ? (
                      <>
                        <LoadingSpinner size="sm" className="mr-2" />
                        Creating Account...
                      </>
                    ) : (
                      <>
                        <CheckCircleIcon className="h-4 w-4 mr-2" />
                        Create Account
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Terms & Privacy Notice */}
        {currentStep < steps.length - 1 && (
          <div className="mt-6 text-center">
            <p className="text-xs text-gray-500 dark:text-gray-400 px-4">
              By creating an account, you agree to our{' '}
              <a href="/terms" className="text-primary-600 dark:text-primary-400 hover:underline">
                Terms of Service
              </a>{' '}
              and{' '}
              <a href="/privacy" className="text-primary-600 dark:text-primary-400 hover:underline">
                Privacy Policy
              </a>
            </p>
          </div>
        )}

        {/* Mobile-only quick links */}
        {isTouchDevice && currentStep < steps.length - 1 && (
          <div className="mt-6 grid grid-cols-2 gap-3">
            <button
              onClick={() => navigate('/login')}
              className="inline-flex items-center justify-center py-2.5 px-4 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-neutral-700 rounded-lg hover:bg-gray-200 dark:hover:bg-neutral-600 transition-colors active:scale-98"
            >
              <ArrowLeftIcon className="h-4 w-4 mr-2" />
              Back to Login
            </button>
            <a
              href="/help"
              className="inline-flex items-center justify-center py-2.5 px-4 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-neutral-700 rounded-lg hover:bg-gray-200 dark:hover:bg-neutral-600 transition-colors active:scale-98"
            >
              <InformationCircleIcon className="h-4 w-4 mr-2" />
              Need Help?
            </a>
          </div>
        )}
      </main>
    </div>
  );
}