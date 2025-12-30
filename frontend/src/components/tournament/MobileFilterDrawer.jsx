
import {
  
  Trophy,
  Calendar,
  
  Zap,

  X,
} from "lucide-react";


// Mobile Filter Drawer Component
const MobileFilterDrawer = ({
  isOpen,
  onClose,
  filters,
  onFilterChange,
  onReset,
}) => {
  const statusOptions = [
    { id: "all", label: "All Status", icon: Trophy },
    { id: "ongoing", label: "Ongoing", icon: Zap },
    { id: "upcoming", label: "Upcoming", icon: Calendar },
    { id: "completed", label: "Completed", icon: Trophy },
  ];

  const sortOptions = [
    { id: "newest", label: "Newest First" },
    { id: "prize_high", label: "Prize: High to Low" },
    { id: "prize_low", label: "Prize: Low to High" },
    { id: "starting_soon", label: "Starting Soon" },
  ];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 md:hidden">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-neutral-800 rounded-t-2xl shadow-xl max-h-[80vh] overflow-y-auto">
        <div className="p-4 border-b border-gray-200 dark:border-neutral-700">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-900 dark:text-white">
              Filter & Sort
            </h3>
            <button
              onClick={onClose}
              className="p-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <h4 className="text-sm font-medium text-gray-900 dark:text-gray-900 dark:text-white mb-2">
                Status
              </h4>
              <div className="flex flex-wrap gap-2">
                {statusOptions.map((option) => (
                  <button
                    key={option.id}
                    onClick={() => onFilterChange("status", option.id)}
                    className={`px-3 py-2 rounded-lg text-sm flex items-center space-x-2 ${
                      filters.status === option.id
                        ? "bg-primary-500 text-gray-900 dark:text-white"
                        : "bg-gray-100 dark:bg-neutral-700 text-gray-700 dark:text-gray-300"
                    }`}
                  >
                    <option.icon className="h-4 w-4" />
                    <span>{option.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <h4 className="text-sm font-medium text-gray-900 dark:text-gray-900 dark:text-white mb-2">
                Sort By
              </h4>
              <div className="space-y-2">
                {sortOptions.map((option) => (
                  <button
                    key={option.id}
                    onClick={() => onFilterChange("sort", option.id)}
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm ${
                      filters.sort === option.id
                        ? "bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400"
                        : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-neutral-700"
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <h4 className="text-sm font-medium text-gray-900 dark:text-gray-900 dark:text-white mb-2">
                Price Range
              </h4>
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
          </div>
        </div>

        <div className="p-4 space-y-3">
          <button
            onClick={onReset}
            className="w-full px-4 py-3 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-neutral-600 rounded-lg text-sm font-medium hover:bg-gray-50 dark:hover:bg-neutral-700"
          >
            Reset Filters
          </button>
          <button
            onClick={onClose}
            className="w-full px-4 py-3 bg-primary-500 text-gray-900 dark:text-white rounded-lg text-sm font-medium hover:bg-primary-600"
          >
            Apply Filters
          </button>
        </div>
      </div>
    </div>
  );
};

export default MobileFilterDrawer