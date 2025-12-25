import LoadingSpinner from '../common/LoadingSpinner';

export default function StepNavigation({ 
  currentStep, 
  totalSteps, 
  onBack, 
  onNext, 
  isLoading,
  formData 
}) {
  const getCurrentField = () => {
    const fields = ['username', 'email', 'phone_number', 'password'];
    return fields[currentStep];
  };

  const getButtonText = () => {
    if (isLoading) return 'Creating Account...';
    if (currentStep === totalSteps - 1) return 'Create Account';
    return 'Continue';
  };

  const isNextDisabled = () => {
    const currentField = getCurrentField();
    return isLoading || !formData[currentField]?.trim();
  };

  return (
    <div className="flex space-x-3 pt-6">
      {currentStep > 0 && (
        <button
          type="button"
          onClick={onBack}
          disabled={isLoading}
          className="flex-1 py-3 px-4 border border-neutral-600 rounded-lg text-sm font-medium text-gray-300 hover:text-gray-900 dark:text-white hover:border-neutral-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 focus:ring-offset-neutral-800 disabled:opacity-50 transition-colors"
        >
          Back
        </button>
      )}
      <button
        type="button"
        onClick={onNext}
        disabled={isNextDisabled()}
        className="flex-1 flex justify-center items-center py-3 px-4 border border-transparent rounded-lg text-sm font-medium text-gray-900 dark:text-white bg-primary-500 hover:bg-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 focus:ring-offset-neutral-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {isLoading ? (
          <LoadingSpinner size="sm" />
        ) : (
          getButtonText()
        )}
      </button>
    </div>
  );
}