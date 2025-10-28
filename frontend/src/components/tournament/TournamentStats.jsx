const TournamentStats = ({ stats }) => {
  const statItems = [
    { key: 'total', label: 'Total', color: 'neutral' },
    { key: 'open', label: 'Open', color: 'blue' },
    { key: 'live', label: 'Live', color: 'green' },
    { key: 'completed', label: 'Completed', color: 'purple' },
    { key: 'cancelled', label: 'Cancelled', color: 'red' }
  ];

  return (
    <div className="hidden md:grid grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-4 mb-6 lg:mb-8">
      {statItems.map((item) => (
        <div
          key={item.key}
          className={`${
            item.color === 'neutral'
              ? 'bg-neutral-800'
              : `bg-${item.color}-500/10 border border-${item.color}-500/20`
          } rounded-lg p-3 sm:p-4 text-center`}
        >
          <div className="text-lg sm:text-2xl font-bold text-white">
            {stats[item.key]}
          </div>
          <div
            className={`text-xs sm:text-sm ${
              item.color === 'neutral'
                ? 'text-gray-400'
                : `text-${item.color}-400`
            }`}
          >
            {item.label}
          </div>
        </div>
      ))}
    </div>
  );
};

export default TournamentStats;
