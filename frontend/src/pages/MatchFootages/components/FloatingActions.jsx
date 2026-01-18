import { memo } from "react";
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Upload,
  Share2,
  Trash2,
  Download,
} from "lucide-react";
import LoadingSpinner from "../../../components/common/LoadingSpinner";

/**
 * Floating action buttons stack (bottom-right)
 * TikTok-style vertical action bar
 */
const FloatingActions = memo(({
  isPlaying,
  isMuted,
  isUploading,
  uploadProgress,
  showControls,
  onTogglePlayPause,
  onToggleMute,
  onUpload,
  onShare,
  onExport,
  onDelete,
  onTap,
}) => {
  const ActionButton = ({ onClick, icon: Icon, label, variant = "default", disabled = false, children }) => (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onTap?.();
        onClick?.();
      }}
      disabled={disabled}
      className={`
        flex flex-col items-center justify-center
        w-12 h-12 rounded-full
        backdrop-blur-sm
        transition-all duration-200
        active:scale-90
        disabled:opacity-50 disabled:cursor-not-allowed
        ${variant === "danger" 
          ? "bg-red-500/80 hover:bg-red-500" 
          : "bg-black/50 hover:bg-black/70"
        }
      `}
      aria-label={label}
    >
      {children || (Icon && <Icon className="h-5 w-5 text-white" />)}
    </button>
  );

  return (
    <div
      className={`
        absolute bottom-24 right-4 z-30
        flex flex-col items-center gap-4
        transition-opacity duration-300
        ${showControls ? "opacity-100" : "opacity-0 pointer-events-none"}
      `}
    >
      {/* Gradient background for readability */}
      <div className="absolute inset-0 -m-4 rounded-full bg-gradient-to-l from-black/30 to-transparent blur-xl pointer-events-none" />
      
      {/* Play/Pause */}
      <ActionButton
        onClick={onTogglePlayPause}
        icon={isPlaying ? Pause : Play}
        label={isPlaying ? "Pause" : "Play"}
      />
      
      {/* Mute/Unmute */}
      <ActionButton
        onClick={onToggleMute}
        icon={isMuted ? VolumeX : Volume2}
        label={isMuted ? "Unmute" : "Mute"}
      />
      
      {/* Upload */}
      <ActionButton
        onClick={onUpload}
        icon={Upload}
        label="Upload"
        disabled={isUploading}
      >
        {isUploading ? (
          <div className="relative">
            <LoadingSpinner size="sm" />
            <span className="absolute -bottom-5 left-1/2 -translate-x-1/2 text-[10px] text-white font-medium">
              {uploadProgress}%
            </span>
          </div>
        ) : (
          <Upload className="h-5 w-5 text-white" />
        )}
      </ActionButton>
      
      {/* Share */}
      <ActionButton
        onClick={onShare}
        icon={Share2}
        label="Share"
      />
      
      {/* Export to Gallery */}
      <ActionButton
        onClick={onExport}
        icon={Download}
        label="Export to Gallery"
      />
      
      {/* Delete */}
      <ActionButton
        onClick={onDelete}
        icon={Trash2}
        label="Delete"
        variant="danger"
      />
    </div>
  );
});

FloatingActions.displayName = "FloatingActions";

export default FloatingActions;
