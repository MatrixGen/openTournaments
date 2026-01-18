import { memo } from "react";
import { AlertCircle } from "lucide-react";

/**
 * Delete confirmation modal
 * Simple overlay dialog for delete confirmation
 */
const DeleteConfirmModal = memo(({
  recording,
  onConfirm,
  onCancel,
}) => {
  if (!recording) return null;

  // Get display name
  const getDisplayName = (name) => {
    const matchIdMatch = name.match(/match_(\d+)/);
    if (matchIdMatch) {
      return `Match #${matchIdMatch[1]}`;
    }
    return name.replace(/\.(mp4|webm|mov)$/i, "");
  };

  return (
    <div 
      className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={onCancel}
    >
      <div 
        className="bg-gray-900 rounded-2xl p-6 max-w-sm w-full border border-gray-800"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center">
            <AlertCircle className="h-5 w-5 text-red-500" />
          </div>
          <h3 className="text-lg font-semibold text-white">
            Delete Footage
          </h3>
        </div>
        
        <p className="text-gray-400 mb-6">
          Are you sure you want to delete <span className="text-white font-medium">"{getDisplayName(recording.name)}"</span>? 
          This action cannot be undone.
        </p>
        
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="
              flex-1 py-3 px-4 
              bg-gray-800 hover:bg-gray-700 
              text-white font-medium rounded-xl 
              transition-colors
            "
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="
              flex-1 py-3 px-4 
              bg-red-500 hover:bg-red-600 
              text-white font-medium rounded-xl 
              transition-colors
            "
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
});

DeleteConfirmModal.displayName = "DeleteConfirmModal";

export default DeleteConfirmModal;
