import { memo } from "react";

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
    <div className="p-3 sm:p-4 border-b border-neutral-700 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 sm:gap-0">
      {/* Left Section */}
      <div className="min-w-0 flex-1">
        <h3 className="text-base sm:text-lg font-semibold text-white truncate">
          Match #{match.id}
        </h3>
        <p className="text-gray-400 text-xs sm:text-sm mt-0.5 sm:mt-1 truncate">
          Round {match.round_number} • Match {match.match_order}
        </p>
      </div>

      {/* Right Section */}
      <div className="flex flex-wrap sm:flex-nowrap items-center justify-between sm:justify-end gap-1 sm:gap-2 shrink-0 w-full sm:w-auto text-right">
      {timeRemaining && (
        <span
          className={`text-xs sm:text-sm font-medium ${getCountdownColor()} truncate`}
        >
          {formatTimeRemaining()}
        </span>
      )}
      <span
        className={`px-2 py-0.5 sm:px-2.5 sm:py-1 rounded text-[10px] sm:text-xs font-medium ${statusConfig.color} text-nowrap`}
      >
        {statusConfig.label}
      </span>
    </div>

    </div>
  );
});

export default MatchHeader;
