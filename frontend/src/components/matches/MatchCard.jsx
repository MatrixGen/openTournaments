import { useState } from 'react';
import { matchService } from '../../services/matchService';
import { useAuth } from '../../contexts/AuthContext';

export default function MatchCard({ match, onUpdate }) {
  const [isReporting, setIsReporting] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [isDisputing, setIsDisputing] = useState(false);
  const [showReportForm, setShowReportForm] = useState(false);
  const [showDisputeForm, setShowDisputeForm] = useState(false);
  const [score, setScore] = useState({
    player1_score: match.participant1_score || 0,
    player2_score: match.participant2_score || 0,
    evidence_url: ''
  });
  const [disputeReason, setDisputeReason] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const { user } = useAuth();

  const isPlayer1 = user && match.participant1?.user_id === user.id;
  const isPlayer2 = user && match.participant2?.user_id === user.id;
  const isParticipant = isPlayer1 || isPlayer2;
  const isReporter = user && match.reported_by_user_id === user.id;

  const canReport = () =>
    isParticipant && match.status === 'scheduled';

  const canConfirm = () =>
    isParticipant && match.status === 'awaiting_confirmation' && !isReporter;

  const canDispute = () =>
    isParticipant && match.status === 'awaiting_confirmation' && !isReporter;

  const handleReportScore = async () => {
    setIsReporting(true);
    setError('');
    setSuccess('');

    try {
      await matchService.reportScore(match.id, {
        player1_score: score.player1_score,
        player2_score: score.player2_score,
        evidence_url: score.evidence_url
      });
      setSuccess('Score reported successfully. Waiting for opponent confirmation.');
      setShowReportForm(false);
      onUpdate();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to report score. Please try again.');
    } finally {
      setIsReporting(false);
    }
  };

  const handleConfirmScore = async () => {
    setIsConfirming(true);
    setError('');
    setSuccess('');

    try {
      await matchService.confirmScore(match.id);
      setSuccess('Score confirmed successfully. Match completed.');
      onUpdate();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to confirm score. Please try again.');
    } finally {
      setIsConfirming(false);
    }
  };

  const handleDispute = async () => {
    setIsDisputing(true);
    setError('');
    setSuccess('');

    try {
      await matchService.dispute(match.id, {
        reason: disputeReason,
        evidence_url: '' // placeholder for later evidence upload
      });
      setSuccess('Dispute raised successfully. Admins will review it.');
      setShowDisputeForm(false);
      onUpdate();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to raise dispute. Please try again.');
    } finally {
      setIsDisputing(false);
    }
  };

  const getStatusMessage = () => {
    if (match.status === 'reported') {
      return isReporter
        ? 'Waiting for opponent confirmation'
        : 'Opponent reported score. Please confirm or dispute';
    }
    return null;
  };

  return (
    <div className="bg-neutral-800 rounded-lg shadow p-5 mb-5">
      {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-white">Match #{match.id}</h3>
        <span
          className={`px-3 py-1 rounded-full text-xs font-semibold capitalize
            ${match.status === 'scheduled' ? 'bg-blue-500/20 text-blue-300' :
              match.status === 'reported' ? 'bg-yellow-500/20 text-yellow-300' :
              match.status === 'completed' ? 'bg-green-500/20 text-green-300' :
              match.status === 'disputed' ? 'bg-red-500/20 text-red-300' :
              'bg-gray-500/20 text-gray-300'
            }`}
        >
          {match.status}
        </span>
      </div>

      {/* Status Message */}
      {getStatusMessage() && (
        <div className="mb-4 p-3 bg-neutral-700/50 rounded-md text-sm text-yellow-300">
          {getStatusMessage()}
        </div>
      )}

      {/* Participants */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 items-center mb-4">
        <div className="text-center bg-neutral-700/40 rounded-lg p-3">
          <p className="text-white font-medium truncate">
            {match.participant1?.user?.username || 'TBD'}
          </p>
          <p className="text-gray-400 text-sm">{match.participant1?.gamer_tag || ''}</p>
          {match.participant1_score !== null && (
            <p className="text-2xl font-bold text-white mt-1">{match.participant1_score}</p>
          )}
        </div>

        <div className="text-center text-gray-400 font-bold text-xl">VS</div>

        <div className="text-center bg-neutral-700/40 rounded-lg p-3">
          <p className="text-white font-medium truncate">
            {match.participant2?.user?.username || 'TBD'}
          </p>
          <p className="text-gray-400 text-sm">{match.participant2?.gamer_tag || ''}</p>
          {match.participant2_score !== null && (
            <p className="text-2xl font-bold text-white mt-1">{match.participant2_score}</p>
          )}
        </div>
      </div>

      {/* Alerts */}
      {error && (
        <div className="mb-3 rounded-md bg-red-800/50 py-2 px-3 text-sm text-red-200">
          {error}
        </div>
      )}
      {success && (
        <div className="mb-3 rounded-md bg-green-800/50 py-2 px-3 text-sm text-green-200">
          {success}
        </div>
      )}

      {/* Report Form */}
      {showReportForm && (
        <div className="mb-4 p-4 bg-neutral-700/50 rounded-md">
          <h4 className="text-white font-medium mb-3">Report Score</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
            <div>
              <label className="text-gray-400 text-sm">Your Score</label>
              <input
                type="number"
                min="0"
                value={isPlayer1 ? score.player1_score : score.player2_score}
                onChange={(e) =>
                  isPlayer1
                    ? setScore({ ...score, player1_score: parseInt(e.target.value) || 0 })
                    : setScore({ ...score, player2_score: parseInt(e.target.value) || 0 })
                }
                className="w-full rounded-md border border-neutral-600 bg-neutral-700 py-1 px-2 text-white"
              />
            </div>
            <div>
              <label className="text-gray-400 text-sm">Opponent Score</label>
              <input
                type="number"
                min="0"
                value={isPlayer1 ? score.player2_score : score.player1_score}
                onChange={(e) =>
                  isPlayer1
                    ? setScore({ ...score, player2_score: parseInt(e.target.value) || 0 })
                    : setScore({ ...score, player1_score: parseInt(e.target.value) || 0 })
                }
                className="w-full rounded-md border border-neutral-600 bg-neutral-700 py-1 px-2 text-white"
              />
            </div>
          </div>

          <div className="mb-3">
            <label className="text-gray-400 text-sm">Evidence URL (Screenshot/Video)</label>
            <input
              type="url"
              value={score.evidence_url}
              onChange={(e) => setScore({ ...score, evidence_url: e.target.value })}
              placeholder="https://example.com/screenshot.jpg"
              className="w-full rounded-md border border-neutral-600 bg-neutral-700 py-1 px-2 text-white"
            />
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleReportScore}
              disabled={isReporting}
              className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium py-1.5 px-4 rounded disabled:opacity-50"
            >
              {isReporting ? 'Reporting...' : 'Submit Score'}
            </button>
            <button
              onClick={() => setShowReportForm(false)}
              className="bg-gray-600 hover:bg-gray-700 text-white text-sm font-medium py-1.5 px-4 rounded"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Dispute Form */}
      {showDisputeForm && (
        <div className="mb-4 p-4 bg-neutral-700/50 rounded-md">
          <h4 className="text-white font-medium mb-3">Raise Dispute</h4>
          <textarea
            value={disputeReason}
            onChange={(e) => setDisputeReason(e.target.value)}
            placeholder="Explain why you're disputing this score..."
            rows={3}
            className="w-full rounded-md border border-neutral-600 bg-neutral-700 py-1 px-2 text-white mb-3"
          />
          <div className="flex gap-2">
            <button
              onClick={handleDispute}
              disabled={isDisputing || !disputeReason.trim()}
              className="bg-red-600 hover:bg-red-700 text-white text-sm font-medium py-1.5 px-4 rounded disabled:opacity-50"
            >
              {isDisputing ? 'Submitting...' : 'Submit Dispute'}
            </button>
            <button
              onClick={() => setShowDisputeForm(false)}
              className="bg-gray-600 hover:bg-gray-700 text-white text-sm font-medium py-1.5 px-4 rounded"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-wrap gap-2">
        {canReport() && (
          <button
            onClick={() => setShowReportForm(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium py-1.5 px-4 rounded"
          >
            Report Score
          </button>
        )}

        {canConfirm() && (
          <>
            <button
              onClick={handleConfirmScore}
              disabled={isConfirming}
              className="bg-green-600 hover:bg-green-700 text-white text-sm font-medium py-1.5 px-4 rounded disabled:opacity-50"
            >
              {isConfirming ? 'Confirming...' : 'Confirm Score'}
            </button>
            <button
              onClick={() => setShowDisputeForm(true)}
              className="bg-red-600 hover:bg-red-700 text-white text-sm font-medium py-1.5 px-4 rounded"
            >
              Dispute Score
            </button>
          </>
        )}

        {match.status === 'disputed' && (
          <span className="px-3 py-1 bg-red-600/20 text-red-300 text-xs rounded-full">
            Under Dispute
          </span>
        )}
      </div>
    </div>
  );
}
