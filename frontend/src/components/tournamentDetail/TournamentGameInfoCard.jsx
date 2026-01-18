import { Gamepad2, ListChecks } from "lucide-react";

const TournamentGameInfoCard = ({ tournament }) => {
  const gameModeName = tournament?.game_mode?.name || tournament?.game_mode;
  const howToPlay = (tournament?.game_mode?.how_to_play || "").trim();

  if (!gameModeName && !howToPlay) return null;

  return (
    <section className="bg-white dark:bg-neutral-800 rounded-xl border border-gray-200 dark:border-neutral-700 shadow-sm">
      <div className="px-4 md:px-6 py-4 border-b border-gray-100 dark:border-neutral-700/60">
        <h3 className="text-base font-semibold text-gray-900 dark:text-white">
          How to play
        </h3>
      </div>

      <div className="p-4 md:p-6 space-y-4">
        {/* Game Mode */}
        {gameModeName && (
          <div className="flex items-start gap-3">
            <div className="h-9 w-9 rounded-lg bg-gray-100 dark:bg-neutral-700 flex items-center justify-center shrink-0">
              <Gamepad2 className="h-4 w-4 text-gray-600 dark:text-gray-200" />
            </div>

            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                Game Mode
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                {gameModeName}
              </p>
            </div>
          </div>
        )}

        {/* How to Play */}
        {howToPlay && (
          <div className="flex items-start gap-3">
            <div className="h-9 w-9 rounded-lg bg-gray-100 dark:bg-neutral-700 flex items-center justify-center shrink-0">
              <ListChecks className="h-4 w-4 text-gray-600 dark:text-gray-200" />
            </div>

            <div className="w-full">
              <p className="text-sm font-medium text-gray-900 dark:text-white mb-1">
                How to Play
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">
                {howToPlay}
              </p>
            </div>
          </div>
        )}
      </div>
    </section>
  );
};

export default TournamentGameInfoCard;
