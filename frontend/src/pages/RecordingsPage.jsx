import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import Header from "../components/layout/Header";
import LoadingSpinner from "../components/common/LoadingSpinner";
import { screenRecorderUtil } from "../utils/ScreenRecorder";
import {
  Search,
  Filter,
  Play,
  Pause,
  Volume2,
  VolumeX,
  Upload,
  Trash2,
  Share2,
  MoreVertical,
  ChevronLeft,
  ChevronRight,
  Calendar,
  Clock,
  FileVideo,
  Download,
  Eye,
  EyeOff,
  Info,
  X,
  Check,
  AlertCircle,
  ExternalLink,
  FolderOpen,
  RefreshCw,
  HardDrive,
} from "lucide-react";

export default function RecordingsPage() {
  const [recordings, setRecordings] = useState([]);
  const [filteredRecordings, setFilteredRecordings] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [showControls, setShowControls] = useState(true);
  const [selectedRecording, setSelectedRecording] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  //const [showShareMenu, setShowShareMenu] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [activeFilter, setActiveFilter] = useState("all"); // all, recent, largest, oldest
  
  const videoRefs = useRef([]);
  const containerRef = useRef(null);
  const controlsTimeoutRef = useRef(null);

  useEffect(() => {
    loadRecordings();
  }, []);

  useEffect(() => {
    filterRecordings();
  }, [recordings, searchQuery, activeFilter]);

  useEffect(() => {
    // Auto-play current video when index changes
    if (videoRefs.current[currentIndex]) {
      const video = videoRefs.current[currentIndex];
      const playPromise = video.play();
      
      if (playPromise !== undefined) {
        playPromise.catch(() => {
          // Auto-play was prevented
          setIsPlaying(false);
        });
      }
    }
    
    // Pause all other videos
    videoRefs.current.forEach((video, index) => {
      if (video && index !== currentIndex) {
        video.pause();
      }
    });
    
    setSelectedRecording(filteredRecordings[currentIndex] || null);
  }, [currentIndex, filteredRecordings]);

  useEffect(() => {
    // Handle keyboard shortcuts
    const handleKeyDown = (e) => {
      switch (e.key) {
        case "ArrowUp":
        case "ArrowLeft":
          e.preventDefault();
          handlePrevious();
          break;
        case "ArrowDown":
        case "ArrowRight":
          e.preventDefault();
          handleNext();
          break;
        case " ":
          e.preventDefault();
          togglePlayPause();
          break;
        case "m":
        case "M":
          e.preventDefault();
          toggleMute();
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [currentIndex, filteredRecordings.length]);

  const loadRecordings = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const recordingsList = await screenRecorderUtil.listRecordings();
      
      // Sort by creation date (newest first)
      const sortedRecordings = recordingsList.sort((a, b) => b.created - a.created);
      setRecordings(sortedRecordings);
      setFilteredRecordings(sortedRecordings);
      
      if (sortedRecordings.length > 0) {
        setSelectedRecording(sortedRecordings[0]);
      }
    } catch (error) {
      console.error("Failed to load recordings:", error);
      setError("Failed to load recordings. Please check permissions.");
    } finally {
      setIsLoading(false);
    }
  };

  const filterRecordings = () => {
    let filtered = [...recordings];
    
    // Apply search filter
    if (searchQuery.trim()) {
      filtered = filtered.filter(recording =>
        recording.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    // Apply type filter
    switch (activeFilter) {
      case "recent":
        filtered = filtered.sort((a, b) => b.created - a.created);
        break;
      case "oldest":
        filtered = filtered.sort((a, b) => a.created - b.created);
        break;
      case "largest":
        filtered = filtered.sort((a, b) => b.size - a.size);
        break;
      case "smallest":
        filtered = filtered.sort((a, b) => a.size - b.size);
        break;
      default:
        filtered = filtered.sort((a, b) => b.created - a.created);
    }
    
    setFilteredRecordings(filtered);
    
    // Reset current index if filtered list changed
    if (currentIndex >= filtered.length) {
      setCurrentIndex(0);
    }
  };

  const handleNext = () => {
    if (filteredRecordings.length === 0) return;
    setCurrentIndex(prev =>
      prev === filteredRecordings.length - 1 ? 0 : prev + 1
    );
    resetControlsTimer();
  };

  const handlePrevious = () => {
    if (filteredRecordings.length === 0) return;
    setCurrentIndex(prev =>
      prev === 0 ? filteredRecordings.length - 1 : prev - 1
    );
    resetControlsTimer();
  };

  const togglePlayPause = () => {
    if (!videoRefs.current[currentIndex]) return;
    
    const video = videoRefs.current[currentIndex];
    if (video.paused) {
      video.play();
      setIsPlaying(true);
    } else {
      video.pause();
      setIsPlaying(false);
    }
    resetControlsTimer();
  };

  const toggleMute = () => {
    if (!videoRefs.current[currentIndex]) return;
    
    const video = videoRefs.current[currentIndex];
    video.muted = !video.muted;
    setIsMuted(video.muted);
    resetControlsTimer();
  };

  const resetControlsTimer = () => {
    setShowControls(true);
    
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    
    controlsTimeoutRef.current = setTimeout(() => {
      setShowControls(false);
    }, 3000);
  };

  const handleVideoClick = () => {
    resetControlsTimer();
  };

  const handleDeleteRecording = async (recordingPath) => {
    try {
      await screenRecorderUtil.deleteRecording(recordingPath);
      await loadRecordings(); // Reload list
      setShowDeleteConfirm(false);
    } catch (error) {
      console.error("Failed to delete recording:", error);
      setError("Failed to delete recording");
    }
  };

  const handleShareRecording = async (recording) => {
    try {
      // Export to public storage first
      const result = await screenRecorderUtil.exportToPublicStorage(recording.path);
      
      // Create share URL or file URI
      const shareUrl = result.uri || result.publicPath;
      
      // Use Web Share API if available
      if (navigator.share) {
        await navigator.share({
          title: recording.name,
          text: "Check out my screen recording!",
          url: shareUrl,
        });
      } else {
        // Fallback: Copy to clipboard
        await navigator.clipboard.writeText(shareUrl);
        alert("Share link copied to clipboard!");
      }
    } catch (error) {
      console.error("Failed to share recording:", error);
    }
  };

  const handleUploadRecording = async (recording) => {
    // Replace with your actual upload endpoint
    const uploadUrl = "https://uploads/open-tournament.com/api/upload-recording";
    
    try {
      setIsUploading(true);
      setUploadProgress(0);
      
      // Simulate upload progress
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 100) {
            clearInterval(progressInterval);
            return 100;
          }
          return prev + 10;
        });
      }, 200);
      
      // Actual upload
      await screenRecorderUtil.uploadRecording(recording.path, uploadUrl);
      
      clearInterval(progressInterval);
      setUploadProgress(100);
      
      setTimeout(() => {
        setIsUploading(false);
        setUploadProgress(0);
        alert("Recording uploaded successfully!");
      }, 500);
      
    } catch (error) {
      console.error("Upload failed:", error);
      setError("Upload failed. Please try again.");
      setIsUploading(false);
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const formatDate = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatDuration = (seconds) => {
    if (!seconds) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const handleScroll = (e) => {
    if (filteredRecordings.length === 0) return;
    
    const container = e.target;
    const scrollPosition = container.scrollTop;
    const windowHeight = container.clientHeight;
    const scrollHeight = container.scrollHeight;
    const percentage = scrollPosition / (scrollHeight - windowHeight);
    
    const newIndex = Math.round(percentage * (filteredRecordings.length - 1));
    if (newIndex !== currentIndex) {
      setCurrentIndex(newIndex);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-indigo-50/20 dark:from-gray-900 dark:to-gray-800">
        <div className="flex items-center justify-center min-h-[80vh]">
          <LoadingSpinner size="lg" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-indigo-50/20 dark:from-gray-900 dark:to-gray-800 safe-padding">
      
      <main className="mx-auto max-w-7xl py-4 md:py-8 px-3 sm:px-4 lg:px-8">
        {/* Top Bar with Search and Filters */}
        <div className="mb-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
                Screen Recordings
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-2">
                {filteredRecordings.length} recording{filteredRecordings.length !== 1 ? "s" : ""} found
              </p>
            </div>
            
            <div className="flex items-center space-x-3">
              <button
                onClick={loadRecordings}
                className="p-2 rounded-lg bg-gradient-to-br from-white to-gray-50/80 dark:from-gray-800 dark:to-gray-900/90 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all duration-200"
                title="Refresh"
              >
                <RefreshCw className="h-5 w-5" />
              </button>
              
              <div className="relative flex-1 md:flex-none">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search recordings..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full md:w-64 pl-10 pr-4 py-2 bg-gradient-to-br from-white to-gray-50/80 dark:from-gray-800 dark:to-gray-900/90 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 dark:focus:ring-purple-400 text-gray-900 dark:text-white"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery("")}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
          
          {/* Filter Tabs */}
          <div className="flex space-x-2 mb-6 overflow-x-auto pb-2">
            {["all", "recent", "largest", "oldest"].map((filter) => (
              <button
                key={filter}
                onClick={() => setActiveFilter(filter)}
                className={`px-4 py-2 rounded-lg whitespace-nowrap transition-all duration-200 ${
                  activeFilter === filter
                    ? "bg-gradient-to-r from-purple-500 to-indigo-500 text-white shadow-md"
                    : "bg-gradient-to-br from-white to-gray-50/80 dark:from-gray-800 dark:to-gray-900/90 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
                }`}
              >
                {filter.charAt(0).toUpperCase() + filter.slice(1)}
              </button>
            ))}
          </div>
        </div>
        
        {/* Error Display */}
        {error && (
          <div className="mb-6 p-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
            <div className="flex items-center">
              <AlertCircle className="h-5 w-5 text-red-500 dark:text-red-400 mr-3" />
              <p className="text-red-700 dark:text-red-300">{error}</p>
            </div>
          </div>
        )}
        
        {/* Main Content */}
        {filteredRecordings.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-900 flex items-center justify-center">
              <FileVideo className="h-10 w-10 text-gray-400 dark:text-gray-500" />
            </div>
            <h3 className="text-xl font-medium text-gray-900 dark:text-white mb-3">
              No recordings found
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-8 max-w-md mx-auto">
              {searchQuery
                ? `No recordings match "${searchQuery}"`
                : "Start screen recording to see your videos here"}
            </p>
            {!searchQuery && (
              <Link
                to="/dashboard"
                className="inline-flex items-center bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600 text-white font-medium py-2.5 px-6 rounded-lg transition-all duration-200 hover:scale-105 active:scale-95 shadow-md"
              >
                Start Recording
              </Link>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Video Feed (TikTok Style) */}
            <div className="lg:col-span-3 relative">
              <div
                ref={containerRef}
                onScroll={handleScroll}
                className="h-[75vh] overflow-y-scroll snap-y snap-mandatory scrollbar-hide rounded-xl"
              >
                {filteredRecordings.map((recording, index) => (
                  <div
                    key={recording.path}
                    className="h-full w-full snap-start relative"
                    onClick={handleVideoClick}
                  >
                    {/* Video Container */}
                    <div className="relative h-full w-full bg-black rounded-xl overflow-hidden">
                      <video
                        ref={(el) => (videoRefs.current[index] = el)}
                        src={`file://${recording.path}`}
                        className="w-full h-full object-contain"
                        loop
                        muted={isMuted}
                        playsInline
                        onPlay={() => setIsPlaying(true)}
                        onPause={() => setIsPlaying(false)}
                        onEnded={handleNext}
                      />
                      
                      {/* Video Overlay Controls */}
                      <div
                        className={`absolute inset-0 transition-opacity duration-300 ${
                          showControls ? "opacity-100" : "opacity-0"
                        }`}
                      >
                        {/* Top Gradient Overlay */}
                        <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-black/60 to-transparent" />
                        
                        {/* Bottom Gradient Overlay */}
                        <div className="absolute bottom-0 left-0 right-0 h-48 bg-gradient-to-t from-black/60 to-transparent" />
                        
                        {/* Play/Pause Button */}
                        <button
                          onClick={togglePlayPause}
                          className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 w-16 h-16 rounded-full bg-black/50 hover:bg-black/70 backdrop-blur-sm flex items-center justify-center transition-all duration-200 hover:scale-110"
                        >
                          {isPlaying && currentIndex === index ? (
                            <Pause className="h-8 w-8 text-white" />
                          ) : (
                            <Play className="h-8 w-8 text-white ml-1" />
                          )}
                        </button>
                        
                        {/* Mute Button */}
                        <button
                          onClick={toggleMute}
                          className="absolute top-6 right-6 p-2 rounded-full bg-black/50 hover:bg-black/70 backdrop-blur-sm transition-all duration-200 hover:scale-110"
                        >
                          {isMuted ? (
                            <VolumeX className="h-6 w-6 text-white" />
                          ) : (
                            <Volume2 className="h-6 w-6 text-white" />
                          )}
                        </button>
                        
                        {/* Navigation Arrows */}
                        <button
                          onClick={handlePrevious}
                          className="absolute left-6 top-1/2 transform -translate-y-1/2 p-2 rounded-full bg-black/50 hover:bg-black/70 backdrop-blur-sm transition-all duration-200 hover:scale-110"
                        >
                          <ChevronLeft className="h-6 w-6 text-white" />
                        </button>
                        
                        <button
                          onClick={handleNext}
                          className="absolute right-6 top-1/2 transform -translate-y-1/2 p-2 rounded-full bg-black/50 hover:bg-black/70 backdrop-blur-sm transition-all duration-200 hover:scale-110"
                        >
                          <ChevronRight className="h-6 w-6 text-white" />
                        </button>
                        
                        {/* Video Info Overlay */}
                        <div className="absolute bottom-6 left-6 right-6">
                          <div className="flex items-center justify-between">
                            <div>
                              <h3 className="text-white font-semibold text-lg">
                                {recording.name}
                              </h3>
                              <div className="flex items-center space-x-4 mt-2 text-white/80">
                                <span className="flex items-center">
                                  <Calendar className="h-4 w-4 mr-1" />
                                  {formatDate(recording.created)}
                                </span>
                                <span className="flex items-center">
                                  <HardDrive className="h-4 w-4 mr-1" />
                                  {formatFileSize(recording.size)}
                                </span>
                                {recording.duration > 0 && (
                                  <span className="flex items-center">
                                    <Clock className="h-4 w-4 mr-1" />
                                    {formatDuration(recording.duration)}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              
              {/* Current Position Indicator */}
              <div className="flex justify-center space-x-2 mt-4">
                {filteredRecordings.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentIndex(index)}
                    className={`w-2 h-2 rounded-full transition-all duration-200 ${
                      index === currentIndex
                        ? "w-8 bg-gradient-to-r from-purple-500 to-indigo-500"
                        : "bg-gray-300 dark:bg-gray-600 hover:bg-gray-400 dark:hover:bg-gray-500"
                    }`}
                  />
                ))}
              </div>
            </div>
            
            {/* Sidebar with Action Buttons and Info */}
            <div className="space-y-6">
              {/* Selected Recording Info */}
              {selectedRecording && (
                <div className="bg-gradient-to-br from-white to-gray-50/80 dark:from-gray-800 dark:to-gray-900/90 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-3">
                    Recording Details
                  </h3>
                  
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">File Name</p>
                      <p className="text-gray-900 dark:text-white font-medium truncate">
                        {selectedRecording.name}
                      </p>
                    </div>
                    
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Created</p>
                      <p className="text-gray-900 dark:text-white">
                        {formatDate(selectedRecording.created)}
                      </p>
                    </div>
                    
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Size</p>
                      <p className="text-gray-900 dark:text-white">
                        {formatFileSize(selectedRecording.size)}
                      </p>
                    </div>
                    
                    {selectedRecording.duration > 0 && (
                      <div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">Duration</p>
                        <p className="text-gray-900 dark:text-white">
                          {formatDuration(selectedRecording.duration)}
                        </p>
                      </div>
                    )}
                    
                    <div className="pt-3 border-t border-gray-200 dark:border-gray-700">
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">File Path</p>
                      <div className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800 rounded-lg">
                        <p className="text-xs text-gray-600 dark:text-gray-400 truncate">
                          {selectedRecording.path}
                        </p>
                        <button
                          onClick={() => {
                            // Open file location
                            // This would need platform-specific implementation
                            console.log("Open file location:", selectedRecording.path);
                          }}
                          className="ml-2 p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
                          title="Open folder"
                        >
                          <FolderOpen className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Action Buttons */}
              <div className="bg-gradient-to-br from-white to-gray-50/80 dark:from-gray-800 dark:to-gray-900/90 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-4">
                  Actions
                </h3>
                
                <div className="space-y-3">
                  <button
                    onClick={() => selectedRecording && handleUploadRecording(selectedRecording)}
                    disabled={isUploading || !selectedRecording}
                    className="w-full flex items-center justify-center space-x-2 bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600 text-white font-medium py-3 rounded-lg transition-all duration-200 hover:scale-[1.02] active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isUploading ? (
                      <>
                        <LoadingSpinner size="sm" />
                        <span>Uploading... {uploadProgress}%</span>
                      </>
                    ) : (
                      <>
                        <Upload className="h-5 w-5" />
                        <span>Upload to Server</span>
                      </>
                    )}
                  </button>
                  
                  <button
                    onClick={() => selectedRecording && handleShareRecording(selectedRecording)}
                    disabled={!selectedRecording}
                    className="w-full flex items-center justify-center space-x-2 bg-gradient-to-br from-white to-gray-50/80 dark:from-gray-800 dark:to-gray-900/90 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white font-medium py-3 rounded-lg transition-all duration-200 hover:scale-[1.02] active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Share2 className="h-5 w-5" />
                    <span>Share Recording</span>
                  </button>
                  
                  <button
                    onClick={() => {
                      if (selectedRecording) {
                        setShowDeleteConfirm(true);
                      }
                    }}
                    disabled={!selectedRecording}
                    className="w-full flex items-center justify-center space-x-2 bg-gradient-to-r from-red-500 to-rose-500 hover:from-red-600 hover:to-rose-600 text-white font-medium py-3 rounded-lg transition-all duration-200 hover:scale-[1.02] active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Trash2 className="h-5 w-5" />
                    <span>Delete Recording</span>
                  </button>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => {
                        // Export to gallery
                        if (selectedRecording) {
                          screenRecorderUtil.exportToPublicStorage(selectedRecording.path)
                            .then(() => alert("Exported to gallery!"))
                            .catch(console.error);
                        }
                      }}
                      disabled={!selectedRecording}
                      className="flex items-center justify-center space-x-2 bg-gradient-to-br from-white to-gray-50/80 dark:from-gray-800 dark:to-gray-900/90 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white font-medium py-2 rounded-lg transition-all duration-200 hover:scale-[1.02] active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <ExternalLink className="h-4 w-4" />
                      <span className="text-sm">Export</span>
                    </button>
                    
                    <button
                      onClick={() => {
                        // Download file
                        if (selectedRecording) {
                          const link = document.createElement('a');
                          link.href = `file://${selectedRecording.path}`;
                          link.download = selectedRecording.name;
                          link.click();
                        }
                      }}
                      disabled={!selectedRecording}
                      className="flex items-center justify-center space-x-2 bg-gradient-to-br from-white to-gray-50/80 dark:from-gray-800 dark:to-gray-900/90 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white font-medium py-2 rounded-lg transition-all duration-200 hover:scale-[1.02] active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Download className="h-4 w-4" />
                      <span className="text-sm">Download</span>
                    </button>
                  </div>
                </div>
              </div>
              
              {/* Keyboard Shortcuts Help */}
              <div className="bg-gradient-to-br from-white to-gray-50/80 dark:from-gray-800 dark:to-gray-900/90 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-3">
                  Keyboard Shortcuts
                </h3>
                <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                  <li className="flex justify-between">
                    <span>Play/Pause</span>
                    <span className="font-medium text-gray-900 dark:text-white">Space</span>
                  </li>
                  <li className="flex justify-between">
                    <span>Next Video</span>
                    <span className="font-medium text-gray-900 dark:text-white">↓ or →</span>
                  </li>
                  <li className="flex justify-between">
                    <span>Previous Video</span>
                    <span className="font-medium text-gray-900 dark:text-white">↑ or ←</span>
                  </li>
                  <li className="flex justify-between">
                    <span>Mute/Unmute</span>
                    <span className="font-medium text-gray-900 dark:text-white">M</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        )}
      </main>
      
      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && selectedRecording && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gradient-to-br from-white to-gray-50/80 dark:from-gray-800 dark:to-gray-900/90 rounded-xl border border-gray-200 dark:border-gray-700 p-6 max-w-md w-full">
            <div className="flex items-center mb-4">
              <AlertCircle className="h-6 w-6 text-red-500 dark:text-red-400 mr-3" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Delete Recording
              </h3>
            </div>
            
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Are you sure you want to delete "{selectedRecording.name}"? This action cannot be undone.
            </p>
            
            <div className="flex space-x-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 py-2.5 px-4 bg-gradient-to-br from-white to-gray-50/80 dark:from-gray-800 dark:to-gray-900/90 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white rounded-lg transition-all duration-200 hover:scale-[1.02] active:scale-95"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteRecording(selectedRecording.path)}
                className="flex-1 py-2.5 px-4 bg-gradient-to-r from-red-500 to-rose-500 hover:from-red-600 hover:to-rose-600 text-white rounded-lg transition-all duration-200 hover:scale-[1.02] active:scale-95"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}