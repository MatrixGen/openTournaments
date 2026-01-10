import { memo } from "react";
import Banner from "../common/Banner";
import LoadingSpinner from "../common/LoadingSpinner";
import { 
  CheckCircleIcon, 
  FlagIcon, 
  AlertTriangleIcon,
  ClockIcon,
  ShieldAlertIcon,
  PlayCircleIcon,
  PauseCircleIcon,
  CheckIcon,
  UserCheckIcon,
  UserXIcon,
  RadioIcon,
  ZapIcon
} from "lucide-react";

const ActionButtons = memo(({ 
  match, 
  isReporter, 
  isParticipant, 
  onShowReport, 
  onConfirm, 
  onShowDispute,
  onMarkReady,
  onMarkNotReady,
  onConfirmActive,  // New prop
  isConfirming,
  isDisputing,
  isMarkingReady,
  isMarkingNotReady,
  isConfirmingActive,  // New prop
  readyStatus,
  user
}) => {
  if (!isParticipant) return null;

  // Helper function for button classes
  const getButtonClasses = (color, isLoading = false, fullWidth = false) => `
    flex items-center justify-center gap-3 
    font-medium py-3 px-6 rounded-xl 
    transition-all duration-200 ease-out
    focus:outline-none focus:ring-4 focus:ring-opacity-50
    disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none
    text-sm sm:text-base min-h-[52px]
    ${fullWidth ? 'w-full' : 'flex-1'}
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
      color === 'yellow' ?
        'bg-yellow-600 hover:bg-yellow-700 text-gray-900 dark:text-white focus:ring-yellow-600' :
      color === 'purple' ?
        'bg-purple-600 hover:bg-purple-700 text-gray-900 dark:text-white focus:ring-purple-600' :
      color === 'orange' ?
        'bg-orange-600 hover:bg-orange-700 text-gray-900 dark:text-white focus:ring-orange-600' :
      'bg-gray-600 hover:bg-gray-700 text-gray-900 dark:text-white focus:ring-gray-600'
    }
  `;

  const getLoadingContent = (text) => (
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

  // Determine current user's status
  const currentUserId = user?.id; // You'll need to pass user prop or get from context
  const isCurrentUserReady = currentUserId === match.participant1?.user?.id 
    ? readyStatus?.participant1Ready 
    : readyStatus?.participant2Ready;
  
  const isCurrentUserActiveConfirmed = currentUserId === match.participant1?.user?.id 
    ? readyStatus?.participant1ActiveConfirmed 
    : readyStatus?.participant2ActiveConfirmed;
  
  const opponentReady = currentUserId === match.participant1?.user?.id 
    ? readyStatus?.participant2Ready 
    : readyStatus?.participant1Ready;
  
  const opponentActiveConfirmed = currentUserId === match.participant1?.user?.id 
    ? readyStatus?.participant2ActiveConfirmed 
    : readyStatus?.participant1ActiveConfirmed;

  const totalReady = readyStatus?.totalReady || 0;
  const totalActiveConfirmed = readyStatus?.totalActiveConfirmed || 0;
  const required = 2;
  const isLive = match.status === 'live';
  const handshakeStatus = readyStatus?.handshakeStatus || 'waiting';
  const handshakeCompleted = readyStatus?.handshakeCompleted || false;

  // Determine which phase we're in
  const isPhase1Ready = handshakeStatus === 'one_ready' || handshakeStatus === 'both_ready';
  const isPhase2Active = handshakeStatus === 'both_ready' && !handshakeCompleted;
  const isPhase3Live = handshakeCompleted || isLive;

  return (
    <div className="p-4 pt-0">
      <div className="flex flex-col sm:flex-row gap-3">
        {/* SCHEDULED STATE - Enhanced handshake flow */}
        {match.status === 'scheduled' && (
          <div className="w-full">
            {/* Handshake Status Banner */}
            <div className="mb-4 p-4 bg-gradient-to-r from-blue-900/20 to-purple-900/20 border border-blue-500/30 rounded-xl">
              {/* Phase Indicators */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  {isPhase3Live ? (
                    <>
                      <PlayCircleIcon className="h-5 w-5 text-green-500 animate-pulse" />
                      <span className="text-sm font-medium text-green-500">
                        Match is Live!
                      </span>
                    </>
                  ) : isPhase2Active ? (
                    <>
                      <ZapIcon className="h-5 w-5 text-orange-500 animate-pulse" />
                      <span className="text-sm font-medium text-orange-500">
                        Confirm Active to Start
                      </span>
                    </>
                  ) : isPhase1Ready ? (
                    <>
                      <RadioIcon className="h-5 w-5 text-blue-400 animate-pulse" />
                      <span className="text-sm font-medium text-blue-400">
                        {opponentReady ? 'Both Ready!' : 'Waiting for Opponent'}
                      </span>
                    </>
                  ) : (
                    <>
                      <ClockIcon className="h-5 w-5 text-gray-400" />
                      <span className="text-sm font-medium text-gray-400">
                        Waiting for players
                      </span>
                    </>
                  )}
                </div>
                <div className="text-xs text-gray-400">
                  {isPhase2Active 
                    ? `${totalActiveConfirmed}/${required} active` 
                    : `${totalReady}/${required} ready`
                  }
                </div>
              </div>
              
              {/* Progress indicators */}
              <div className="space-y-2">
                {/* Ready Progress */}
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-400">Ready Status</span>
                  <span className="font-medium">
                    {isCurrentUserReady ? '✓ You' : 'You'} • {opponentReady ? '✓ Opponent' : 'Opponent'}
                  </span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-2">
                  <div 
                    className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${(totalReady / required) * 100}%` }}
                  />
                </div>
                
                {/* Active Progress (shown in phase 2) */}
                {isPhase2Active && (
                  <>
                    <div className="flex items-center justify-between text-xs mt-3">
                      <span className="text-gray-400">Active Confirmation</span>
                      <span className="font-medium">
                        {isCurrentUserActiveConfirmed ? '✓ You' : 'You'} • {opponentActiveConfirmed ? '✓ Opponent' : 'Opponent'}
                      </span>
                    </div>
                    <div className="w-full bg-gray-700 rounded-full h-2">
                      <div 
                        className="bg-orange-500 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${(totalActiveConfirmed / required) * 100}%` }}
                      />
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Action Buttons - Dynamic based on phase */}
            <div className="flex flex-col sm:flex-row gap-3">
              {/* PHASE 1: Ready Button */}
              {!isCurrentUserReady && (
                <button
                  onClick={onMarkReady}
                  disabled={isMarkingReady}
                  className={getButtonClasses('green', isMarkingReady, true)}
                  aria-label="Mark yourself as ready"
                >
                  {getButtonContent(
                    isMarkingReady ? 'Marking Ready...' : 'I\'m Ready to Play',
                    <UserCheckIcon className="h-5 w-5" />,
                    isMarkingReady
                  )}
                </button>
              )}

              {/* PHASE 1: Not Ready Button (if already ready) */}
              {isCurrentUserReady && !isPhase2Active && (
                <button
                  onClick={onMarkNotReady}
                  disabled={isMarkingNotReady}
                  className={getButtonClasses('yellow', isMarkingNotReady, true)}
                  aria-label="Mark yourself as not ready"
                >
                  {getButtonContent(
                    isMarkingNotReady ? 'Marking Not Ready...' : 'Not Ready Anymore',
                    <UserXIcon className="h-5 w-5" />,
                    isMarkingNotReady
                  )}
                </button>
              )}

              {/* PHASE 2: Confirm Active Button */}
              {isPhase2Active && !isCurrentUserActiveConfirmed && (
                <button
                  onClick={onConfirmActive}
                  disabled={isConfirmingActive}
                  className={getButtonClasses('orange', isConfirmingActive, true)}
                  aria-label="Confirm you are active and ready to start"
                >
                  {getButtonContent(
                    isConfirmingActive ? 'Confirming...' : 'Confirm Active & Start',
                    <ZapIcon className="h-5 w-5" />,
                    isConfirmingActive
                  )}
                </button>
              )}

              {/* PHASE 2: Active Confirmed (waiting for opponent) */}
              {isPhase2Active && isCurrentUserActiveConfirmed && (
                <div className="w-full text-center p-4 bg-gradient-to-r from-orange-900/20 to-yellow-900/20 border border-orange-500/30 rounded-xl">
                  <div className="flex items-center justify-center gap-2">
                    <CheckIcon className="h-5 w-5 text-green-500" />
                    <span className="text-sm font-medium text-green-500">
                      You're confirmed! Waiting for opponent...
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 mt-1">
                    Match will start when opponent confirms
                  </p>
                </div>
              )}

              {/* Report Score Button (only when match is live) */}
              {isPhase3Live && (
                <button
                  onClick={onShowReport}
                  className={getButtonClasses('blue', false, true)}
                  aria-label="Report match score"
                >
                  {getButtonContent(
                    'Report Final Score',
                    <FlagIcon className="h-5 w-5" />,
                    false
                  )}
                </button>
              )}
            </div>
          </div>
        )}

        {/* LIVE STATE - Report Score Only */}
        {match.status === 'live' && (
          <div className="w-full">
            <button
              onClick={onShowReport}
              className={getButtonClasses('blue', false, true)}
              aria-label="Report match score"
            >
              {getButtonContent(
                'Report Final Score',
                <FlagIcon className="h-5 w-5" />,
                false
              )}
            </button>
          </div>
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

      {match.status === 'scheduled' && !isLive && (
        <div className="mt-3 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
          <p className="text-xs text-blue-300 text-center">
            {!isCurrentUserReady ? (
              <><strong>Ready to play?</strong> Click "I'm Ready to Play" when you're prepared. Your opponent will be notified.</>
            ) : isPhase2Active ? (
              <><strong>Almost there!</strong> Click "Confirm Active & Start" when you're ready. Match will start when both confirm.</>
            ) : (
              <><strong>Waiting for opponent...</strong> They'll be notified you're ready.</>
            )}
          </p>
        </div>
      )}

    </div>
  );
});

// Add display name for better debugging
ActionButtons.displayName = 'ActionButtons';

export default ActionButtons;