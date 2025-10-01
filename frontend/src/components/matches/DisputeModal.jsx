import { XCircleIcon,ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { ModalWrapper } from '../common/ModalWrapper';

export const DisputeModal = ({ 
  show, 
  onClose, 
  onDispute, 
  disputeReason, 
  onDisputeReasonChange, 
  isDisputing, 
  error 
}) => (
  <ModalWrapper 
    show={show} 
    onClose={onClose}
    title="Raise Dispute"
    icon={ExclamationTriangleIcon}
  >
    <div className="space-y-4">
      <div>
        <label className="block text-gray-400 text-sm mb-2">
          Why are you disputing this score?
        </label>
        <textarea
          value={disputeReason}
          onChange={(e) => onDisputeReasonChange(e.target.value)}
          placeholder="Please explain why you believe the reported score is incorrect..."
          rows={4}
          className="w-full rounded-lg border border-neutral-600 bg-neutral-700 py-2 px-3 text-white focus:outline-none focus:border-primary-500 resize-none text-sm sm:text-base"
        />
        <p className="text-xs text-gray-500 mt-1">Provide as much detail as possible for admin review</p>
      </div>

      {error && (
        <div className="rounded-lg bg-red-800/50 border border-red-600/50 py-2 px-3 text-sm text-red-200 flex items-center gap-2">
          <XCircleIcon className="h-4 w-4" />
          {error}
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-3 pt-2">
        <button
          onClick={onDispute}
          disabled={isDisputing || !disputeReason.trim()}
          className="flex-1 flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white font-medium py-2.5 px-4 rounded-lg transition-colors disabled:opacity-50 text-sm sm:text-base"
        >
          {isDisputing ? 'Submitting...' : 'Submit Dispute'}
        </button>
        <button
          onClick={onClose}
          className="flex items-center justify-center gap-2 bg-neutral-600 hover:bg-neutral-700 text-white font-medium py-2.5 px-4 rounded-lg transition-colors text-sm sm:text-base"
        >
          Cancel
        </button>
      </div>
    </div>
  </ModalWrapper>
);