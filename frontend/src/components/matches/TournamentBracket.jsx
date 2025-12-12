import { useState, useEffect, useCallback, useMemo, memo, useRef } from 'react';
import { matchService } from '../../services/matchService';
import { 
  ArrowPathIcon as RefreshIcon,      // ✅ exists
  Squares2X2Icon as ViewGridIcon,     // ✅ exists
  Bars3Icon as ViewListIcon,  // v2 replacement for "ViewListIcon"
  ChevronLeftIcon,    // ✅ exists
  ChevronRightIcon,   // ✅ exists
  TrophyIcon,         // ✅ exists
  CalendarDaysIcon as CalendarIcon, // v2 replacement
  UserIcon,           // ✅ exists
  CheckCircleIcon,    // ✅ exists
  ClockIcon,          // ✅ exists
  ExclamationCircleIcon, // ✅ exists
  XCircleIcon         // ✅ exists
} from '@heroicons/react/24/outline';

import MatchCard from './MatchCard'; // Import your existing MatchCard

// Skeleton loader for bracket
const BracketSkeleton = () => (
  <div className="bg-white dark:bg-neutral-800 rounded-lg border border-gray-200 dark:border-neutral-700 p-4 animate-pulse">
    <div className="flex justify-between items-center mb-6">
      <div>
        <div className="h-6 bg-gray-200 dark:bg-neutral-700 rounded w-48 mb-2"></div>
        <div className="h-4 bg-gray-200 dark:bg-neutral-700 rounded w-32"></div>
      </div>
      <div className="h-8 bg-gray-200 dark:bg-neutral-700 rounded w-24"></div>
    </div>
    <div className="space-y-4">
      {[1, 2, 3].map(round => (
        <div key={round} className="flex items-center gap-4">
          <div className="w-24 h-8 bg-gray-200 dark:bg-neutral-700 rounded"></div>
          <div className="flex-1 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {[1, 2].map(match => (
              <div key={match} className="h-24 bg-gray-200 dark:bg-neutral-700 rounded"></div>
            ))}
          </div>
        </div>
      ))}
    </div>
  </div>
);

// Match node for grid view - shows minimal info
const MatchNode = memo(({ match, onMatchUpdate, onExpandMatch }) => {
  const isCompleted = match.status === 'completed';
  const isLive = match.status === 'live';
  const isAwaitingConfirmation = match.status === 'awaiting_confirmation';
  const isDisputed = match.status === 'disputed';
  const isReported = match.status === 'reported';
  
  const getStatusColor = () => {
    if (isLive) return 'bg-red-500/20 text-red-400 border-red-500/30';
    if (isCompleted) return 'bg-green-500/20 text-green-400 border-green-500/30';
    if (isAwaitingConfirmation) return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
    if (isDisputed) return 'bg-red-500/20 text-red-400 border-red-500/30';
    if (isReported) return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
    return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
  };

  const getStatusText = () => {
    if (isLive) return 'LIVE';
    if (isCompleted) return 'DONE';
    if (isAwaitingConfirmation) return 'AWAITING';
    if (isDisputed) return 'DISPUTED';
    if (isReported) return 'REPORTED';
    return 'SCHEDULED';
  };

  return (
    <div 
      onClick={() => onExpandMatch(match)}
      className={`bg-white dark:bg-neutral-800 rounded-lg border border-gray-200 dark:border-neutral-700 
        p-3 min-w-[180px] cursor-pointer transition-all duration-200 
        hover:shadow-lg hover:border-primary-500 dark:hover:border-primary-400
        active:scale-95`}
    >
      {/* Match header */}
      <div className="flex justify-between items-center mb-2">
        <span className={`px-2 py-0.5 rounded text-xs font-medium ${getStatusColor()}`}>
          {getStatusText()}
        </span>
        {match.match_order && (
          <span className="text-xs text-gray-500 dark:text-gray-400">#{match.match_order}</span>
        )}
      </div>

      {/* Participants - Compact View */}
      <div className="space-y-2">
        <div className={`flex items-center justify-between p-2 rounded ${
          match.winner_id === match.participant1?.user_id
            ? 'bg-green-50 dark:bg-green-900/20 border border-green-100 dark:border-green-800/30'
            : 'bg-gray-50 dark:bg-neutral-750'
        }`}>
          <div className="flex items-center gap-2 min-w-0">
            {match.winner_id === match.participant1?.user_id && (
              <CheckCircleIcon className="h-3 w-3 text-green-600 dark:text-green-400 flex-shrink-0" />
            )}
            <span className={`text-xs font-medium truncate ${
              match.winner_id === match.participant1?.user_id
                ? 'text-green-700 dark:text-green-300'
                : 'text-gray-900 dark:text-white'
            }`}>
              {match.participant1?.user?.username || 'TBD'}
            </span>
          </div>
          <span className="text-xs font-semibold text-gray-700 dark:text-gray-300 ml-2">
            {match.participant1_score ?? '-'}
          </span>
        </div>

        <div className={`flex items-center justify-between p-2 rounded ${
          match.winner_id === match.participant2?.user_id
            ? 'bg-green-50 dark:bg-green-900/20 border border-green-100 dark:border-green-800/30'
            : 'bg-gray-50 dark:bg-neutral-750'
        }`}>
          <div className="flex items-center gap-2 min-w-0">
            {match.winner_id === match.participant2?.user_id && (
              <CheckCircleIcon className="h-3 w-3 text-green-600 dark:text-green-400 flex-shrink-0" />
            )}
            <span className={`text-xs font-medium truncate ${
              match.winner_id === match.participant2?.user_id
                ? 'text-green-700 dark:text-green-300'
                : 'text-gray-900 dark:text-white'
            }`}>
              {match.participant2?.user?.username || 'TBD'}
            </span>
          </div>
          <span className="text-xs font-semibold text-gray-700 dark:text-gray-300 ml-2">
            {match.participant2_score ?? '-'}
          </span>
        </div>
      </div>
    </div>
  );
});

MatchNode.displayName = 'MatchNode';

// Main bracket visualization component
const BracketVisualization = memo(({ 
  rounds, 
  viewMode, 
  onScrollLeft, 
  onScrollRight, 
  onMatchUpdate,
  onExpandMatch 
}) => {
  const scrollContainerRef = useRef(null);

  const getRoundTitle = (roundNumber, totalRounds) => {
    if (roundNumber === totalRounds) return 'Final';
    if (roundNumber === totalRounds - 1) return 'Semi-Finals';
    if (roundNumber === totalRounds - 2) return 'Quarter-Finals';
    return `Round ${roundNumber}`;
  };

  const getRoundColor = (roundNumber, totalRounds) => {
    if (roundNumber === totalRounds) return 'text-yellow-600 dark:text-yellow-400';
    if (roundNumber >= totalRounds - 2) return 'text-purple-600 dark:text-purple-400';
    return 'text-blue-600 dark:text-blue-400';
  };

  if (viewMode === 'list') {
    return (
      <div className="space-y-4">
        {Object.entries(rounds).map(([roundNumber, matches]) => (
          <div key={roundNumber} className="bg-white dark:bg-neutral-800 rounded-lg border border-gray-200 dark:border-neutral-700">
            <div className="p-4 border-b border-gray-200 dark:border-neutral-700">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white">
                    {getRoundTitle(Number(roundNumber), Object.keys(rounds).length)}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {matches.length} match{matches.length !== 1 ? 'es' : ''}
                  </p>
                </div>
                <span className={`px-2 py-1 rounded text-xs font-medium ${
                  Number(roundNumber) === Object.keys(rounds).length
                    ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400'
                    : 'bg-gray-100 dark:bg-neutral-700 text-gray-700 dark:text-gray-300'
                }`}>
                  Round {roundNumber}
                </span>
              </div>
            </div>
            <div className="p-4 space-y-3">
              {matches.map(match => (
                <MatchNode 
                  key={match.id} 
                  match={match} 
                  onMatchUpdate={onMatchUpdate}
                  onExpandMatch={onExpandMatch}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  // Grid view - horizontal bracket
  return (
    <div className="relative">
      {/* Scroll controls for desktop */}
      <div className="hidden lg:flex absolute left-0 top-0 bottom-0 items-center z-10">
        <button
          onClick={onScrollLeft}
          className="p-2 rounded-full bg-white dark:bg-neutral-800 shadow-lg border border-gray-200 dark:border-neutral-700 hover:bg-gray-50 dark:hover:bg-neutral-700 transition-colors"
        >
          <ChevronLeftIcon className="h-5 w-5 text-gray-600 dark:text-gray-400" />
        </button>
      </div>

      <div className="hidden lg:flex absolute right-0 top-0 bottom-0 items-center z-10">
        <button
          onClick={onScrollRight}
          className="p-2 rounded-full bg-white dark:bg-neutral-800 shadow-lg border border-gray-200 dark:border-neutral-700 hover:bg-gray-50 dark:hover:bg-neutral-700 transition-colors"
        >
          <ChevronRightIcon className="h-5 w-5 text-gray-600 dark:text-gray-400" />
        </button>
      </div>

      {/* Bracket container */}
      <div 
        ref={scrollContainerRef}
        className="overflow-x-auto pb-4 scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-neutral-700"
        style={{ scrollbarWidth: 'thin' }}
      >
        <div className="flex space-x-6 min-w-max px-4">
          {Object.entries(rounds).map(([roundNumber, matches]) => (
            <div key={roundNumber} className="flex flex-col space-y-4">
              {/* Round header */}
              <div className="sticky top-0 bg-white dark:bg-neutral-800 z-10 pb-2">
                <div className={`text-center px-3 py-2 rounded-lg border ${
                  Number(roundNumber) === Object.keys(rounds).length
                    ? 'border-yellow-200 dark:border-yellow-800 bg-yellow-50 dark:bg-yellow-900/20'
                    : 'border-gray-200 dark:border-neutral-700 bg-gray-50 dark:bg-neutral-750'
                }`}>
                  <h3 className={`font-bold ${
                    getRoundColor(Number(roundNumber), Object.keys(rounds).length)
                  }`}>
                    {getRoundTitle(Number(roundNumber), Object.keys(rounds).length)}
                  </h3>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                    {matches.length} match{matches.length !== 1 ? 'es' : ''}
                  </p>
                </div>
              </div>

              {/* Matches */}
              <div className="space-y-4">
                {matches.map((match) => (
                  <div key={match.id} className="relative">
                    {/* Connecting lines (only for non-first rounds) */}
                    {Number(roundNumber) > 1 && (
                      <>
                        <div className="absolute -left-4 top-1/2 w-4 h-px bg-gray-300 dark:bg-neutral-600"></div>
                        <div className="absolute -left-4 top-1/2 w-px h-16 bg-gray-300 dark:bg-neutral-600 -translate-y-1/2"></div>
                      </>
                    )}
                    <MatchNode 
                      match={match} 
                      onMatchUpdate={onMatchUpdate}
                      onExpandMatch={onExpandMatch}
                    />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
});

BracketVisualization.displayName = 'BracketVisualization';

function TournamentBracket({ tournamentId }) {
  const [matches, setMatches] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list'
  const [expandedMatch, setExpandedMatch] = useState(null); // Track which match is expanded
  const scrollContainerRef = useRef(null);

  const loadMatches = useCallback(async (showRefreshing = false) => {
    try {
      if (showRefreshing) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }
      setError('');
      const data = await matchService.getTournamentMatches(tournamentId);
      setMatches(data);
    } catch (err) {
      console.error('Failed to load matches:', err);
      setError(err.response?.data?.message || 'Failed to load tournament matches. Please try again.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [tournamentId]);

  const handleMatchUpdate = useCallback(() => {
    loadMatches(true);
    setExpandedMatch(null); // Close expanded match after update
  }, [loadMatches]);

  const handleExpandMatch = useCallback((match) => {
    setExpandedMatch(match);
  }, []);

  const handleCloseExpandedMatch = useCallback(() => {
    setExpandedMatch(null);
  }, []);

  const handleScroll = (direction) => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const scrollAmount = direction === 'left' ? -400 : 400;
    container.scrollBy({ left: scrollAmount, behavior: 'smooth' });
  };

  useEffect(() => {
    loadMatches();
  }, [loadMatches]);

  // Group matches by round
  const rounds = useMemo(() => {
    const grouped = {};
    matches.forEach(match => {
      if (!grouped[match.round_number]) {
        grouped[match.round_number] = [];
      }
      grouped[match.round_number].push(match);
    });

    // Sort rounds and matches within each round
    return Object.keys(grouped)
      .sort((a, b) => a - b)
      .reduce((acc, round) => {
        acc[round] = grouped[round].sort((a, b) => a.match_order - b.match_order);
        return acc;
      }, {});
  }, [matches]);

  // Calculate match statistics
  const matchStats = useMemo(() => {
    if (!matches.length) return { completed: 0, live: 0, upcoming: 0, total: 0 };
    
    const completed = matches.filter(m => m.status === 'completed').length;
    const live = matches.filter(m => m.status === 'live').length;
    const upcoming = matches.filter(m => m.status === 'upcoming' || !m.status).length;
    
    return { completed, live, upcoming, total: matches.length };
  }, [matches]);

  if (isLoading) {
    return <BracketSkeleton />;
  }

  if (error) {
    return (
      <div className="bg-white dark:bg-neutral-800 rounded-lg border border-gray-200 dark:border-neutral-700 p-6">
        <div className="text-center">
          <div className="mx-auto w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mb-4">
            <ExclamationCircleIcon className="h-6 w-6 text-red-600 dark:text-red-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            Unable to load bracket
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">{error}</p>
          <button
            onClick={() => loadMatches()}
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-medium transition-colors"
          >
            <RefreshIcon className="h-4 w-4" />
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Expanded Match Card Modal/Overlay */}
      {expandedMatch && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-neutral-800 rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-neutral-800 p-4 border-b border-neutral-700 flex justify-between items-center">
              <h3 className="text-xl font-bold text-white">Match Details</h3>
              <button
                onClick={handleCloseExpandedMatch}
                className="p-2 rounded-lg hover:bg-neutral-700 transition-colors"
              >
                <XCircleIcon className="h-6 w-6 text-gray-400" />
              </button>
            </div>
            <div className="p-4">
              <MatchCard 
                match={expandedMatch} 
                onUpdate={handleMatchUpdate}
              />
            </div>
          </div>
        </div>
      )}

      {/* Main Bracket Component */}
      <div className="bg-white dark:bg-neutral-800 rounded-lg border border-gray-200 dark:border-neutral-700">
        {/* Header */}
        <div className="p-4 border-b border-gray-200 dark:border-neutral-700">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Tournament Bracket</h2>
              <div className="flex flex-wrap items-center gap-3 mt-2">
                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                  <TrophyIcon className="h-4 w-4" />
                  <span>{matchStats.total} total matches</span>
                </div>
                {matchStats.live > 0 && (
                  <div className="flex items-center gap-1 text-sm font-medium text-red-600 dark:text-red-400">
                    <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
                    {matchStats.live} live
                  </div>
                )}
                {matchStats.completed > 0 && (
                  <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
                    <CheckCircleIcon className="h-4 w-4" />
                    {matchStats.completed} completed
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => loadMatches(true)}
                disabled={isRefreshing}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-neutral-700 transition-colors disabled:opacity-50"
                title="Refresh bracket"
              >
                <RefreshIcon className={`h-5 w-5 text-gray-600 dark:text-gray-400 ${isRefreshing ? 'animate-spin' : ''}`} />
              </button>
              
              <div className="flex items-center rounded-lg border border-gray-200 dark:border-neutral-700 overflow-hidden">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-2 ${
                    viewMode === 'grid'
                      ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400'
                      : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-neutral-700'
                  }`}
                  title="Grid view"
                >
                  <ViewGridIcon className="h-5 w-5" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-2 ${
                    viewMode === 'list'
                      ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400'
                      : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-neutral-700'
                  }`}
                  title="List view"
                >
                  <ViewListIcon className="h-5 w-5" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-4">
          {matches.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 mx-auto bg-gray-100 dark:bg-neutral-750 rounded-full flex items-center justify-center mb-4">
                <TrophyIcon className="h-8 w-8 text-gray-400 dark:text-gray-500" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Bracket Not Available
              </h3>
              <p className="text-gray-600 dark:text-gray-400 max-w-sm mx-auto">
                Tournament matches will be displayed here once the bracket is generated.
              </p>
            </div>
          ) : (
            <BracketVisualization 
              rounds={rounds}
              viewMode={viewMode}
              onScrollLeft={() => handleScroll('left')}
              onScrollRight={() => handleScroll('right')}
              onMatchUpdate={handleMatchUpdate}
              onExpandMatch={handleExpandMatch}
            />
          )}
        </div>

        {/* Mobile tip */}
        <div className="lg:hidden px-4 pb-4">
          <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
            Tap on any match to view details and report scores
          </p>
        </div>
      </div>
    </>
  );
}

export default memo(TournamentBracket);