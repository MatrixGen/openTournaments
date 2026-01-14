import { useState, useEffect, useCallback } from 'react';
import { screenRecorderUtil } from '../../utils/ScreenRecorder';

export default function ScreenRecordButton({
  autoStart = false,
  platform = 'web',
  onUnsupportedPlatform,
  onStartRecording,
  startOptions,
  installUrl = '#',
  installLabel = 'Install Android App',
  showButton = true
}) {
  const [recording, setRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [expanded, setExpanded] = useState(true); // Start expanded then minimize
  const [feedback, setFeedback] = useState(null);
  const [showUnsupportedModal, setShowUnsupportedModal] = useState(false);
  const [autoStartConsumed, setAutoStartConsumed] = useState(false);

  // Timer effect
  useEffect(() => {
    let interval = null;

    if (recording) {
      interval = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } else if (interval) {
      clearInterval(interval);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [recording]);

  // Auto-minimize after 5 seconds
  useEffect(() => {
    if (recording && expanded) {
      const timer = setTimeout(() => {
        setExpanded(false);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [recording, expanded]);

  useEffect(() => {
    if (!autoStart) {
      setAutoStartConsumed(false);
    }
  }, [autoStart]);

  const resolveStartOptions = useCallback(() => {
    if (typeof startOptions === 'function') {
      return startOptions();
    }
    if (startOptions) {
      return startOptions;
    }
    return { fileName: 'game_recording.mp4' };
  }, [startOptions]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleUnsupportedPlatform = useCallback((source) => {
    setShowUnsupportedModal(true);
    setFeedback({
      type: 'info',
      message: 'Screen recording is available only in the Android app.'
    });
    onUnsupportedPlatform?.({ platform, source });
  }, [onUnsupportedPlatform, platform]);

  const handleStartRecording = useCallback(async (source) => {
    try {
      if (!recording) {
        if (platform !== 'android') {
          handleUnsupportedPlatform(source);
          return;
        }

        await screenRecorderUtil.start(resolveStartOptions());
        setRecording(true);
        setRecordingTime(0);
        setExpanded(true); // Show controls when starting
        setFeedback({
          type: 'success',
          message: 'Screen recording started.'
        });
        onStartRecording?.({ platform, source });
      }
    } catch (e) {
      console.error('Screen recording error:', e);
      setFeedback({
        type: 'error',
        message: e?.message || 'Failed to start screen recording.'
      });
    }
  }, [
    recording,
    platform,
    resolveStartOptions,
    handleUnsupportedPlatform,
    onStartRecording
  ]);

  useEffect(() => {
    if (autoStart && !autoStartConsumed && !recording) {
      setAutoStartConsumed(true);
      handleStartRecording('auto');
    }
  }, [autoStart, autoStartConsumed, recording, handleStartRecording]);

  const handleScreenRecord = async () => {
    await handleStartRecording('manual');
  };

  const handleStopRecording = async () => {
    try {
      await screenRecorderUtil.stop();
      setRecording(false);
      setRecordingTime(0);
      setFeedback({
        type: 'success',
        message: 'Game recording saved.'
      });
    } catch (e) {
      console.error('Error stopping recording:', e);
      setFeedback({
        type: 'error',
        message: e?.message || 'Failed to stop recording.'
      });
    }
  };

  // Main button for starting recording
  if (!recording) {
    return (
      <>
        {showButton && (
          <button
            onClick={handleScreenRecord}
            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg mt-4 transition-colors flex items-center gap-2 font-semibold shadow-lg"
          >
            <div className="w-3 h-3 bg-white rounded-full"></div>
            Record Game
          </button>
        )}

        {feedback && (
          <div className="mt-2 text-xs text-gray-600 dark:text-gray-300">
            {feedback.message}
          </div>
        )}

        {showUnsupportedModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
            <div className="w-full max-w-md rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 p-5 shadow-2xl">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                Screen recording unavailable
              </h3>
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
                Screen recording is available only in the Android app. Installing the app provides a better experience.
              </p>
              <div className="mt-4 flex items-center justify-end gap-3">
                <button
                  onClick={() => setShowUnsupportedModal(false)}
                  className="px-4 py-2 text-sm font-semibold text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
                >
                  Close
                </button>
                <a
                  href={installUrl}
                  className="inline-flex items-center justify-center px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold"
                >
                  {installLabel}
                </a>
              </div>
            </div>
          </div>
        )}
      </>
    );
  }

  // Recording overlay controls (non-blocking, minimal UI)
  return (
    <>
      {/* Expanded Controls (shows for 5 seconds then minimizes) */}
      {expanded && (
        <div 
          className="fixed top-4 right-4 z-50 bg-gray-900/90 backdrop-blur-sm rounded-lg shadow-2xl border border-gray-800 p-3 w-56"
          style={{ pointerEvents: 'auto' }}
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                <span className="text-red-400 font-bold text-xs">REC</span>
              </div>
              <span className="text-white text-sm font-mono font-bold">
                {formatTime(recordingTime)}
              </span>
            </div>
            <button
              onClick={() => setExpanded(false)}
              className="text-gray-400 hover:text-white text-sm font-bold"
            >
              ↓
            </button>
          </div>

          <div className="mb-3">
            <div className="text-xs text-gray-300 mb-2">Recording gameplay...</div>
          </div>

          <button
            onClick={handleStopRecording}
            className="w-full bg-red-600 hover:bg-red-700 text-white py-2 px-3 rounded font-semibold transition-colors flex items-center justify-center gap-2"
          >
            <div className="w-3 h-3 bg-white rounded-sm"></div>
            Stop Recording
          </button>
        </div>
      )}

      {/* Minimized Indicator (always visible while recording) */}
      <div 
        className="fixed top-4 right-4 z-40 bg-gray-900/80 backdrop-blur-sm rounded-full shadow-xl border border-gray-800 p-2 cursor-pointer hover:bg-gray-900 transition-all"
        onClick={() => setExpanded(!expanded)}
        title="Click for recording controls"
        style={{ 
          pointerEvents: 'auto',
          transform: expanded ? 'translateX(150px)' : 'translateX(0)' // Move out of the way when expanded
        }}
      >
        <div className="flex items-center gap-2">
          <div className="relative">
            <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
            <div className="absolute inset-0 bg-red-500 animate-ping rounded-full opacity-75"></div>
          </div>
          <span className="text-white text-sm font-mono font-bold">
            {formatTime(recordingTime)}
          </span>
        </div>
      </div>

      {/* Semi-transparent clickable area to minimize when clicking outside */}
      {expanded && (
        <div 
          className="fixed inset-0 z-30"
          onClick={() => setExpanded(false)}
          style={{ pointerEvents: 'auto' }}
        />
      )}
    </>
  );
}
