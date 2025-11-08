
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
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-white">Tournament Basics</h2>
        
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label htmlFor="name" className="block text-sm font-medium text-white">
            Tournament Name *
          </label>
          <input
            type="text"
            id="name"
            {...register('name')}
            className="mt-1 block w-full rounded-md border border-neutral-600 bg-neutral-700 py-2 px-3 text-white placeholder-gray-400 focus:border-primary-500 focus:outline-none focus:ring-primary-500 sm:text-sm"
            placeholder="e.g., Spring Championship 2024"
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
          {!selectedGameId && (
            <p className="mt-1 text-sm text-yellow-400">Please select a game first</p>
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
            <option value="public">Public - Anyone can join</option>
            <option value="private">Private - Invite only</option>
          </select>
          {errors.visibility && (
            <p className="mt-1 text-sm text-red-400">{errors.visibility.message}</p>
          )}
        </div>
      </div>
    </div>
  );
}