import { CheckCircleIcon, ClockIcon, UsersIcon, TrophyIcon } from '@heroicons/react/24/outline';
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
  
  const totalPrizePool = (allValues.entry_fee || 0) * (allValues.total_slots || 0);

  return (
    <div className="space-y-6">
      <div className="text-center mb-4 md:mb-6">
        <h2 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-gray-900 dark:text-white">Almost There!</h2>
        <p className="text-gray-600 dark:text-gray-400 mt-1 text-sm md:text-base">
          Review your tournament details and add your gamer tag
        </p>
      </div>

      {/* Review Summary */}
      <div className="space-y-6">
        <div className="bg-gray-50 dark:bg-neutral-800 rounded-xl p-4 md:p-6 border border-gray-200 dark:border-neutral-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-900 dark:text-white mb-4 flex items-center">
            <CheckCircleIcon className="h-5 w-5 text-green-500 mr-2" />
            Tournament Summary
          </h3>
          
          <div className="space-y-4">
            {/* Basic Info Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white dark:bg-neutral-700/30 p-3 rounded-lg">
                <h4 className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Tournament Name</h4>
                <p className="text-base font-medium text-gray-900 dark:text-gray-900 dark:text-white">{allValues.name || "Not set"}</p>
              </div>
              
              <div className="bg-white dark:bg-neutral-700/30 p-3 rounded-lg">
                <h4 className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Visibility</h4>
                <p className="text-base font-medium text-gray-900 dark:text-gray-900 dark:text-white capitalize">
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
                  <p className="font-medium text-gray-900 dark:text-gray-900 dark:text-white">{selectedGame?.name || "Not selected"}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Platform</p>
                  <p className="font-medium text-gray-900 dark:text-gray-900 dark:text-white">{selectedPlatform?.name || "Not selected"}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Game Mode</p>
                  <p className="font-medium text-gray-900 dark:text-gray-900 dark:text-white">{selectedGameMode?.name || "Not selected"}</p>
                </div>
              </div>
            </div>

            {/* Tournament Settings */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white dark:bg-neutral-700/30 p-3 rounded-lg">
                <h4 className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Format</h4>
                <p className="text-base font-medium text-gray-900 dark:text-gray-900 dark:text-white capitalize">
                  {allValues.format?.replace(/_/g, ' ') || "Not set"}
                </p>
              </div>
              
              <div className="bg-white dark:bg-neutral-700/30 p-3 rounded-lg">
                <h4 className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Slots & Entry</h4>
                <div className="flex items-center space-x-2">
                  <UsersIcon className="h-4 w-4 text-gray-400" />
                  <p className="text-base font-medium text-gray-900 dark:text-gray-900 dark:text-white">
                    {allValues.total_slots || 0} slots
                  </p>
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  ${allValues.entry_fee || 0} entry fee
                </p>
              </div>
              
              <div className="bg-white dark:bg-neutral-700/30 p-3 rounded-lg">
                <h4 className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Start Time</h4>
                <div className="flex items-center space-x-2">
                  <ClockIcon className="h-4 w-4 text-gray-400" />
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-900 dark:text-white">
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
            <div className="bg-white dark:bg-neutral-700/30 p-4 rounded-lg">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-xs font-medium text-gray-500 dark:text-gray-400">Prize Distribution</h4>
                <div className="text-right">
                  <p className="text-sm text-gray-500 dark:text-gray-400">Total Prize Pool</p>
                  <p className="text-lg font-bold text-gray-900 dark:text-gray-900 dark:text-white">
                    {formatCurrency(  totalPrizePool,'USD')}
                  </p>
                </div>
              </div>
              
              <div className="space-y-2">
                {allValues.prize_distribution?.map((prize, index) => {
                  const prizeAmount = ((prize.percentage || 0) / 100) * totalPrizePool;
                  
                  return (
                    <div key={index} className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-neutral-600 last:border-0">
                      <div className="flex items-center space-x-3">
                        <TrophyIcon className={`h-4 w-4 ${
                          index === 0 ? 'text-yellow-500' : 
                          index === 1 ? 'text-gray-400' : 
                          index === 2 ? 'text-orange-500' : 'text-gray-300'
                        }`} />
                        <span className="text-sm font-medium text-gray-900 dark:text-gray-900 dark:text-white">
                          {prize.position}st Place
                        </span>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-gray-900 dark:text-gray-900 dark:text-white">
                          {formatCurrency(prizeAmount,'USD')}
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
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-900 dark:text-white mb-4">
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
              className="block w-full rounded-lg border border-gray-300 dark:border-neutral-600 bg-white dark:bg-neutral-700 py-3 px-4 text-gray-900 dark:text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500 text-base md:text-sm transition-colors"
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