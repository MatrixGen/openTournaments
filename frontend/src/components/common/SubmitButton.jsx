export default function SubmitButton({ isSubmitting }) {
  return (
    <div className="pt-6">
      <button
        type="submit"
        disabled={isSubmitting}
        className="flex w-full justify-center rounded-md border border-transparent bg-primary-500 py-3 px-4 text-sm font-medium text-white shadow-sm hover:bg-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 focus:ring-offset-neutral-900 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isSubmitting ? 'Creating Tournament...' : 'Create Tournament'}
      </button>
    </div>
  );
}