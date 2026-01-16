import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';

const SkeletonCard = () => (
  <div className="min-w-[220px] bg-white dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 rounded-lg p-3 animate-pulse">
    <div className="h-10 w-10 rounded-md bg-gray-200 dark:bg-neutral-700 mb-3" />
    <div className="h-3 w-24 bg-gray-200 dark:bg-neutral-700 rounded" />
  </div>
);

const SupportedGamesRow = ({
  games,
  isLoading,
  onRefresh,
  onOpenFilters,
  filterButtonRef,
}) => {
  const hasGames = Array.isArray(games) && games.length > 0;

  return (
    <section className="mb-6">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-base font-semibold text-gray-900 dark:text-white">
          Supported Games
        </h2>
        <div className="flex items-center gap-2">
          <button
            onClick={onOpenFilters}
            ref={filterButtonRef}
            className="p-2 bg-white dark:bg-neutral-800 border border-gray-300 dark:border-neutral-700 rounded-lg"
          >
            <svg
              viewBox="0 0 24 24"
              className="h-5 w-5 text-gray-600 dark:text-gray-400"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M22 3H2l8 9v7l4 2v-9l8-9z" />
            </svg>
          </button>
          <button
            onClick={onRefresh}
            className="p-2 bg-white dark:bg-neutral-800 border border-gray-300 dark:border-neutral-700 rounded-lg"
          >
            <svg
              viewBox="0 0 24 24"
              className="h-5 w-5 text-gray-600 dark:text-gray-400"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M21 12a9 9 0 1 1-3-6.7" />
              <path d="M21 3v6h-6" />
            </svg>
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex gap-3 overflow-x-auto pb-2 no-scrollbar">
          {Array.from({ length: 4 }).map((_, index) => (
            <SkeletonCard key={index} />
          ))}
        </div>
      ) : hasGames ? (
        <div className="flex gap-3 overflow-x-auto pb-2 no-scrollbar">
          {games.map((game) => (
              <Link
                key={game.id}
                to={`/tournaments?search=${encodeURIComponent(game.name)}`}
                className="min-w-[220px] bg-white dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 rounded-lg p-3 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-neutral-700 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-md bg-gray-100 dark:bg-neutral-700 flex items-center justify-center overflow-hidden">
                    {game.logo_url ? (
                      <img
                        src={game.logo_url}
                        alt={game.name}
                        className="h-full w-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">
                        {game.name?.slice(0, 2)?.toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {game.name}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">View</p>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-gray-400" />
              </Link>
            ))}
        </div>
      ) : (
        <div className="bg-white dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 rounded-lg p-4 text-sm text-gray-600 dark:text-gray-400">
          No supported games available right now.
        </div>
      )}
    </section>
  );
};

export default SupportedGamesRow;
