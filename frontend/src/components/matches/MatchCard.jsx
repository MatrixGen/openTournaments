import { useState, useEffect, useMemo, useCallback, memo } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import {
  CheckCircleIcon,
  FlagIcon,
  ExclamationTriangleIcon,
  TrophyIcon,
  ClockIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import { ParticipantCard } from './ParticipantCard';
import { ReportModal } from './ReportModal';
import { DisputeModal } from './DisputeModal';
import { matchService } from '../../services/matchService';
import Banner from '../../components/common/Banner';
import LoadingSpinner from '../../components/common/LoadingSpinner';

// Memoized status configuration to prevent recreation
const STATUS_CONFIG = {
  scheduled: { color: 'bg-blue-500/20 text-blue-300 border-blue-500/30', icon: ClockIcon, label: 'Scheduled' },
  reported: { color: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30', icon: ExclamationTriangleIcon, label: 'Reported' },
  completed: { color: 'bg-green-500/20 text-green-300 border-green-500/30', icon: CheckCircleIcon, label: 'Completed' },
  disputed: { color: 'bg-red-500/20 text-red-300 border-red-500/30', icon: FlagIcon, label: 'Disputed' },
  awaiting_confirmation: { color: 'bg-orange-500/20 text-orange-300 border-orange-500/30', icon: ExclamationTriangleIcon, label: 'Awaiting Confirmation' },
};

// Simple sub-components defined inline
const MatchHeader = memo(({ match, statusConfig, timeRemaining }) => {
  const getCountdownColor = () => {
    if (!timeRemaining) return 'text-gray-400';
    if (timeRemaining < 300000) return 'text-red-400';
    if (timeRemaining < 600000) return 'text-yellow-400';
    return 'text-green-400';
  };

  const formatTimeRemaining = () => {
    if (!timeRemaining) return null;
    const minutes = Math.floor(timeRemaining / 60000);
    const seconds = Math.floor((timeRemaining % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className="p-4 sm:p-6 border-b border-neutral-700 flex justify-between items-center">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white truncate">Match #{match.id}</h3>
        <p className="text-gray-400 text-sm mt-1">
          Round {match.round_number} • Match {match.match_order}
        </p>
      </div>
      <div className="flex items-center space-x-2">
        {timeRemaining && (
          <span className={`text-sm font-medium ${getCountdownColor()}`}>
            {formatTimeRemaining()}
          </span>
        )}
        <span className={`px-2 py-1 rounded text-xs font-medium ${statusConfig.color}`}>
          {statusConfig.label}
        </span>
      </div>
    </div>
  );
});

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
            className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-gray-900 dark:text-white font-medium py-2.5 px-4 rounded-lg transition-colors flex-1 text-sm sm:text-base"
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
              className="flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-gray-900 dark:text-white font-medium py-2.5 px-4 rounded-lg transition-colors disabled:opacity-50 flex-1 text-sm sm:text-base"
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
              className="flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-gray-900 dark:text-white font-medium py-2.5 px-4 rounded-lg transition-colors disabled:opacity-50 flex-1 text-sm sm:text-base"
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
              dismissible={true}
            />
          </div>
        )}
      </div>
    </div>
  );
});

export default function MatchCard({ match, onUpdate }) {
  const { user } = useAuth();
  console.log(user);
  
  // Memoized permissions to prevent recalculation
  const { isPlayer1, isPlayer2, isParticipant, isReporter } = useMemo(() => ({
    isPlayer1: user && match.participant1?.user_id === user.id,
    isPlayer2: user && match.participant2?.user_id === user.id,
    isParticipant: (user && match.participant1?.user_id === user.id) || (user && match.participant2?.user_id === user.id),
    isReporter: user && match.reported_by_user_id === user.id,
  }), [user, match.participant1?.user_id, match.participant2?.user_id, match.reported_by_user_id]);

  // State
  const [score, setScore] = useState({
    player1_score: match.participant1_score || 0,
    player2_score: match.participant2_score || 0,
    evidence_file: null,
    evidence_url: ''
  });
  const [disputeReason, setDisputeReason] = useState('');
  const [showReportModal, setShowReportModal] = useState(false);
  const [showDisputeModal, setShowDisputeModal] = useState(false);
  const [isReporting, setIsReporting] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [isDisputing, setIsDisputing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [timeRemaining, setTimeRemaining] = useState(null);

  // Memoized status config and message
  const statusConfig = useMemo(() => 
    STATUS_CONFIG[match.status] || STATUS_CONFIG.scheduled, 
    [match.status]
  );

  const statusMessage = useMemo(() => {
    if (match.status === 'awaiting_confirmation') {
      return isReporter ? 'Waiting for opponent confirmation' : 'Opponent reported score. Please confirm or dispute';
    }
    return null;
  }, [match.status, isReporter]);

  // FIXED: Countdown Timer for Auto-confirm - prevent infinite loops
  useEffect(() => {
    if (match.status === 'awaiting_confirmation' && match.auto_confirm_at) {
      const updateTimer = () => {
        const now = Date.now();
        const autoConfirmAt = new Date(match.auto_confirm_at).getTime();
        const remaining = autoConfirmAt - now;

        if (remaining <= 0) {
          setTimeRemaining(null);
          // Don't call onUpdate here to prevent loops
          // The parent component should handle auto-confirm logic
        } else {
          setTimeRemaining(remaining);
        }
      };

      updateTimer();
      const interval = setInterval(updateTimer, 1000);
      return () => clearInterval(interval);
    } else {
      setTimeRemaining(null);
    }
  }, [match.status, match.auto_confirm_at]); // Removed onUpdate from dependencies

  // Reset forms with useCallback
  const resetForms = useCallback(() => {
    setScore({ 
      player1_score: match.participant1_score || 0, 
      player2_score: match.participant2_score || 0, 
      evidence_file: null, 
      evidence_url: '' 
    });
    setDisputeReason('');
    setError('');
    setSuccess('');
  }, [match.participant1_score, match.participant2_score]);

  // Event handlers with useCallback
  const handleReportScore = useCallback(async () => {
    setIsReporting(true);
    setError('');
    setSuccess('');

    try {
      await matchService.reportScore(match.id, score);
      setSuccess('Score reported successfully. Waiting for opponent confirmation.');
      setShowReportModal(false);
      resetForms();
      onUpdate(); // This is okay as it's user-triggered
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to report score.');
    } finally {
      setIsReporting(false);
    }
  }, [match.id, score, onUpdate, resetForms]);

  const handleConfirmScore = useCallback(async () => {
    setIsConfirming(true);
    setError('');
    setSuccess('');

    try {
      await matchService.confirmScore(match.id);
      setSuccess('Score confirmed successfully. Match completed.');
      onUpdate(); // This is okay as it's user-triggered
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to confirm score.');
    } finally {
      setIsConfirming(false);
    }
  }, [match.id, onUpdate]);

  const handleDispute = useCallback(async () => {
    if (!disputeReason.trim()) {
      setError('Please provide a reason for disputing the score.');
      return;
    }

    setIsDisputing(true);
    setError('');
    setSuccess('');

    try {
      await matchService.dispute(match.id, { reason: disputeReason, evidence_url: '' });
      setSuccess('Dispute raised successfully. Admins will review it.');
      setShowDisputeModal(false);
      resetForms();
      onUpdate(); // This is okay as it's user-triggered
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to raise dispute.');
    } finally {
      setIsDisputing(false);
    }
  }, [match.id, disputeReason, onUpdate, resetForms]);

  const handleShowReport = useCallback(() => setShowReportModal(true), []);
  const handleShowDispute = useCallback(() => setShowDisputeModal(true), []);
  
  const handleCloseReport = useCallback(() => {
    setShowReportModal(false);
    resetForms();
  }, [resetForms]);

  const handleCloseDispute = useCallback(() => {
    setShowDisputeModal(false);
    resetForms();
  }, [resetForms]);

  const clearError = useCallback(() => setError(''), []);
  const clearSuccess = useCallback(() => setSuccess(''), []);

  // Determine which banners to show
  const showAutoConfirmBanner = timeRemaining && timeRemaining < 600000;
  const showHelpBanner = isParticipant && match.status !== 'completed';

  return (
    <>
      {/* Modals */}
      <ReportModal
        show={showReportModal}
        onClose={handleCloseReport}
        onReport={handleReportScore}
        score={score}
        onScoreChange={setScore}
        isReporting={isReporting}
        error={error}
        isPlayer1={isPlayer1}
      />

      <DisputeModal
        show={showDisputeModal}
        onClose={handleCloseDispute}
        onDispute={handleDispute}
        disputeReason={disputeReason}
        onDisputeReasonChange={setDisputeReason}
        isDisputing={isDisputing}
        error={error}
      />

      {/* Match Card */}
      <div className="bg-neutral-800 rounded-xl shadow-lg border border-neutral-700 hover:border-neutral-600 transition-all duration-200 w-full">
        {/* Header */}
        <MatchHeader
          match={match} 
          statusConfig={statusConfig} 
          timeRemaining={timeRemaining} 
        />

        {/* Status Banner */}
        {statusMessage && (
          <Banner
            type="warning"
            title="Action Required"
            message={statusMessage}
            dismissible={true}
            className="mx-4 mt-4 mb-0"
          />
        )}

        {/* Success Banner */}
        {success && (
          <Banner
            type="success"
            title="Success!"
            autoDismiss={true}
            message={success}
            onClose={clearSuccess}
            className="mx-4 mt-4 mb-0"
          />
        )}

        {/* Error Banner */}
        {error && (
          <Banner
            type="error"
            title="Action Failed"
            message={error}
            autoDismiss={true}
            onClose={clearError}
            className="mx-4 mt-4 mb-0"
          />
        )}

        {/* Participants */}
        <ParticipantsSection
          match={match} 
          isPlayer1={isPlayer1} 
          isPlayer2={isPlayer2} 
        />

        {/* Match Info Banner */}
        {match.status === 'scheduled' && isParticipant && (
          <Banner
            type="info"
            message="Report your score as soon as the match is completed. Both players should agree on the result."
            className="mx-4 mb-4"
            dismissible={true}
          />
        )}

        {/* Auto-Confirm Countdown Banner */}
        {showAutoConfirmBanner && (
          <Banner
            type="warning"
            title="Auto-Confirm Soon"
            message={`Score will auto-confirm in ${Math.floor(timeRemaining / 60000)}:${Math.floor((timeRemaining % 60000) / 1000).toString().padStart(2, '0')}. Make sure to review the reported score.`}
            className="mx-4 mb-4"
          />
        )}

        {/* Dispute Info Banner */}
        {match.status === 'disputed' && (
          <Banner
            type="error"
            title="Match Under Dispute"
            message="This match is currently being reviewed by tournament administrators. Please wait for resolution."
            className="mx-4 mb-4"
            autoDismiss={true}
          />
        )}

        {/* Completed Match Banner */}
        {match.status === 'completed' && (
          <Banner
            type="success"
            title="Match Completed"
            message="This match has been completed and the results are final."
            className="mx-4 mb-4"
            dismissible={true}
          />
        )}

        {/* Actions */}
        <ActionButtons
          match={match}
          isReporter={isReporter}
          isParticipant={isParticipant}
          onShowReport={handleShowReport}
          onConfirm={handleConfirmScore}
          onShowDispute={handleShowDispute}
          isConfirming={isConfirming}
          isDisputing={isDisputing}
        />

      </div>
    </>
  );
}