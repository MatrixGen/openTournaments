import { useState, useEffect, useRef, useCallback } from "react";
import { screenRecorderUtil } from "../../utils/ScreenRecorder";
import { Capacitor } from "@capacitor/core";
import { App } from "@capacitor/app";

/**
 * Custom hook for managing match footages (screen recordings)
 * Handles loading, filtering, playback state, and video ref management
 */
export function useMatchFootages() {
  // Core data state
  const [recordings, setRecordings] = useState([]);
  const [filteredRecordings, setFilteredRecordings] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Filter/search state
  const [searchQuery, setSearchQuery] = useState("");
  
  // Playback state
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [showControls, setShowControls] = useState(true);
  
  // Action state
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  
  // Refs
  const videoRefs = useRef(new Map());
  const convertedSrcCache = useRef(new Map());
  const controlsTimeoutRef = useRef(null);
  const scrollTimeoutRef = useRef(null);
  const playListenerRef = useRef(null);
  const pauseListenerRef = useRef(null);

  // Get the currently selected recording
  const selectedRecording = filteredRecordings[currentIndex] || null;

  // Helper to get converted URL with caching
  const getConvertedSrc = useCallback((path) => {
    if (convertedSrcCache.current.has(path)) {
      return convertedSrcCache.current.get(path);
    }
    const converted = Capacitor.convertFileSrc(path);
    convertedSrcCache.current.set(path, converted);
    return converted;
  }, []);

  // Video ref setter with proper cleanup
  const setVideoRef = useCallback((index, el) => {
    if (el) {
      videoRefs.current.set(index, el);
    } else {
      videoRefs.current.delete(index);
    }
  }, []);

  // Get video ref for an index
  const getVideoRef = useCallback((index) => {
    return videoRefs.current.get(index);
  }, []);

  // Load recordings from device
  const loadRecordings = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const recordingsList = await screenRecorderUtil.listRecordings();
      const sortedRecordings = recordingsList.sort((a, b) => b.created - a.created);
      setRecordings(sortedRecordings);
      setFilteredRecordings(sortedRecordings);
    } catch (err) {
      console.error("Failed to load recordings:", err);
      setError("Failed to load recordings. Please check permissions.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Filter recordings based on search query
  const filterRecordings = useCallback(() => {
    let filtered = [...recordings];
    
    if (searchQuery.trim()) {
      filtered = filtered.filter(recording =>
        recording.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    // Always sort by most recent
    filtered = filtered.sort((a, b) => b.created - a.created);
    
    setFilteredRecordings(filtered);
    
    // Reset index if out of bounds
    if (currentIndex >= filtered.length && filtered.length > 0) {
      setCurrentIndex(0);
    }
  }, [recordings, searchQuery, currentIndex]);

  // Navigation
  const handleNext = useCallback(() => {
    if (filteredRecordings.length === 0) return;
    setCurrentIndex(prev =>
      prev === filteredRecordings.length - 1 ? 0 : prev + 1
    );
    setShowControls(true);
  }, [filteredRecordings.length]);

  const handlePrevious = useCallback(() => {
    if (filteredRecordings.length === 0) return;
    setCurrentIndex(prev =>
      prev === 0 ? filteredRecordings.length - 1 : prev - 1
    );
    setShowControls(true);
  }, [filteredRecordings.length]);

  // Playback controls
  const togglePlayPause = useCallback(() => {
    const video = videoRefs.current.get(currentIndex);
    if (!video) return;
    
    if (video.paused) {
      video.play();
    } else {
      video.pause();
    }
    setShowControls(true);
  }, [currentIndex]);

  const toggleMute = useCallback(() => {
    const video = videoRefs.current.get(currentIndex);
    if (!video) return;
    
    video.muted = !video.muted;
    setIsMuted(video.muted);
    setShowControls(true);
  }, [currentIndex]);

  // Controls visibility
  const resetControlsTimer = useCallback(() => {
    setShowControls(true);
    
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    
    controlsTimeoutRef.current = setTimeout(() => {
      setShowControls(false);
    }, 3000);
  }, []);

  const showControlsTemporarily = useCallback(() => {
    resetControlsTimer();
  }, [resetControlsTimer]);

  // Scroll handling with debounce
  const handleScroll = useCallback((scrollTop, containerHeight) => {
    if (filteredRecordings.length === 0) return;
    
    const newIndex = Math.round(scrollTop / containerHeight);
    
    if (newIndex !== currentIndex && newIndex >= 0 && newIndex < filteredRecordings.length) {
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
      
      scrollTimeoutRef.current = setTimeout(() => {
        setCurrentIndex(newIndex);
      }, 100);
    }
  }, [currentIndex, filteredRecordings.length]);

  // Actions
  const handleDeleteRecording = useCallback(async () => {
    if (!selectedRecording) return;
    
    try {
      await screenRecorderUtil.deleteRecording(selectedRecording.path);
      await loadRecordings();
      setShowDeleteConfirm(false);
    } catch (err) {
      console.error("Failed to delete recording:", err);
      setError("Failed to delete recording");
    }
  }, [selectedRecording, loadRecordings]);

  const handleShareRecording = useCallback(async () => {
    if (!selectedRecording) return;
    
    try {
      const result = await screenRecorderUtil.exportToPublicStorage(selectedRecording.path);
      const shareUrl = result.uri || result.publicPath;
      
      if (navigator.share) {
        await navigator.share({
          title: selectedRecording.name,
          text: "Check out my match footage!",
          url: shareUrl,
        });
      } else {
        await navigator.clipboard.writeText(shareUrl);
        alert("Share link copied to clipboard!");
      }
    } catch (err) {
      console.error("Failed to share recording:", err);
    }
  }, [selectedRecording]);

  const handleUploadRecording = useCallback(async () => {
    if (!selectedRecording) return;
    
    const uploadUrl = "https://uploads.open-tournament.com";
    
    try {
      setIsUploading(true);
      setUploadProgress(0);
      
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 100) {
            clearInterval(progressInterval);
            return 100;
          }
          return prev + 10;
        });
      }, 200);
      
      await screenRecorderUtil.uploadRecording(selectedRecording.path, uploadUrl);
      
      clearInterval(progressInterval);
      setUploadProgress(100);
      
      setTimeout(() => {
        setIsUploading(false);
        setUploadProgress(0);
        alert("Recording uploaded successfully!");
      }, 500);
      
    } catch (err) {
      console.error("Upload failed:", err);
      setError("Upload failed. Please try again.");
      setIsUploading(false);
    }
  }, [selectedRecording]);

  const handleExportRecording = useCallback(async () => {
    if (!selectedRecording) return;
    
    try {
      await screenRecorderUtil.exportToPublicStorage(selectedRecording.path);
      alert("Exported to gallery!");
    } catch (err) {
      console.error("Export failed:", err);
      setError("Export failed. Please try again.");
    }
  }, [selectedRecording]);

  // Initial load
  useEffect(() => {
    loadRecordings();
  }, [loadRecordings]);

  // Filter when dependencies change
  useEffect(() => {
    filterRecordings();
  }, [filterRecordings]);

  // Handle app backgrounding - pause videos
  useEffect(() => {
    let appPauseListener;
    const currentVideoRefs = videoRefs.current;
    
    const setupAppListeners = async () => {
      try {
        appPauseListener = await App.addListener('pause', () => {
          currentVideoRefs.forEach(video => {
            if (video && !video.paused) {
              video.pause();
            }
          });
        });
      } catch (err) {
        console.warn('Could not set up app pause listener:', err);
      }
    };

    setupAppListeners();

    return () => {
      if (appPauseListener) {
        appPauseListener.remove();
      }
      currentVideoRefs.clear();
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, []);

  // Sync isPlaying state with actual video element via events
  useEffect(() => {
    const activeVideo = videoRefs.current.get(currentIndex);
    if (!activeVideo) {
      setIsPlaying(false);
      return;
    }

    // Remove previous listeners if they exist
    if (playListenerRef.current && activeVideo) {
      activeVideo.removeEventListener('play', playListenerRef.current);
    }
    if (pauseListenerRef.current && activeVideo) {
      activeVideo.removeEventListener('pause', pauseListenerRef.current);
    }

    // Set initial state from video
    setIsPlaying(!activeVideo.paused);

    // Create new listeners
    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    
    activeVideo.addEventListener('play', handlePlay);
    activeVideo.addEventListener('pause', handlePause);
    
    // Store refs correctly (FIX: was incorrectly assigning handlePlay to pauseListenerRef)
    playListenerRef.current = handlePlay;
    pauseListenerRef.current = handlePause;

    return () => {
      if (activeVideo) {
        activeVideo.removeEventListener('play', handlePlay);
        activeVideo.removeEventListener('pause', handlePause);
      }
    };
  }, [currentIndex]);

  // Handle video playback when index changes
  useEffect(() => {
    const activeVideo = videoRefs.current.get(currentIndex);
    
    // Pause all other videos
    videoRefs.current.forEach((video, index) => {
      if (video && index !== currentIndex) {
        video.pause();
        video.currentTime = 0;
      }
    });

    // Try to play active video
    if (activeVideo) {
      if (activeVideo.currentTime >= activeVideo.duration - 0.5) {
        activeVideo.currentTime = 0;
      }
      
      const playPromise = activeVideo.play();
      if (playPromise !== undefined) {
        playPromise.catch(() => {
          console.log('Auto-play prevented');
        });
      }
    }
  }, [currentIndex, filteredRecordings]);

  // Clear error after timeout
  useEffect(() => {
    if (error) {
      const timeout = setTimeout(() => setError(null), 5000);
      return () => clearTimeout(timeout);
    }
  }, [error]);

  return {
    // Data
    recordings,
    filteredRecordings,
    selectedRecording,
    isLoading,
    error,
    
    // Search/filter
    searchQuery,
    setSearchQuery,
    
    // Playback
    currentIndex,
    setCurrentIndex,
    isPlaying,
    isMuted,
    showControls,
    
    // Actions
    isUploading,
    uploadProgress,
    showDeleteConfirm,
    setShowDeleteConfirm,
    
    // Methods
    loadRecordings,
    handleNext,
    handlePrevious,
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
    getVideoRef,
    getConvertedSrc,
  };
}
