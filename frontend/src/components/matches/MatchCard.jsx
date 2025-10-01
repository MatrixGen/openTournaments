import { useState, useMemo, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import {
  CheckCircleIcon,
  FlagIcon,
  ExclamationTriangleIcon,
  TrophyIcon,
  ClockIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import { useMatchPermissions } from '../../hooks/useMatchPermissions';
import { useMatchActions } from '../../hooks/useMatchActions';
import { ParticipantCard } from './ParticipantCard';
import { ReportModal } from './ReportModal';
import { DisputeModal } from './DisputeModal';

// Status configuration constants
const STATUS_CONFIG = {
  scheduled: { 
    color: 'bg-blue-500/20 text-blue-300 border-blue-500/30', 
    icon: ClockIcon,
    label: 'Scheduled'
  },
  reported: { 
    color: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30', 
    icon: ExclamationTriangleIcon,
    label: 'Reported'
  },
  completed: { 
    color: 'bg-green-500/20 text-green-300 border-green-500/30', 
    icon: CheckCircleIcon,
    label: 'Completed'
  },
  disputed: { 
    color: 'bg-red-500/20 text-red-300 border-red-500/30', 
    icon: FlagIcon,
    label: 'Disputed'
  },
  awaiting_confirmation: { 
    color: 'bg-orange-500/20 text-orange-300 border-orange-500/30', 
    icon: ExclamationTriangleIcon,
    label: 'Awaiting Confirmation'
  }
};

export default function MatchCard({ match, onUpdate }) {
  const [showReportModal, setShowReportModal] = useState(false);
  const [showDisputeModal, setShowDisputeModal] = useState(false);
  const [score, setScore] = useState({
    player1_score: match.participant1_score || 0,
    player2_score: match.participant2_score || 0,
    evidence_url: ''
  });
  const [disputeReason, setDisputeReason] = useState('');

  const { user } = useAuth();
  const permissions = useMatchPermissions(match);
  const actions = useMatchActions(match, onUpdate);

  // Memoized status configuration
  const statusConfig = useMemo(() => 
    STATUS_CONFIG[match.status] || STATUS_CONFIG.scheduled, 
    [match.status]
  );
  const StatusIcon = statusConfig.icon;

  // Memoized status message
  const statusMessage = useMemo(() => {
    if (match.status === 'reported' || match.status === 'awaiting_confirmation') {
      return permissions.isReporter
        ? 'Waiting for opponent confirmation'
        : 'Opponent reported score. Please confirm or dispute';
    }
    return null;
  }, [match.status, permissions.isReporter]);

  // Action handlers
  const handleReportScore = useCallback(async () => {
    const success = await actions.handleReportScore(score);
    if (success) {
      setShowReportModal(false);
      setScore({ player1_score: 0, player2_score: 0, evidence_url: '' });
    }
  }, [actions, score]);

  const handleDispute = useCallback(async () => {
    if (!disputeReason.trim()) {
      actions.setError('Please provide a reason for disputing the score.');
      return;
    }

    const success = await actions.handleDispute({
      reason: disputeReason,
      evidence_url: ''
    });
    
    if (success) {
      setShowDisputeModal(false);
      setDisputeReason('');
    }
  }, [actions, disputeReason]);

  const resetForms = useCallback(() => {
    setScore({ player1_score: 0, player2_score: 0, evidence_url: '' });
    setDisputeReason('');
    actions.clearMessages();
  }, [actions]);

  const handleCloseReportModal = useCallback(() => {
    setShowReportModal(false);
    resetForms();
  }, [resetForms]);

  const handleCloseDisputeModal = useCallback(() => {
    setShowDisputeModal(false);
    resetForms();
  }, [resetForms]);

  return (
    <>
      {/* Modals */}
      <ReportModal
        show={showReportModal}
        onClose={handleCloseReportModal}
        onReport={handleReportScore}
        score={score}
        onScoreChange={setScore}
        isReporting={actions.isReporting}
        error={actions.error}
        isPlayer1={permissions.isPlayer1}
      />

      <DisputeModal
        show={showDisputeModal}
        onClose={handleCloseDisputeModal}
        onDispute={handleDispute}
        disputeReason={disputeReason}
        onDisputeReasonChange={setDisputeReason}
        isDisputing={actions.isDisputing}
        error={actions.error}
      />

      {/* Match Card */}
      <div className="bg-neutral-800 rounded-xl shadow-lg border border-neutral-700 hover:border-neutral-600 transition-all duration-200 w-full">
        {/* Header */}
        <div className="p-4 sm:p-6 border-b border-neutral-700">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
            <div className="flex items-center gap-3">
              <div className="bg-primary-500/20 p-2 rounded-lg">
                <TrophyIcon className="h-5 w-5 text-primary-400" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-lg font-semibold text-white truncate">Match #{match.id}</h3>
                <p className="text-gray-400 text-sm mt-1">
                  Round {match.round_number} • Match {match.match_order}
                </p>
              </div>
            </div>
            <span className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium border ${statusConfig.color} flex-shrink-0`}>
              <StatusIcon className="h-3 w-3" />
              {statusConfig.label}
            </span>
          </div>

          {/* Status Message */}
          {statusMessage && (
            <div className="flex items-center gap-2 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg text-sm text-yellow-300">
              <ExclamationTriangleIcon className="h-4 w-4 flex-shrink-0" />
              <span className="text-xs sm:text-sm break-words">{statusMessage}</span>
            </div>
          )}
        </div>

        {/* Participants */}
        <div className="p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row items-stretch gap-4 mb-6">
            {/* Player 1 */}
            <div className="flex-1 min-w-0">
              <ParticipantCard
                participant={match.participant1}
                score={match.participant1_score}
                isWinner={match.winner_id === match.participant1?.user_id}
                isCurrentUser={permissions.isPlayer1}
              />
            </div>

            {/* VS Separator */}
            <div className="flex items-center justify-center py-2 sm:py-0 sm:px-4">
              <div className="flex items-center gap-2 sm:flex-col sm:gap-1">
                <div className="h-px w-8 bg-neutral-600 sm:h-8 sm:w-px"></div>
                <div className="inline-flex items-center justify-center w-8 h-8 bg-neutral-700 rounded-full flex-shrink-0">
                  <span className="text-gray-400 font-bold text-xs">VS</span>
                </div>
                <div className="h-px w-8 bg-neutral-600 sm:h-8 sm:w-px"></div>
              </div>
            </div>

            {/* Player 2 */}
            <div className="flex-1 min-w-0">
              <ParticipantCard
                participant={match.participant2}
                score={match.participant2_score}
                isWinner={match.winner_id === match.participant2?.user_id}
                isCurrentUser={permissions.isPlayer2}
              />
            </div>
          </div>

          {/* Success Message */}
          {actions.success && (
            <div className="mb-4 rounded-lg bg-green-800/50 border border-green-600/50 py-3 px-4 text-sm text-green-200 flex items-center gap-2">
              <CheckCircleIcon className="h-4 w-4 flex-shrink-0" />
              <span className="break-words">{actions.success}</span>
            </div>
          )}

          {/* Actions */}
          {permissions.isParticipant && (
            <div className="flex flex-col sm:flex-row gap-2">
              {permissions.canReport && (
                <button
                  onClick={() => setShowReportModal(true)}
                  className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 px-4 rounded-lg transition-colors flex-1 min-w-0 text-sm sm:text-base"
                >
                  <FlagIcon className="h-4 w-4 flex-shrink-0" />
                  <span className="truncate">Report Score</span>
                </button>
              )}

              {permissions.canConfirm && (
                <>
                  <button
                    onClick={actions.handleConfirmScore}
                    disabled={actions.isConfirming}
                    className="flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white font-medium py-2.5 px-4 rounded-lg transition-colors disabled:opacity-50 flex-1 min-w-0 text-sm sm:text-base"
                  >
                    <CheckCircleIcon className="h-4 w-4 flex-shrink-0" />
                    <span className="truncate">
                      {actions.isConfirming ? 'Confirming...' : 'Confirm Score'}
                    </span>
                  </button>
                  <button
                    onClick={() => setShowDisputeModal(true)}
                    className="flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white font-medium py-2.5 px-4 rounded-lg transition-colors flex-1 min-w-0 text-sm sm:text-base"
                  >
                    <ExclamationTriangleIcon className="h-4 w-4 flex-shrink-0" />
                    <span className="truncate">Dispute Score</span>
                  </button>
                </>
              )}

              {match.status === 'disputed' && (
                <span className="inline-flex items-center justify-center gap-2 px-3 py-2 bg-red-600/20 text-red-300 text-sm rounded-lg border border-red-500/30 text-center">
                  <FlagIcon className="h-4 w-4 flex-shrink-0" />
                  <span className="break-words">Under Dispute - Awaiting Admin Review</span>
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}