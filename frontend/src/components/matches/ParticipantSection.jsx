import { memo } from "react";
import { ParticipantCard } from "./ParticipantCard";

const ParticipantsSection = memo(({ match, isPlayer1, isPlayer2 }) => (
  <div className="p-4 sm:p-6 flex flex-col sm:flex-row items-stretch gap-4">
    <ParticipantCard
      participant={match.participant1}
      score={match.participant1_score}
      isWinner={match.winner_id === match.participant1?.user_id}
      isCurrentUser={isPlayer1}
    />
    <div className="flex items-center justify-center py-2 sm:py-0 sm:px-4">
      <div className="flex items-center gap-2 sm:flex-col sm:gap-1">
        <div className="h-px w-8 bg-neutral-600 sm:h-8 sm:w-px"></div>
        <div className="inline-flex items-center justify-center w-8 h-8 bg-neutral-700 rounded-full flex-shrink-0">
          <span className="text-gray-400 font-bold text-xs">VS</span>
        </div>
        <div className="h-px w-8 bg-neutral-600 sm:h-8 sm:w-px"></div>
      </div>
    </div>
    <ParticipantCard
      participant={match.participant2}
      score={match.participant2_score}
      isWinner={match.winner_id === match.participant2?.user_id}
      isCurrentUser={isPlayer2}
    />
  </div>
));

export default ParticipantsSection;
