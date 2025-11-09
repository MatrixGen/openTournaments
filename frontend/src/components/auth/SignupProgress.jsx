export default function SignupProgress({ currentStep, totalSteps, progress }) {
  return (
    <div className="sm:mx-auto sm:w-full sm:max-w-md mb-8">
      <div className="flex items-center justify-between text-sm text-gray-400 mb-2">
        <span>Step {currentStep + 1} of {totalSteps}</span>
        <span>{Math.round(progress)}% complete</span>
      </div>
      <div className="w-full bg-neutral-700 rounded-full h-2">
        <div 
          className="bg-primary-500 h-2 rounded-full transition-all duration-500 ease-out"
          style={{ width: `${progress}%` }}
        ></div>
      </div>
    </div>
  );
}