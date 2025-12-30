import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { dataService } from '../../services/dataService';
//import { tournamentSchema } from './TournamentForm';
import ProgressSteps from './ProgressSteps';
import NavigationButtons from './NavigationButtons';
import Step1BasicInfo from './steps/Step1BasicInfo';
import Step2TournamentDetails from './steps/Step2TournamentDetails';
import Step3PrizeDistribution from './steps/Step3PrizeDistribution';
import Step4ReviewAndGamerTag from './steps/Step4ReviewAndGamerTag';
import Banner from '../../components/common/Banner';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { useAuth } from '../../contexts/AuthContext'; // Import useAuth
import { tournamentSchema } from '../../schemas/tournamentSchema';

const steps = [
  { id: 'basic', title: 'Basic Info', description: 'Tournament fundamentals' },
  { id: 'details', title: 'Details', description: 'Settings & rules' },
  { id: 'prizes', title: 'Prizes', description: 'Prize distribution' },
  { id: 'review', title: 'Review', description: 'Confirm & create' },
];

const DRAFT_KEY = 'tournamentFormDraft';

const LOADING_MESSAGES = [
  "Setting up your tournament...",
  "Configuring prize distribution...",
  "Preparing tournament lobby...",
  "Almost there...",
  "Making things ready...",
  "Finalizing details...",
  "Hold on, we're creating something awesome!",
  "Just a few more seconds...",
  "Your tournament is being crafted...",
  "Getting everything in place..."
];

export default function MultiStepTournamentForm({
  initialData = {},
  onSubmit,
  isSubmitting = false,
  error = '',
  success = '',
  submitButtonText = 'Create Tournament',
}) {
  const [currentStep, setCurrentStep] = useState(0);
  const [games, setGames] = useState([]);
  const [platforms, setPlatforms] = useState([]);
  const [gameModes, setGameModes] = useState([]);
  const [filteredGameModes, setFilteredGameModes] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentLoadingMessage, setCurrentLoadingMessage] = useState(LOADING_MESSAGES[0]);

  // Get user context to access wallet balance
  const { user } = useAuth();

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    trigger,
    formState: { errors },
    reset,
    clearErrors,
  } = useForm({
    resolver: zodResolver(tournamentSchema),
    defaultValues: {
      visibility: 'public',
      prize_distribution: [{ position: 1, percentage: 100 }],
      ...initialData,
    },
  });

  const selectedGameId = watch('game_id');
  const allValues = watch();

  // Mobile view state
  const [isMobileView, setIsMobileView] = useState(window.innerWidth < 768);

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      setIsMobileView(window.innerWidth < 768);
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Cycling loading messages when submitting
  useEffect(() => {
    let interval;
    if (isSubmitting) {
      let messageIndex = 0;
      setCurrentLoadingMessage(LOADING_MESSAGES[0]);
      
      interval = setInterval(() => {
        messageIndex = (messageIndex + 1) % LOADING_MESSAGES.length;
        setCurrentLoadingMessage(LOADING_MESSAGES[messageIndex]);
      }, 3000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isSubmitting]);

  // Load initial data + check for saved draft
  useEffect(() => {
    const loadData = async () => {
      try {
        const [gamesData, platformsData, gameModesData] = await Promise.all([
          dataService.getGames(),
          dataService.getPlatforms(),
          dataService.getGameModes(),
        ]);
        setGames(gamesData);
        setPlatforms(platformsData);
        setGameModes(gameModesData);
      } catch (err) {
        console.error('Failed to load data:', err);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();

    const savedDraft = localStorage.getItem(DRAFT_KEY);
    if (savedDraft) {
      const { formData, step } = JSON.parse(savedDraft);
      reset(formData);
      setCurrentStep(step || 0);
    }
  }, [reset]);

  // Auto-save progress to localStorage
  useEffect(() => {
    const timer = setTimeout(() => {
      localStorage.setItem(
        DRAFT_KEY,
        JSON.stringify({
          formData: allValues,
          step: currentStep,
        })
      );
    }, 800);

    return () => clearTimeout(timer);
  }, [allValues, currentStep]);

  // Clear draft after successful submit
  useEffect(() => {
    if (success) {
      localStorage.removeItem(DRAFT_KEY);
    }
  }, [success]);

  // Filter game modes when game selection changes
  useEffect(() => {
    if (selectedGameId) {
      const filtered = gameModes.filter(
        (mode) => mode.game_id === parseInt(selectedGameId)
      );
      setFilteredGameModes(filtered);
    } else {
      setFilteredGameModes([]);
    }
  }, [selectedGameId, gameModes]);

  // Update step 2 validation to include prize_pool
  const getStepFields = (step) => {
    const stepFields = {
      0: ['name', 'game_id', 'platform_id', 'game_mode_id', 'format', 'visibility'],
      1: ['entry_fee', 'total_slots', 'start_time', 'rules'],
      2: ['prize_distribution', 'prize_pool'], // Added prize_pool to step 2 validation
      3: ['gamer_tag'],
    };
    return stepFields[step] || [];
  };

  const nextStep = async () => {
    const fieldsToValidate = getStepFields(currentStep);
    const isValid = await trigger(fieldsToValidate);

    if (isValid) {
      setCurrentStep((prev) => Math.min(prev + 1, steps.length - 1));
      // Scroll to top on mobile when changing steps
      if (isMobileView) {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }
  };

  const prevStep = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 0));
    if (isMobileView) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const addPrizePosition = () => {
    const currentPrizes = watch('prize_distribution') || [];
    const newPosition = currentPrizes.length + 1;
    setValue('prize_distribution', [
      ...currentPrizes,
      { position: newPosition, percentage: 0 },
    ]);
  };

  const removePrizePosition = (index) => {
    const currentPrizes = watch('prize_distribution');
    const newPrizes = currentPrizes.filter((_, i) => i !== index);
    setValue('prize_distribution', newPrizes);
  };

  const updatePrizePercentage = (index, value) => {
    const currentPrizes = watch('prize_distribution');
    const newPrizes = [...currentPrizes];
    newPrizes[index].percentage = parseFloat(value) || 0;
    setValue('prize_distribution', newPrizes);
  };

  const clearDraft = () => {
    localStorage.removeItem(DRAFT_KEY);
    reset(initialData);
    setCurrentStep(0);
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return (
          <Step1BasicInfo
            register={register}
            errors={errors}
            games={games}
            platforms={platforms}
            filteredGameModes={filteredGameModes}
            selectedGameId={selectedGameId}
            watch={watch}
          />
        );
      case 1:
  return (
    <Step2TournamentDetails
      register={register}
      errors={errors}
      setValue={setValue}
      watch={watch}
      rulesArray={watch('rules') || []} // Pass the array separately
    />
  );
      case 2:
        return (
          <Step3PrizeDistribution
            register={register}
            errors={errors}
            watch={watch}
            setValue={setValue}
            clearErrors={clearErrors}
            addPrizePosition={addPrizePosition}
            removePrizePosition={removePrizePosition}
            updatePrizePercentage={updatePrizePercentage}
            userBalance={user?.wallet_balance || 0} // Pass user balance
          />
        );
      case 3:
        return (
          <Step4ReviewAndGamerTag
            register={register}
            errors={errors}
            watch={watch}
            games={games}
            platforms={platforms}
            filteredGameModes={filteredGameModes}
          />
        );
      default:
        return null;
    }
  };

  // Full-screen loading overlay for tournament creation
  const renderFullScreenLoading = () => {
    if (!isSubmitting) return null;

    return (
      <div className="fixed inset-0 bg-black/75 dark:bg-black/90 flex items-center justify-center z-50">
        <div className="bg-white dark:bg-neutral-800 p-6 md:p-8 rounded-xl shadow-2xl max-w-sm md:max-w-md w-full mx-4 text-center">
          <div className="mb-4 md:mb-6">
            <LoadingSpinner size="xl" className="mx-auto" />
          </div>
          
          <h3 className="text-lg md:text-xl font-bold text-gray-900 dark:text-white mb-3 md:mb-4">
            Creating Your Tournament
          </h3>
          
          <p className="text-gray-600 dark:text-gray-300 mb-4 md:mb-6 min-h-[24px] text-sm md:text-base transition-all duration-500">
            {currentLoadingMessage}
          </p>
          
          <div className="w-full bg-gray-200 dark:bg-neutral-700 rounded-full h-1.5 md:h-2">
            <div 
              className="bg-primary-500 dark:bg-primary-600 h-1.5 md:h-2 rounded-full transition-all duration-1000 animate-pulse"
              style={{ width: '85%' }}
            />
          </div>
          
          <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400 mt-3 md:mt-4">
            This may take a few moments...
          </p>
        </div>
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" text="Loading tournament data..." />
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-neutral-800 p-4 md:p-6 rounded-lg md:rounded-xl border border-gray-200 dark:border-neutral-700 shadow-sm relative">
      {/* Full-screen loading overlay */}
      {renderFullScreenLoading()}

      {/* Progress Steps - Compact on mobile */}
      <div className="mb-6">
        <ProgressSteps currentStep={currentStep} />
      </div>

      {/* Error/Success Banners */}
      {error && (
        <div className="mb-4 md:mb-6">
          <Banner type="error" title="Form Error" message={error} />
        </div>
      )}
      {success && (
        <div className="mb-4 md:mb-6">
          <Banner type="success" title="Success!" message={success} />
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)}>
        {/* Step Content */}
        <div className="mb-6 md:mb-8">
          {renderStepContent()}
        </div>

        {/* Navigation Buttons - Mobile optimized */}
        <div className="mt-8">
          <NavigationButtons
            currentStep={currentStep}
            prevStep={prevStep}
            nextStep={nextStep}
            isSubmitting={isSubmitting}
            stepsLength={steps.length}
            submitButtonText={
              isSubmitting ? (
                <span className="flex items-center space-x-2">
                  <LoadingSpinner size="sm" />
                  <span>Creating...</span>
                </span>
              ) : (
                submitButtonText
              )
            }
          />
        </div>
      </form>

      {/* Clear Draft Option - Mobile friendly */}
      <div className="mt-6 pt-6 border-t border-gray-200 dark:border-neutral-700">
        <button
          onClick={clearDraft}
          className="w-full md:w-auto text-sm text-red-500 dark:text-red-400 hover:text-red-600 dark:hover:text-red-300 py-2 px-4 border border-gray-200 dark:border-neutral-700 rounded-lg hover:bg-gray-50 dark:hover:bg-neutral-700 transition-colors"
        >
          Clear Saved Draft
        </button>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
          This will delete your saved progress.
        </p>
      </div>

      {/* Help Banner */}
      <div className="mt-6">
        <Banner
          type="info"
          message="Need help setting up your tournament? Check out our creation guide."
          action={{
            text: 'View Guide',
            to: '/support',
          }}
        />
      </div>

      {/* Mobile bottom spacing */}
      <div className="h-16 md:h-0"></div>
    </div>
  );
}