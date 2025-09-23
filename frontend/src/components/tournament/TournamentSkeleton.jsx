const TournamentSkeleton = () => (
  <div className="bg-neutral-800 rounded-lg shadow p-4 sm:p-6 animate-pulse">
    <div className="flex items-center justify-between">
      <div className="flex items-center space-x-3 sm:space-x-4">
        <div className="w-8 h-8 sm:w-12 sm:h-12 bg-neutral-700 rounded-md"></div>
        <div>
          <div className="h-4 bg-neutral-700 rounded w-24 sm:w-32 mb-2"></div>
          <div className="h-3 bg-neutral-700 rounded w-16 sm:w-24"></div>
        </div>
      </div>
      <div className="h-6 bg-neutral-700 rounded w-16 sm:w-20"></div>
    </div>
    <div className="mt-4 h-4 bg-neutral-700 rounded w-full"></div>
  </div>
);

export default TournamentSkeleton;