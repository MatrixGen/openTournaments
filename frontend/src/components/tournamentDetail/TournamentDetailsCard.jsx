import { formatMoney } from "../../utils/formatters";

const TournamentDetailsCard = ({ tournament }) => {
  const tournamentCurrency = tournament?.currency || "TZS";
  const formatPrizePosition = (position) => {
    if (position === 1) return '1st';
    if (position === 2) return '2nd';
    if (position === 3) return '3rd';
    return `${position}th`;
  };

  return (
    <div className="bg-white dark:bg-neutral-800 rounded-xl shadow-sm md:shadow border border-gray-200 dark:border-neutral-700 p-4 md:p-6">
      <div className="flex items-center justify-between mb-4 md:mb-6">
        <h2 className="text-lg md:text-xl font-semibold text-gray-900 dark:text-gray-900 dark:text-white">Tournament Details</h2>
        <div className="w-1 h-1 rounded-full bg-gray-300 dark:bg-neutral-600"></div>
      </div>
      
      {tournament.rules && (
        <div className="mb-4 md:mb-6">
          <h3 className="text-sm md:text-base font-medium text-gray-900 dark:text-gray-900 dark:text-white mb-2 md:mb-3">Rules & Guidelines</h3>
          <div className="bg-gray-50 dark:bg-neutral-700/30 rounded-lg p-3 md:p-4">
            <p className="text-gray-600 dark:text-gray-400 whitespace-pre-wrap text-sm leading-relaxed">
              {tournament.rules}
            </p>
          </div>
        </div>
      )}

      {tournament.prizes && tournament.prizes.length > 0 && (
        <div>
          <h3 className="text-sm md:text-base font-medium text-gray-900 dark:text-gray-900 dark:text-white mb-2 md:mb-3">Prize Distribution</h3>
          <div className="bg-gray-50 dark:bg-neutral-700/30 rounded-lg p-3 md:p-4">
            <div className="grid grid-cols-2 gap-2 md:gap-3 text-sm">
              <div className="font-medium text-gray-900 dark:text-gray-900 dark:text-white">Position</div>
              <div className="font-medium text-gray-900 dark:text-gray-900 dark:text-white text-right">Prize</div>
              
              {tournament.prizes.slice(0, 5).map((prize, index) => {
                const prizeAmount =
                  tournament.prize_pool > 0
                    ? (tournament.prize_pool * (prize.percentage || 0)) / 100
                    : null;

                return (
                <div key={index} className="contents">
                  <div className="text-gray-600 dark:text-gray-400 py-1 border-b border-gray-200 dark:border-neutral-600">
                    {formatPrizePosition(prize.position)}
                  </div>
                  <div className="text-gray-900 dark:text-gray-900 dark:text-white font-medium py-1 border-b border-gray-200 dark:border-neutral-600 text-right">
                    {formatMoney(prizeAmount, tournamentCurrency, "en-TZ", {
                      nullDisplay: "-",
                    })}
                  </div>
                </div>
                );
              })}
              
              {tournament.prizes.length > 5 && (
                <div className="col-span-2 pt-2 text-center">
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    +{tournament.prizes.length - 5} more positions
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      
      {!tournament.rules && (!tournament.prizes || tournament.prizes.length === 0) && (
        <div className="text-center py-6 md:py-8">
          <div className="mx-auto w-12 h-12 rounded-full bg-gray-100 dark:bg-neutral-700 flex items-center justify-center mb-3">
            <svg className="w-5 h-5 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="text-gray-500 dark:text-gray-400 text-sm">
            No additional details provided for this tournament
          </p>
        </div>
      )}
    </div>
  );
};

export default TournamentDetailsCard;
