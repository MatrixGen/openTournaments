import { Link } from 'react-router-dom';
import { useMemo } from 'react';
import { MATCH_STATUS_KEYS, MATCH_STATUS_UI } from './matchStatusUi';
import { sortAndFilterMyMatches } from './sortAndFilterMyMatches';

const getMatchStatus = (status) =>
  MATCH_STATUS_UI[status] || {
    label: status || 'Unknown',
    badgeClass: 'bg-gray-100 text-gray-700 dark:bg-neutral-700 dark:text-gray-300',
    dotClass: 'bg-gray-500',
  };

const getParticipantName = (participant) =>
  participant?.user?.username || participant?.user?.name || 'TBD';

const formatMatchTime = (match) => {
  const value = match.scheduled_time || match.created_at;
  if (!value) return 'Time TBD';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Time TBD';
  return date.toLocaleString();
};

const MyArenaMatchesList = ({ matches, isLoading, error, onRetry }) => {
  const orderedMatches = useMemo(
    () => sortAndFilterMyMatches(matches, MATCH_STATUS_KEYS),
    [matches]
  );

  return (
    <section className="mb-8">
    <div className="flex items-center justify-between mb-3">
      <h2 className="text-sm font-semibold text-gray-900 dark:text-white">
        My Matches
      </h2>
      <span className="text-xs text-gray-500 dark:text-gray-400">
        {orderedMatches.length} total
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
      <div className="space-y-3">
        {[1, 2, 3].map((n) => (
          <div
            key={n}
            className="bg-white dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 rounded-xl p-4 animate-pulse"
          >
            <div className="h-4 w-32 bg-gray-200 dark:bg-neutral-700 rounded mb-2" />
            <div className="h-3 w-24 bg-gray-200 dark:bg-neutral-700 rounded" />
          </div>
        ))}
      </div>
    ) : orderedMatches.length > 0 ? (
      <div className="space-y-3">
        {orderedMatches.map((match) => {
          const status = getMatchStatus(match.status);
          const participant1 = getParticipantName(match.participant1);
          const participant2 = getParticipantName(match.participant2);
          const isLive = match.status === MATCH_STATUS_KEYS.LIVE;
          return (
            <div
              key={match.id}
              className={`bg-white dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 rounded-xl p-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between ${
                isLive ? 'live-shimmer' : ''
              }`}
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2 mb-2">
                  <span className={`h-2 w-2 rounded-full ${status.dotClass}`} />
                  <span className={`px-2 py-1 text-xs rounded-full ${status.badgeClass}`}>
                    {status.label}
                  </span>
                </div>
                <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                  {participant1} vs {participant2}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                  {match.tournament?.name || 'Tournament'} • {formatMatchTime(match)}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Link
                  to={`/matches/${match.id}`}
                  className="text-sm font-medium text-primary-600 dark:text-primary-400 hover:text-primary-700"
                >
                  View
                </Link>
              </div>
            </div>
          );
        })}
      </div>
    ) : (
      <div className="rounded-xl border border-gray-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 p-4 text-sm text-gray-600 dark:text-gray-400">
        No matches yet.
      </div>
    )}
  </section>
);
};

export default MyArenaMatchesList;
