import { useState, useEffect, useCallback } from 'react';
import { matchService } from '../../services/matchService';
import { ChevronDownIcon, ChevronUpIcon, TrophyIcon, ArrowsPointingOutIcon, ArrowsPointingInIcon } from '@heroicons/react/24/outline';
import MatchCard from './MatchCard';

export default function TournamentBracket({ tournamentId }) {
  const [matches, setMatches] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [expandedRounds, setExpandedRounds] = useState(new Set());
  const [isCollapsed, setIsCollapsed] = useState(false);

  const loadMatches = useCallback(async () => {
    try {
      setIsLoading(true);
      setError('');
      const data = await matchService.getTournamentMatches(tournamentId);
      setMatches(data);
      
      // Auto-expand the first two rounds for better UX
      if (data.length > 0) {
        const rounds = [...new Set(data.map(match => match.round_number))].sort((a, b) => a - b);
        const roundsToExpand = rounds.slice(0, 2); // Expand first two rounds
        setExpandedRounds(new Set(roundsToExpand));
      }
    } catch (err) {
      console.error('Failed to load matches:', err);
      setError('Failed to load tournament matches. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [tournamentId]);

  useEffect(() => {
    loadMatches();
  }, [loadMatches]);

  const toggleRound = (roundNumber) => {
    setExpandedRounds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(roundNumber)) {
        newSet.delete(roundNumber);
      } else {
        newSet.add(roundNumber);
      }
      return newSet;
    });
  };

  const toggleAllRounds = () => {
    const rounds = groupMatchesByRound();
    if (expandedRounds.size === Object.keys(rounds).length) {
      setExpandedRounds(new Set());
    } else {
      const allRounds = Object.keys(rounds).map(Number);
      setExpandedRounds(new Set(allRounds));
    }
  };

  const toggleCollapseView = () => {
    setIsCollapsed(!isCollapsed);
  };

  const groupMatchesByRound = () => {
    const rounds = {};
    matches.forEach(match => {
      if (!rounds[match.round_number]) {
        rounds[match.round_number] = [];
      }
      rounds[match.round_number].push(match);
    });
    
    // Sort rounds in ascending order (early rounds first)
    return Object.keys(rounds)
      .sort((a, b) => a - b)
      .reduce((acc, round) => {
        acc[round] = rounds[round].sort((a, b) => a.match_order - b.match_order);
        return acc;
      }, {});
  };

  const getRoundTitle = (roundNumber, totalRounds) => {
    if (roundNumber === 1) return 'Qualifiers';
    if (roundNumber === totalRounds) return 'Grand Finals';
    if (roundNumber === totalRounds - 1) return 'Semi Finals';
    if (roundNumber === totalRounds - 2) return 'Quarter Finals';
    if (roundNumber <= 3) return `Round ${roundNumber}`;
    return `Round of ${Math.pow(2, totalRounds - roundNumber + 1)}`;
  };

  const getRoundIcon = (roundNumber, totalRounds) => {
    if (roundNumber === totalRounds) return '🏆';
    if (roundNumber >= totalRounds - 2) return '⭐';
    return '⚔️';
  };

  // Skeleton Loading Components
  const RoundSkeleton = () => (
    <div className="bg-neutral-800 rounded-xl border border-neutral-700 p-4 sm:p-6 animate-pulse">
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-neutral-700 rounded-lg"></div>
          <div>
            <div className="h-5 bg-neutral-700 rounded w-32 mb-2"></div>
            <div className="h-3 bg-neutral-700 rounded w-24"></div>
          </div>
        </div>
        <div className="w-5 h-5 bg-neutral-700 rounded"></div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {[1, 2, 3].map(n => (
          <div key={n} className="bg-neutral-750 rounded-lg p-4">
            <div className="space-y-3">
              <div className="h-4 bg-neutral-700 rounded w-3/4"></div>
              <div className="grid grid-cols-2 gap-2">
                <div className="h-8 bg-neutral-700 rounded"></div>
                <div className="h-8 bg-neutral-700 rounded"></div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const CompactMatchList = ({ matches }) => (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
      {matches.map(match => (
        <div key={match.id} className="bg-neutral-750 rounded-lg p-3 border border-neutral-700">
          <div className="flex justify-between items-center text-sm">
            <span className="text-white font-medium truncate flex-1">
              {match.participant1?.user?.username || 'TBD'}
            </span>
            <span className="text-gray-400 mx-2">vs</span>
            <span className="text-white font-medium truncate flex-1 text-right">
              {match.participant2?.user?.username || 'TBD'}
            </span>
          </div>
          {(match.participant1_score !== null || match.participant2_score !== null) && (
            <div className="flex justify-between items-center mt-2 text-xs">
              <span className={`px-2 py-1 rounded ${
                match.winner_id === match.participant1?.user_id 
                  ? 'bg-green-500/20 text-green-300' 
                  : 'bg-neutral-700 text-gray-300'
              }`}>
                {match.participant1_score ?? '-'}
              </span>
              <span className="text-gray-500 text-xs">Score</span>
              <span className={`px-2 py-1 rounded ${
                match.winner_id === match.participant2?.user_id 
                  ? 'bg-green-500/20 text-green-300' 
                  : 'bg-neutral-700 text-gray-300'
              }`}>
                {match.participant2_score ?? '-'}
              </span>
            </div>
          )}
        </div>
      ))}
    </div>
  );

  if (isLoading) {
    return (
      <div className="bg-neutral-800 rounded-xl shadow-lg border border-neutral-700 p-4 sm:p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <div className="h-7 bg-neutral-700 rounded w-48 mb-2"></div>
            <div className="h-4 bg-neutral-700 rounded w-32"></div>
          </div>
          <div className="h-9 bg-neutral-700 rounded w-24"></div>
        </div>
        <div className="space-y-4">
          <RoundSkeleton />
          <RoundSkeleton />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-neutral-800 rounded-xl shadow-lg border border-neutral-700 p-4 sm:p-6 text-center">
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 mb-4">
          <div className="text-red-400 text-sm font-medium">⚠️ {error}</div>
        </div>
        <button
          onClick={loadMatches}
          className="bg-primary-500 hover:bg-primary-600 text-white font-medium py-2.5 px-6 rounded-lg transition-colors text-sm"
        >
          Try Again
        </button>
      </div>
    );
  }

  const rounds = groupMatchesByRound();
  const totalRounds = Object.keys(rounds).length;

  return (
    <div className="bg-neutral-800 rounded-xl shadow-lg border border-neutral-700">
      {/* Header */}
      <div className="p-4 sm:p-6 border-b border-neutral-700">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-2">
          <div>
            <h2 className="text-xl font-semibold text-white">Tournament Bracket</h2>
            <p className="text-gray-400 text-sm mt-1">
              {matches.length} matches across {totalRounds} rounds
            </p>
          </div>
          
          <div className="flex items-center gap-2 self-stretch sm:self-auto">
            {totalRounds > 1 && (
              <>
                <button
                  onClick={toggleCollapseView}
                  className="flex items-center gap-2 bg-neutral-700 hover:bg-neutral-600 text-gray-300 text-sm font-medium py-2 px-3 rounded-lg transition-colors"
                  title={isCollapsed ? "Expand view" : "Compact view"}
                >
                  {isCollapsed ? (
                    <ArrowsPointingOutIcon className="h-4 w-4" />
                  ) : (
                    <ArrowsPointingInIcon className="h-4 w-4" />
                  )}
                  <span className="hidden sm:inline">
                    {isCollapsed ? "Expand" : "Compact"}
                  </span>
                </button>
                
                <button
                  onClick={toggleAllRounds}
                  className="flex items-center gap-2 bg-neutral-700 hover:bg-neutral-600 text-gray-300 text-sm font-medium py-2 px-3 rounded-lg transition-colors"
                >
                  {expandedRounds.size === totalRounds ? (
                    <>
                      <ChevronUpIcon className="h-4 w-4" />
                      <span className="hidden sm:inline">Collapse All</span>
                    </>
                  ) : (
                    <>
                      <ChevronDownIcon className="h-4 w-4" />
                      <span className="hidden sm:inline">Expand All</span>
                    </>
                  )}
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 sm:p-6">
        {Object.keys(rounds).length === 0 ? (
          <div className="text-center py-8 sm:py-12">
            <div className="bg-neutral-750 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
              <TrophyIcon className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-white mb-2">No Matches Scheduled Yet</h3>
            <p className="text-gray-400 max-w-md mx-auto text-sm">
              Matches will be generated when the tournament begins. Check back soon!
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {Object.entries(rounds).map(([roundNumber, roundMatches]) => {
              const roundNum = Number(roundNumber);
              const isExpanded = expandedRounds.has(roundNum);
              const isFinalRound = roundNum === totalRounds;
              
              return (
                <div key={roundNum} className={`bg-neutral-750 rounded-xl border border-neutral-700 overflow-hidden transition-all duration-200 ${
                  isFinalRound ? 'ring-1 ring-yellow-500/20' : ''
                }`}>
                  {/* Round Header */}
                  <button
                    onClick={() => toggleRound(roundNum)}
                    className="w-full flex justify-between items-center p-4 sm:p-6 hover:bg-neutral-700/50 transition-colors"
                    disabled={isCollapsed}
                  >
                    <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0">
                      <div className={`flex items-center justify-center w-10 h-10 rounded-lg ${
                        isFinalRound ? 'bg-yellow-500/20' : 'bg-primary-500/20'
                      }`}>
                        <span className="text-lg">{getRoundIcon(roundNum, totalRounds)}</span>
                      </div>
                      <div className="flex-1 min-w-0 text-left">
                        <h3 className={`font-semibold truncate text-sm sm:text-base ${
                          isFinalRound ? 'text-yellow-400' : 'text-white'
                        }`}>
                          {getRoundTitle(roundNum, totalRounds)}
                        </h3>
                        <p className="text-gray-400 text-xs sm:text-sm truncate">
                          {roundMatches.length} match{roundMatches.length !== 1 ? 'es' : ''}
                          {isFinalRound && ' • Grand Final'}
                        </p>
                      </div>
                    </div>
                    
                    {!isCollapsed && (
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          isFinalRound ? 'bg-yellow-500/20 text-yellow-300' : 'bg-neutral-600 text-gray-300'
                        }`}>
                          Round {roundNum}
                        </span>
                        {isExpanded ? (
                          <ChevronUpIcon className="h-5 w-5 text-gray-400 flex-shrink-0" />
                        ) : (
                          <ChevronDownIcon className="h-5 w-5 text-gray-400 flex-shrink-0" />
                        )}
                      </div>
                    )}
                  </button>

                  {/* Round Content */}
                  {!isCollapsed && isExpanded && (
                    <div className="p-4 sm:p-6 border-t border-neutral-700">
                      {roundMatches.length <= 4 ? (
                        <div className={`grid gap-3 sm:gap-4 ${
                          roundMatches.length === 1 ? 'grid-cols-1 max-w-2xl mx-auto' :
                          roundMatches.length === 2 ? 'grid-cols-1 lg:grid-cols-2' :
                          'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'
                        }`}>
                          {roundMatches.map(match => (
                            <MatchCard 
                              key={match.id} 
                              match={match} 
                              onUpdate={loadMatches}
                            />
                          ))}
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4">
                          {roundMatches.map(match => (
                            <MatchCard 
                              key={match.id} 
                              match={match} 
                              onUpdate={loadMatches}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Compact View */}
                  {isCollapsed && (
                    <div className="p-4 border-t border-neutral-700">
                      <CompactMatchList matches={roundMatches} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}