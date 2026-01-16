import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { formatMoney } from '../../utils/formatters';
import { STATUS_BADGE_CLASSES } from './myTournamentsConfig';

const getStatusClass = (status) =>
  STATUS_BADGE_CLASSES[status] || STATUS_BADGE_CLASSES.default;

const getEntryFeeLabel = (tournament, currency) =>
  tournament.entry_fee > 0 ? formatMoney(tournament.entry_fee, currency) : 'free';

const getPrizeLabel = (tournament, currency) =>
  tournament.prize_pool > 0 ? formatMoney(tournament.prize_pool, currency) : 'free';

const MyArenaTournamentsRow = ({
  tournaments,
  isLoading,
  error,
  onRetry,
  getTournamentCurrency,
}) => (
  <section className="mb-8">
    <div className="flex items-center justify-between mb-3">
      <h2 className="text-sm font-semibold text-gray-900 dark:text-white">
        My Tournaments
      </h2>
      <span className="text-xs text-gray-500 dark:text-gray-400">
        {tournaments.length} total
      </span>
    </div>

    {error && (
      <div className="mb-3 rounded-lg border border-red-200 dark:border-red-900/40 bg-red-50 dark:bg-red-900/10 px-3 py-2 text-xs text-red-700 dark:text-red-300 flex items-center justify-between">
        <span>{error}</span>
        <button onClick={onRetry} className="font-medium">
          Retry
        </button>
      </div>
    )}

    {isLoading ? (
      <div className="flex gap-3 overflow-x-auto pb-2 no-scrollbar">
        {[1, 2, 3].map((n) => (
          <div
            key={n}
            className="min-w-[220px] bg-white dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 rounded-xl p-4 animate-pulse"
          >
            <div className="h-4 w-24 bg-gray-200 dark:bg-neutral-700 rounded mb-3" />
            <div className="h-3 w-20 bg-gray-200 dark:bg-neutral-700 rounded mb-4" />
            <div className="h-6 w-16 bg-gray-200 dark:bg-neutral-700 rounded" />
          </div>
        ))}
      </div>
    ) : tournaments.length > 0 ? (
      <div className="flex gap-3 overflow-x-auto pb-2 no-scrollbar">
        {tournaments.map((tournament) => {
          const currency = getTournamentCurrency(tournament);
          return (
            <Link
              key={tournament.id}
              to={`/tournaments/${tournament.id}`}
              className="min-w-[240px] bg-white dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 rounded-xl p-4 hover:bg-gray-50 dark:hover:bg-neutral-700 transition-colors"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="h-10 w-10 rounded-lg bg-gray-100 dark:bg-neutral-700 overflow-hidden flex items-center justify-center">
                    {tournament.game?.logo_url ? (
                      <img
                        src={tournament.game.logo_url}
                        alt={tournament.game?.name || tournament.name}
                        className="h-full w-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">
                        {tournament.name?.slice(0, 2)?.toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                      {tournament.name}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                      {tournament.game?.name || tournament.game_type || 'Tournament'}
                    </p>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-gray-400" />
              </div>

              <div className="flex items-center justify-between text-xs mb-2">
                <span
                  className={`px-2 py-1 rounded-full ${getStatusClass(
                    tournament.status
                  )}`}
                >
                  {tournament.status}
                </span>
                <span className="text-gray-500 dark:text-gray-400">
                  {tournament.current_slots || 0}/{tournament.total_slots || 0}
                </span>
              </div>

              <div className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-400">
                <span>{getEntryFeeLabel(tournament, currency)} entry</span>
                <span className="text-emerald-600 dark:text-emerald-400">
                  {getPrizeLabel(tournament, currency)} prize
                </span>
              </div>
            </Link>
          );
        })}
      </div>
    ) : (
      <div className="rounded-xl border border-gray-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 p-4 text-sm text-gray-600 dark:text-gray-400">
        No tournaments yet.
      </div>
    )}
  </section>
);

export default MyArenaTournamentsRow;
