import { useMatchFootages } from "./useMatchFootages";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import VideoFeed from "./components/VideoFeed";
import FloatingSearch from "./components/FloatingSearch";
import FloatingActions from "./components/FloatingActions";
import DeleteConfirmModal from "./components/DeleteConfirmModal";
import EmptyState from "./components/EmptyState";
import { AlertCircle } from "lucide-react";

/**
 * Match Footages Page
 * TikTok-style fullscreen video feed for viewing match recordings
 */
export default function MatchFootagesPage() {
  const {
    // Data
    filteredRecordings,
    selectedRecording,
    isLoading,
    error,
    
    // Search/filter
    searchQuery,
    setSearchQuery,
    
    // Playback
    currentIndex,
    isPlaying,
    isMuted,
    showControls,
    
    // Actions
    isUploading,
    uploadProgress,
    showDeleteConfirm,
    setShowDeleteConfirm,
    
    // Methods
    handleNext,
    togglePlayPause,
    toggleMute,
    handleScroll,
    showControlsTemporarily,
    handleDeleteRecording,
    handleShareRecording,
    handleUploadRecording,
    handleExportRecording,
    
    // Video refs
    setVideoRef,
    getConvertedSrc,
  } = useMatchFootages();

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center safe-padding">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black safe-padding relative">
      {/* Error toast */}
      {error && (
        <div className="absolute top-16 left-4 right-4 z-50 flex justify-center">
          <div className="bg-red-500/90 backdrop-blur-sm text-white px-4 py-3 rounded-xl flex items-center gap-2 max-w-sm">
            <AlertCircle className="h-5 w-5 flex-shrink-0" />
            <p className="text-sm">{error}</p>
          </div>
        </div>
      )}

      {/* Main content */}
      {filteredRecordings.length === 0 ? (
        <div className="h-screen flex flex-col">
          {/* Search still available when empty */}
          <FloatingSearch 
            searchQuery={searchQuery} 
            setSearchQuery={setSearchQuery} 
          />
          <EmptyState searchQuery={searchQuery} />
        </div>
      ) : (
        <div className="h-screen relative">
          {/* Floating search */}
          <FloatingSearch 
            searchQuery={searchQuery} 
            setSearchQuery={setSearchQuery} 
          />

          {/* Video feed */}
          <VideoFeed
            filteredRecordings={filteredRecordings}
            currentIndex={currentIndex}
            showControls={showControls}
            isMuted={isMuted}
            setVideoRef={setVideoRef}
            getConvertedSrc={getConvertedSrc}
            onScroll={handleScroll}
            onVideoClick={showControlsTemporarily}
            onVideoEnded={handleNext}
          />

          {/* Floating action buttons */}
          <FloatingActions
            isPlaying={isPlaying}
            isMuted={isMuted}
            isUploading={isUploading}
            uploadProgress={uploadProgress}
            showControls={showControls}
            onTogglePlayPause={togglePlayPause}
            onToggleMute={toggleMute}
            onUpload={handleUploadRecording}
            onShare={handleShareRecording}
            onExport={handleExportRecording}
            onDelete={() => setShowDeleteConfirm(true)}
            onTap={showControlsTemporarily}
          />

          {/* Video counter indicator */}
          <div 
            className={`
              absolute bottom-6 left-0 right-0 
              flex justify-center
              transition-opacity duration-300
              ${showControls ? "opacity-100" : "opacity-0"}
            `}
          >
            <div className="bg-black/50 backdrop-blur-sm px-3 py-1.5 rounded-full">
              <span className="text-white/80 text-xs font-medium">
                {currentIndex + 1} / {filteredRecordings.length}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirmation modal */}
      {showDeleteConfirm && (
        <DeleteConfirmModal
          recording={selectedRecording}
          onConfirm={handleDeleteRecording}
          onCancel={() => setShowDeleteConfirm(false)}
        />
      )}
    </div>
  );
}
