
import FilterPopoverDrawer from "../common/FilterPopoverDrawer";


// Mobile Filter Drawer Component
const MobileFilterDrawer = ({
  isOpen,
  onClose,
  filters,
  onFilterChange,
  onReset,
  showTypeFilter,
  anchorRef,
}) => {
  const statusOptions = [
    { id: "all", label: "All Status" },
    { id: "ongoing", label: "Ongoing" },
    { id: "upcoming", label: "Upcoming" },
    { id: "completed", label: "Completed" },
  ];

  const sortOptions = [
    { id: "newest", label: "Newest First" },
    { id: "prize_high", label: "Prize: High to Low" },
    { id: "prize_low", label: "Prize: Low to High" },
    { id: "starting_soon", label: "Starting Soon" },
  ];

  return (
    <FilterPopoverDrawer
      isOpen={isOpen}
      onClose={onClose}
      anchorRef={anchorRef}
      title="Filter & Sort"
      mobileOnly={false}
      width={260}
      maxWidthClass="max-w-[16rem]"
      footer={
        <div className="space-y-3">
          <button
            onClick={onReset}
            className="w-full px-4 py-2 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-neutral-600 rounded-lg text-sm font-medium hover:bg-gray-50 dark:hover:bg-neutral-700"
          >
            Reset Filters
          </button>
          <button
            onClick={onClose}
            className="w-full px-4 py-2 bg-primary-500 text-gray-900 dark:text-white rounded-lg text-sm font-medium hover:bg-primary-600"
          >
            Apply Filters
          </button>
        </div>
      }
    >
      {showTypeFilter && (
        <div>
          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
            Type
          </label>
          <select
            value={filters.type || "all"}
            onChange={(e) => onFilterChange("type", e.target.value)}
            className="w-full bg-white dark:bg-neutral-700 border border-gray-300 dark:border-neutral-600 rounded-lg px-2.5 py-2 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          >
            <option value="all">All Types</option>
            <option value="public">Public</option>
            <option value="private">Private</option>
            <option value="invite_only">Invite Only</option>
          </select>
        </div>
      )}

      <div>
        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
          Status
        </label>
        <select
          value={filters.status}
          onChange={(e) => onFilterChange("status", e.target.value)}
          className="w-full bg-white dark:bg-neutral-700 border border-gray-300 dark:border-neutral-600 rounded-lg px-2.5 py-2 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
        >
          {statusOptions.map((option) => (
            <option key={option.id} value={option.id}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
          Sort By
        </label>
        <select
          value={filters.sort}
          onChange={(e) => onFilterChange("sort", e.target.value)}
          className="w-full bg-white dark:bg-neutral-700 border border-gray-300 dark:border-neutral-600 rounded-lg px-2.5 py-2 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
        >
          {sortOptions.map((option) => (
            <option key={option.id} value={option.id}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
          Price Range
        </label>
        <div className="grid grid-cols-2 gap-2">
          <input
            type="number"
            placeholder="Min"
            value={filters.minPrice || ""}
            onChange={(e) => onFilterChange("minPrice", e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-neutral-600 rounded-lg bg-white dark:bg-neutral-700 text-gray-900 dark:text-gray-900 dark:text-white text-sm"
          />
          <input
            type="number"
            placeholder="Max"
            value={filters.maxPrice || ""}
            onChange={(e) => onFilterChange("maxPrice", e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-neutral-600 rounded-lg bg-white dark:bg-neutral-700 text-gray-900 dark:text-gray-900 dark:text-white text-sm"
          />
        </div>
      </div>
    </FilterPopoverDrawer>
  );
};

export default MobileFilterDrawer
