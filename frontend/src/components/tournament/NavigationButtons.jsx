export default function NavigationButtons({ 
  currentStep, 
  prevStep, 
  nextStep, 
  isSubmitting, 
  stepsLength,
  submitButtonText = 'Create Tournament'
}) {
  return (
    <div className="flex justify-between pt-6 mt-8 border-t border-neutral-600">
      <button
        type="button"
        onClick={prevStep}
        disabled={currentStep === 0}
        className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-300 bg-transparent hover:bg-neutral-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        Previous
      </button>

      {currentStep < stepsLength - 1 ? (
        <button
          type="button"
          onClick={nextStep}
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-500 hover:bg-primary-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
        >
          Next
        </button>
      ) : (
        <button
          type="submit"
          disabled={isSubmitting}
          className="inline-flex items-center px-6 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? 'Creating Tournament...' : submitButtonText}
        </button>
      )}
    </div>
  );
}