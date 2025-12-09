export default function Step1BasicInfo({ 
  register, 
  errors, 
  games, 
  platforms, 
  filteredGameModes, 
  selectedGameId,
}) {
  return (
    <div className="space-y-6">
      <div className="text-center mb-4 md:mb-6">
        <h2 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">Tournament Basics</h2>
        <p className="text-gray-600 dark:text-gray-400 mt-1 text-sm md:text-base">
          Start by setting up the foundation of your tournament
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:gap-6">
        {/* Tournament Name - Full width */}
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Tournament Name *
          </label>
          <input
            type="text"
            id="name"
            {...register('name')}
            className="mt-1 block w-full rounded-lg border border-gray-300 dark:border-neutral-600 bg-white dark:bg-neutral-700 py-3 px-4 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500 text-base md:text-sm transition-colors"
            placeholder="e.g., Spring Championship 2024"
          />
          {errors.name && (
            <p className="mt-2 text-sm text-red-600 dark:text-red-400">{errors.name.message}</p>
          )}
        </div>

        {/* Grid for Game, Platform, Game Mode, Format, Visibility */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
          {/* Game Selection */}
          <div>
            <label htmlFor="game_id" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Game *
            </label>
            <div className="mt-1 relative">
              <select
                id="game_id"
                {...register('game_id', { valueAsNumber: true })}
                className="block w-full rounded-lg border border-gray-300 dark:border-neutral-600 bg-white dark:bg-neutral-700 py-3 px-4 text-gray-900 dark:text-white focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500 text-base md:text-sm appearance-none transition-colors"
              >
                <option value="">Select a game</option>
                {games.map((game) => (
                  <option key={game.id} value={game.id}>
                    {game.name}
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700 dark:text-gray-300">
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
            {errors.game_id && (
              <p className="mt-2 text-sm text-red-600 dark:text-red-400">{errors.game_id.message}</p>
            )}
          </div>

          {/* Platform Selection */}
          <div>
            <label htmlFor="platform_id" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Platform *
            </label>
            <div className="mt-1 relative">
              <select
                id="platform_id"
                {...register('platform_id', { valueAsNumber: true })}
                className="block w-full rounded-lg border border-gray-300 dark:border-neutral-600 bg-white dark:bg-neutral-700 py-3 px-4 text-gray-900 dark:text-white focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500 text-base md:text-sm appearance-none transition-colors"
              >
                <option value="">Select a platform</option>
                {platforms.map((platform) => (
                  <option key={platform.id} value={platform.id}>
                    {platform.name}
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700 dark:text-gray-300">
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
            {errors.platform_id && (
              <p className="mt-2 text-sm text-red-600 dark:text-red-400">{errors.platform_id.message}</p>
            )}
          </div>

          {/* Game Mode Selection */}
          <div>
            <label htmlFor="game_mode_id" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Game Mode *
            </label>
            <div className="mt-1 relative">
              <select
                id="game_mode_id"
                {...register('game_mode_id', { valueAsNumber: true })}
                className="block w-full rounded-lg border border-gray-300 dark:border-neutral-600 bg-white dark:bg-neutral-700 py-3 px-4 text-gray-900 dark:text-white focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500 text-base md:text-sm appearance-none transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={!selectedGameId}
              >
                <option value="">Select a game mode</option>
                {filteredGameModes.map((mode) => (
                  <option key={mode.id} value={mode.id}>
                    {mode.name}
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700 dark:text-gray-300">
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
            {errors.game_mode_id && (
              <p className="mt-2 text-sm text-red-600 dark:text-red-400">{errors.game_mode_id.message}</p>
            )}
            {!selectedGameId && (
              <p className="mt-2 text-sm text-yellow-600 dark:text-yellow-400">
                Please select a game first
              </p>
            )}
          </div>

          {/* Tournament Format */}
          <div>
            <label htmlFor="format" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Tournament Format *
            </label>
            <div className="mt-1 relative">
              <select
                id="format"
                {...register('format')}
                className="block w-full rounded-lg border border-gray-300 dark:border-neutral-600 bg-white dark:bg-neutral-700 py-3 px-4 text-gray-900 dark:text-white focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500 text-base md:text-sm appearance-none transition-colors"
              >
                <option value="">Select a format</option>
                <option value="single_elimination">Single Elimination</option>
                <option value="double_elimination">Double Elimination</option>
                <option value="round_robin">Round Robin</option>
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700 dark:text-gray-300">
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
            {errors.format && (
              <p className="mt-2 text-sm text-red-600 dark:text-red-400">{errors.format.message}</p>
            )}
          </div>

          {/* Visibility */}
          <div>
            <label htmlFor="visibility" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Visibility
            </label>
            <div className="mt-1 relative">
              <select
                id="visibility"
                {...register('visibility')}
                className="block w-full rounded-lg border border-gray-300 dark:border-neutral-600 bg-white dark:bg-neutral-700 py-3 px-4 text-gray-900 dark:text-white focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500 text-base md:text-sm appearance-none transition-colors"
              >
                <option value="public">Public - Anyone can join</option>
                <option value="private">Private - Invite only</option>
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700 dark:text-gray-300">
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
            {errors.visibility && (
              <p className="mt-2 text-sm text-red-600 dark:text-red-400">{errors.visibility.message}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}