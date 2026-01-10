import { ClockIcon, TrophyIcon } from "lucide-react";
import { ParticipantCard } from "./ParticipantCard";
import { memo } from "react";
import { STATUS_CONFIG } from "../../pages/Match/MatchPage";

const ParticipantsSection = memo(({ match, isPlayer1, isPlayer2 }) => {
  const Icon = STATUS_CONFIG[match.status]?.icon || ClockIcon;

  return (
    <div className="p-4 md:p-6 bg-white dark:bg-gray-800">
      {/* Match info bar */}
      <div className="flex items-center justify-between mb-4 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
        <div className="flex items-center gap-2">
          <Icon className="h-5 w-5 text-gray-500 dark:text-gray-400" />
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {match.status === "live"
              ? "Match in Progress"
              : match.status === "scheduled"
              ? "Match Scheduled"
              : match.status === "completed"
              ? "Match Completed"
              : match.status.replace("_", " ")}
          </span>
        </div>
        <div className="text-xs text-gray-500 dark:text-gray-400">
          {match.scheduled_time &&
            new Date(match.scheduled_time).toLocaleDateString()}
        </div>
      </div>

      {/* Participants Grid */}
      <div className="relative">
        {/* VS badge for mobile */}
        <div className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 z-10 md:hidden">
          <div className="bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-full p-1.5 shadow-lg">
            <div className="w-10 h-10 bg-gradient-to-br from-gray-900 to-gray-700 dark:from-gray-800 dark:to-gray-600 rounded-full flex items-center justify-center">
              <span className="text-white font-bold text-sm">VS</span>
            </div>
          </div>
        </div>

        {/* Desktop VS separator */}
        <div className="hidden md:flex absolute left-1/2 top-0 bottom-0 transform -translate-x-1/2">
          <div className="flex flex-col items-center justify-center h-full px-4">
            <div className="h-8 w-px bg-gradient-to-b from-transparent via-gray-300 dark:via-gray-600 to-transparent"></div>
            <div className="my-2 bg-gradient-to-r from-gray-300 dark:from-gray-600 to-gray-300 dark:to-gray-600 h-px w-8"></div>
            <div className="bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-full p-1.5">
              <div className="w-12 h-12 bg-gradient-to-br from-gray-900 to-gray-700 dark:from-gray-800 dark:to-gray-600 rounded-full flex items-center justify-center">
                <span className="text-white font-bold text-lg">VS</span>
              </div>
            </div>
            <div className="my-2 bg-gradient-to-r from-gray-300 dark:from-gray-600 to-gray-300 dark:to-gray-600 h-px w-8"></div>
            <div className="h-8 w-px bg-gradient-to-b from-transparent via-gray-300 dark:via-gray-600 to-transparent"></div>
          </div>
        </div>

        {/* Participants */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8">
          <div
            className={`relative ${
              isPlayer1
                ? "ring-2 ring-blue-500 ring-offset-2 dark:ring-offset-gray-800 rounded-xl"
                : ""
            }`}
          >
            <ParticipantCard
              participant={match.participant1}
              score={match.participant1_score}
              isWinner={match.winner_id === match.participant1?.user_id}
              isCurrentUser={isPlayer1}
              showScore={match.status !== "scheduled"}
            />
            {isPlayer1 && (
              <div className="absolute -top-2 -right-2 bg-blue-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                YOU
              </div>
            )}
          </div>

          <div
            className={`relative ${
              isPlayer2
                ? "ring-2 ring-blue-500 ring-offset-2 dark:ring-offset-gray-800 rounded-xl"
                : ""
            }`}
          >
            <ParticipantCard
              participant={match.participant2}
              score={match.participant2_score}
              isWinner={match.winner_id === match.participant2?.user_id}
              isCurrentUser={isPlayer2}
              showScore={match.status !== "scheduled"}
            />
            {isPlayer2 && (
              <div className="absolute -top-2 -right-2 bg-blue-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                YOU
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Score summary for completed matches */}
      {(match.status === "completed" || match.status === "reported") && (
        <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-center gap-4">
            <div className="text-center">
              <div className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-gray-100">
                {match.participant1_score}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Score
              </div>
            </div>
            <div className="text-gray-300 dark:text-gray-600 text-lg">-</div>
            <div className="text-center">
              <div className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-gray-100">
                {match.participant2_score}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Score
              </div>
            </div>
          </div>
          {match.winner_id && (
            <div className="text-center mt-4">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gradient-to-r from-emerald-500 to-green-500 text-white text-sm font-semibold">
                <TrophyIcon className="h-4 w-4" />
                Winner:{" "}
                {match.winner_id === match.participant1?.user_id
                  ? match.participant1?.gamer_tag ||
                    match.participant1?.user?.username
                  : match.participant2?.gamer_tag ||
                    match.participant2?.user?.username}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
});
export default ParticipantsSection
ParticipantsSection.displayName = "ParticipantsSection";