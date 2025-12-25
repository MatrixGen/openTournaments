export default function PrizeDistribution({ prizes, onAddPrize, onRemovePrize, onUpdatePercentage, errors }) {
  return (
    <div>
      <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Prize Distribution</h2>
      <div className="space-y-4">
        {prizes?.map((prize, index) => (
          <div key={index} className="flex items-center space-x-4">
            <div>
              <label className="block text-sm font-medium text-gray-900 dark:text-white">Position</label>
              <input
                type="number"
                min="1"
                value={prize.position}
                readOnly
                className="mt-1 block w-20 rounded-md border border-neutral-600 bg-neutral-700 py-2 px-3 text-gray-900 dark:text-white focus:border-primary-500 focus:outline-none focus:ring-primary-500 sm:text-sm"
              />
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-900 dark:text-white">Percentage</label>
              <input
                type="number"
                min="0"
                max="100"
                step="0.01"
                value={prize.percentage}
                onChange={(e) => onUpdatePercentage(index, e.target.value)}
                className="mt-1 block w-full rounded-md border border-neutral-600 bg-neutral-700 py-2 px-3 text-gray-900 dark:text-white focus:border-primary-500 focus:outline-none focus:ring-primary-500 sm:text-sm"
              />
            </div>
            {index > 0 && (
              <button
                type="button"
                onClick={() => onRemovePrize(index)}
                className="mt-6 text-red-500 hover:text-red-400"
              >
                Remove
              </button>
            )}
          </div>
        ))}
        
        {errors && (
          <p className="text-sm text-red-400">{errors.message}</p>
        )}
        
        <button
          type="button"
          onClick={onAddPrize}
          className="text-primary-500 hover:text-primary-400 text-sm font-medium"
        >
          + Add Prize Position
        </button>
      </div>
    </div>
  );
}