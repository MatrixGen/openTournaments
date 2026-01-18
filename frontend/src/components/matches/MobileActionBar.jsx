import { CheckCircleIcon } from "lucide-react";
import LoadingSpinner from "../common/LoadingSpinner";
import { memo } from "react";

// Mobile Bottom Action Bar
const MobileActionBar = memo(
  ({
    match,
    isParticipant,
    isReporter,
    onConfirmActive,
    onEnterGame,  // New: user-initiated recording + confirmActive
    onShowReport,
    onConfirm,
    onShowDispute,
    onMarkReady,
    readyStatus,
    getCurrentUserReadyStatus,
    isConfirming,
    isDisputing,
    isMarkingReady,
    currentUser,
    isMarkingNotReady,
    isConfirmingActive,
    isEnteringGame,  // New: loading state for Enter Game
    recordingError,  // New: display recording errors
  }) => {
    const userReadyStatus = getCurrentUserReadyStatus;

    if (!isParticipant) return null;

    return (
      <div className="md:hidden fixed bottom-20 left-0 right-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 p-4 shadow-lg">
        <div className="max-w-2xl mx-auto">
          {/* Scheduled Match Actions */}
          {match.status === "scheduled" && (
            <>
              {readyStatus.handshakeStatus === "waiting" ||
              readyStatus.handshakeStatus === "one_ready" ? (
                <button
                  onClick={onMarkReady}
                  disabled={userReadyStatus?.isReady || isMarkingReady}
                  className={`w-full py-3 px-4 rounded-lg font-semibold text-sm transition-all duration-200 ${
                    userReadyStatus?.isReady
                      ? "bg-gradient-to-r from-emerald-500 to-green-500 text-white"
                      : "bg-gradient-to-r from-blue-500 to-indigo-500 text-white hover:opacity-90"
                  }`}
                >
                  {isMarkingReady ? (
                    <span className="flex items-center justify-center gap-2">
                      <LoadingSpinner />
                      Processing...
                    </span>
                  ) : userReadyStatus?.isReady ? (
                    <span className="flex items-center justify-center gap-2">
                      <CheckCircleIcon className="h-5 w-5" />
                      Ready! Waiting for opponent...
                    </span>
                  ) : (
                    "Mark as Ready"
                  )}
                </button>
              ) : readyStatus.handshakeStatus === "both_ready" &&
                !userReadyStatus?.isActiveConfirmed ? (
                <>
                  <button
                    onClick={onEnterGame || onConfirmActive}
                    disabled={isEnteringGame || isConfirmingActive}
                    className="w-full py-3 px-4 rounded-lg font-semibold text-sm bg-gradient-to-r from-green-500 to-emerald-500 text-white hover:opacity-90 transition-all duration-200 disabled:opacity-70"
                  >
                    {isEnteringGame || isConfirmingActive ? (
                      <span className="flex items-center justify-center gap-2">
                        <LoadingSpinner />
                        Entering Game...
                      </span>
                    ) : (
                      "Enter Game"
                    )}
                  </button>
                  {recordingError && (
                    <p className="text-xs text-red-500 mt-1 text-center">{recordingError}</p>
                  )}
                </>
              ) : null}
            </>
          )}

          {/* Live Match Actions - Score Reporting */}
          {match.status === "live" && (
            <>
              {!isReporter ? (
                <button
                  onClick={onShowReport}
                  className="w-full py-3 px-4 rounded-lg font-semibold text-sm bg-gradient-to-r from-amber-500 to-orange-500 text-white hover:opacity-90 transition-all duration-200"
                >
                  Report Score
                </button>
              ) : null}
            </>
          )}
          {match.status === "awaiting_confirmation" && !isReporter ? (
            <>
              <button
                onClick={onConfirm}
                disabled={isConfirming}
                className="w-full py-3 px-4 rounded-lg font-semibold text-sm bg-gradient-to-r from-green-500 to-emerald-500 text-white hover:opacity-90 transition-all duration-200 mb-2 disabled:opacity-70"
              >
                {isConfirming ? (
                  <span className="flex items-center justify-center gap-2">
                    <LoadingSpinner />
                    Confirming Score...
                  </span>
                ) : (
                  "Confirm Score"
                )}
              </button>
              <button
                onClick={onShowDispute}
                disabled={isDisputing}
                className="w-full py-3 px-4 rounded-lg font-semibold text-sm bg-gradient-to-r from-red-500 to-rose-500 text-white hover:opacity-90 transition-all duration-200 disabled:opacity-70"
              >
                {isDisputing ? (
                  <span className="flex items-center justify-center gap-2">
                    <LoadingSpinner />
                    Opening Dispute...
                  </span>
                ) : (
                  "Dispute Score"
                )}
              </button>
            </>
          ):null}
        </div>
      </div>
    );
  }
);

export default MobileActionBar

MobileActionBar.displayName = "MobileActionBar";