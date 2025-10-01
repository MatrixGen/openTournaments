const steps = [
  { id: 'basic', title: 'Basic Info', description: 'Tournament fundamentals' },
  { id: 'details', title: 'Details', description: 'Settings & rules' },
  { id: 'prizes', title: 'Prizes', description: 'Prize distribution' },
  { id: 'review', title: 'Review', description: 'Confirm & create' }
];

export default function ProgressSteps({ currentStep }) {
  return (
    <div className="mb-8">
      <div className="flex justify-between">
        {steps.map((step, index) => (
          <div key={step.id} className="flex flex-col items-center flex-1">
            <div className="flex items-center w-full">
              {/* Connector line */}
              {index > 0 && (
                <div className={`flex-1 h-1 ${index <= currentStep ? 'bg-primary-500' : 'bg-neutral-600'}`} />
              )}
              
              {/* Step circle */}
              <div className={`
                flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium
                ${index < currentStep ? 'bg-primary-500 text-white' : 
                  index === currentStep ? 'bg-primary-500 text-white ring-2 ring-primary-300' : 
                  'bg-neutral-600 text-neutral-300'}
              `}>
                {index < currentStep ? '✓' : index + 1}
              </div>

              {/* Connector line */}
              {index < steps.length - 1 && (
                <div className={`flex-1 h-1 ${index < currentStep ? 'bg-primary-500' : 'bg-neutral-600'}`} />
              )}
            </div>
            
            {/* Step labels */}
            <div className="mt-2 text-center">
              <div className={`text-sm font-medium ${
                index <= currentStep ? 'text-white' : 'text-neutral-400'
              }`}>
                {step.title}
              </div>
              <div className="text-xs text-neutral-400 hidden sm:block">
                {step.description}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}