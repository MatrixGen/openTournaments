export default function Step3PrizeDistribution({ 
  errors, 
  watch, 
  addPrizePosition, 
  removePrizePosition, 
  updatePrizePercentage 
}) {
  const allValues = watch();
  const prizeDistribution = watch('prize_distribution') || [];

  const totalPrizePool = (allValues.entry_fee || 0) * (allValues.total_slots || 0);
  const totalPercentage = prizeDistribution.reduce((sum, prize) => sum + (prize.percentage || 0), 0);

  return (
    <div className="space-y-6">
      <div className="text-center mb-4 md:mb-6">
        <h2 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">Prize Distribution</h2>
        <p className="text-gray-600 dark:text-gray-400 mt-1 text-sm md:text-base">
          Configure how the prize pool is distributed
        </p>
      </div>

      {/* Prize Pool Summary */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800/30 p-4 rounded-lg">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <h3 className="font-medium text-gray-900 dark:text-white">Prize Pool Calculation</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Based on entry fee and total slots
            </p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              ${totalPrizePool.toFixed(2)}
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              ${allValues.entry_fee || 0} × {allValues.total_slots || 0} players
            </p>
          </div>
        </div>
      </div>

      {/* Prize Distribution Items */}
      <div className="space-y-4">
        {prizeDistribution.map((prize, index) => {
          const prizeAmount = ((prize.percentage || 0) / 100) * totalPrizePool;
          
          return (
            <div key={index} className="p-4 bg-gray-50 dark:bg-neutral-700/30 rounded-lg border border-gray-200 dark:border-neutral-600">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2 mb-3">
                    <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 text-sm font-semibold">
                      {prize.position}
                    </span>
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      Position #{prize.position}
                    </span>
                  </div>
                  
                  <div className="space-y-3">
                    {/* Percentage Slider */}
                    <div>
                      <label className="block text-xs text-gray-500 dark:text-gray-400 mb-2">
                        Percentage: {prize.percentage || 0}%
                      </label>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        step="0.5"
                        value={prize.percentage || 0}
                        onChange={(e) => updatePrizePercentage(index, e.target.value)}
                        className="w-full h-2 bg-gray-200 dark:bg-neutral-600 rounded-lg appearance-none cursor-pointer slider-thumb"
                      />
                    </div>

                    {/* Percentage Input */}
                    <div className="flex items-center space-x-3">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        step="0.1"
                        value={prize.percentage || 0}
                        onChange={(e) => updatePrizePercentage(index, e.target.value)}
                        className="w-24 rounded-lg border border-gray-300 dark:border-neutral-600 bg-white dark:bg-neutral-700 py-2 px-3 text-gray-900 dark:text-white text-center focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
                      />
                      <span className="text-gray-700 dark:text-gray-300 font-medium">%</span>
                      <div className="ml-auto text-right">
                        <p className="text-sm font-semibold text-gray-900 dark:text-white">
                          ${prizeAmount.toFixed(2)}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Prize amount</p>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Remove Button - Only show for positions beyond first */}
                {index > 0 && (
                  <button
                    type="button"
                    onClick={() => removePrizePosition(index)}
                    className="mt-4 md:mt-0 px-4 py-2 border border-red-300 dark:border-red-700 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-sm font-medium transition-colors"
                  >
                    Remove
                  </button>
                )}
              </div>
            </div>
          );
        })}
        
        {/* Error Display */}
        {errors.prize_distribution && (
          <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4">
            <p className="text-sm text-red-600 dark:text-red-400">
              {errors.prize_distribution.message}
            </p>
          </div>
        )}

        {/* Add Button and Total */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pt-4">
          <button
            type="button"
            onClick={addPrizePosition}
            className="inline-flex items-center justify-center px-4 py-2 border border-gray-300 dark:border-neutral-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-neutral-700 text-sm font-medium transition-colors"
          >
            <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Prize Position
          </button>
          
          <div className="text-center md:text-right">
            <div className="text-sm text-gray-600 dark:text-gray-400">Total Percentage</div>
            <div className={`text-xl font-bold ${totalPercentage === 100 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
              {totalPercentage.toFixed(1)}%
            </div>
            {totalPercentage !== 100 && (
              <p className="text-sm text-red-600 dark:text-red-400 mt-1">
                Total must equal 100%
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}