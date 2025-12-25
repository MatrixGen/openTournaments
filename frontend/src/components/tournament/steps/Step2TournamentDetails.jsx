export default function Step2TournamentDetails({ register, errors }) {
  return (
    <div className="space-y-6">
      <div className="text-center mb-4 md:mb-6">
        <h2 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-gray-900 dark:text-white">Tournament Settings</h2>
        <p className="text-gray-600 dark:text-gray-400 mt-1 text-sm md:text-base">
          Configure the tournament details and rules
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:gap-6">
        {/* Entry Fee and Total Slots */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
          <div>
            <label htmlFor="entry_fee" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Entry Fee ($) *
            </label>
            <div className="mt-1 relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <span className="text-gray-500 dark:text-gray-400">$</span>
              </div>
              <input
                type="number"
                id="entry_fee"
                step="0.01"
                min="0"
                {...register('entry_fee', { valueAsNumber: true })}
                className="block w-full pl-8 rounded-lg border border-gray-300 dark:border-neutral-600 bg-white dark:bg-neutral-700 py-3 px-4 text-gray-900 dark:text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500 text-base md:text-sm transition-colors"
                placeholder="0.00"
              />
            </div>
            {errors.entry_fee && (
              <p className="mt-2 text-sm text-red-600 dark:text-red-400">{errors.entry_fee.message}</p>
            )}
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              Set to 0 for a free tournament
            </p>
          </div>

          <div>
            <label htmlFor="total_slots" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Total Slots *
            </label>
            <input
              type="number"
              id="total_slots"
              min="2"
              max="128"
              {...register('total_slots', { valueAsNumber: true })}
              className="mt-1 block w-full rounded-lg border border-gray-300 dark:border-neutral-600 bg-white dark:bg-neutral-700 py-3 px-4 text-gray-900 dark:text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500 text-base md:text-sm transition-colors"
              placeholder="16"
            />
            {errors.total_slots && (
              <p className="mt-2 text-sm text-red-600 dark:text-red-400">{errors.total_slots.message}</p>
            )}
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              Number of participants (2-128)
            </p>
          </div>
        </div>

        {/* Start Time - Full width */}
        <div>
          <label htmlFor="start_time" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Start Time *
          </label>
          <div className="mt-1">
            <input
              type="datetime-local"
              id="start_time"
              {...register('start_time')}
              className="block w-full rounded-lg border border-gray-300 dark:border-neutral-600 bg-white dark:bg-neutral-700 py-3 px-4 text-gray-900 dark:text-gray-900 dark:text-white focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500 text-base md:text-sm transition-colors"
            />
          </div>
          {errors.start_time && (
            <p className="mt-2 text-sm text-red-600 dark:text-red-400">{errors.start_time.message}</p>
          )}
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            Tournament must start at least 1 hour from now
          </p>
        </div>

        {/* Rules & Guidelines - Full width */}
        <div>
          <label htmlFor="rules" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Rules & Guidelines
          </label>
          <textarea
            id="rules"
            rows={4}
            {...register('rules')}
            className="mt-1 block w-full rounded-lg border border-gray-300 dark:border-neutral-600 bg-white dark:bg-neutral-700 py-3 px-4 text-gray-900 dark:text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500 text-base md:text-sm transition-colors resize-y min-h-[120px]"
            placeholder="Describe the rules, guidelines, and any special instructions for participants..."
          />
          {errors.rules && (
            <p className="mt-2 text-sm text-red-600 dark:text-red-400">{errors.rules.message}</p>
          )}
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            Optional: Add custom rules, restrictions, or special instructions
          </p>
        </div>
      </div>
    </div>
  );
}