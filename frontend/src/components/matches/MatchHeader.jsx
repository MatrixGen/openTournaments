import { ArrowLeftIcon, ClockIcon, ShieldCheckIcon } from "lucide-react";
import { memo } from "react";


// Simple sub-component for match header
const MatchHeader = memo(({ match, statusConfig, timeRemaining, onBack }) => {
  const getCountdownColor = () => {
    if (!timeRemaining) return "text-gray-500 dark:text-gray-400";
    if (timeRemaining < 300000) return "text-red-500 dark:text-red-400";
    if (timeRemaining < 600000) return "text-amber-500 dark:text-amber-400";
    return "text-green-500 dark:text-green-400";
  };

  const formatTimeRemaining = () => {
    if (!timeRemaining) return null;
    const minutes = Math.floor(timeRemaining / 60000);
    const seconds = Math.floor((timeRemaining % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  return (
    <div
      className={`p-4 md:p-6 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-br ${statusConfig.gradient}`}
    >
      {/* Back button and title for mobile */}
      <div className="flex items-center justify-between mb-3 md:mb-4">
        <button
          onClick={onBack}
          className="flex items-center text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100"
        >
          <ArrowLeftIcon className="h-4 w-4 mr-1.5" />
          Back
        </button>

        {timeRemaining && (
          <div className="flex items-center">
            <ClockIcon className="h-4 w-4 mr-1.5 text-gray-400" />
            <span
              className={`text-sm font-bold ${getCountdownColor()}`}
              title={`${Math.floor(timeRemaining / 60000)} minutes remaining`}
            >
              {formatTimeRemaining()}
            </span>
          </div>
        )}
      </div>

      {/* Main header content */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <ShieldCheckIcon className="h-4 w-4 text-gray-400 dark:text-gray-500" />
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
              Tournament Match
            </span>
          </div>

          <div className="flex items-center gap-2">
            <h1 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-gray-100 truncate">
              Match #{match.id}
            </h1>
            <span
              className={`px-2 py-0.5 rounded-full text-xs font-semibold ${statusConfig.color} ${statusConfig.bgColor} border ${statusConfig.borderColor}`}
            >
              {statusConfig.label}
            </span>
          </div>

          <div className="flex items-center gap-2 mt-1.5">
            <div className="flex items-center gap-1.5 text-sm text-gray-600 dark:text-gray-400">
              <span className="font-medium">Round {match.round_number}</span>
              <span className="text-gray-300 dark:text-gray-600">•</span>
              <span>Match {match.match_order}</span>
            </div>
            {match.tournament && (
              <>
                <span className="text-gray-300 dark:text-gray-600">•</span>
                <span className="text-sm text-gray-600 dark:text-gray-400 truncate">
                  {match.tournament.name}
                </span>
              </>
            )}
          </div>
        </div>

        {/* Status badge for desktop */}
        <div className="hidden md:flex items-center space-x-2 shrink-0">
          {timeRemaining && (
            <div className="flex flex-col items-end">
              <span className="text-xs text-gray-500 dark:text-gray-400">
                Time Remaining
              </span>
              <span
                className={`text-lg font-bold ${getCountdownColor()}`}
                title={`${Math.floor(timeRemaining / 60000)} minutes remaining`}
              >
                {formatTimeRemaining()}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
});

export default MatchHeader

MatchHeader.displayName = "MatchHeader";