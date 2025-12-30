// Tournament Skeleton Component
 const TournamentSkeleton = () => (
  <div className="bg-white dark:bg-neutral-800 rounded-xl p-4 md:p-6 border border-gray-200 dark:border-neutral-700 animate-pulse">
    <div className="flex justify-between items-start mb-4">
      <div className="h-5 bg-gray-200 dark:bg-neutral-700 rounded w-3/4"></div>
      <div className="h-5 bg-gray-200 dark:bg-neutral-700 rounded w-16"></div>
    </div>
    <div className="flex items-center mb-4">
      <div className="h-10 w-10 md:h-12 md:w-12 bg-gray-200 dark:bg-neutral-700 rounded-lg mr-3"></div>
      <div className="flex-1 min-w-0">
        <div className="h-4 bg-gray-200 dark:bg-neutral-700 rounded w-24 mb-2"></div>
        <div className="h-3 bg-gray-200 dark:bg-neutral-700 rounded w-16"></div>
      </div>
    </div>
    <div className="grid grid-cols-2 gap-3 md:gap-4 mb-4">
      {[1, 2, 3, 4].map((n) => (
        <div key={n} className="text-center">
          <div className="h-7 bg-gray-200 dark:bg-neutral-700 rounded mb-2"></div>
          <div className="h-3 bg-gray-200 dark:bg-neutral-700 rounded w-16 mx-auto"></div>
        </div>
      ))}
    </div>
    <div className="h-10 bg-gray-200 dark:bg-neutral-700 rounded"></div>
  </div>
);

export default TournamentSkeleton