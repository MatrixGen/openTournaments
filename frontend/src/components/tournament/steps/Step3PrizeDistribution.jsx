export default function Step3PrizeDistribution({ 
  register, 
  errors, 
  watch, 
  setValue, 
  addPrizePosition, 
  removePrizePosition, 
  updatePrizePercentage 
}) {
  const allValues = watch();
  const prizeDistribution = watch('prize_distribution') || [];

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-white">Prize Distribution</h2>
       
      </div>

      <div className="bg-neutral-700/50 p-4 rounded-lg mb-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-medium text-white">Prize Pool Calculation</h3>
            <p className="text-sm text-neutral-400">
              Total Prize Pool: ${(allValues.entry_fee * allValues.total_slots).toFixed(2)}
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm font-medium text-white">
              Entry Fee: ${allValues.entry_fee || 0} × {allValues.total_slots || 0} players
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {prizeDistribution.map((prize, index) => (
          <div key={index} className="flex items-end space-x-4 p-4 bg-neutral-700/30 rounded-lg">
            <div className="flex-1">
              <label className="block text-sm font-medium text-white mb-2">
                Position #{prize.position}
              </label>
              <div className="flex items-center space-x-2">
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="0.5"
                  value={prize.percentage}
                  onChange={(e) => updatePrizePercentage(index, e.target.value)}
                  className="flex-1 h-2 bg-neutral-600 rounded-lg appearance-none cursor-pointer"
                />
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  value={prize.percentage}
                  onChange={(e) => updatePrizePercentage(index, e.target.value)}
                  className="w-20 rounded-md border border-neutral-600 bg-neutral-700 py-1 px-2 text-white text-center focus:border-primary-500 focus:outline-none focus:ring-primary-500 sm:text-sm"
                />
                <span className="text-white w-8 text-sm">%</span>
              </div>
              <p className="text-sm text-neutral-400 mt-1">
                ${((prize.percentage / 100) * (allValues.entry_fee * allValues.total_slots)).toFixed(2)}
              </p>
            </div>
            {index > 0 && (
              <button
                type="button"
                onClick={() => removePrizePosition(index)}
                className="text-red-500 hover:text-red-400 p-2"
              >
                × Remove
              </button>
            )}
          </div>
        ))}
        
        {errors.prize_distribution && (
          <div className="rounded-md bg-red-800/50 py-3 px-4 text-sm text-red-200">
            {errors.prize_distribution.message}
          </div>
        )}

        <div className="flex justify-between items-center">
          <button
            type="button"
            onClick={addPrizePosition}
            className="text-primary-500 hover:text-primary-400 text-sm font-medium flex items-center"
          >
            + Add Prize Position
          </button>
          
          <div className="text-sm text-neutral-400">
            Total: {prizeDistribution.reduce((sum, prize) => sum + prize.percentage, 0) || 0}%
          </div>
        </div>
      </div>
    </div>
  );
}