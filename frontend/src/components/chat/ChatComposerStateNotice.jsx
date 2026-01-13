import { memo } from "react";
import { AlertCircle, Lock } from "lucide-react";

const ChatComposerStateNotice = memo(
  ({ variant, chatDataType, tournamentId, isUserMuted }) => {
    if (variant === "unavailable") {
      return (
        <div className="text-center py-4 px-4">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-800 mb-3">
            <Lock className="w-6 h-6 text-gray-400" />
          </div>
          <p className="text-gray-500 dark:text-gray-400 mb-2">
            {chatDataType === "tournament"
              ? "Chat is not available for this tournament"
              : "You don't have access to this chat"}
          </p>
          {chatDataType === "tournament" && tournamentId && (
            <button
              onClick={() =>
                (window.location.href = `/tournaments/${tournamentId}`)
              }
              className="mt-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors text-sm"
            >
              View Tournament
            </button>
          )}
        </div>
      );
    }

    return (
      <div className="text-center py-4 px-4">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/20 mb-3">
          <AlertCircle className="w-6 h-6 text-red-500" />
        </div>
        <p className="text-gray-500 dark:text-gray-400 mb-2">
          {isUserMuted
            ? "You are muted and cannot send messages"
            : "You don't have permission to send messages here"}
        </p>
        {chatDataType === "tournament" && tournamentId && (
          <button
            onClick={() =>
              (window.location.href = `/tournaments/${tournamentId}`)
            }
            className="mt-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors text-sm"
          >
            Join Tournament
          </button>
        )}
      </div>
    );
  }
);

ChatComposerStateNotice.displayName = "ChatComposerStateNotice";

export default ChatComposerStateNotice;
