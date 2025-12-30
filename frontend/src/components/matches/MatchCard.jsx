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
//import LoadingSpinner from '../../components/common/LoadingSpinner';
import ActionButtons from './ActionButtons';

// Memoized status configuration with theme support
const STATUS_CONFIG = {
  scheduled: { 
    color: 'text-blue-600 dark:text-blue-400',
    bgColor: 'bg-blue-50 dark:bg-blue-900/20',
    borderColor: 'border-blue-200 dark:border-blue-800',
    icon: ClockIcon, 
    label: 'Scheduled' 
  },
  live: { 
    color: 'text-green-600 dark:text-green-400',
    bgColor: 'bg-green-50 dark:bg-green-900/20',
    borderColor: 'border-green-200 dark:border-green-800',
    icon: TrophyIcon, 
    label: 'Live' 
  },
  reported: { 
    color: 'text-amber-600 dark:text-amber-400',
    bgColor: 'bg-amber-50 dark:bg-amber-900/20',
    borderColor: 'border-amber-200 dark:border-amber-800',
    icon: ExclamationTriangleIcon, 
    label: 'Reported' 
  },
  completed: { 
    color: 'text-emerald-600 dark:text-emerald-400',
    bgColor: 'bg-emerald-50 dark:bg-emerald-900/20',
    borderColor: 'border-emerald-200 dark:border-emerald-800',
    icon: CheckCircleIcon, 
    label: 'Completed' 
  },
  disputed: { 
    color: 'text-red-600 dark:text-red-400',
    bgColor: 'bg-red-50 dark:bg-red-900/20',
    borderColor: 'border-red-200 dark:border-red-800',
    icon: FlagIcon, 
    label: 'Disputed' 
  },
  awaiting_confirmation: { 
    color: 'text-orange-600 dark:text-orange-400',
    bgColor: 'bg-orange-50 dark:bg-orange-900/20',
    borderColor: 'border-orange-200 dark:border-orange-800',
    icon: ExclamationTriangleIcon, 
    label: 'Awaiting Confirmation' 
  },
};

// Simple sub-components defined inline with theme support
const MatchHeader = memo(({ match, statusConfig, timeRemaining }) => {
  const getCountdownColor = () => {
    if (!timeRemaining) return 'text-gray-500 dark:text-gray-400';
    if (timeRemaining < 300000) return 'text-red-500 dark:text-red-400';
    if (timeRemaining < 600000) return 'text-amber-500 dark:text-amber-400';
    return 'text-green-500 dark:text-green-400';
  };

  const formatTimeRemaining = () => {
    if (!timeRemaining) return null;
    const minutes = Math.floor(timeRemaining / 60000);
    const seconds = Math.floor((timeRemaining % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className="p-4 sm:p-6 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center bg-white/50 dark:bg-gray-800/50">
      <div className="min-w-0">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 truncate">
          Match #{match.id}
        </h3>
        <p className="text-gray-500 dark:text-gray-400 text-sm mt-1 truncate">
          Round {match.round_number} • Match {match.match_order}
        </p>
      </div>
      <div className="flex items-center space-x-2 shrink-0">
        {timeRemaining && (
          <span 
            className={`text-sm font-medium ${getCountdownColor()} min-w-[55px] text-center`}
            title={`${Math.floor(timeRemaining / 60000)} minutes remaining`}
          >
            {formatTimeRemaining()}
          </span>
        )}
        <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${statusConfig.color} ${statusConfig.bgColor} border ${statusConfig.borderColor} shadow-xs`}>
          {statusConfig.label}
        </span>
      </div>
    </div>
  );
});

MatchHeader.displayName = 'MatchHeader';

const ParticipantsSection = memo(({ match, isPlayer1, isPlayer2 }) => (
  <div className="p-4 sm:p-6 flex flex-col sm:flex-row items-stretch gap-4 bg-white dark:bg-gray-800">
    <ParticipantCard
      participant={match.participant1}
      score={match.participant1_score}
      isWinner={match.winner_id === match.participant1?.user_id}
      isCurrentUser={isPlayer1}
    />
    <div className="flex items-center justify-center py-2 sm:py-0 sm:px-4">
      <div className="flex items-center gap-2 sm:flex-col sm:gap-1">
        <div className="h-px w-8 bg-gray-300 dark:bg-gray-600 sm:h-8 sm:w-px"></div>
        <div className="inline-flex items-center justify-center w-8 h-8 bg-gray-100 dark:bg-gray-700 rounded-full flex-shrink-0 border border-gray-200 dark:border-gray-600">
          <span className="text-gray-500 dark:text-gray-400 font-bold text-xs">VS</span>
        </div>
        <div className="h-px w-8 bg-gray-300 dark:bg-gray-600 sm:h-8 sm:w-px"></div>
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

ParticipantsSection.displayName = 'ParticipantsSection';

export default function MatchCard({ match, onUpdate }) {
  const { user } = useAuth();
  
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
  const [isMarkingReady, setIsMarkingReady] = useState(false);
  const [isMarkingNotReady, setIsMarkingNotReady] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [timeRemaining, setTimeRemaining] = useState(null);
  const [readyStatus, setReadyStatus] = useState({
    participant1Ready: false,
    participant2Ready: false,
    totalReady: 0,
    required: 2,
    isLive: match.status === 'live'
  });

  // Memoized status config and message
  const statusConfig = useMemo(() => 
    STATUS_CONFIG[match.status] || STATUS_CONFIG.scheduled, 
    [match.status]
  );

  const statusMessage = useMemo(() => {
    if (match.status === 'awaiting_confirmation') {
      return isReporter ? 'Waiting for opponent confirmation' : 'Opponent reported score. Please confirm or dispute';
    }
    if (match.status === 'scheduled' && isParticipant) {
      const totalReady = readyStatus.totalReady;
      if (totalReady === 0) return 'Both players need to mark themselves as ready';
      if (totalReady === 1) return 'One player is ready. Waiting for the other...';
    }
    if (match.status === 'live') {
      return 'Match is live! You can now play and report the final score.';
    }
    return null;
  }, [match.status, isReporter, isParticipant, readyStatus.totalReady]);

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
  }, [match.status, match.auto_confirm_at]);

  // Fetch ready status when match is scheduled or live
  useEffect(() => {
    const fetchReadyStatus = async () => {
      if (!isParticipant || !['scheduled', 'live'].includes(match.status)) return;
      
      try {
        const status = await matchService.getReadyStatus(match.id);
        setReadyStatus(status);
        
        // If match status doesn't match ready status, trigger update
        if (status.isLive && match.status !== 'live') {
          onUpdate();
        }
      } catch (err) {
        console.error('Failed to fetch ready status:', err);
      }
    };

    fetchReadyStatus();
    // Poll every 5 seconds for live updates
    const interval = setInterval(fetchReadyStatus, 5000);
    return () => clearInterval(interval);
  }, [match.id, match.status, isParticipant, onUpdate]);

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
      onUpdate();
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
      onUpdate();
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
      onUpdate(); 
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to raise dispute.');
    } finally {
      setIsDisputing(false);
    }
  }, [match.id, disputeReason, onUpdate, resetForms]);

  // New handlers for ready status
  const handleMarkReady = useCallback(async () => {
    setIsMarkingReady(true);
    setError('');
    
    try {
      const result = await matchService.markReady(match.id);
      setReadyStatus(result.readyStatus);
      setSuccess(result.message);
      
      // If match went live, trigger update
      if (result.readyStatus.isLive && match.status !== 'live') {
        onUpdate();
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to mark as ready.');
    } finally {
      setIsMarkingReady(false);
    }
  }, [match.id, match.status, onUpdate]);

  const handleMarkNotReady = useCallback(async () => {
    setIsMarkingNotReady(true);
    setError('');
    
    try {
      const result = await matchService.markNotReady(match.id);
      setReadyStatus(prev => ({ ...prev, isLive: false }));
      setSuccess(result.message);
      
      // If match status was live, trigger update
      if (match.status === 'live') {
        onUpdate();
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to mark as not ready.');
    } finally {
      setIsMarkingNotReady(false);
    }
  }, [match.id, match.status, onUpdate]);

  const handleShowReport = useCallback(() => {
    // Prevent showing report modal if match isn't live
    if (match.status !== 'live') {
      setError('Match must be live before reporting scores. Both players must be ready.');
      return;
    }
    setShowReportModal(true);
  }, [match.status]);

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
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md dark:shadow-gray-900/50 border border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 transition-all duration-200 w-full overflow-hidden">
        {/* Header */}
        <MatchHeader
          match={match} 
          statusConfig={statusConfig} 
          timeRemaining={timeRemaining} 
        />

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

        {/* Status Message */}
        {statusMessage && (
          <div className="px-4 sm:px-6 pb-4">
            <div className="bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-lg p-3">
              <p className="text-sm text-gray-600 dark:text-gray-300 text-center">
                {statusMessage}
              </p>
            </div>
          </div>
        )}

        {/* Actions */}
        <ActionButtons
          match={match}
          isReporter={isReporter}
          isParticipant={isParticipant}
          onShowReport={handleShowReport}
          onConfirm={handleConfirmScore}
          onShowDispute={handleShowDispute}
          onMarkReady={handleMarkReady}
          onMarkNotReady={handleMarkNotReady}
          isConfirming={isConfirming}
          isDisputing={isDisputing}
          isMarkingReady={isMarkingReady}
          isMarkingNotReady={isMarkingNotReady}
          readyStatus={readyStatus}
        />
      </div>
    </>
  );
}