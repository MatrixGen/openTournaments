import { useCallback } from 'react';
import { PhotoIcon, XCircleIcon, FlagIcon } from '@heroicons/react/24/outline';
import { ModalWrapper } from '../common/ModalWrapper';
import FileUploadSection from './FileUploadSection';

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
    if (score.player1_score === score.player2_score) {
      return;
    }
    onReport(score);
  }, [score, onReport]);

  return (
    <ModalWrapper
      show={show}
      onClose={onClose}
      title="Report Score"
      icon={FlagIcon}
      maxWidth="md"
    >
      <div className="space-y-4">
        {/* Score Inputs */}
        <div className="grid grid-cols-2 gap-3 sm:gap-4">
          <div>
            <label className="block text-gray-600 dark:text-gray-400 text-sm font-medium mb-2">
              Your Score
            </label>
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
              className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 py-2.5 px-3 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm sm:text-base placeholder-gray-500 dark:placeholder-gray-400"
              placeholder="0"
            />
          </div>
          <div>
            <label className="block text-gray-600 dark:text-gray-400 text-sm font-medium mb-2">
              Opponent Score
            </label>
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
              className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 py-2.5 px-3 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm sm:text-base placeholder-gray-500 dark:placeholder-gray-400"
              placeholder="0"
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
          <div className="rounded-lg bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 py-2.5 px-3 text-sm text-red-700 dark:text-red-300 flex items-start gap-2">
            <XCircleIcon className="h-4 w-4 flex-shrink-0 mt-0.5" />
            <span className="flex-1">
              {error || 'Scores cannot be equal. There must be a winner.'}
            </span>
          </div>
        )}

        {/* Info Message */}
        <div className="rounded-lg bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 py-2.5 px-3 text-sm text-blue-700 dark:text-blue-300">
          <p className="font-medium mb-1">Important:</p>
          <p className="text-xs opacity-90">
            Please provide evidence (screenshot or video URL) to support your score report. 
            Both players must confirm the score or dispute it if incorrect.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <button
            onClick={handleSubmit}
            disabled={isReporting || score.player1_score === score.player2_score}
            className="flex-1 flex items-center justify-center gap-2 bg-primary-500 hover:bg-primary-600 text-white font-medium py-2.5 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800"
          >
            {isReporting ? (
              <>
                <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Reporting...
              </>
            ) : (
              'Submit Score'
            )}
          </button>
          <button
            onClick={onClose}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 font-medium py-2.5 px-4 rounded-lg transition-colors shadow-sm hover:shadow focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800"
          >
            Cancel
          </button>
        </div>
      </div>
    </ModalWrapper>
  );
};