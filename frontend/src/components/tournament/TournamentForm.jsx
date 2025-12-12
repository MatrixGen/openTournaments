import { useState, useEffect, useCallback, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { dataService } from '../../services/dataService';
import { 
  PlusIcon, 
  XMarkIcon, 
  InformationCircleIcon,
  CalendarIcon,
  CurrencyDollarIcon,
  UserGroupIcon,
  ClockIcon
} from '@heroicons/react/24/outline';

// Export the schema so it can be used by both create and edit components
export const tournamentSchema = z.object({
  name: z.string().min(5, 'Tournament name must be at least 5 characters').max(255),
  game_id: z.number().min(1, 'Please select a game'),
  platform_id: z.number().min(1, 'Please select a platform'),
  game_mode_id: z.number().min(1, 'Please select a game mode'),
  format: z.enum(['single_elimination', 'double_elimination', 'round_robin'], {
    required_error: 'Please select a tournament format',
  }),
  entry_fee: z.number().min(0, 'Entry fee must be at least 0'),
  total_slots: z.number().min(2, 'Minimum 2 slots required').max(128, 'Maximum 128 slots allowed'),
  start_time: z.string().min(1, 'Start time is required').refine(
    (val) => new Date(val) > new Date(), 
    'Start time must be in the future'
  ),
  rules: z.string().optional(),
  visibility: z.enum(['public', 'private']).default('public'),
  prize_distribution: z.array(
    z.object({
      position: z.number().min(1, 'Position must be at least 1'),
      percentage: z.number().min(0, 'Percentage must be at least 0').max(100, 'Percentage cannot exceed 100'),
    })
  ).refine(
    (prizes) => prizes.reduce((sum, prize) => sum + prize.percentage, 0) === 100,
    'Prize distribution must total 100%'
  ).optional(),
  gamer_tag: z.string().min(2, 'Gamer tag must be at least 2 characters').max(50, 'Gamer tag cannot exceed 50 characters').optional(),
});

export default function TournamentForm({ 
  initialData = {}, 
  onSubmit, 
  isSubmitting = false, 
  error = '', 
  success = '',
  submitButtonText = 'Create Tournament',
  mode = 'create',
  tournamentStatus = 'scheduled'
}) {
  const [games, setGames] = useState([]);
  const [platforms, setPlatforms] = useState([]);
  const [gameModes, setGameModes] = useState([]);
  const [filteredGameModes, setFilteredGameModes] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [formErrors, setFormErrors] = useState('');

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(tournamentSchema),
    defaultValues: {
      visibility: 'public',
      prize_distribution: [{ position: 1, percentage: 100 }],
      ...initialData
    },
  });

  const selectedGameId = watch('game_id');
  const prizeDistribution = watch('prize_distribution') || [];
  const totalPrizePercentage = useMemo(() => 
    prizeDistribution.reduce((sum, prize) => sum + prize.percentage, 0),
    [prizeDistribution]
  );

  // Touch device detection for mobile optimizations
  const isTouchDevice = useMemo(() => 
    'ontouchstart' in window || navigator.maxTouchPoints > 0,
    []
  );

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
        setFormErrors('Failed to load required data. Please refresh the page.');
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, []);

  // Filter game modes when game selection changes
  useEffect(() => {
    if (selectedGameId) {
      const filtered = gameModes.filter(mode => mode.game_id === parseInt(selectedGameId));
      setFilteredGameModes(filtered);
      // Auto-select first game mode if only one exists and not already set
      if (filtered.length === 1 && !watch('game_mode_id')) {
        setValue('game_mode_id', filtered[0].id);
      }
    } else {
      setFilteredGameModes([]);
    }
  }, [selectedGameId, gameModes, setValue, watch]);

  const addPrizePosition = useCallback(() => {
    const currentPrizes = prizeDistribution;
    const newPosition = currentPrizes.length + 1;
    setValue('prize_distribution', [
      ...currentPrizes,
      { position: newPosition, percentage: 0 }
    ]);
  }, [prizeDistribution, setValue]);

  const removePrizePosition = useCallback((index) => {
    const newPrizes = prizeDistribution.filter((_, i) => i !== index);
    // Recalculate percentages to maintain 100%
    if (newPrizes.length > 0) {
      const totalRemaining = 100 - newPrizes.reduce((sum, prize) => sum + prize.percentage, 0);
      newPrizes[newPrizes.length - 1].percentage += totalRemaining;
    }
    setValue('prize_distribution', newPrizes);
  }, [prizeDistribution, setValue]);

  const updatePrizePercentage = useCallback((index, value) => {
    const percentage = Math.min(100, Math.max(0, parseFloat(value) || 0));
    const newPrizes = [...prizeDistribution];
    newPrizes[index].percentage = percentage;
    
    // Ensure total doesn't exceed 100%
    const total = newPrizes.reduce((sum, prize) => sum + prize.percentage, 0);
    if (total > 100) {
      // Adjust the last prize to maintain 100%
      newPrizes[newPrizes.length - 1].percentage -= (total - 100);
    }
    
    setValue('prize_distribution', newPrizes);
  }, [prizeDistribution, setValue]);

  const getMinStartTime = useCallback(() => {
    const now = new Date();
    now.setMinutes(now.getMinutes() + 30); // Minimum 30 minutes from now
    return now.toISOString().slice(0, 16);
  }, []);

  // Form sections for better mobile navigation
  const formSections = useMemo(() => [
    { id: 'basic', title: 'Basic Information', icon: InformationCircleIcon },
    { id: 'details', title: 'Tournament Details', icon: CalendarIcon },
    { id: 'prizes', title: 'Prize Distribution', icon: CurrencyDollarIcon },
    ...(mode === 'create' ? [{ id: 'gamerTag', title: 'Your Gamer Tag', icon: UserGroupIcon }] : []),
  ], [mode]);

  const [activeSection, setActiveSection] = useState('basic');

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 dark:border-primary-400"></div>
      </div>
    );
  }

  if (formErrors) {
    return (
      <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4">
        <div className="flex items-center">
          <ExclamationCircleIcon className="h-5 w-5 text-red-400 mr-2" />
          <p className="text-sm text-red-800 dark:text-red-200">{formErrors}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Mobile section navigation */}
      <div className="lg:hidden">
        <div className="flex space-x-2 overflow-x-auto pb-2">
          {formSections.map((section) => (
            <button
              key={section.id}
              type="button"
              onClick={() => {
                document.getElementById(section.id)?.scrollIntoView({ behavior: 'smooth' });
                setActiveSection(section.id);
              }}
              className={`flex-shrink-0 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                activeSection === section.id
                  ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300'
                  : 'bg-gray-100 dark:bg-neutral-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-neutral-600'
              }`}
            >
              <section.icon className="h-4 w-4 inline mr-1" />
              {section.title}
            </button>
          ))}
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 bg-white dark:bg-neutral-800 p-4 sm:p-6 rounded-lg shadow-sm border border-gray-200 dark:border-neutral-700">
        {error && (
          <div className="rounded-md bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 py-3 px-4 text-sm text-red-800 dark:text-red-200">
            {error}
          </div>
        )}

        {success && (
          <div className="rounded-md bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 py-3 px-4 text-sm text-green-800 dark:text-green-200">
            {success}
          </div>
        )}

        {/* Basic Information */}
        <section id="basic">
          <h2 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
            <InformationCircleIcon className="h-5 w-5 mr-2 text-gray-500 dark:text-gray-400" />
            Basic Information
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:gap-6 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label htmlFor="name" className="block text-sm font-medium text-gray-900 dark:text-white mb-1">
                Tournament Name *
              </label>
              <input
                type="text"
                id="name"
                {...register('name')}
                className={`w-full rounded-lg border bg-white dark:bg-neutral-700 py-2.5 px-3 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 text-sm transition-colors ${
                  errors.name
                    ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
                    : 'border-gray-300 dark:border-neutral-600 focus:border-primary-500 focus:ring-primary-500'
                }`}
                placeholder="e.g., Spring Championship"
                disabled={tournamentStatus === 'live'}
              />
              {errors.name && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.name.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="game_id" className="block text-sm font-medium text-gray-900 dark:text-white mb-1">
                Game *
              </label>
              <select
                id="game_id"
                {...register('game_id', { valueAsNumber: true })}
                className={`w-full rounded-lg border bg-white dark:bg-neutral-700 py-2.5 px-3 text-gray-900 dark:text-white focus:outline-none focus:ring-2 text-sm transition-colors ${
                  errors.game_id
                    ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
                    : 'border-gray-300 dark:border-neutral-600 focus:border-primary-500 focus:ring-primary-500'
                } ${tournamentStatus === 'live' ? 'opacity-60 cursor-not-allowed' : ''}`}
                disabled={tournamentStatus === 'live'}
              >
                <option value="">Select a game</option>
                {games.map((game) => (
                  <option key={game.id} value={game.id}>
                    {game.name}
                  </option>
                ))}
              </select>
              {errors.game_id && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.game_id.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="platform_id" className="block text-sm font-medium text-gray-900 dark:text-white mb-1">
                Platform *
              </label>
              <select
                id="platform_id"
                {...register('platform_id', { valueAsNumber: true })}
                className={`w-full rounded-lg border bg-white dark:bg-neutral-700 py-2.5 px-3 text-gray-900 dark:text-white focus:outline-none focus:ring-2 text-sm transition-colors ${
                  errors.platform_id
                    ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
                    : 'border-gray-300 dark:border-neutral-600 focus:border-primary-500 focus:ring-primary-500'
                } ${tournamentStatus === 'live' ? 'opacity-60 cursor-not-allowed' : ''}`}
                disabled={tournamentStatus === 'live'}
              >
                <option value="">Select a platform</option>
                {platforms.map((platform) => (
                  <option key={platform.id} value={platform.id}>
                    {platform.name}
                  </option>
                ))}
              </select>
              {errors.platform_id && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.platform_id.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="game_mode_id" className="block text-sm font-medium text-gray-900 dark:text-white mb-1">
                Game Mode *
              </label>
              <select
                id="game_mode_id"
                {...register('game_mode_id', { valueAsNumber: true })}
                className={`w-full rounded-lg border bg-white dark:bg-neutral-700 py-2.5 px-3 text-gray-900 dark:text-white focus:outline-none focus:ring-2 text-sm transition-colors ${
                  errors.game_mode_id
                    ? 'border-red-500 focus:border-red500 focus:ring-red-500'
                    : 'border-gray-300 dark:border-neutral-600 focus:border-primary-500 focus:ring-primary-500'
                } ${!selectedGameId || tournamentStatus === 'live' ? 'opacity-60 cursor-not-allowed' : ''}`}
                disabled={!selectedGameId || tournamentStatus === 'live'}
              >
                <option value="">Select a game mode</option>
                {filteredGameModes.map((mode) => (
                  <option key={mode.id} value={mode.id}>
                    {mode.name}
                  </option>
                ))}
              </select>
              {errors.game_mode_id && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.game_mode_id.message}</p>
              )}
              {!selectedGameId && (
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Select a game first to see available modes
                </p>
              )}
            </div>

            <div>
              <label htmlFor="format" className="block text-sm font-medium text-gray-900 dark:text-white mb-1">
                Tournament Format *
              </label>
              <select
                id="format"
                {...register('format')}
                className={`w-full rounded-lg border bg-white dark:bg-neutral-700 py-2.5 px-3 text-gray-900 dark:text-white focus:outline-none focus:ring-2 text-sm transition-colors ${
                  errors.format
                    ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
                    : 'border-gray-300 dark:border-neutral-600 focus:border-primary-500 focus:ring-primary-500'
                } ${tournamentStatus === 'live' ? 'opacity-60 cursor-not-allowed' : ''}`}
                disabled={tournamentStatus === 'live'}
              >
                <option value="">Select a format</option>
                <option value="single_elimination">Single Elimination</option>
                <option value="double_elimination">Double Elimination</option>
                <option value="round_robin">Round Robin</option>
              </select>
              {errors.format && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.format.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="visibility" className="block text-sm font-medium text-gray-900 dark:text-white mb-1">
                Visibility
              </label>
              <select
                id="visibility"
                {...register('visibility')}
                className="w-full rounded-lg border border-gray-300 dark:border-neutral-600 bg-white dark:bg-neutral-700 py-2.5 px-3 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:border-primary-500 focus:ring-primary-500 text-sm"
              >
                <option value="public">Public</option>
                <option value="private">Private</option>
              </select>
            </div>
          </div>
        </section>

        {/* Tournament Details */}
        <section id="details" className="pt-6 border-t border-gray-200 dark:border-neutral-700">
          <h2 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
            <CalendarIcon className="h-5 w-5 mr-2 text-gray-500 dark:text-gray-400" />
            Tournament Details
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:gap-6 sm:grid-cols-2">
            <div>
              <label htmlFor="entry_fee" className="block text-sm font-medium text-gray-900 dark:text-white mb-1">
                Entry Fee ($) *
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <CurrencyDollarIcon className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="number"
                  id="entry_fee"
                  step="0.01"
                  min="0"
                  {...register('entry_fee', { valueAsNumber: true })}
                  className={`pl-10 w-full rounded-lg border bg-white dark:bg-neutral-700 py-2.5 px-3 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 text-sm transition-colors ${
                    errors.entry_fee
                      ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
                      : 'border-gray-300 dark:border-neutral-600 focus:border-primary-500 focus:ring-primary-500'
                  } ${'opacity-60 cursor-not-allowed'}`}
                  placeholder={initialData.entry_fee}
                  disabled={true}
                />
              </div>
              {errors.entry_fee && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.entry_fee.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="total_slots" className="block text-sm font-medium text-gray-900 dark:text-white mb-1">
                Total Slots *
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <UserGroupIcon className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="number"
                  id="total_slots"
                  min="2"
                  max="128"
                  {...register('total_slots', { valueAsNumber: true })}
                  className={`pl-10 w-full rounded-lg border bg-white dark:bg-neutral-700 py-2.5 px-3 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 text-sm transition-colors ${
                    errors.total_slots
                      ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
                      : 'border-gray-300 dark:border-neutral-600 focus:border-primary-500 focus:ring-primary-500'
                  } ${tournamentStatus === 'live' ? 'opacity-60 cursor-not-allowed' : ''}`}
                  placeholder="16"
                  disabled={tournamentStatus === 'live'}
                />
              </div>
              {errors.total_slots && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.total_slots.message}</p>
              )}
            </div>

            <div className="sm:col-span-2">
              <label htmlFor="start_time" className="block text-sm font-medium text-gray-900 dark:text-white mb-1">
                Start Time *
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <ClockIcon className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="datetime-local"
                  id="start_time"
                  min={getMinStartTime()}
                  {...register('start_time')}
                  className={`pl-10 w-full rounded-lg border bg-white dark:bg-neutral-700 py-2.5 px-3 text-gray-900 dark:text-white focus:outline-none focus:ring-2 text-sm transition-colors ${
                    errors.start_time
                      ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
                      : 'border-gray-300 dark:border-neutral-600 focus:border-primary-500 focus:ring-primary-500'
                  } ${tournamentStatus === 'live' ? 'opacity-60 cursor-not-allowed' : ''}`}
                  disabled={tournamentStatus === 'live'}
                />
              </div>
              {errors.start_time && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.start_time.message}</p>
              )}
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Tournament must start at least 30 minutes from now
              </p>
            </div>

            <div className="sm:col-span-2">
              <label htmlFor="rules" className="block text-sm font-medium text-gray-900 dark:text-white mb-1">
                Rules & Guidelines
              </label>
              <textarea
                id="rules"
                rows={4}
                {...register('rules')}
                className="w-full rounded-lg border border-gray-300 dark:border-neutral-600 bg-white dark:bg-neutral-700 py-2.5 px-3 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:border-primary-500 focus:ring-primary-500 text-sm"
                placeholder="Describe the rules, guidelines, and any special instructions for participants..."
              />
            </div>
          </div>
        </section>

        {/* Prize Distribution 
        <section id="prizes" className="pt-6 border-t border-gray-200 dark:border-neutral-700">
          <h2 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
            <CurrencyDollarIcon className="h-5 w-5 mr-2 text-gray-500 dark:text-gray-400" />
            Prize Distribution
          </h2>
          <div className="space-y-4">
            <div className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              <p>Total: <span className={`font-medium ${totalPrizePercentage === 100 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                {totalPrizePercentage}%
              </span></p>
              {totalPrizePercentage !== 100 && (
                <p className="text-red-600 dark:text-red-400 text-xs mt-1">
                  Prize distribution must total 100%
                </p>
              )}
            </div>

            {prizeDistribution.map((prize, index) => (
              <div key={index} className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4 p-3 bg-gray-50 dark:bg-neutral-750 rounded-lg">
                <div className="w-full sm:w-32">
                  <label className="block text-sm font-medium text-gray-900 dark:text-white mb-1">
                    Position
                  </label>
                  <input
                    type="number"
                    min="1"
                    {...register(`prize_distribution.${index}.position`, { valueAsNumber: true })}
                    className="w-full rounded-lg border border-gray-300 dark:border-neutral-600 bg-white dark:bg-neutral-700 py-2 px-3 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:border-primary-500 focus:ring-primary-500 text-sm"
                  />
                </div>
                <div className="flex-1 w-full">
                  <label className="block text-sm font-medium text-gray-900 dark:text-white mb-1">
                    Percentage
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="range"
                      min="0"
                      max="100"
                      step="1"
                      value={prize.percentage}
                      onChange={(e) => updatePrizePercentage(index, e.target.value)}
                      className="flex-1 h-2 bg-gray-200 dark:bg-neutral-600 rounded-lg appearance-none cursor-pointer"
                    />
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="0.01"
                      value={prize.percentage}
                      onChange={(e) => updatePrizePercentage(index, e.target.value)}
                      className="w-24 rounded-lg border border-gray-300 dark:border-neutral-600 bg-white dark:bg-neutral-700 py-2 px-3 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:border-primary-500 focus:ring-primary-500 text-sm"
                    />
                    <span className="text-gray-600 dark:text-gray-400 text-sm">%</span>
                  </div>
                </div>
                {index > 0 && (
                  <button
                    type="button"
                    onClick={() => removePrizePosition(index)}
                    className={`mt-2 sm:mt-6 text-red-500 hover:text-red-400 ${isTouchDevice ? 'p-2' : ''}`}
                    aria-label="Remove prize position"
                  >
                    <XMarkIcon className="h-5 w-5" />
                  </button>
                )}
              </div>
            ))}
            
            {errors.prize_distribution && (
              <p className="text-sm text-red-600 dark:text-red-400">{errors.prize_distribution.message}</p>
            )}
            
            <button
              type="button"
              onClick={addPrizePosition}
              className="inline-flex items-center text-primary-600 dark:text-primary-400 hover:text-primary-500 dark:hover:text-primary-300 text-sm font-medium"
            >
              <PlusIcon className="h-4 w-4 mr-1" />
              Add Prize Position
            </button>
          </div>
        </section>{ */}

        {/* Gamer Tag (only for create mode) */}
        {mode === 'create' && (
          <section id="gamerTag" className="pt-6 border-t border-gray-200 dark:border-neutral-700">
            <h2 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
              <UserGroupIcon className="h-5 w-5 mr-2 text-gray-500 dark:text-gray-400" />
              Your Gamer Tag
            </h2>
            <div>
              <label htmlFor="gamer_tag" className="block text-sm font-medium text-gray-900 dark:text-white mb-1">
                Your Gamer Tag for This Tournament
              </label>
              <input
                type="text"
                id="gamer_tag"
                {...register('gamer_tag')}
                className={`w-full rounded-lg border bg-white dark:bg-neutral-700 py-2.5 px-3 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 text-sm transition-colors ${
                  errors.gamer_tag
                    ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
                    : 'border-gray-300 dark:border-neutral-600 focus:border-primary-500 focus:ring-primary-500'
                }`}
                placeholder="Enter your gamer tag for this tournament"
              />
              {errors.gamer_tag && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.gamer_tag.message}</p>
              )}
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                This will be displayed to other participants in the tournament.
              </p>
            </div>
          </section>
        )}

        {/* Submit Button */}
        <div className="pt-6 border-t border-gray-200 dark:border-neutral-700">
          <button
            type="submit"
            disabled={isSubmitting || tournamentStatus === 'live'}
            className={`flex w-full justify-center items-center rounded-lg border border-transparent py-3 px-4 text-sm font-medium text-white shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 transition-colors ${
              isTouchDevice ? 'min-h-12' : ''
            } ${
              tournamentStatus === 'live'
                ? 'bg-gray-400 dark:bg-gray-600 cursor-not-allowed'
                : 'bg-primary-500 hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed'
            }`}
          >
            {submitButtonText}
          </button>
          
          {tournamentStatus === 'live' && (
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400 text-center">
              Tournament is in progress. Editing is disabled.
            </p>
          )}
        </div>
      </form>
    </div>
  );
}