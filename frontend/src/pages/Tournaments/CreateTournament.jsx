import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import Header from '../../components/layout/Header';
import { dataService } from '../../services/dataService';
import { tournamentService } from '../../services/tournamentService';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

// Define validation schema based on API requirements
const tournamentSchema = z.object({
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
});

export default function CreateTournament() {
  const [games, setGames] = useState([]);
  const [platforms, setPlatforms] = useState([]);
  const [gameModes, setGameModes] = useState([]);
  const [filteredGameModes, setFilteredGameModes] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const { user } = useAuth();
  const navigate = useNavigate();

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
    },
  });

  const selectedGameId = watch('game_id');

  // Load necessary data
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
        setError('Failed to load necessary data. Please try again.');
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
      // Reset game mode selection when game changes
      setValue('game_mode_id', '');
    } else {
      setFilteredGameModes([]);
    }
  }, [selectedGameId, gameModes, setValue]);

  const onSubmit = async (data) => {
    setIsSubmitting(true);
    setError('');
    setSuccess('');

    try {
      // Convert string values to numbers where needed
      const formattedData = {
        ...data,
        game_id: parseInt(data.game_id),
        platform_id: parseInt(data.platform_id),
        game_mode_id: parseInt(data.game_mode_id),
        entry_fee: parseFloat(data.entry_fee),
        total_slots: parseInt(data.total_slots),
      };

      const response = await tournamentService.create(formattedData);
      setSuccess('Tournament created successfully!');
      
      // Redirect to the new tournament page after a short delay
      setTimeout(() => {
        navigate(`/tournaments/${response.tournament.id}`);
      }, 1500);
    } catch (err) {
      console.error('Tournament creation error:', err);
      setError(err.response?.data?.message || 'Failed to create tournament. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const addPrizePosition = () => {
    const currentPrizes = watch('prize_distribution') || [];
    const newPosition = currentPrizes.length + 1;
    setValue('prize_distribution', [
      ...currentPrizes,
      { position: newPosition, percentage: 0 }
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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-neutral-900">
        <Header />
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-900">
      <Header />
      <main className="mx-auto max-w-4xl py-8 px-4 sm:px-6 lg:px-8">
        <div className="md:flex md:items-center md:justify-between mb-8">
          <div className="flex-1 min-w-0">
            <h1 className="text-3xl font-bold text-white">Create Tournament</h1>
            <p className="mt-2 text-sm text-gray-400">
              Set up a new tournament for players to compete in.
            </p>
          </div>
          <div className="mt-4 flex md:mt-0 md:ml-4">
            <button
              type="button"
              onClick={() => navigate('/tournaments')}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-300 bg-transparent hover:bg-neutral-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
            >
              Cancel
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-6 rounded-md bg-red-800/50 py-3 px-4 text-sm text-red-200">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-6 rounded-md bg-green-800/50 py-3 px-4 text-sm text-green-200">
            {success}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 bg-neutral-800 p-6 rounded-lg">
          {/* Basic Information */}
          <div>
            <h2 className="text-xl font-semibold text-white mb-4">Basic Information</h2>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-white">
                  Tournament Name *
                </label>
                <input
                  type="text"
                  id="name"
                  {...register('name')}
                  className="mt-1 block w-full rounded-md border border-neutral-600 bg-neutral-700 py-2 px-3 text-white placeholder-gray-400 focus:border-primary-500 focus:outline-none focus:ring-primary-500 sm:text-sm"
                  placeholder="e.g., Spring Championship"
                />
                {errors.name && (
                  <p className="mt-1 text-sm text-red-400">{errors.name.message}</p>
                )}
              </div>

              <div>
                <label htmlFor="game_id" className="block text-sm font-medium text-white">
                  Game *
                </label>
                <select
                  id="game_id"
                  {...register('game_id', { valueAsNumber: true })}
                  className="mt-1 block w-full rounded-md border border-neutral-600 bg-neutral-700 py-2 px-3 text-white focus:border-primary-500 focus:outline-none focus:ring-primary-500 sm:text-sm"
                >
                  <option value="">Select a game</option>
                  {games.map((game) => (
                    <option key={game.id} value={game.id}>
                      {game.name}
                    </option>
                  ))}
                </select>
                {errors.game_id && (
                  <p className="mt-1 text-sm text-red-400">{errors.game_id.message}</p>
                )}
              </div>

              <div>
                <label htmlFor="platform_id" className="block text-sm font-medium text-white">
                  Platform *
                </label>
                <select
                  id="platform_id"
                  {...register('platform_id', { valueAsNumber: true })}
                  className="mt-1 block w-full rounded-md border border-neutral-600 bg-neutral-700 py-2 px-3 text-white focus:border-primary-500 focus:outline-none focus:ring-primary-500 sm:text-sm"
                >
                  <option value="">Select a platform</option>
                  {platforms.map((platform) => (
                    <option key={platform.id} value={platform.id}>
                      {platform.name}
                    </option>
                  ))}
                </select>
                {errors.platform_id && (
                  <p className="mt-1 text-sm text-red-400">{errors.platform_id.message}</p>
                )}
              </div>

              <div>
                <label htmlFor="game_mode_id" className="block text-sm font-medium text-white">
                  Game Mode *
                </label>
                <select
                  id="game_mode_id"
                  {...register('game_mode_id', { valueAsNumber: true })}
                  className="mt-1 block w-full rounded-md border border-neutral-600 bg-neutral-700 py-2 px-3 text-white focus:border-primary-500 focus:outline-none focus:ring-primary-500 sm:text-sm"
                  disabled={!selectedGameId}
                >
                  <option value="">Select a game mode</option>
                  {filteredGameModes.map((mode) => (
                    <option key={mode.id} value={mode.id}>
                      {mode.name}
                    </option>
                  ))}
                </select>
                {errors.game_mode_id && (
                  <p className="mt-1 text-sm text-red-400">{errors.game_mode_id.message}</p>
                )}
              </div>

              <div>
                <label htmlFor="format" className="block text-sm font-medium text-white">
                  Tournament Format *
                </label>
                <select
                  id="format"
                  {...register('format')}
                  className="mt-1 block w-full rounded-md border border-neutral-600 bg-neutral-700 py-2 px-3 text-white focus:border-primary-500 focus:outline-none focus:ring-primary-500 sm:text-sm"
                >
                  <option value="">Select a format</option>
                  <option value="single_elimination">Single Elimination</option>
                  <option value="double_elimination">Double Elimination</option>
                  <option value="round_robin">Round Robin</option>
                </select>
                {errors.format && (
                  <p className="mt-1 text-sm text-red-400">{errors.format.message}</p>
                )}
              </div>

              <div>
                <label htmlFor="visibility" className="block text-sm font-medium text-white">
                  Visibility
                </label>
                <select
                  id="visibility"
                  {...register('visibility')}
                  className="mt-1 block w-full rounded-md border border-neutral-600 bg-neutral-700 py-2 px-3 text-white focus:border-primary-500 focus:outline-none focus:ring-primary-500 sm:text-sm"
                >
                  <option value="public">Public</option>
                  <option value="private">Private</option>
                </select>
                {errors.visibility && (
                  <p className="mt-1 text-sm text-red-400">{errors.visibility.message}</p>
                )}
              </div>
            </div>
          </div>

          {/* Tournament Details */}
          <div>
            <h2 className="text-xl font-semibold text-white mb-4">Tournament Details</h2>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div>
                <label htmlFor="entry_fee" className="block text-sm font-medium text-white">
                  Entry Fee ($) *
                </label>
                <input
                  type="number"
                  id="entry_fee"
                  step="0.01"
                  min="0"
                  {...register('entry_fee', { valueAsNumber: true })}
                  className="mt-1 block w-full rounded-md border border-neutral-600 bg-neutral-700 py-2 px-3 text-white placeholder-gray-400 focus:border-primary-500 focus:outline-none focus:ring-primary-500 sm:text-sm"
                  placeholder="0.00"
                />
                {errors.entry_fee && (
                  <p className="mt-1 text-sm text-red-400">{errors.entry_fee.message}</p>
                )}
              </div>

              <div>
                <label htmlFor="total_slots" className="block text-sm font-medium text-white">
                  Total Slots *
                </label>
                <input
                  type="number"
                  id="total_slots"
                  min="2"
                  max="128"
                  {...register('total_slots', { valueAsNumber: true })}
                  className="mt-1 block w-full rounded-md border border-neutral-600 bg-neutral-700 py-2 px-3 text-white placeholder-gray-400 focus:border-primary-500 focus:outline-none focus:ring-primary-500 sm:text-sm"
                  placeholder="16"
                />
                {errors.total_slots && (
                  <p className="mt-1 text-sm text-red-400">{errors.total_slots.message}</p>
                )}
              </div>

              <div className="sm:col-span-2">
                <label htmlFor="start_time" className="block text-sm font-medium text-white">
                  Start Time *
                </label>
                <input
                  type="datetime-local"
                  id="start_time"
                  {...register('start_time')}
                  className="mt-1 block w-full rounded-md border border-neutral-600 bg-neutral-700 py-2 px-3 text-white focus:border-primary-500 focus:outline-none focus:ring-primary-500 sm:text-sm"
                />
                {errors.start_time && (
                  <p className="mt-1 text-sm text-red-400">{errors.start_time.message}</p>
                )}
              </div>

              <div className="sm:col-span-2">
                <label htmlFor="rules" className="block text-sm font-medium text-white">
                  Rules & Guidelines
                </label>
                <textarea
                  id="rules"
                  rows={4}
                  {...register('rules')}
                  className="mt-1 block w-full rounded-md border border-neutral-600 bg-neutral-700 py-2 px-3 text-white placeholder-gray-400 focus:border-primary-500 focus:outline-none focus:ring-primary-500 sm:text-sm"
                  placeholder="Describe the rules, guidelines, and any special instructions for participants..."
                />
                {errors.rules && (
                  <p className="mt-1 text-sm text-red-400">{errors.rules.message}</p>
                )}
              </div>
            </div>
          </div>

          {/* Prize Distribution */}
          <div>
            <h2 className="text-xl font-semibold text-white mb-4">Prize Distribution</h2>
            <div className="space-y-4">
              {watch('prize_distribution')?.map((prize, index) => (
                <div key={index} className="flex items-center space-x-4">
                  <div>
                    <label className="block text-sm font-medium text-white">Position</label>
                    <input
                      type="number"
                      min="1"
                      {...register(`prize_distribution.${index}.position`, { valueAsNumber: true })}
                      className="mt-1 block w-20 rounded-md border border-neutral-600 bg-neutral-700 py-2 px-3 text-white focus:border-primary-500 focus:outline-none focus:ring-primary-500 sm:text-sm"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-white">Percentage</label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="0.01"
                      value={prize.percentage}
                      onChange={(e) => updatePrizePercentage(index, e.target.value)}
                      className="mt-1 block w-full rounded-md border border-neutral-600 bg-neutral-700 py-2 px-3 text-white focus:border-primary-500 focus:outline-none focus:ring-primary-500 sm:text-sm"
                    />
                  </div>
                  {index > 0 && (
                    <button
                      type="button"
                      onClick={() => removePrizePosition(index)}
                      className="mt-6 text-red-500 hover:text-red-400"
                    >
                      Remove
                    </button>
                  )}
                </div>
              ))}
              
              {errors.prize_distribution && (
                <p className="text-sm text-red-400">{errors.prize_distribution.message}</p>
              )}
              
              <button
                type="button"
                onClick={addPrizePosition}
                className="text-primary-500 hover:text-primary-400 text-sm font-medium"
              >
                + Add Prize Position
              </button>
            </div>
          </div>

          {/* Submit Button */}
          <div className="pt-6">
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex w-full justify-center rounded-md border border-transparent bg-primary-500 py-3 px-4 text-sm font-medium text-white shadow-sm hover:bg-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 focus:ring-offset-neutral-900 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Creating Tournament...' : 'Create Tournament'}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}