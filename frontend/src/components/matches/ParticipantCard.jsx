import { UserCircleIcon, TrophyIcon } from '@heroicons/react/24/outline';

export const ParticipantCard = ({ participant, score, isWinner, isCurrentUser }) => (
  <div className={`flex-1 w-full sm:w-auto text-center p-4 rounded-lg border-2 transition-all ${
    isWinner 
      ? 'bg-green-500/10 border-green-500/30' 
      : 'bg-neutral-700/40 border-neutral-600'
  } ${isCurrentUser ? 'ring-2 ring-primary-500/50' : ''}`}>
    <div className="flex items-center justify-between sm:block">
      <div className="flex items-center gap-3 sm:justify-center sm:flex-col">
        <UserCircleIcon className="h-8 w-8 text-gray-400" />
        <div className="text-left sm:text-center">
          <p className="text-white font-medium truncate text-sm">
            {participant?.user?.username || 'TBD'}
          </p>
          <p className="text-gray-400 text-xs truncate">
            {participant?.gamer_tag || ''}
          </p>
        </div>
      </div>
      
      {score !== null && (
        <div className="sm:mt-3">
          <p className="text-2xl font-bold text-white">{score}</p>
        </div>
      )}
    </div>

    {isWinner && (
      <div className="flex items-center justify-center gap-1 mt-2 text-green-400 text-xs">
        <TrophyIcon className="h-3 w-3" />
        Winner
      </div>
    )}
  </div>
);