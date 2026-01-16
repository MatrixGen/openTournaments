const defaultTabs = [
  { key: 'all', label: 'All' },
  { key: 'open', label: 'Open' },
  { key: 'live', label: 'Live' },
  { key: 'completed', label: 'Completed' },
  { key: 'cancelled', label: 'Cancelled' },
];

const getCount = (stats, key) => {
  if (!stats) return 0;
  if (key === 'all') return stats.total || 0;
  return stats[key] || 0;
};

const FilterTabs = ({ filter, setFilter, stats, filters }) => {
  const tabs = (filters && filters.length > 0
    ? filters.map(({ id, label }) => ({ key: id, label }))
    : defaultTabs
  ).map((tab) => ({
    ...tab,
    count: getCount(stats, tab.key),
  }));

  return (
    <div className="mb-4 sm:mb-6 bg-neutral-800 rounded-lg p-1 overflow-x-auto">
      <nav className="flex space-x-1 min-w-max">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key)}
            className={`flex-1 py-2 px-3 sm:py-3 sm:px-4 text-xs sm:text-sm font-medium rounded-md transition-colors whitespace-nowrap ${
              filter === tab.key
                ? 'bg-primary-500 text-gray-900 dark:text-white shadow-lg'
                : 'text-gray-400 hover:text-gray-900 dark:text-white hover:bg-neutral-700'
            }`}
          >
            <div className="flex items-center justify-center space-x-1 sm:space-x-2">
              <span>{tab.label}</span>
              {tab.count > 0 && (
                <span className={`px-1.5 py-0.5 sm:px-2 sm:py-1 text-xs rounded-full ${
                  filter === tab.key ? 'bg-white/20' : 'bg-neutral-700'
                }`}>
                  {tab.count}
                </span>
              )}
            </div>
          </button>
        ))}
      </nav>
    </div>
  );
};

export default FilterTabs;
