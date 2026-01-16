import FilterPopoverDrawer from '../common/FilterPopoverDrawer';
import { TOURNAMENT_FILTERS } from './myTournamentsConfig';

const getFilterCount = (stats, id) => {
  if (!stats) return null;
  if (id === 'all') return stats.total || 0;
  return stats[id] || 0;
};

const MyTournamentsFilterDrawer = ({
  isOpen,
  onClose,
  filter,
  setFilter,
  stats,
  showCounts,
  anchorRef,
}) => (
  <FilterPopoverDrawer
    isOpen={isOpen}
    onClose={onClose}
    anchorRef={anchorRef}
    title="Filter Tournaments"
    mobileOnly={false}
    width={260}
    maxWidthClass="max-w-[16rem]"
  >
    <div className="space-y-2">
      {TOURNAMENT_FILTERS.map((option) => {
        const count = showCounts ? getFilterCount(stats, option.id) : null;

        return (
          <button
            key={option.id}
            onClick={() => {
              setFilter(option.id);
              onClose();
            }}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-lg transition-colors ${
              filter === option.id
                ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400'
                : 'hover:bg-gray-50 dark:hover:bg-neutral-700'
            }`}
          >
            <span className="font-medium text-gray-900 dark:text-gray-900 dark:text-white">
              {option.label}
            </span>
            {showCounts && (
              <span
                className={`px-2 py-1 text-xs rounded-full ${
                  filter === option.id
                    ? 'bg-primary-100 dark:bg-primary-800 text-primary-600 dark:text-primary-400'
                    : 'bg-gray-100 dark:bg-neutral-700 text-gray-600 dark:text-gray-400'
                }`}
              >
                {count ?? 0}
              </span>
            )}
          </button>
        );
      })}
    </div>
  </FilterPopoverDrawer>
);

export default MyTournamentsFilterDrawer;
