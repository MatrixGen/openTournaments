import { CheckCircleIcon, ClockIcon, UsersIcon, TrophyIcon, PlusCircleIcon, CurrencyDollarIcon } from '@heroicons/react/24/outline';
import { formatCurrency } from '../../../config/currencyConfig';

export default function Step4ReviewAndGamerTag({ 
  register, 
  errors, 
  watch, 
  games, 
  platforms, 
  filteredGameModes 
}) {
  const allValues = watch();

  const selectedGame = games.find(g => g.id === allValues.game_id);
  const selectedPlatform = platforms.find(p => p.id === allValues.platform_id);
  const selectedGameMode = filteredGameModes.find(m => m.id === allValues.game_mode_id);
  
  // Calculate prize pool properly
  const entryFee = parseFloat(allValues.entry_fee || 0);
  const totalSlots = parseInt(allValues.total_slots || 0);
  const defaultPrizePool = entryFee * totalSlots;
  const customPrizePool = allValues.prize_pool ? parseFloat(allValues.prize_pool) : null;
  const effectivePrizePool = customPrizePool !== null ? customPrizePool : defaultPrizePool;
  const additionalContribution = customPrizePool ? customPrizePool - defaultPrizePool : 0;

  return (
    <div className="space-y-6">
      <div className="text-center mb-4 md:mb-6">
        <h2 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">Almost There!</h2>
        <p className="text-gray-600 dark:text-gray-400 mt-1 text-sm md:text-base">
          Review your tournament details and add your gamer tag
        </p>
      </div>

      {/* Review Summary */}
      <div className="space-y-6">
        <div className="bg-gray-50 dark:bg-neutral-800 rounded-xl p-4 md:p-6 border border-gray-200 dark:border-neutral-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
            <CheckCircleIcon className="h-5 w-5 text-green-500 mr-2" />
            Tournament Summary
          </h3>
          
          <div className="space-y-4">
            {/* Basic Info Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white dark:bg-neutral-700/30 p-3 rounded-lg">
                <h4 className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Tournament Name</h4>
                <p className="text-base font-medium text-gray-900 dark:text-white">{allValues.name || "Not set"}</p>
              </div>
              
              <div className="bg-white dark:bg-neutral-700/30 p-3 rounded-lg">
                <h4 className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Visibility</h4>
                <p className="text-base font-medium text-gray-900 dark:text-white capitalize">
                  {allValues.visibility === 'public' ? 'Public Tournament' : 'Private Tournament'}
                </p>
              </div>
            </div>

            {/* Game Details Row */}
            <div className="bg-white dark:bg-neutral-700/30 p-4 rounded-lg">
              <h4 className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Game Details</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Game</p>
                  <p className="font-medium text-gray-900 dark:text-white">{selectedGame?.name || "Not selected"}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Platform</p>
                  <p className="font-medium text-gray-900 dark:text-white">{selectedPlatform?.name || "Not selected"}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Game Mode</p>
                  <p className="font-medium text-gray-900 dark:text-white">{selectedGameMode?.name || "Not selected"}</p>
                </div>
              </div>
            </div>

            {/* Tournament Settings */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white dark:bg-neutral-700/30 p-3 rounded-lg">
                <h4 className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Format</h4>
                <p className="text-base font-medium text-gray-900 dark:text-white capitalize">
                  {allValues.format?.replace(/_/g, ' ') || "Not set"}
                </p>
              </div>
              
              <div className="bg-white dark:bg-neutral-700/30 p-3 rounded-lg">
                <h4 className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Slots & Entry</h4>
                <div className="flex items-center space-x-2">
                  <UsersIcon className="h-4 w-4 text-gray-400" />
                  <p className="text-base font-medium text-gray-900 dark:text-white">
                    {totalSlots} slots
                  </p>
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  {formatCurrency(entryFee, 'USD')} entry fee
                </p>
              </div>
              
              <div className="bg-white dark:bg-neutral-700/30 p-3 rounded-lg">
                <h4 className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Start Time</h4>
                <div className="flex items-center space-x-2">
                  <ClockIcon className="h-4 w-4 text-gray-400" />
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {allValues.start_time ? new Date(allValues.start_time).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    }) : 'Not set'}
                  </p>
                </div>
              </div>
            </div>

            {/* Prize Pool Details */}
            <div className="bg-white dark:bg-neutral-700/30 p-4 rounded-lg border border-gray-200 dark:border-neutral-600">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center">
                  <CurrencyDollarIcon className="h-5 w-5 text-green-500 mr-2" />
                  <h4 className="text-sm font-semibold text-gray-900 dark:text-white">Prize Pool Details</h4>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-500 dark:text-gray-400">Total Prize Pool</p>
                  <p className="text-xl font-bold text-primary-600 dark:text-primary-400">
                    {formatCurrency(effectivePrizePool, 'USD')}
                  </p>
                </div>
              </div>
              
              <div className="space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Default Prize Pool:</p>
                    <p className="text-lg font-medium text-gray-900 dark:text-white">
                      {formatCurrency(defaultPrizePool, 'USD')}
                    </p>
                  </div>
                  
                  {additionalContribution > 0 && (
                    <div>
                      <div className="flex items-center">
                        <PlusCircleIcon className="h-4 w-4 text-green-500 mr-1" />
                        <p className="text-sm text-gray-600 dark:text-gray-400">Your Additional Contribution:</p>
                      </div>
                      <p className="text-lg font-medium text-green-600 dark:text-green-400">
                        +{formatCurrency(additionalContribution, 'USD')}
                      </p>
                    </div>
                  )}
                </div>
                
                {additionalContribution > 0 && (
                  <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800/30 rounded-lg">
                    <div className="flex items-start">
                      <svg className="h-5 w-5 text-yellow-500 mt-0.5 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                      <div className="flex-1">
                        <p className="font-medium text-yellow-800 dark:text-yellow-300 text-sm">
                          Additional payment required
                        </p>
                        <p className="text-yellow-700 dark:text-yellow-400 text-sm mt-1">
                          You'll pay an additional {formatCurrency(additionalContribution, 'USD')} 
                          (entry fee: {formatCurrency(entryFee, 'USD')} + prize boost: {formatCurrency(additionalContribution, 'USD')})
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Rules Section */}
            {allValues.rules && (
              <div className="bg-white dark:bg-neutral-700/30 p-4 rounded-lg">
                <h4 className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Rules & Guidelines</h4>
                <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                  {allValues.rules}
                </p>
              </div>
            )}

            {/* Prize Distribution */}
            <div className="bg-white dark:bg-neutral-700/30 p-4 rounded-lg border border-gray-200 dark:border-neutral-600">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center">
                  <TrophyIcon className="h-5 w-5 text-yellow-500 mr-2" />
                  <h4 className="text-sm font-semibold text-gray-900 dark:text-white">Prize Distribution</h4>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-500 dark:text-gray-400">Based on {formatCurrency(effectivePrizePool, 'USD')}</p>
                </div>
              </div>
              
              <div className="space-y-2">
                {allValues.prize_distribution?.map((prize, index) => {
                  const prizeAmount = ((prize.percentage || 0) / 100) * effectivePrizePool;
                  
                  return (
                    <div key={index} className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-neutral-600 last:border-0">
                      <div className="flex items-center space-x-3">
                        <TrophyIcon className={`h-4 w-4 ${
                          index === 0 ? 'text-yellow-500' : 
                          index === 1 ? 'text-gray-400' : 
                          index === 2 ? 'text-orange-500' : 'text-gray-300'
                        }`} />
                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                          {prize.position}st Place
                        </span>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-gray-900 dark:text-white">
                          {formatCurrency(prizeAmount, 'USD')}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {prize.percentage || 0}% of prize pool
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Gamer Tag Input */}
        <div className="bg-white dark:bg-neutral-800 rounded-xl p-4 md:p-6 border border-gray-200 dark:border-neutral-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Your Gamer Tag
          </h3>
          
          <div>
            <label htmlFor="gamer_tag" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Enter your gamer tag for this tournament *
            </label>
            <input
              type="text"
              id="gamer_tag"
              {...register('gamer_tag')}
              className="block w-full rounded-lg border border-gray-300 dark:border-neutral-600 bg-white dark:bg-neutral-700 py-3 px-4 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500 text-base md:text-sm transition-colors"
              placeholder="Enter your gamer tag (e.g., ProGamer123)"
            />
            {errors.gamer_tag && (
              <p className="mt-2 text-sm text-red-600 dark:text-red-400">{errors.gamer_tag.message}</p>
            )}
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              This will be displayed to other participants in the tournament. Make sure it's accurate!
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}