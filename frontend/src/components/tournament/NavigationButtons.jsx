import { ArrowLeftIcon, ArrowRightIcon } from '@heroicons/react/24/outline';

export default function NavigationButtons({
  currentStep,
  prevStep,
  nextStep,
  isSubmitting,
  stepsLength,
  submitButtonText,
}) {
  return (
    <div className="flex flex-col-reverse sm:flex-row sm:justify-between gap-3">
      <div className="flex-1">
        {currentStep > 0 && (
          <button
            type="button"
            onClick={prevStep}
            disabled={isSubmitting}
            className="w-full sm:w-auto inline-flex items-center justify-center px-4 py-3 border border-gray-300 dark:border-neutral-600 shadow-sm text-sm font-medium rounded-lg text-gray-700 dark:text-gray-300 bg-white dark:bg-neutral-800 hover:bg-gray-50 dark:hover:bg-neutral-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50"
          >
            <ArrowLeftIcon className="h-4 w-4 mr-2" />
            Previous
          </button>
        )}
      </div>
      
      <div className="flex-1">
        {currentStep < stepsLength - 1 ? (
          <button
            type="button"
            onClick={nextStep}
            disabled={isSubmitting}
            className="w-full sm:w-auto inline-flex items-center justify-center px-4 py-3 border border-transparent text-sm font-medium rounded-lg shadow-sm text-black bg-primary-500 hover:bg-primary-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50"
          >
            Continue
            <ArrowRightIcon className="h-4 w-4 ml-2" />
          </button>
        ) : (
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full sm:w-auto inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-lg shadow-sm text-black bg-green-500 hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
          >
            {submitButtonText}
          </button>
        )}
      </div>
    </div>
  );
}