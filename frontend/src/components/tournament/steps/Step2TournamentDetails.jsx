export default function Step2TournamentDetails({ register, errors }) {
  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-white">Tournament Settings</h2>
        
      </div>

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
          <p className="mt-1 text-sm text-gray-400">
            Set to 0 for a free tournament
          </p>
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
          <p className="mt-1 text-sm text-gray-400">
            Number of participants (2-128)
          </p>
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
          <p className="mt-1 text-sm text-gray-400">
            Tournament must start at least 1 hour from now
          </p>
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
          <p className="mt-1 text-sm text-gray-400">
            Optional: Add custom rules, restrictions, or special instructions
          </p>
        </div>
      </div>
    </div>
  );
}