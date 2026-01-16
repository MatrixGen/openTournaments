import FilterPopoverDrawer from '../common/FilterPopoverDrawer';

const FILTER_OPTIONS = [
  { id: 'all', label: 'All Squads' },
  { id: 'joined', label: 'Joined' },
  { id: 'public', label: 'Public' },
  { id: 'private', label: 'Private' },
];

const SquadFiltersDrawer = ({
  isOpen,
  onClose,
  filter,
  setFilter,
  anchorRef,
}) => (
  <FilterPopoverDrawer
    isOpen={isOpen}
    onClose={onClose}
    anchorRef={anchorRef}
    title="Filter Squads"
    mobileOnly={false}
    width={260}
    maxWidthClass="max-w-[16rem]"
  >
    <div className="space-y-2">
      {FILTER_OPTIONS.map((option) => (
        <button
          key={option.id}
          onClick={() => {
            setFilter(option.id);
            onClose();
          }}
          className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors ${
            filter === option.id
              ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400'
              : 'hover:bg-gray-50 dark:hover:bg-neutral-700 text-gray-700 dark:text-gray-300'
          }`}
        >
          <span className="font-medium">{option.label}</span>
          {filter === option.id && (
            <span className="text-xs text-primary-500 dark:text-primary-400">
              Selected
            </span>
          )}
        </button>
      ))}
      <button
        onClick={() => {
          setFilter('all');
          onClose();
        }}
        className="w-full px-3 py-2 text-xs font-medium text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
      >
        Reset Filter
      </button>
    </div>
  </FilterPopoverDrawer>
);

export default SquadFiltersDrawer;
