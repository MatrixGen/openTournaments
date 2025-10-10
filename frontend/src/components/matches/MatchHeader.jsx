import { memo } from "react";

// Memoized sub-components to prevent unnecessary re-renders
const MatchHeader = memo(({ match, statusConfig, timeRemaining }) => {
  
  const getCountdownColor = () => {
    if (!timeRemaining) return 'text-gray-400';
    if (timeRemaining < 300000) return 'text-red-400';
    if (timeRemaining < 600000) return 'text-yellow-400';
    return 'text-green-400';
  };

  const formatTimeRemaining = () => {
    if (!timeRemaining) return null;
    const minutes = Math.floor(timeRemaining / 60000);
    const seconds = Math.floor((timeRemaining % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className="p-4 sm:p-6 border-b border-neutral-700 flex justify-between items-center">
      <div>
        <h3 className="text-lg font-semibold text-white truncate">Match #{match.id}</h3>
        <p className="text-gray-400 text-sm mt-1">
          Round {match.round_number} • Match {match.match_order}
        </p>
      </div>
      <div className="flex items-center space-x-2">
        {timeRemaining && (
          <span className={`text-sm font-medium ${getCountdownColor()}`}>
            {formatTimeRemaining()}
          </span>
        )}
        <span className={`px-2 py-1 rounded text-xs font-medium ${statusConfig.color}`}>
          {statusConfig.label}
        </span>
      </div>
    </div>
  );
});

export default MatchHeader;