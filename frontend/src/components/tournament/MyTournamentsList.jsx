import { Link } from 'react-router-dom';
import { Share2 } from 'lucide-react';
import { formatMoney } from '../../utils/formatters';
import TournamentInfoCard from './TournamentInfoCard';
import { STATUS_BADGE_CLASSES } from './myTournamentsConfig';

const getStatusClass = (status) =>
  STATUS_BADGE_CLASSES[status] || STATUS_BADGE_CLASSES.default;

const getEntryFeeLabel = (tournament, currency) =>
  tournament.entry_fee > 0 ? formatMoney(tournament.entry_fee, currency) : 'free';

const getPrizeLabel = (tournament, currency) =>
  tournament.prize_pool > 0 ? formatMoney(tournament.prize_pool, currency) : 'free';

const MyTournamentsList = ({
  tournaments,
  actionLoading,
  onAction,
  responseCurrency,
  getTournamentCurrency,
  onShare,
}) => (
  <>
    <div className="md:hidden space-y-4">
      {tournaments.map((tournament) => {
        const currency = getTournamentCurrency(tournament);
        const canShareTournament = tournament.status !== 'cancelled';

        return (
          <div
            key={tournament.id}
            className="bg-white dark:bg-neutral-800 rounded-xl p-4 border border-gray-200 dark:border-neutral-700"
          >
            <div className="flex justify-between items-start mb-3">
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-gray-900 dark:text-white text-base truncate">
                  {tournament.name}
                </h3>
                <div className="flex items-center space-x-2 mt-1">
                  <span
                    className={`px-2 py-1 rounded-full text-xs ${getStatusClass(
                      tournament.status
                    )}`}
                  >
                    {tournament.status}
                  </span>
                  <span className="text-gray-500 dark:text-gray-400 text-xs">
                    {tournament.game_type}
                  </span>
                </div>
              </div>
              <span className="text-lg font-bold text-gray-900 dark:text-gray-900 dark:text-white">
                {getEntryFeeLabel(tournament, currency)}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-900 dark:text-white">
                  {tournament.current_slots || 0}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Players</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                  {getPrizeLabel(tournament, currency)}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Prize</p>
              </div>
            </div>

            <div className="flex space-x-2">
              <Link
                to={`/tournaments/${tournament.id}`}
                className="flex-1 text-center bg-gray-100 dark:bg-neutral-700 hover:bg-gray-200 dark:hover:bg-neutral-600 text-gray-900 dark:text-gray-900 dark:text-white font-medium py-2 px-4 rounded-lg transition-colors text-sm"
              >
                View Details
              </Link>

              {canShareTournament && (
                <button
                  onClick={() => onShare(tournament)}
                  className="flex-1 text-center bg-cyan-50 dark:bg-cyan-900/20 hover:bg-cyan-100 dark:hover:bg-cyan-800/30 text-cyan-700 dark:text-cyan-400 border border-cyan-200 dark:border-cyan-800 font-medium py-2 px-4 rounded-lg transition-colors text-sm flex items-center justify-center gap-1"
                >
                  <Share2 size={14} />
                  Share
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>

    <div className="hidden md:grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-4 md:gap-6">
      {tournaments.map((tournament) => (
        <TournamentInfoCard
          key={tournament.id}
          tournament={tournament}
          actionLoading={actionLoading}
          onAction={onAction}
          responseCurrency={responseCurrency}
        />
      ))}
    </div>
  </>
);

export default MyTournamentsList;
