import { memo, useRef, useEffect, useCallback } from "react";
import VideoSlide from "./VideoSlide";

/**
 * Scrollable video feed container
 * Handles snap scrolling and index tracking
 */
const VideoFeed = memo(({
  filteredRecordings,
  currentIndex,
  showControls,
  isMuted,
  setVideoRef,
  getConvertedSrc,
  onScroll,
  onVideoClick,
  onVideoEnded,
}) => {
  const containerRef = useRef(null);
  const scrollTimeoutRef = useRef(null);

  // Handle scroll with throttle
  const handleScroll = useCallback((e) => {
    if (filteredRecordings.length === 0) return;
    
    const container = e.target;
    const scrollTop = container.scrollTop;
    const containerHeight = container.clientHeight;
    
    if (scrollTimeoutRef.current) return;
    
    scrollTimeoutRef.current = setTimeout(() => {
      onScroll(scrollTop, containerHeight);
      scrollTimeoutRef.current = null;
    }, 50);
  }, [filteredRecordings.length, onScroll]);

  // Set up scroll listener
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.addEventListener('scroll', handleScroll);
    
    return () => {
      container.removeEventListener('scroll', handleScroll);
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, [handleScroll]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      switch (e.key) {
        case "ArrowUp":
        case "ArrowLeft":
          e.preventDefault();
          // Navigate to previous
          if (containerRef.current && currentIndex > 0) {
            const containerHeight = containerRef.current.clientHeight;
            containerRef.current.scrollTo({
              top: (currentIndex - 1) * containerHeight,
              behavior: 'smooth'
            });
          }
          break;
        case "ArrowDown":
        case "ArrowRight":
          e.preventDefault();
          // Navigate to next
          if (containerRef.current && currentIndex < filteredRecordings.length - 1) {
            const containerHeight = containerRef.current.clientHeight;
            containerRef.current.scrollTo({
              top: (currentIndex + 1) * containerHeight,
              behavior: 'smooth'
            });
          }
          break;
        case " ":
          e.preventDefault();
          onVideoClick();
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [currentIndex, filteredRecordings.length, onVideoClick]);

  return (
    <div
      ref={containerRef}
      className="h-full w-full overflow-y-scroll snap-y snap-mandatory scrollbar-hide"
    >
      {filteredRecordings.map((recording, index) => {
        const isActive = index === currentIndex;
        const isNear = Math.abs(index - currentIndex) <= 1;

        return (
          <VideoSlide
            key={recording.path}
            recording={recording}
            index={index}
            isActive={isActive}
            isNear={isNear}
            showControls={showControls}
            videoSrc={getConvertedSrc(recording.path)}
            isMuted={isMuted}
            setVideoRef={setVideoRef}
            onVideoClick={onVideoClick}
            onVideoEnded={onVideoEnded}
          />
        );
      })}
    </div>
  );
});

VideoFeed.displayName = "VideoFeed";

export default VideoFeed;
