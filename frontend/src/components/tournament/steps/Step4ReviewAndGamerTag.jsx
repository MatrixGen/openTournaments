export default function Step4ReviewAndGamerTag({ 
  register, 
  errors, 
  watch, 
  games, 
  platforms, 
  filteredGameModes 
}) {
  const allValues = watch();

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-white">Almost There!</h2>
        
      </div>

      {/* Review Summary */}
      <div className="bg-neutral-700/30 rounded-lg p-6 space-y-4">
        <h3 className="text-lg font-semibold text-white mb-4">Tournament Summary</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <h4 className="text-sm font-medium text-neutral-400">Basic Info</h4>
            <p className="text-white font-medium">{allValues.name}</p>
            <p className="text-sm text-neutral-300">
              {games.find(g => g.id === allValues.game_id)?.name} • 
              {platforms.find(p => p.id === allValues.platform_id)?.name} • 
              {filteredGameModes.find(m => m.id === allValues.game_mode_id)?.name}
            </p>
          </div>

          <div>
            <h4 className="text-sm font-medium text-neutral-400">Format & Settings</h4>
            <p className="text-white font-medium capitalize">{allValues.format?.replace('_', ' ')}</p>
            <p className="text-sm text-neutral-300">
              {allValues.total_slots} slots • ${allValues.entry_fee} entry • {allValues.visibility}
            </p>
          </div>

          <div className="md:col-span-2">
            <h4 className="text-sm font-medium text-neutral-400">Start Time</h4>
            <p className="text-white font-medium">
              {allValues.start_time ? new Date(allValues.start_time).toLocaleString() : 'Not set'}
            </p>
          </div>

          {allValues.rules && (
            <div className="md:col-span-2">
              <h4 className="text-sm font-medium text-neutral-400">Rules</h4>
              <p className="text-white text-sm">{allValues.rules}</p>
            </div>
          )}

          <div className="md:col-span-2">
            <h4 className="text-sm font-medium text-neutral-400">Prize Distribution</h4>
            <div className="space-y-2 mt-2">
              {allValues.prize_distribution?.map((prize, index) => (
                <div key={index} className="flex justify-between text-sm">
                  <span className="text-neutral-300">{prize.position}st Place</span>
                  <span className="text-white font-medium">
                    {prize.percentage}% (${((prize.percentage / 100) * (allValues.entry_fee * allValues.total_slots)).toFixed(2)})
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Gamer Tag */}
      <div>
        <label htmlFor="gamer_tag" className="block text-sm font-medium text-white">
          Your Gamer Tag for This Tournament *
        </label>
        <input
          type="text"
          id="gamer_tag"
          {...register('gamer_tag')}
          className="mt-1 block w-full rounded-md border border-neutral-600 bg-neutral-700 py-2 px-3 text-white placeholder-gray-400 focus:border-primary-500 focus:outline-none focus:ring-primary-500 sm:text-sm"
          placeholder="Enter your gamer tag for this tournament"
        />
        {errors.gamer_tag && (
          <p className="mt-1 text-sm text-red-400">{errors.gamer_tag.message}</p>
        )}
        <p className="mt-1 text-sm text-gray-400">
          This will be displayed to other participants in the tournament. Make sure it's accurate!
        </p>
      </div>
    </div>
  );
}