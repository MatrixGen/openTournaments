import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Gamepad2, ChevronDown, ChevronUp, Info } from "lucide-react";

const TournamentDetailsCard = ({ tournament }) => {
  const navigate = useNavigate();
  const [showAllRules, setShowAllRules] = useState(false);

  const rules = (tournament?.rules || "").trim();
  const hasRules = rules.length > 0;

  // Split rules into lines so we can clamp by lines (nice for whitespace-pre-wrap content)
  const ruleLines = useMemo(() => (hasRules ? rules.split("\n") : []), [hasRules, rules]);
  const MAX_LINES = 6;
  const shouldClamp = ruleLines.length > MAX_LINES;

  const displayedRules = useMemo(() => {
    if (!hasRules) return "";
    if (!shouldClamp || showAllRules) return rules;
    return ruleLines.slice(0, MAX_LINES).join("\n");
  }, [hasRules, shouldClamp, showAllRules, rules, ruleLines]);

  const hasGame = Boolean(tournament?.game?.id);

  const goToGameRules = () => {
    if (!tournament?.game?.id) return;
    navigate(`/games/${tournament.game.id}/rules`, {
      state: {
        gameName: tournament.game?.name,
        tournament,
      },
    });
  };

  const showEmptyState = !hasRules;

  return (
    <section className="bg-white dark:bg-neutral-800 rounded-xl border border-gray-200 dark:border-neutral-700 shadow-sm">
      {/* Header */}
      <div className="px-4 md:px-6 py-4 md:py-5 border-b border-gray-100 dark:border-neutral-700/60">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-base md:text-lg font-semibold text-gray-900 dark:text-white">
            Tournament Details
          </h2>
          <span className="text-xs px-2 py-1 rounded-full bg-gray-100 dark:bg-neutral-700/60 text-gray-600 dark:text-gray-300">
            Info
          </span>
        </div>
      </div>

      <div className="p-4 md:p-6 space-y-4 md:space-y-6">
        {/* Rules */}
        {hasRules && (
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-sm md:text-base font-medium text-gray-900 dark:text-white">
                Rules & Guidelines
              </h3>

              {shouldClamp && (
                <button
                  type="button"
                  onClick={() => setShowAllRules((v) => !v)}
                  className="inline-flex items-center gap-1 text-xs md:text-sm font-medium text-gray-700 dark:text-gray-200 hover:text-gray-900 dark:hover:text-white transition-colors"
                >
                  {showAllRules ? (
                    <>
                      Show less <ChevronUp className="h-4 w-4" />
                    </>
                  ) : (
                    <>
                      Show more <ChevronDown className="h-4 w-4" />
                    </>
                  )}
                </button>
              )}
            </div>

            <div className="rounded-lg border border-gray-200 dark:border-neutral-700 bg-gray-50 dark:bg-neutral-700/30 p-3 md:p-4">
              <p className="text-gray-700 dark:text-gray-200 whitespace-pre-wrap text-sm leading-relaxed">
                {displayedRules}
              </p>

              {!showAllRules && shouldClamp && (
                <div className="mt-3 text-xs text-gray-500 dark:text-gray-400">
                  Showing first {MAX_LINES} lines
                </div>
              )}
            </div>
          </div>
        )}

        {/* Game Rules Action */}
        {hasGame && (
          <button
            type="button"
            onClick={goToGameRules}
            className="w-full group rounded-lg border border-gray-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 hover:bg-gray-50 dark:hover:bg-neutral-700/40 transition-colors px-4 py-3 flex items-center justify-between focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-neutral-800"
          >
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-gray-100 dark:bg-neutral-700 flex items-center justify-center">
                <Gamepad2 className="h-4 w-4 text-gray-600 dark:text-gray-200" />
              </div>
              <div className="text-left">
                <div className="text-sm font-semibold text-gray-900 dark:text-white">
                  View Game Rules
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  Rules specific to {tournament?.game?.name || "this game"}
                </div>
              </div>
            </div>

            <span className="text-xs font-medium text-gray-600 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-white">
              Open →
            </span>
          </button>
        )}

        {/* Empty state */}
        {showEmptyState && (
          <div className="text-center py-6 md:py-8">
            <div className="mx-auto w-12 h-12 rounded-full bg-gray-100 dark:bg-neutral-700 flex items-center justify-center mb-3">
              <Info className="w-5 h-5 text-gray-400 dark:text-gray-500" />
            </div>
            <p className="text-gray-600 dark:text-gray-300 text-sm font-medium">
              No additional details provided
            </p>
            <p className="text-gray-500 dark:text-gray-400 text-xs mt-1">
              The organizer hasn’t added rules or extra info yet.
            </p>
          </div>
        )}
      </div>
    </section>
  );
};

export default TournamentDetailsCard;
