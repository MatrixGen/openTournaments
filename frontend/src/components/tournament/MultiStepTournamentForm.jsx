import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { dataService } from '../../services/dataService';
import { tournamentSchema } from './TournamentForm';

import ProgressSteps from './ProgressSteps';
import NavigationButtons from './NavigationButtons';
import Step1BasicInfo from './steps/Step1BasicInfo';
import Step2TournamentDetails from './steps/Step2TournamentDetails';
import Step3PrizeDistribution from './steps/Step3PrizeDistribution';
import Step4ReviewAndGamerTag from './steps/Step4ReviewAndGamerTag';
import Banner from '../../components/common/Banner';
import LoadingSpinner from '../../components/common/LoadingSpinner';

const steps = [
  { id: 'basic', title: 'Basic Info', description: 'Tournament fundamentals' },
  { id: 'details', title: 'Details', description: 'Settings & rules' },
  { id: 'prizes', title: 'Prizes', description: 'Prize distribution' },
  { id: 'review', title: 'Review', description: 'Confirm & create' },
];

const DRAFT_KEY = 'tournamentFormDraft';

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

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    trigger,
    formState: { errors },
    reset,
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

  // 🧩 Load initial data + check for saved draft
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

    // 🗃️ Load draft if exists
    const savedDraft = localStorage.getItem(DRAFT_KEY);
    if (savedDraft) {
      const { formData, step } = JSON.parse(savedDraft);
      reset(formData);
      setCurrentStep(step || 0);
    }
  }, [reset]);

  // 🎯 Auto-save progress to localStorage on every change
  useEffect(() => {
    const timer = setTimeout(() => {
      localStorage.setItem(
        DRAFT_KEY,
        JSON.stringify({
          formData: allValues,
          step: currentStep,
        })
      );
    }, 800); // debounce for performance

    return () => clearTimeout(timer);
  }, [allValues, currentStep]);

  // 🧹 Clear draft after successful submit
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

  const nextStep = async () => {
    const fieldsToValidate = getStepFields(currentStep);
    const isValid = await trigger(fieldsToValidate);

    if (isValid) {
      setCurrentStep((prev) => Math.min(prev + 1, steps.length - 1));
    }
  };

  const prevStep = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 0));
  };

  const getStepFields = (step) => {
    const stepFields = {
      0: ['name', 'game_id', 'platform_id', 'game_mode_id', 'format', 'visibility'],
      1: ['entry_fee', 'total_slots', 'start_time', 'rules'],
      2: ['prize_distribution'],
      3: ['gamer_tag'],
    };
    return stepFields[step] || [];
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
        return <Step2TournamentDetails register={register} errors={errors} />;
      case 2:
        return (
          <Step3PrizeDistribution
            register={register}
            errors={errors}
            watch={watch}
            setValue={setValue}
            addPrizePosition={addPrizePosition}
            removePrizePosition={removePrizePosition}
            updatePrizePercentage={updatePrizePercentage}
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" text="Loading tournament data..." />
      </div>
    );
  }

  return (
    <div className="bg-neutral-800 p-6 rounded-lg">
      <ProgressSteps currentStep={currentStep} />

      {error && (
        <Banner type="error" title="Form Error" message={error} className="mb-6" />
      )}
      {success && (
        <Banner
          type="success"
          title="Success!"
          message={success}
          className="mb-6"
        />
      )}

      <form onSubmit={handleSubmit(onSubmit)}>
        {renderStepContent()}

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
                <span>Creating Tournament...</span>
              </span>
            ) : (
              submitButtonText
            )
          }
        />
      </form>

      {/* 🧹 Clear Draft Option */}
      <div className="mt-4 text-right">
        <button
          onClick={clearDraft}
          className="text-sm text-red-400 hover:text-red-300 underline"
        >
          Clear Saved Draft
        </button>
      </div>

      <Banner
        type="info"
        message="Need help setting up your tournament? Check out our creation guide."
        action={{
          text: 'View Guide',
          to: '/help/tournament-creation',
        }}
        className="mt-6"
      />
    </div>
  );
}
