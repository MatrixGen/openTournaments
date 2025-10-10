import { memo } from "react";
import Banner from "../common/Banner";
import LoadingSpinner from "../common/LoadingSpinner";
import { CheckCircleIcon, FlagIcon } from "lucide-react";
import { ExclamationTriangleIcon } from "@heroicons/react/24/outline";

const ActionButtons = memo(({ 
  match, 
  isReporter, 
  isParticipant, 
  onShowReport, 
  onConfirm, 
  onShowDispute,
  isConfirming,
  isDisputing 
}) => {
  if (!isParticipant) return null;

  return (
    <div className="p-4 pt-0">
      <div className="flex flex-col sm:flex-row gap-2">
        {match.status === 'scheduled' && (
          <button
            onClick={onShowReport}
            className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 px-4 rounded-lg transition-colors flex-1 text-sm sm:text-base"
          >
            <FlagIcon className="h-4 w-4" />
            Report Score
          </button>
        )}

        {match.status === 'awaiting_confirmation' && !isReporter && (
          <>
            <button
              onClick={onConfirm}
              disabled={isConfirming}
              className="flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white font-medium py-2.5 px-4 rounded-lg transition-colors disabled:opacity-50 flex-1 text-sm sm:text-base"
            >
              {isConfirming ? (
                <span className="flex items-center space-x-2">
                  <LoadingSpinner size="sm" />
                  <span>Confirming...</span>
                </span>
              ) : (
                <>
                  <CheckCircleIcon className="h-4 w-4" />
                  Confirm Score
                </>
              )}
            </button>
            <button
              onClick={onShowDispute}
              disabled={isDisputing}
              className="flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white font-medium py-2.5 px-4 rounded-lg transition-colors disabled:opacity-50 flex-1 text-sm sm:text-base"
            >
              {isDisputing ? (
                <span className="flex items-center space-x-2">
                  <LoadingSpinner size="sm" />
                  <span>Disputing...</span>
                </span>
              ) : (
                <>
                  <ExclamationTriangleIcon className="h-4 w-4" />
                  Dispute Score
                </>
              )}
            </button>
          </>
        )}

        {match.status === 'disputed' && (
          <div className="w-full text-center">
            <Banner
              type="error"
              title="Under Administration Review"
              message="This match is currently being reviewed by tournament administrators. Please wait for resolution."
              className="w-full"
              showIcon={true}
              dismissible={true}
            />
          </div>
        )}
      </div>
    </div>
  );
});

export default ActionButtons;