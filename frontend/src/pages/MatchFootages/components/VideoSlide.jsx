import { memo } from "react";
import { Calendar, Clock } from "lucide-react";

/**
 * Single video slide in the feed
 * Handles video rendering and overlay info
 */
const VideoSlide = memo(({
  recording,
  index,
  isActive,
  isNear,
  showControls,
  videoSrc,
  isMuted,
  setVideoRef,
  onVideoClick,
  onVideoEnded,
}) => {
  // Format date for display
  const formatDate = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Format duration
  const formatDuration = (seconds) => {
    if (!seconds) return null;
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  // Extract match info from filename if possible
  const getDisplayName = (name) => {
    // Try to extract match ID from filename pattern: match_123_timestamp.mp4
    const matchIdMatch = name.match(/match_(\d+)/);
    if (matchIdMatch) {
      return `Match #${matchIdMatch[1]}`;
    }
    // Remove extension and clean up
    return name.replace(/\.(mp4|webm|mov)$/i, "").replace(/_/g, " ");
  };

  return (
    <div
      className="h-full w-full snap-start relative"
      onClick={onVideoClick}
    >
      <div className="relative h-full w-full bg-black overflow-hidden">
        {/* Video or placeholder */}
        {isNear ? (
          <video
            ref={(el) => setVideoRef(index, el)}
            src={videoSrc}
            className="w-full h-full object-contain"
            muted={isMuted}
            playsInline
            preload={isActive ? 'auto' : 'metadata'}
            onEnded={onVideoEnded}
            loop={false}
          />
        ) : (
          <div className="w-full h-full bg-black flex items-center justify-center">
            <div className="w-8 h-8 border-2 border-white/20 border-t-white/60 rounded-full animate-spin" />
          </div>
        )}

        {/* Gradient overlays for text readability */}
        {isActive && (
          <>
            {/* Top gradient */}
            <div className="absolute top-0 left-0 right-0 h-24 bg-gradient-to-b from-black/50 to-transparent pointer-events-none" />
            
            {/* Bottom gradient */}
            <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-black/60 to-transparent pointer-events-none" />
          </>
        )}

        {/* Video info overlay - bottom left */}
        {isActive && (
          <div
            className={`
              absolute bottom-20 left-4 right-20
              transition-opacity duration-300
              ${showControls ? "opacity-100" : "opacity-0"}
            `}
          >
            <h3 className="font-semibold text-white text-lg drop-shadow-lg line-clamp-1">
              {getDisplayName(recording.name)}
            </h3>
            
            <div className="flex items-center gap-3 mt-1.5 text-white/80 text-sm">
              <span className="flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5" />
                {formatDate(recording.created)}
              </span>
              
              {recording.duration > 0 && (
                <span className="flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5" />
                  {formatDuration(recording.duration)}
                </span>
              )}
            </div>
          </div>
        )}

        {/* Progress indicator dots */}
        {isActive && (
          <div className="absolute bottom-6 left-0 right-0 flex justify-center pointer-events-none">
            {/* Visual indicator that more videos exist */}
          </div>
        )}
      </div>
    </div>
  );
});

VideoSlide.displayName = "VideoSlide";

export default VideoSlide;
