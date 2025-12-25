import { CheckIcon } from '@heroicons/react/24/solid';

const steps = [
  { id: 'basic', title: 'Basic', description: 'Info' },
  { id: 'details', title: 'Details', description: 'Settings' },
  { id: 'prizes', title: 'Prizes', description: 'Distribution' },
  { id: 'review', title: 'Review', description: 'Create' },
];

export default function ProgressSteps({ currentStep }) {
  return (
    <div className="relative">
      {/* Desktop Progress Steps */}
      <div className="hidden md:flex items-center justify-between mb-8">
        {steps.map((step, index) => (
          <div key={step.id} className="flex items-center">
            <div className="flex flex-col items-center">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 ${
                index <= currentStep
                  ? 'border-primary-500 bg-primary-500 text-gray-900 dark:text-white'
                  : index === currentStep + 1
                  ? 'border-primary-500 bg-white dark:bg-neutral-800 text-primary-500'
                  : 'border-gray-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 text-gray-400 dark:text-gray-500'
              }`}>
                {index < currentStep ? (
                  <CheckIcon className="h-5 w-5" />
                ) : (
                  <span className="font-semibold">{index + 1}</span>
                )}
              </div>
              <div className="mt-2 text-center">
                <div className="text-sm font-medium text-gray-900 dark:text-gray-900 dark:text-white">{step.title}</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">{step.description}</div>
              </div>
            </div>
            {index < steps.length - 1 && (
              <div className={`w-24 h-1 mx-2 ${
                index < currentStep ? 'bg-primary-500' : 'bg-gray-200 dark:bg-neutral-700'
              }`} />
            )}
          </div>
        ))}
      </div>

      {/* Mobile Progress Steps */}
      <div className="md:hidden">
        <div className="flex items-center justify-between mb-4">
          {steps.map((step, index) => (
            <div key={step.id} className="flex flex-col items-center flex-1">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${
                index <= currentStep
                  ? 'border-primary-500 bg-primary-500 text-gray-900 dark:text-white'
                  : 'border-gray-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 text-gray-400 dark:text-gray-500'
              }`}>
                {index < currentStep ? (
                  <CheckIcon className="h-4 w-4" />
                ) : (
                  <span className="text-sm font-semibold">{index + 1}</span>
                )}
              </div>
              <div className="mt-1 text-center">
                <div className="text-xs font-medium text-gray-900 dark:text-gray-900 dark:text-white">{step.title}</div>
              </div>
            </div>
          ))}
        </div>
        <div className="relative h-1 bg-gray-200 dark:bg-neutral-700 rounded-full overflow-hidden">
          <div
            className="absolute top-0 left-0 h-full bg-primary-500 transition-all duration-300 ease-out"
            style={{ width: `${(currentStep / (steps.length - 1)) * 100}%` }}
          />
        </div>
        <div className="mt-2 text-center">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Step {currentStep + 1} of {steps.length}: {steps[currentStep].description}
          </p>
        </div>
      </div>
    </div>
  );
}