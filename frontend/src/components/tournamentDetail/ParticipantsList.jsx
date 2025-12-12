import { memo } from 'react';

// Theme-aware color configuration
const THEME_CONFIG = {
  light: {
    background: 'bg-white',
    cardBackground: 'bg-gray-50',
    text: {
      primary: 'text-gray-900',
      secondary: 'text-gray-600',
      tertiary: 'text-gray-500',
      inverse: 'text-white'
    },
    border: 'border-gray-200'
  },
  dark: {
    background: 'bg-neutral-800',
    cardBackground: 'bg-neutral-700/50',
    text: {
      primary: 'text-white',
      secondary: 'text-gray-300',
      tertiary: 'text-gray-400',
      inverse: 'text-white'
    },
    border: 'border-neutral-700'
  }
};

// Memoized participant card component
const ParticipantCard = memo(({ participant, theme }) => {
  const initials = participant.user?.username?.charAt(0).toUpperCase() || '?';
  const isWinner = participant.final_standing === 1;
  const isRunnerUp = participant.final_standing === 2;
  const isThirdPlace = participant.final_standing === 3;

  const getRankingColor = () => {
    if (isWinner) return 'bg-yellow-500 text-yellow-50';
    if (isRunnerUp) return 'bg-gray-400 text-gray-50';
    if (isThirdPlace) return 'bg-amber-700 text-amber-50';
    return participant.final_standing 
      ? 'bg-primary-500/20 text-primary-600 dark:text-primary-400'
      : 'bg-gray-200 dark:bg-neutral-600 text-gray-700 dark:text-gray-300';
  };

  return (
    <div 
      className={`flex items-center justify-between p-3 rounded-lg transition-all duration-200 hover:scale-[1.02] active:scale-100 ${
        theme.cardBackground
      } ${theme.border} border hover:border-primary-400/50`}
    >
      <div className="flex items-center min-w-0 flex-1">
        {/* Avatar */}
        <div className="relative flex-shrink-0">
          <div className={`h-8 w-8 sm:h-9 sm:w-9 md:h-10 md:w-10 rounded-full flex items-center justify-center font-medium text-sm sm:text-base ${
            isWinner 
              ? 'bg-yellow-500 text-yellow-50' 
              : 'bg-primary-500 text-white'
          }`}>
            {initials}
          </div>
          {participant.is_current_user && (
            <div className="absolute -bottom-1 -right-1 w-3 h-3 sm:w-3.5 sm:h-3.5 rounded-full bg-green-500 border border-white dark:border-neutral-800" />
          )}
        </div>
        
        {/* User Info */}
        <div className="ml-3 min-w-0 flex-1">
          <p className={`text-sm sm:text-base font-medium truncate ${theme.text.primary}`}>
            {participant.user?.username || 'Unknown'}
            {participant.is_current_user && (
              <span className="ml-2 text-xs text-green-600 dark:text-green-400">(You)</span>
            )}
          </p>
          {participant.gamer_tag && (
            <p className={`text-xs sm:text-sm truncate mt-0.5 ${theme.text.tertiary}`}>
              {participant.gamer_tag}
            </p>
          )}
          {participant.team_name && (
            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
              {participant.team_name}
            </p>
          )}
        </div>
      </div>

      {/* Ranking Badge */}
      {participant.final_standing && (
        <div className="ml-2 flex-shrink-0">
          <span className={`inline-flex items-center justify-center min-w-[2rem] px-2 py-1 rounded-full text-xs font-medium ${getRankingColor()}`}>
            {isWinner ? (
              <>
                <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
                #{participant.final_standing}
              </>
            ) : (
              `#${participant.final_standing}`
            )}
          </span>
        </div>
      )}

      {/* Status Indicator */}
      {participant.status === 'checked_in' && (
        <div className="ml-2 flex-shrink-0">
          <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-green-500/20 text-green-600 dark:text-green-400">
            Checked In
          </span>
        </div>
      )}
    </div>
  );
});

ParticipantCard.displayName = 'ParticipantCard';

// Skeleton loader for participants
const ParticipantsSkeleton = () => (
  <div className="space-y-3">
    {[1, 2, 3, 4, 5].map((i) => (
      <div key={i} className="animate-pulse">
        <div className="flex items-center justify-between p-3 bg-gray-100 dark:bg-neutral-700/50 rounded-lg">
          <div className="flex items-center flex-1">
            <div className="h-9 w-9 rounded-full bg-gray-200 dark:bg-neutral-600"></div>
            <div className="ml-3 flex-1 space-y-2">
              <div className="h-4 bg-gray-200 dark:bg-neutral-600 rounded w-24"></div>
              <div className="h-3 bg-gray-200 dark:bg-neutral-600 rounded w-16"></div>
            </div>
          </div>
          <div className="h-6 w-10 bg-gray-200 dark:bg-neutral-600 rounded-full"></div>
        </div>
      </div>
    ))}
  </div>
);

// Main ParticipantsList component
const ParticipantsList = ({ tournament, isLoading = false }) => {
  const participantsCount = tournament?.participants?.length || 0;
  const theme = THEME_CONFIG.dark; // You can make this dynamic based on user preference
  
  // Sort participants by final standing if available
  const sortedParticipants = useMemo(() => {
    if (!tournament?.participants) return [];
    
    return [...tournament.participants].sort((a, b) => {
      // First sort by final standing (if available)
      if (a.final_standing && b.final_standing) {
        return a.final_standing - b.final_standing;
      }
      if (a.final_standing && !b.final_standing) return -1;
      if (!a.final_standing && b.final_standing) return 1;
      
      // Then sort by username
      return a.user?.username?.localeCompare(b.user?.username);
    });
  }, [tournament?.participants]);

  // Group participants by status or category if needed
  const participantsByStatus = useMemo(() => {
    const groups = {
      winners: [],
      checkedIn: [],
      registered: [],
      waiting: []
    };
    
    sortedParticipants.forEach(participant => {
      if (participant.final_standing === 1) {
        groups.winners.push(participant);
      } else if (participant.status === 'checked_in') {
        groups.checkedIn.push(participant);
      } else if (participant.status === 'registered') {
        groups.registered.push(participant);
      } else {
        groups.waiting.push(participant);
      }
    });
    
    return groups;
  }, [sortedParticipants]);

  if (isLoading) {
    return (
      <div className={`rounded-lg shadow p-4 sm:p-6 ${theme.background}`}>
        <div className="h-6 bg-gray-200 dark:bg-neutral-700 rounded w-48 mb-4"></div>
        <ParticipantsSkeleton />
      </div>
    );
  }

  return (
    <div className={`rounded-lg shadow-lg border ${theme.border} overflow-hidden ${theme.background}`}>
      {/* Header */}
      <div className="p-4 sm:p-6 border-b bg-gradient-to-r from-primary-500/10 to-primary-600/10">
        <div className="flex items-center justify-between">
          <div>
            <h2 className={`text-lg sm:text-xl font-bold ${theme.text.primary}`}>
              Participants
            </h2>
            <p className={`text-sm ${theme.text.secondary} mt-1`}>
              {participantsCount} player{participantsCount !== 1 ? 's' : ''} registered
            </p>
          </div>
          {participantsCount > 0 && (
            <div className="hidden sm:flex items-center gap-2">
              {participantsByStatus.winners.length > 0 && (
                <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-yellow-500/20 text-yellow-700 dark:text-yellow-400">
                  {participantsByStatus.winners.length} winner{participantsByStatus.winners.length !== 1 ? 's' : ''}
                </span>
              )}
              {participantsByStatus.checkedIn.length > 0 && (
                <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-green-500/20 text-green-700 dark:text-green-400">
                  {participantsByStatus.checkedIn.length} checked in
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-4 sm:p-6">
        {participantsCount > 0 ? (
          <div className="space-y-2 sm:space-y-3">
            {/* Winners Section (if any) */}
            {participantsByStatus.winners.length > 0 && (
              <div className="mb-4 sm:mb-6">
                <h3 className="text-sm font-semibold text-yellow-600 dark:text-yellow-400 mb-2 sm:mb-3 flex items-center">
                  <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                  Tournament Winners
                </h3>
                <div className="space-y-2 sm:space-y-3">
                  {participantsByStatus.winners.map((participant) => (
                    <ParticipantCard 
                      key={participant.id} 
                      participant={participant} 
                      theme={theme}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* All Participants */}
            <h3 className="text-sm font-semibold text-gray-600 dark:text-gray-400 mb-2 sm:mb-3">
              All Participants
            </h3>
            <div className="space-y-2 sm:space-y-3 max-h-[400px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-neutral-700">
              {sortedParticipants.map((participant) => (
                <ParticipantCard 
                  key={participant.id} 
                  participant={participant} 
                  theme={theme}
                />
              ))}
            </div>

            {/* Mobile Status Summary */}
            <div className="sm:hidden pt-4 border-t border-gray-200 dark:border-neutral-700">
              <div className="flex items-center justify-between text-sm">
                <span className={theme.text.secondary}>
                  {participantsCount} total
                </span>
                {participantsByStatus.checkedIn.length > 0 && (
                  <span className="text-green-600 dark:text-green-400">
                    {participantsByStatus.checkedIn.length} checked in
                  </span>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-8 sm:py-12">
            <div className="w-16 h-16 mx-auto bg-gray-100 dark:bg-neutral-700/50 rounded-full flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.67 3.107a6 6 0 00-9.339-5.553" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              No Participants Yet
            </h3>
            <p className="text-gray-600 dark:text-gray-400 max-w-sm mx-auto text-sm">
              Be the first to join this tournament! Participants will appear here once registered.
            </p>
          </div>
        )}
      </div>

      {/* Footer Stats */}
      {participantsCount > 0 && (
        <div className="px-4 sm:px-6 py-3 bg-gray-50 dark:bg-neutral-900/50 border-t border-gray-200 dark:border-neutral-700">
          <div className="flex items-center justify-between text-sm">
            <span className={theme.text.tertiary}>
              Showing {participantsCount} participant{participantsCount !== 1 ? 's' : ''}
            </span>
            {tournament?.max_participants && (
              <span className={`font-medium ${
                participantsCount >= tournament.max_participants
                  ? 'text-red-600 dark:text-red-400'
                  : 'text-primary-600 dark:text-primary-400'
              }`}>
                {participantsCount}/{tournament.max_participants} spots filled
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// Add missing imports and memoize the main component
import { useMemo } from 'react';

export default memo(ParticipantsList);