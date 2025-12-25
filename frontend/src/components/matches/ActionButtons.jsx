import { memo } from "react";
import Banner from "../common/Banner";
import LoadingSpinner from "../common/LoadingSpinner";
import { 
  CheckCircleIcon, 
  FlagIcon, 
  AlertTriangleIcon,
  ClockIcon,
  ShieldAlertIcon
} from "lucide-react";

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

  // Helper function for button classes
  const getButtonClasses = (color, isLoading = false) => `
    flex items-center justify-center gap-3 
    font-medium py-3 px-6 rounded-xl 
    transition-all duration-200 ease-out
    focus:outline-none focus:ring-4 focus:ring-opacity-50
    disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none
    flex-1 text-sm sm:text-base min-h-[52px]
    ${isLoading 
      ? 'cursor-wait' 
      : 'hover:scale-105 active:scale-95 cursor-pointer'
    }
    ${
      color === 'blue' ? 
        'bg-blue-600 hover:bg-blue-700 text-gray-900 dark:text-white focus:ring-blue-600' :
      color === 'green' ?
        'bg-green-600 hover:bg-green-700 text-gray-900 dark:text-white focus:ring-green-600' :
      color === 'red' ?
        'bg-red-600 hover:bg-red-700 text-gray-900 dark:text-white focus:ring-red-600' :
      'bg-gray-600 hover:bg-gray-700 text-gray-900 dark:text-white focus:ring-gray-600'
    }
  `;

  const getLoadingContent = (text, icon) => (
    <span className="flex items-center space-x-3">
      <LoadingSpinner size="sm" />
      <span>{text}</span>
    </span>
  );

  const getButtonContent = (text, icon, loading = false) => (
    loading ? getLoadingContent(text, icon) : (
      <span className="flex items-center space-x-3">
        {icon}
        <span>{text}</span>
      </span>
    )
  );

  return (
    <div className="p-4 pt-0">
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Report Score Button */}
        {match.status === 'scheduled' && (
          <button
            onClick={onShowReport}
            className={getButtonClasses('blue')}
            aria-label="Report match score"
          >
            {getButtonContent(
              'Report Score',
              <FlagIcon className="h-5 w-5" />,
              false
            )}
          </button>
        )}

        {/* Awaiting Confirmation Actions */}
        {match.status === 'awaiting_confirmation' && !isReporter && (
          <>
            <div className="flex flex-col sm:flex-row gap-3 flex-1">
              {/* Confirm Button */}
              <button
                onClick={onConfirm}
                disabled={isConfirming}
                className={getButtonClasses('green', isConfirming)}
                aria-label="Confirm match score"
              >
                {getButtonContent(
                  isConfirming ? 'Confirming...' : 'Confirm Score',
                  <CheckCircleIcon className="h-5 w-5" />,
                  isConfirming
                )}
              </button>

              {/* Dispute Button */}
              <button
                onClick={onShowDispute}
                disabled={isDisputing}
                className={getButtonClasses('red', isDisputing)}
                aria-label="Dispute match score"
              >
                {getButtonContent(
                  isDisputing ? 'Disputing...' : 'Dispute Score',
                  <AlertTriangleIcon className="h-5 w-5" />,
                  isDisputing
                )}
              </button>
            </div>

            {/* Help Text */}
            <div className="text-center sm:text-left mt-2">
              <p className="text-xs text-gray-400 flex items-center justify-center sm:justify-start gap-1">
                <ClockIcon className="h-3 w-3" />
                Auto-confirms in {match.auto_confirm_at ? 
                  Math.max(0, Math.floor((new Date(match.auto_confirm_at).getTime() - Date.now()) / 60000)) 
                  : '?'} minutes
              </p>
            </div>
          </>
        )}

        {/* Disputed State */}
        {match.status === 'disputed' && (
          <div className="w-full">
            <Banner
              type="error"
              title="Under Administration Review"
              message="This match is currently being reviewed by tournament administrators. Please wait for resolution."
              className="w-full"
              showIcon={true}
              dismissible={true}
              icon={<ShieldAlertIcon className="h-5 w-5" />}
            />
            <div className="mt-3 text-center">
              <p className="text-sm text-gray-400">
                Contact support if you need immediate assistance
              </p>
            </div>
          </div>
        )}

        {/* Completed State - Show winner info */}
        {match.status === 'completed' && match.winner_id && (
          <div className="w-full text-center py-2">
            <div className="inline-flex items-center gap-2 bg-green-500/20 text-green-300 px-4 py-2 rounded-full">
              <CheckCircleIcon className="h-4 w-4" />
              <span className="text-sm font-medium">
                Match completed • {match.winner_id === match.participant1?.user_id ? 
                match.participant1?.gamer_tag : match.participant2?.gamer_tag} won
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Status-specific guidance */}
      {match.status === 'awaiting_confirmation' && !isReporter && (
        <div className="mt-3 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
          <p className="text-xs text-blue-300 text-center">
            <strong>Please verify the reported score:</strong> Confirm if correct or dispute if there's an issue
          </p>
        </div>
      )}

      {match.status === 'scheduled' && (
        <div className="mt-3 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
          <p className="text-xs text-blue-300 text-center">
            <strong>Ready to report?</strong> Make sure both players agree on the final score before submitting
          </p>
        </div>
      )}
    </div>
  );
});

// Add display name for better debugging
ActionButtons.displayName = 'ActionButtons';

export default ActionButtons;