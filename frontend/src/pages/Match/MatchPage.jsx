import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import {
  CheckCircleIcon,
  FlagIcon,
  ExclamationTriangleIcon,
  TrophyIcon,
  ClockIcon,
  ArrowLeftIcon,
  ExclamationCircleIcon,
  
} from "@heroicons/react/24/outline";
import { ParticipantCard } from "../../components/matches/ParticipantCard";
import { ReportModal } from "../../components/matches/ReportModal";
import { DisputeModal } from "../../components/matches/DisputeModal";
import Banner from "../../components/common/Banner";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import ActionButtons from "../../components/matches/ActionButtons";
import { matchService } from "../../services/matchService";
import { Capacitor } from "@capacitor/core";
import MobileActionBar from "../../components/matches/MobileActionBar";
import ParticipantsSection from "../../components/matches/ParticipantSection";
import MatchHeader from "../../components/matches/MatchHeader";

// Debug flag for screen recording (set to true to enable logging)
const DEBUG_RECORDING = false;

// Memoized status configuration with theme support
export const STATUS_CONFIG = {
  scheduled: {
    color: "text-blue-600 dark:text-blue-400",
    bgColor: "bg-blue-50 dark:bg-blue-900/20",
    borderColor: "border-blue-200 dark:border-blue-800",
    icon: ClockIcon,
    label: "Scheduled",
    gradient: "from-blue-50 to-white dark:from-blue-900/10 dark:to-gray-800",
  },
  live: {
    color: "text-green-600 dark:text-green-400",
    bgColor: "bg-green-50 dark:bg-green-900/20",
    borderColor: "border-green-200 dark:border-green-800",
    icon: TrophyIcon,
    label: "Live",
    gradient: "from-green-50 to-white dark:from-green-900/10 dark:to-gray-800",
  },
  reported: {
    color: "text-amber-600 dark:text-amber-400",
    bgColor: "bg-amber-50 dark:bg-amber-900/20",
    borderColor: "border-amber-200 dark:border-amber-800",
    icon: ExclamationTriangleIcon,
    label: "Reported",
    gradient: "from-amber-50 to-white dark:from-amber-900/10 dark:to-gray-800",
  },
  completed: {
    color: "text-emerald-600 dark:text-emerald-400",
    bgColor: "bg-emerald-50 dark:bg-emerald-900/20",
    borderColor: "border-emerald-200 dark:border-emerald-800",
    icon: CheckCircleIcon,
    label: "Completed",
    gradient:
      "from-emerald-50 to-white dark:from-emerald-900/10 dark:to-gray-800",
  },
  disputed: {
    color: "text-red-600 dark:text-red-400",
    bgColor: "bg-red-50 dark:bg-red-900/20",
    borderColor: "border-red-200 dark:border-red-800",
    icon: FlagIcon,
    label: "Disputed",
    gradient: "from-red-50 to-white dark:from-red-900/10 dark:to-gray-800",
  },
  awaiting_confirmation: {
    color: "text-orange-600 dark:text-orange-400",
    bgColor: "bg-orange-50 dark:bg-orange-900/20",
    borderColor: "border-orange-200 dark:border-orange-800",
    icon: ExclamationTriangleIcon,
    label: "Awaiting Confirmation",
    gradient:
      "from-orange-50 to-white dark:from-orange-900/10 dark:to-gray-800",
  },
};

export default function MatchPage() {
  const { id } = useParams();
  const matchId = id;

  const navigate = useNavigate();
  const { user } = useAuth();

  // State
  const [match, setMatch] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [score, setScore] = useState({
    player1_score: 0,
    player2_score: 0,
    evidence_file: null,
    evidence_url: "",
  });
  const [disputeReason, setDisputeReason] = useState("");
  const [showReportModal, setShowReportModal] = useState(false);
  const [showDisputeModal, setShowDisputeModal] = useState(false);
  const [isReporting, setIsReporting] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [isDisputing, setIsDisputing] = useState(false);
  const [isMarkingReady, setIsMarkingReady] = useState(false);
  const [isMarkingNotReady, setIsMarkingNotReady] = useState(false);
  const [isConfirmingActive, setIsConfirmingActive] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(null);
  const [autoStartRecording, setAutoStartRecording] = useState(false);
  const [recordingStartOptions, setRecordingStartOptions] = useState(null);
  const [preConfirmCountdown, setPreConfirmCountdown] = useState(null);
  const [showRedirecting, setShowRedirecting] = useState(false);

  // Ref to track if recording has been triggered for this match session
  const hasTriggeredRecordingRef = useRef(false);

  // Enhanced ready status state
  const [readyStatus, setReadyStatus] = useState({
    handshakeStatus: "waiting",
    handshakeCompleted: false,
    participant1Ready: false,
    participant1ActiveConfirmed: false,
    participant2Ready: false,
    participant2ActiveConfirmed: false,
    totalReady: 0,
    totalActiveConfirmed: 0,
    required: 2,
    isLive: false,
  });

  // Fetch match data
  const fetchMatchData = useCallback(async () => {
    if (!matchId) return;

    try {
      setLoading(true);
      const matchData = await matchService.getById(matchId);
      setMatch(matchData);

      // Set initial score state
      setScore({
        player1_score: matchData.participant1_score || 0,
        player2_score: matchData.participant2_score || 0,
        evidence_file: null,
        evidence_url: "",
      });

      // Set initial ready status based on match status
      setReadyStatus((prev) => ({
        ...prev,
        isLive: matchData.status === "live",
      }));

      setError("");
    } catch (err) {
      setError("Failed to load match data. Please try again.");
      console.error("Error fetching match:", err);
    } finally {
      setLoading(false);
    }
  }, [matchId]);

  // Initial data fetch
  useEffect(() => {
    fetchMatchData();
  }, [fetchMatchData]);

  // Countdown Timer for Auto-confirm
  useEffect(() => {
    if (match?.status === "awaiting_confirmation" && match.auto_confirm_at) {
      const updateTimer = () => {
        const now = Date.now();
        const autoConfirmAt = new Date(match.auto_confirm_at).getTime();
        const remaining = autoConfirmAt - now;

        if (remaining <= 0) {
          setTimeRemaining(null);
          // Refresh match data when timer expires
          fetchMatchData();
        } else {
          setTimeRemaining(remaining);
        }
      };

      updateTimer();
      const interval = setInterval(updateTimer, 1000);
      return () => clearInterval(interval);
    } else {
      setTimeRemaining(null);
    }
  }, [match?.status, match?.auto_confirm_at, fetchMatchData]);

  // Fetch ready status when match is scheduled or live
  const fetchReadyStatus = useCallback(async () => {
    if (!match?.id || !["scheduled", "live"].includes(match.status)) return;

    try {
      const status = await matchService.getReadyStatus(match.id);
      setReadyStatus(prev => ({
        ...prev,
        ...status,
        handshakeStatus: status.handshakeStatus || prev.handshakeStatus,
        handshakeCompleted: status.handshakeCompleted || prev.handshakeCompleted,
        isLive: status.isLive || prev.isLive,
      }));

      // If match status doesn't match handshake status, fetch updated match data
      if (status.handshakeCompleted && match.status !== "live") {
        fetchMatchData();
      }
    } catch (err) {
      console.error("Failed to fetch ready status:", err);
    }
  }, [match?.id, match?.status, fetchMatchData]);

  useEffect(() => {
    if (match?.id && user?.id) {
      fetchReadyStatus();

      // Poll every 5 seconds for live updates
      const interval = setInterval(fetchReadyStatus, 5000);
      return () => clearInterval(interval);
    }
  }, [fetchReadyStatus, match?.id, user?.id]);

  // Safety-net: Auto-trigger screen recording when match becomes live
  // This handles cases where the 10-second polling in handleConfirmActive times out
  useEffect(() => {
    // Only trigger if:
    // 1. User is a participant
    // 2. Match is live (either match.status or readyStatus.isLive)
    // 3. We haven't already triggered recording for this session
    // 4. We're on a supported platform
    const isMatchLive = match?.status === "live" || readyStatus.isLive;
    const platform = Capacitor.getPlatform();
    const isPlatformSupported = platform === "android";

    if (DEBUG_RECORDING) {
      console.log("[ScreenRecord Debug]", {
        isParticipant,
        isMatchLive,
        matchStatus: match?.status,
        readyStatusIsLive: readyStatus.isLive,
        hasTriggered: hasTriggeredRecordingRef.current,
        isPlatformSupported,
        autoStartRecording,
      });
    }

    if (
      isParticipant &&
      isMatchLive &&
      !hasTriggeredRecordingRef.current &&
      isPlatformSupported &&
      match?.id
    ) {
      if (DEBUG_RECORDING) {
        console.log("[ScreenRecord] Triggering auto-start recording for match", match.id);
      }

      // Mark as triggered to prevent duplicates
      hasTriggeredRecordingRef.current = true;

      // Set recording options and trigger auto-start
      setRecordingStartOptions({
        fileName: `match_${match.id}_${Date.now()}.mp4`,
        autoCleanupDays: 7,
      });
      setAutoStartRecording(true);
    }
  }, [
    match?.id,
    match?.status,
    readyStatus.isLive,
    isParticipant,
    autoStartRecording,
  ]);

  // Reset recording trigger when match changes or is no longer live
  useEffect(() => {
    const isMatchLive = match?.status === "live" || readyStatus.isLive;
    
    // Reset the trigger flag if match is not live anymore
    if (!isMatchLive && hasTriggeredRecordingRef.current) {
      if (DEBUG_RECORDING) {
        console.log("[ScreenRecord] Resetting trigger flag - match no longer live");
      }
      hasTriggeredRecordingRef.current = false;
    }
  }, [match?.status, readyStatus.isLive]);

  // Memoized permissions to prevent recalculation
  const { isPlayer1, isPlayer2, isParticipant, isReporter } = useMemo(() => {
    const participant1Id =
      match?.participant1?.user?.id ?? match?.participant1?.user_id;
    const participant2Id =
      match?.participant2?.user?.id ?? match?.participant2?.user_id;
    const reportedById =
      match?.reported_by_user_id ??
      match?.reported_by_user?.id ??
      match?.reported_by?.id;

    return {
      isPlayer1: user && participant1Id === user.id,
      isPlayer2: user && participant2Id === user.id,
      isParticipant: user && (participant1Id === user.id || participant2Id === user.id),
      isReporter: user && reportedById === user.id,
    };
  }, [
    user,
    match?.participant1?.user?.id,
    match?.participant1?.user_id,
    match?.participant2?.user?.id,
    match?.participant2?.user_id,
    match?.reported_by_user_id,
    match?.reported_by_user?.id,
    match?.reported_by?.id,
  ]);

  // Memoized status config and message
  const statusConfig = useMemo(
    () =>
      match
        ? STATUS_CONFIG[match.status] || STATUS_CONFIG.scheduled
        : STATUS_CONFIG.scheduled,
    [match]
  );

  const statusMessage = useMemo(() => {
    if (!match) return null;

    if (match.status === "awaiting_confirmation") {
      return isReporter
        ? "Waiting for opponent confirmation"
        : "Opponent reported score. Please confirm or dispute";
    }
    if (match.status === "scheduled" && isParticipant) {
      const handshakeStatus = readyStatus?.handshakeStatus;
      if (handshakeStatus === "waiting")
        return "Both players need to mark themselves as ready";
      if (handshakeStatus === "one_ready")
        return "One player is ready. Waiting for the other...";
      if (handshakeStatus === "both_ready")
        return "Both players are ready! Confirm active to start match.";
    }
    if (match.status === "live") {
      return "Match is live! You can now play and report the final score.";
    }
    return null;
  }, [match, isReporter, isParticipant, readyStatus?.handshakeStatus]);

  // Event handlers with useCallback
  const handleBack = useCallback(() => {
    navigate(-1);
  }, [navigate]);

  const resetForms = useCallback(() => {
    setScore({
      player1_score: match?.participant1_score || 0,
      player2_score: match?.participant2_score || 0,
      evidence_file: null,
      evidence_url: "",
    });
    setDisputeReason("");
    setError("");
    setSuccess("");
  }, [match?.participant1_score, match?.participant2_score]);

  const handleReportScore = useCallback(async () => {
    if (!match) return;

    setIsReporting(true);
    setError("");
    setSuccess("");

    try {
      await matchService.reportScore(match.id, score);
      setSuccess(
        "Score reported successfully. Waiting for opponent confirmation."
      );
      setShowReportModal(false);
      resetForms();
      fetchMatchData();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to report score.");
    } finally {
      setIsReporting(false);
    }
  }, [match, score, fetchMatchData, resetForms]);

  const handleConfirmScore = useCallback(async () => {
    if (!match) return;

    setIsConfirming(true);
    setError("");
    setSuccess("");

    try {
      await matchService.confirmScore(match.id);
      setSuccess("Score confirmed successfully. Match completed.");
      fetchMatchData();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to confirm score.");
    } finally {
      setIsConfirming(false);
    }
  }, [match, fetchMatchData]);

  const handleDispute = useCallback(async () => {
    if (!match) return;

    if (!disputeReason.trim()) {
      setError("Please provide a reason for disputing the score.");
      return;
    }

    setIsDisputing(true);
    setError("");
    setSuccess("");

    try {
      await matchService.dispute(match.id, {
        reason: disputeReason,
        evidence_url: "",
      });
      setSuccess("Dispute raised successfully. Admins will review it.");
      setShowDisputeModal(false);
      resetForms();
      fetchMatchData();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to raise dispute.");
    } finally {
      setIsDisputing(false);
    }
  }, [match, disputeReason, fetchMatchData, resetForms]);

  // Handlers for ready status - FIXED
  const handleMarkReady = useCallback(async () => {
    if (!match) return;

    setIsMarkingReady(true);
    setError("");
    setSuccess("");

    try {
      const result = await matchService.markReady(match.id);
      
      // Update readyStatus with the server response
      setReadyStatus(prev => ({
        ...prev,
        ...result.readyStatus,
        handshakeStatus: result.readyStatus?.handshakeStatus || prev.handshakeStatus,
        totalReady: result.readyStatus?.totalReady || prev.totalReady,
        isLive: result.readyStatus?.isLive || prev.isLive,
      }));
      
      setSuccess(result.message);

      // If handshake completed, fetch updated match status
      if (result.readyStatus?.handshakeCompleted || result.matchLive) {
        fetchMatchData();
      }
    } catch (err) {
      setError(err.response?.data?.message || "Failed to mark as ready.");
    } finally {
      setIsMarkingReady(false);
    }
  }, [match, fetchMatchData]);

  const handleMarkNotReady = useCallback(async () => {
    if (!match) return;

    setIsMarkingNotReady(true);
    setError("");
    setSuccess("");

    try {
      const result = await matchService.markNotReady(match.id);
      
      // Update readyStatus with the server response
      setReadyStatus(prev => ({
        ...prev,
        ...result.readyStatus,
        handshakeStatus: result.readyStatus?.handshakeStatus || 'waiting',
        totalReady: result.readyStatus?.totalReady || 0,
        isLive: false,
        handshakeCompleted: false,
      }));
      
      setSuccess(result.message);

      // Trigger update
      if (match.status === "live") {
        fetchMatchData();
      }
    } catch (err) {
      setError(err.response?.data?.message || "Failed to mark as not ready.");
    } finally {
      setIsMarkingNotReady(false);
    }
  }, [match, fetchMatchData]);

  // Handle confirm active - FIXED
  const handleConfirmActive = useCallback(async () => {
    if (!match) return;
    if (isConfirmingActive || preConfirmCountdown !== null || showRedirecting) {
      return;
    }

    setIsConfirmingActive(true);
    setError("");
    setSuccess("");

    const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));
    const refreshLiveStatus = async () => {
      try {
        const status = await matchService.getReadyStatus(match.id);
        setReadyStatus(prev => ({
          ...prev,
          ...status,
          handshakeStatus: status.handshakeStatus || prev.handshakeStatus,
          handshakeCompleted: status.handshakeCompleted ?? prev.handshakeCompleted,
          isLive: status.isLive ?? prev.isLive,
        }));
        return status.isLive;
      } catch (statusError) {
        console.error("Failed to refresh ready status:", statusError);
        return false;
      }
    };

    try {
      const result = await matchService.confirmActive(match.id);
      
      // Update readyStatus with the server response
      setReadyStatus(prev => ({
        ...prev,
        ...result.activeStatus,
        handshakeStatus: 'handshake_completed',
        handshakeCompleted: true,
        isLive: result.activeStatus?.matchLive || false,
      }));
      
      setSuccess(result.message);

      let matchIsLive = result.activeStatus?.matchLive || false;
      if (!matchIsLive) {
        setPreConfirmCountdown(10);
        for (let count = 10; count >= 1; count -= 1) {
          setPreConfirmCountdown(count);
          matchIsLive = await refreshLiveStatus();
          if (matchIsLive) {
            break;
          }
          await wait(1000);
        }
        setPreConfirmCountdown(null);
      }

      if (matchIsLive) {
        setShowRedirecting(true);
        await wait(800);
        setShowRedirecting(false);
        
        // Mark as triggered to prevent duplicate auto-starts from the safety-net
        hasTriggeredRecordingRef.current = true;
        
        setRecordingStartOptions({
          fileName: `match_${match.id}_${Date.now()}.mp4`,
          autoCleanupDays: 7,
        });
        setAutoStartRecording(true);
      }

      // Refresh match status
      fetchMatchData();
    } catch (err) {
      setError(
        err.response?.data?.message || "Failed to confirm active status."
      );
    } finally {
      setIsConfirmingActive(false);
    }
  }, [
    match,
    fetchMatchData,
    isConfirmingActive,
    preConfirmCountdown,
    showRedirecting
  ]);

  const handleShowReport = useCallback(() => {
    if (!match) return;

    // Check if match is live or handshake is completed
    if (match.status !== "live" && !readyStatus?.handshakeCompleted) {
      setError(
        "Match must be live before reporting scores. Complete the handshake first."
      );
      return;
    }
    setShowReportModal(true);
  }, [match, readyStatus?.handshakeCompleted]);

  const handleShowDispute = useCallback(() => setShowDisputeModal(true), []);

  const handleCloseReport = useCallback(() => {
    setShowReportModal(false);
    resetForms();
  }, [resetForms]);

  const handleCloseDispute = useCallback(() => {
    setShowDisputeModal(false);
    resetForms();
  }, [resetForms]);

  const clearError = useCallback(() => setError(""), []);
  const clearSuccess = useCallback(() => setSuccess(""), []);

  const platform = Capacitor.getPlatform();

  const screenRecordProps = useMemo(
    () => ({
      platform,
      autoStart: autoStartRecording,
      startOptions: recordingStartOptions,
      onStartRecording: () => setAutoStartRecording(false),
      onUnsupportedPlatform: () => setAutoStartRecording(false),
    }),
    [platform, autoStartRecording, recordingStartOptions]
  );

  // Determine current user's ready status for ActionButtons
  const getCurrentUserReadyStatus = useMemo(() => {
    if (!user || !match) return null;

    const isPlayer1 = user.id === match.participant1?.user?.id;
    
    return {
      isReady: isPlayer1 ? readyStatus.participant1Ready : readyStatus.participant2Ready,
      isActiveConfirmed: isPlayer1 ? readyStatus.participant1ActiveConfirmed : readyStatus.participant2ActiveConfirmed,
      opponentReady: isPlayer1 ? readyStatus.participant2Ready : readyStatus.participant1Ready,
      opponentActiveConfirmed: isPlayer1 ? readyStatus.participant2ActiveConfirmed : readyStatus.participant1ActiveConfirmed,
    };
  }, [user, match, readyStatus]);

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <LoadingSpinner size="lg" text="Loading match..." />
      </div>
    );
  }

  // Error state
  if (error && !match) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <button
            onClick={handleBack}
            className="flex items-center text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 mb-6"
          >
            <ArrowLeftIcon className="h-4 w-4 mr-2" />
            Back
          </button>

          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6">
            <div className="flex items-center">
              <ExclamationCircleIcon className="h-8 w-8 text-red-500 mr-3" />
              <div>
                <h3 className="text-lg font-medium text-red-800 dark:text-red-300">
                  Failed to load match
                </h3>
                <p className="mt-2 text-sm text-red-700 dark:text-red-400">
                  {error}
                </p>
                <button
                  onClick={fetchMatchData}
                  className="mt-4 text-sm font-medium text-red-700 dark:text-red-300 hover:text-red-600 dark:hover:text-red-200"
                >
                  Try again
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!match) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <button
            onClick={handleBack}
            className="flex items-center text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 mb-6"
          >
            <ArrowLeftIcon className="h-4 w-4 mr-2" />
            Back
          </button>

          <div className="text-center">
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
              Match not found
            </h3>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
              The match you're looking for doesn't exist or has been removed.
            </p>
            <button
              onClick={handleBack}
              className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Back to matches
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white dark:from-gray-900 dark:to-gray-800 pb-20 md:pb-8">
      {(preConfirmCountdown !== null || showRedirecting) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
          <div className="text-center">
            {preConfirmCountdown !== null ? (
              <div className="space-y-3">
                <div className="text-6xl md:text-7xl font-extrabold text-white animate-pulse">
                  {preConfirmCountdown}
                </div>
                <div className="text-sm md:text-base text-white/80">
                  Waiting for opponent to confirm...
                </div>
              </div>
            ) : (
              <div className="text-2xl md:text-3xl font-semibold text-white animate-pulse">
                Redirecting to game...
              </div>
            )}
          </div>
        </div>
      )}
      {/* Modals */}
      <ReportModal
        show={showReportModal}
        onClose={handleCloseReport}
        onReport={handleReportScore}
        score={score}
        onScoreChange={setScore}
        isReporting={isReporting}
        error={error}
        isPlayer1={isPlayer1}
      />

      <DisputeModal
        show={showDisputeModal}
        onClose={handleCloseDispute}
        onDispute={handleDispute}
        disputeReason={disputeReason}
        onDisputeReasonChange={setDisputeReason}
        isDisputing={isDisputing}
        error={error}
      />

      {/* Match Card */}
      <div className="bg-white dark:bg-gray-800 rounded-xl md:rounded-2xl shadow-lg dark:shadow-gray-900/30 border border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 transition-all duration-200 w-full overflow-hidden mt-4">
        {/* Header */}
        <MatchHeader
          match={match}
          statusConfig={statusConfig}
          timeRemaining={timeRemaining}
          onBack={handleBack}
          screenRecordProps={screenRecordProps}
        />

        {/* Success Banner */}
        {success && (
          <div className="px-4 md:px-6 pt-4">
            <Banner
              type="success"
              title="Success!"
              autoDismiss={true}
              message={success}
              onClose={clearSuccess}
            />
          </div>
        )}

        {/* Error Banner */}
        {error && (
          <div className="px-4 md:px-6 pt-4">
            <Banner
              type="error"
              title="Action Failed"
              message={error}
              autoDismiss={true}
              onClose={clearError}
            />
          </div>
        )}

        {/* Participants */}
        <ParticipantsSection
          match={match}
          isPlayer1={isPlayer1}
          isPlayer2={isPlayer2}
        />

        {/* Status Message */}
        {statusMessage && (
          <div className="px-4 md:px-6 pb-4 md:pb-6">
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/10 dark:to-indigo-900/10 border border-blue-100 dark:border-blue-800/30 rounded-lg p-3 md:p-4">
              <p className="text-sm font-medium text-blue-700 dark:text-blue-300 text-center">
                {statusMessage}
              </p>
            </div>
          </div>
        )}

        {/* Ready Status Progress */}
        {match.status === "scheduled" && isParticipant && (
          <div className="px-4 md:px-6 pb-4">
            <div className="bg-gray-50 dark:bg-gray-700/30 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Ready Status
                </span>
                <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                  {readyStatus.totalReady}/{readyStatus.required} ready
                </span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                <div
                  className="bg-gradient-to-r from-green-500 to-emerald-500 h-2 rounded-full transition-all duration-300"
                  style={{
                    width: `${
                      (readyStatus.totalReady / readyStatus.required) * 100
                    }%`,
                  }}
                ></div>
              </div>
              <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                {readyStatus.handshakeStatus === "both_ready"
                  ? "Both players ready! Confirm active to start match."
                  : readyStatus.handshakeStatus === "one_ready"
                  ? "One player ready. Waiting for opponent..."
                  : "Waiting for players to mark ready"}
              </div>
            </div>
          </div>
        )}

        {/* Desktop Actions */}
        <div className="hidden md:block px-6 pb-6">
          <ActionButtons
            match={match}
            isReporter={isReporter}
            isParticipant={isParticipant}
            onShowReport={handleShowReport}
            onConfirm={handleConfirmScore}
            onShowDispute={handleShowDispute}
            onMarkReady={handleMarkReady}
            onMarkNotReady={handleMarkNotReady}
            onConfirmActive={handleConfirmActive}
            isConfirming={isConfirming}
            isDisputing={isDisputing}
            isMarkingReady={isMarkingReady}
            isMarkingNotReady={isMarkingNotReady}
            isConfirmingActive={isConfirmingActive}
            readyStatus={readyStatus}
            user={user}
            getCurrentUserReadyStatus={getCurrentUserReadyStatus}
          />
        </div>
      </div>

      {/* Match Details */}
      <div className="mt-4 bg-white dark:bg-gray-800 rounded-xl shadow-sm dark:shadow-gray-900/20 border border-gray-200 dark:border-gray-700 p-4 md:p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
          Match Details
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <div className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">
              Bracket
            </div>
            <div className="text-sm font-medium text-gray-900 dark:text-gray-100 capitalize">
              {match.bracket_type || "Single"}
            </div>
          </div>
          <div>
            <div className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">
              Round
            </div>
            <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
              {match.round_number}
            </div>
          </div>
          <div>
            <div className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">
              Match Order
            </div>
            <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
              {match.match_order}
            </div>
          </div>
          <div>
            <div className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">
              Created
            </div>
            <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
              {new Date(match.created_at).toLocaleDateString()}
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Bottom Action Bar */}
      <MobileActionBar
        match={match}
        isParticipant={isParticipant}
        isReporter={isReporter}
        onShowReport={handleShowReport}
        onConfirm={handleConfirmScore}
        onShowDispute={handleShowDispute}
        onMarkReady={handleMarkReady}
        onMarkNotReady={handleMarkNotReady}
        onConfirmActive={handleConfirmActive}
        readyStatus={readyStatus}
        getCurrentUserReadyStatus={getCurrentUserReadyStatus}
        isConfirming={isConfirming}
        isDisputing={isDisputing}
        isMarkingReady={isMarkingReady}
        isMarkingNotReady={isMarkingNotReady}
        isConfirmingActive={isConfirmingActive}
        currentUser={user}
      />
    </div>
  );
}
