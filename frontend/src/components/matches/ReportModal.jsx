import { useCallback } from 'react';
import { PhotoIcon, XCircleIcon, FlagIcon } from '@heroicons/react/24/outline';
import { ModalWrapper } from '../common/ModalWrapper';
import FileUploadSection from './FileUploadSection'; // Make sure this exists

export const ReportModal = ({
  show,
  onClose,
  onReport,
  score,
  onScoreChange,
  isReporting,
  error,
  isPlayer1
}) => {
  const handleSubmit = useCallback(() => {
    if (score.player1_score === score.player2_score) return;
    onReport(score);
  }, [score, onReport]);

  return (
    <ModalWrapper
      show={show}
      onClose={onClose}
      title="Report Score"
      icon={FlagIcon}
    >
      <div className="space-y-4">
        {/* Score Inputs */}
        <div className="grid grid-cols-2 gap-3 sm:gap-4">
          <div>
            <label className="block text-gray-400 text-sm mb-2">Your Score</label>
            <input
              type="number"
              min="0"
              value={isPlayer1 ? score.player1_score : score.player2_score}
              onChange={(e) => {
                const value = parseInt(e.target.value) || 0;
                if (isPlayer1) {
                  onScoreChange({ ...score, player1_score: value });
                } else {
                  onScoreChange({ ...score, player2_score: value });
                }
              }}
              className="w-full rounded-lg border border-neutral-600 bg-neutral-700 py-2 px-3 text-gray-900 dark:text-white focus:outline-none focus:border-primary-500 text-sm sm:text-base"
            />
          </div>
          <div>
            <label className="block text-gray-400 text-sm mb-2">Opponent Score</label>
            <input
              type="number"
              min="0"
              value={isPlayer1 ? score.player2_score : score.player1_score}
              onChange={(e) => {
                const value = parseInt(e.target.value) || 0;
                if (isPlayer1) {
                  onScoreChange({ ...score, player2_score: value });
                } else {
                  onScoreChange({ ...score, player1_score: value });
                }
              }}
              className="w-full rounded-lg border border-neutral-600 bg-neutral-700 py-2 px-3 text-gray-900 dark:text-white focus:outline-none focus:border-primary-500 text-sm sm:text-base"
            />
          </div>
        </div>

        {/* File / URL Upload */}
        <FileUploadSection
          onFileSelect={(file) =>
            onScoreChange({ ...score, evidence_file: file, evidence_url: '' })
          }
          onUrlChange={(url) =>
            onScoreChange({ ...score, evidence_url: url, evidence_file: null })
          }
          currentFile={score.evidence_file}
          currentUrl={score.evidence_url}
        />

        {/* Error / Validation */}
        {(error || score.player1_score === score.player2_score) && (
          <div className="rounded-lg bg-red-800/50 border border-red-600/50 py-2 px-3 text-sm text-red-200 flex items-center gap-2">
            <XCircleIcon className="h-4 w-4" />
            {error || 'Scores cannot be equal. There must be a winner.'}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <button
            onClick={handleSubmit}
            disabled={isReporting || score.player1_score === score.player2_score}
            className="flex-1 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-gray-900 dark:text-white font-medium py-2.5 px-4 rounded-lg transition-colors disabled:opacity-50 text-sm sm:text-base"
          >
            {isReporting ? 'Reporting...' : 'Submit Score'}
          </button>
          <button
            onClick={onClose}
            className="flex items-center justify-center gap-2 bg-neutral-600 hover:bg-neutral-700 text-gray-900 dark:text-white font-medium py-2.5 px-4 rounded-lg transition-colors text-sm sm:text-base"
          >
            Cancel
          </button>
        </div>
      </div>
    </ModalWrapper>
  );
};
