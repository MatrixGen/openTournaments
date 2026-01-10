// Chat.jsx - Optimized with Brand Colors and Tailwind Dark Mode
import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { useChat } from "../../contexts/ChatContext";
import { tournamentService } from "../../services/tournamentService";
import { useAuth } from "../../contexts/AuthContext";
import ChatWindow from "../chat/ChatWindow";
import {
  Trophy,
  Users,
  Calendar,
  Clock,
  ArrowLeft,
  Wifi,
  WifiOff,
  MessageCircle,
  ChevronLeft,
  MoreVertical,
  Hash,
  Lock,
  Globe,
  UserPlus,
  Crown,
  Settings,
  Volume2,
  VolumeX,
  Bell,
  BellOff,
  Link,
  Share2,
  Zap,
  Target,
  Award,
} from "lucide-react";
import Banner from "../../components/common/Banner";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import ChannelService from "../../services/chatService";

// Utility function for conditional class names
function cn(...classes) {
  return classes.filter(Boolean).join(" ");
}

// Status colors mapping with brand colors
const STATUS_COLORS = {
  live: "bg-gradient-to-r from-emerald-500 to-green-500 text-white",
  upcoming: "bg-gradient-to-r from-blue-500 to-indigo-500 text-white",
  open: "bg-gradient-to-r from-amber-500 to-yellow-500 text-white",
  completed: "bg-gradient-to-r from-gray-500 to-gray-600 text-white",
  default: "bg-gradient-to-r from-purple-500 to-indigo-500 text-white",
};

// Channel type icons and colors with brand gradients
const CHANNEL_TYPE_CONFIG = {
  direct: {
    icon: Users,
    gradient: "from-indigo-500 to-purple-500",
    badge: "DM",
    text: "text-indigo-600 dark:text-indigo-400"
  },
  group: {
    icon: Users,
    gradient: "from-purple-500 to-violet-500",
    badge: "Group",
    text: "text-purple-600 dark:text-purple-400"
  },
  channel: {
    icon: Hash,
    gradient: "from-purple-600 to-indigo-600",
    badge: "Channel",
    text: "text-purple-700 dark:text-purple-300"
  },
};

// Badge styles with brand colors
const BADGE_STYLES = {
  private: "bg-gradient-to-r from-purple-100 to-violet-100 dark:from-purple-900/40 dark:to-violet-900/40 text-purple-800 dark:text-purple-300 border border-purple-200 dark:border-purple-800",
  public: "bg-gradient-to-r from-emerald-100 to-green-100 dark:from-emerald-900/40 dark:to-green-900/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800",
  owner: "bg-gradient-to-r from-amber-100 to-yellow-100 dark:from-amber-900/40 dark:to-yellow-900/40 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800",
  admin: "bg-gradient-to-r from-blue-100 to-indigo-100 dark:from-blue-900/40 dark:to-indigo-900/40 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-800",
  member: "bg-gradient-to-r from-purple-100 to-indigo-100 dark:from-purple-900/40 dark:to-indigo-900/40 text-purple-800 dark:text-purple-300 border border-purple-200 dark:border-purple-800"
};

export default function Chat() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  // Determine chat type from route
  const isTournamentChat = location.pathname.startsWith("/tournaments/");
  const isChannelChat = location.pathname.startsWith("/channels/");

  // State
  const [chatData, setChatData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [isMobile, setIsMobile] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [channelSettings, setChannelSettings] = useState({
    isMuted: false,
    notificationsEnabled: true,
    hidePreviews: false,
  });

  // Refs
  const {
    currentChannel,
    setCurrentChannel,
    isConnected,
    retryConnection,
    clearError: clearChatError,
    onlineUsers,
  } = useChat();

  const { user } = useAuth();
  const hasSetChannelRef = useRef(false);
  const retryCountRef = useRef(0);
  const MAX_RETRIES = 3;

  // Mobile detection
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();

    let timeoutId;
    const handleResize = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(checkMobile, 100);
    };

    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
      clearTimeout(timeoutId);
    };
  }, []);

  // Load data based on chat type
  const loadChatData = useCallback(
    async (isRetry = false) => {
      if (isRetry) {
        retryCountRef.current++;
        if (retryCountRef.current > MAX_RETRIES) {
          setError("Failed to load chat. Please refresh.");
          setIsLoading(false);
          return;
        }
      } else {
        retryCountRef.current = 0;
      }

      try {
        setIsLoading(true);
        setError("");
        clearChatError?.();

        let data;

        if (isTournamentChat) {
          // Load tournament data
          data = await tournamentService.getById(id);
          if (!data?.id) {
            throw new Error("Invalid tournament data");
          }

          // Format as chat data object
          data = {
            type: "tournament",
            id: data.id,
            name: data.name,
            description: data.description,
            status: data.status,
            participants: data.participants,
            start_time: data.start_time,
            game_type: data.game_type,
            chat_channel_id: data.chat_channel_id,
            metadata: {
              ...data,
              chatType: "tournament",
            },
          };
        } else if (isChannelChat) {
          // Load channel data
          data = await ChannelService.getChannel(id);
          if (!data?.data?.channel && !data?.channel) {
            throw new Error("Invalid channel data");
          }

          const channel = data.data?.channel || data.channel;

          // Format as chat data object
          data = {
            type: "channel",
            id: channel.id,
            name: channel.name,
            description: channel.description,
            channelType: channel.type,
            isPrivate: channel.isPrivate,
            memberCount: channel.memberCount,
            members: channel.members,
            admins: channel.admins || [],
            ownerId: channel.ownerId || channel.createdBy,
            owner: channel.owner || channel.creator,
            isMember: channel.isMember,
            userRole: channel.userRole,
            createdAt: channel.createdAt,
            updatedAt: channel.updatedAt,
            tags: channel.tags || [],
            metadata: {
              ...channel,
              chatType: "channel",
            },
          };
        } else {
          throw new Error("Invalid chat route");
        }

        setChatData(data);
        return data;
      } catch (err) {
        console.error("Chat data loading error:", err);
        const errorMessage =
          err.response?.data?.message || err.message || "Failed to load chat";
        setError(errorMessage);
        throw new Error(errorMessage);
      } finally {
        setIsLoading(false);
      }
    },
    [id, isTournamentChat, isChannelChat, clearChatError]
  );

  // Initial load
  useEffect(() => {
    if (!id) return;

    loadChatData().catch(() => {
      // Error handled in loadChatData
    });

    return () => {
      setChatData(null);
    };
  }, [id, loadChatData]);

  // Set chat channel
  useEffect(() => {
    if (!chatData || hasSetChannelRef.current) return;

    let channelId;
    let channelName;
    let channelDescription;

    if (chatData.type === "tournament") {
      channelId = chatData.chat_channel_id;
      channelName = chatData.name ? `${chatData.name} Chat` : "Tournament Chat";
      channelDescription =
        chatData.description || `Chat for ${chatData.name} tournament`;
    } else if (chatData.type === "channel") {
      channelId = chatData.id;
      channelName = chatData.name;
      channelDescription = chatData.description;
    }

    if (channelId && currentChannel?.id !== channelId) {
      setCurrentChannel({
        id: channelId,
        name: channelName,
        description: channelDescription,
        type: chatData.channelType || "channel",
        isPrivate: chatData.isPrivate || false,
        metadata: {
          chatType: chatData.type,
          ...chatData.metadata,
        },
      });
      hasSetChannelRef.current = true;
    }

    return () => {
      hasSetChannelRef.current = false;
    };
  }, [chatData, currentChannel?.id, setCurrentChannel]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (hasSetChannelRef.current) {
        setCurrentChannel?.(null);
      }
    };
  }, [setCurrentChannel]);

  // Navigation handlers
  const handleBack = useCallback(() => {
    if (chatData?.type === "tournament") {
      navigate(`/tournaments/${id}`);
    } else if (chatData?.type === "channel") {
      navigate("/channels");
    } else {
      navigate("/");
    }
  }, [navigate, id, chatData]);

  const handleRetry = useCallback(async () => {
    setError("");
    clearChatError?.();
    try {
      await loadChatData(true);
    } catch {
      // Error handled in loadChatData
    }
  }, [loadChatData, clearChatError]);

  const handleReconnect = useCallback(() => {
    setError("");
    clearChatError?.();
    retryConnection?.();
  }, [retryConnection, clearChatError]);

  const handleInvite = useCallback(() => {
    if (chatData?.type === "channel" && chatData?.id) {
      setShowInviteModal(true);
    }
  }, [chatData]);

  const handleCopyInviteLink = useCallback(() => {
    const inviteLink = `${window.location.origin}/channels/${id}/join`;
    navigator.clipboard.writeText(inviteLink);

    // Show success message
    alert("Invite link copied to clipboard!");
  }, [id]);

  const handleToggleMute = useCallback(() => {
    setChannelSettings((prev) => ({
      ...prev,
      isMuted: !prev.isMuted,
    }));
  }, []);

  const handleToggleNotifications = useCallback(() => {
    setChannelSettings((prev) => ({
      ...prev,
      notificationsEnabled: !prev.notificationsEnabled,
    }));
  }, []);

  // Memoized values
  const chatStatus = useMemo(() => {
    if (chatData?.type === "tournament") {
      return chatData.status?.toLowerCase() || "unknown";
    }
    return "active";
  }, [chatData]);

  const statusColorClass = useMemo(() => {
    if (chatData?.type === "tournament") {
      return STATUS_COLORS[chatStatus] || STATUS_COLORS.default;
    }
    return STATUS_COLORS.default;
  }, [chatData?.type, chatStatus]);

  const statusDisplay = useMemo(() => {
    if (chatData?.type === "tournament") {
      return chatData.status?.toUpperCase() || 'UNKNOWN';
    }
    return chatData?.isPrivate ? "PRIVATE" : "PUBLIC";
  }, [chatData]);

  const formatDate = useCallback((dateString) => {
    try {
      return new Date(dateString).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    } catch {
      return "Invalid date";
    }
  }, []);

  const isUserMember = useMemo(() => {
    if (!chatData || !user) return false;

    if (chatData.type === "tournament") {
      const participants = chatData.participants || [];
      return participants.some(
        (participant) =>
          participant.id === user.id ||
          participant.user_id === user.id ||
          participant.user?.id === user.id ||
          participant.userId === user.id
      );
    } else if (chatData.type === "channel") {
      return chatData.isMember;
    }

    return false;
  }, [chatData, user]);

  const isChatEnabled = useMemo(() => {
    if (!chatData) return false;

    if (chatData.type === "tournament") {
      const hasChatChannel = !!chatData.chat_channel_id;
      return hasChatChannel;
    } else if (chatData.type === "channel") {
      return true;
    }

    return false;
  }, [chatData]);

  const shouldShowChat = useMemo(
    () => chatData && isChatEnabled && (isUserMember || !chatData.isPrivate),
    [chatData, isChatEnabled, isUserMember]
  );

  const channelConfig = useMemo(() => {
    if (chatData?.type === "channel" && chatData.channelType) {
      return (
        CHANNEL_TYPE_CONFIG[chatData.channelType] || CHANNEL_TYPE_CONFIG.channel
      );
    }
    return CHANNEL_TYPE_CONFIG.channel;
  }, [chatData]);

  const isUserAdmin = useMemo(() => {
    if (!chatData || !user) return false;

    if (chatData.type === "channel") {
      return chatData.admins?.includes(user.id) || chatData.ownerId === user.id;
    }

    return false;
  }, [chatData, user]);

  const isUserOwner = useMemo(() => {
    if (!chatData || !user) return false;

    if (chatData.type === "channel") {
      return chatData.ownerId === user.id;
    }

    return false;
  }, [chatData, user]);

  // Memoized banners
  const banners = useMemo(() => {
    const bannerList = [];

    if (error) {
      bannerList.push({
        id: "error",
        type: "error",
        title: "Chat Error",
        message: error,
        action: { text: "Retry", onClick: handleRetry },
      });
    }

    if (chatData?.type === "tournament" && !isChatEnabled && !error) {
      bannerList.push({
        id: "chat-disabled",
        type: "info",
        title: "Chat Not Available",
        message: "Chat has not been enabled for this tournament.",
        action: { text: "View Tournament", onClick: handleBack },
      });
    }

    if (!isConnected && !error && chatData && isChatEnabled) {
      bannerList.push({
        id: "connection",
        type: "warning",
        title: "Connection Lost",
        message: "You are currently disconnected from the chat.",
        action: { text: "Reconnect", onClick: handleReconnect },
      });
    }

    if (isChatEnabled && !isUserMember && chatData?.isPrivate) {
      bannerList.push({
        id: "non-member",
        type: "info",
        title: "Join to Chat",
        message:
          "You need to be a member of this private channel to participate in the chat.",
        action: {
          text: "Join Channel",
          onClick: () => {
            if (chatData.type === "channel") {
              ChannelService.joinChannel(chatData.id)
                .then(() => {
                  loadChatData();
                })
                .catch((err) => {
                  console.error("Failed to join channel:", err);
                });
            }
          },
        },
      });
    }

    if (
      chatData?.type === "tournament" &&
      isChatEnabled &&
      !isUserMember &&
      chatStatus !== "completed"
    ) {
      bannerList.push({
        id: "non-participant",
        type: "info",
        title: "Join Tournament to Chat",
        message: "You need to join the tournament to participate in the chat.",
        action: { text: "Join Tournament", onClick: handleBack },
      });
    }

    if (
      chatData?.type === "tournament" &&
      isChatEnabled &&
      chatStatus === "completed"
    ) {
      bannerList.push({
        id: "completed",
        type: "info",
        title: "Tournament Completed",
        message:
          "This tournament has ended. The chat is now read-only for participants.",
      });
    }

    if (
      chatData?.type === "tournament" &&
      isChatEnabled &&
      isUserMember &&
      chatStatus === "upcoming" &&
      !error
    ) {
      bannerList.push({
        id: "welcome",
        type: "success",
        title: "Welcome to Tournament Chat!",
        message: "Introduce yourself and coordinate with other participants.",
      });
    }

    return bannerList;
  }, [
    error,
    isConnected,
    isUserMember,
    chatStatus,
    chatData,
    isChatEnabled,
    handleRetry,
    handleReconnect,
    handleBack,
    loadChatData,
  ]);

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-indigo-50/20 dark:from-gray-900 dark:to-gray-800">
        <div className="flex items-center justify-center h-screen">
          <LoadingSpinner size="lg" />
        </div>
      </div>
    );
  }

  // Error state
  if (error && !chatData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-indigo-50/20 dark:from-gray-900 dark:to-gray-800 safe-padding">
        <div className="flex flex-col items-center justify-center h-screen p-6">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-red-100 to-pink-100 dark:from-red-900/40 dark:to-pink-900/40 flex items-center justify-center mb-4">
            <WifiOff className="h-8 w-8 text-red-600 dark:text-red-400" />
          </div>
          <h2 className="text-xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent mb-2">
            Chat Error
          </h2>
          <p className="text-gray-600 dark:text-gray-400 text-center mb-6">
            {error}
          </p>
          <div className="flex gap-3">
            <button
              onClick={handleRetry}
              className="px-6 py-3 bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600 text-white rounded-xl transition-all duration-200 hover:scale-105 active:scale-95"
            >
              Retry
            </button>
            <button
              onClick={handleBack}
              className="px-6 py-3 bg-gradient-to-r from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-900 hover:from-gray-200 hover:to-gray-300 dark:hover:from-gray-700 dark:hover:to-gray-800 text-gray-800 dark:text-gray-200 rounded-xl transition-all duration-200 hover:scale-105 active:scale-95"
            >
              Go Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-indigo-50/20 dark:from-gray-900 dark:to-gray-800">
      {/* Mobile Header */}
      {isMobile && (
        <div className="fixed top-0 right-0 left-0 z-50 px-4 py-3 border-b dark:border-gray-700 bg-gradient-to-b from-white/95 to-white/90 dark:from-gray-900/95 dark:to-gray-900/90 backdrop-blur">
          <div className="flex items-center justify-between">
            <button
              onClick={handleBack}
              className="flex items-center space-x-2 p-2 -ml-2 hover:scale-105 transition-transform duration-200"
              aria-label="Back"
            >
              <ChevronLeft className="w-5 h-5" />
              <span className="font-medium text-sm">Back</span>
            </button>

            <div className="flex items-center space-x-2">
              <div
                className={`px-2 py-1 rounded-full text-xs font-semibold ${statusColorClass}`}
              >
                {statusDisplay}
              </div>

              <button
                onClick={() => setShowMobileMenu(!showMobileMenu)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                aria-label="More options"
              >
                <MoreVertical className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Mobile Menu Dropdown */}
          {showMobileMenu && (
            <div className="absolute top-full right-4 mt-2 w-48 rounded-xl shadow-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 z-50">
              <div className="p-2">
                <button
                  onClick={handleReconnect}
                  className="w-full flex items-center justify-between p-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  <span>Reconnect</span>
                  {isConnected ? (
                    <Wifi className="w-4 h-4 text-green-500" />
                  ) : (
                    <WifiOff className="w-4 h-4 text-red-500" />
                  )}
                </button>

                {chatData?.type === "channel" && (
                  <>
                    {isUserMember && (
                      <button
                        onClick={handleInvite}
                        className="w-full flex items-center space-x-2 p-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                      >
                        <UserPlus className="w-4 h-4" />
                        <span>Invite Users</span>
                      </button>
                    )}

                    <button
                      onClick={handleToggleMute}
                      className="w-full flex items-center justify-between p-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                    >
                      <div className="flex items-center space-x-2">
                        {channelSettings.isMuted ? (
                          <VolumeX className="w-4 h-4" />
                        ) : (
                          <Volume2 className="w-4 h-4" />
                        )}
                        <span>
                          {channelSettings.isMuted ? "Unmute" : "Mute"} Channel
                        </span>
                      </div>
                    </button>
                  </>
                )}

                <button
                  onClick={handleBack}
                  className="w-full flex items-center space-x-2 p-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  {chatData?.type === "tournament" ? (
                    <Trophy className="w-4 h-4" />
                  ) : (
                    <Hash className="w-4 h-4" />
                  )}
                  <span>
                    View{" "}
                    {chatData?.type === "tournament"
                      ? "Tournament"
                      : "Channels"}
                  </span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      <main className={`mx-auto max-w-6xl h-[calc(100vh-160px)] flex flex-col py-4 px-3 sm:px-4 lg:px-6 ${isMobile ? 'pt-4' : ''}`}>
        {/* Desktop Header */}
        {!isMobile && (
          <div className="flex flex-col lg:flex-row lg:items-center justify-between mb-4 lg:mb-6 flex-shrink-0 space-y-3 lg:space-y-0">
            {/* Left Section */}
            <div className="flex items-start space-x-3 min-w-0 flex-1">
              <button
                onClick={handleBack}
                className="group flex items-center space-x-2 p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-all duration-200 hover:scale-105"
                aria-label="Back"
              >
                <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
                <span className="text-sm font-medium">Back</span>
              </button>

              <div className="min-w-0 flex-1 flex items-center space-x-3">
                <div
                  className={`hidden sm:flex flex-shrink-0 items-center justify-center w-12 h-12 rounded-xl shadow-lg bg-gradient-to-br ${channelConfig.gradient}`}
                >
                  <channelConfig.icon className="w-6 h-6 text-white" />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center space-x-2 mb-1 flex-wrap">
                    <h1 className="text-lg sm:text-xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 dark:from-purple-500 dark:to-indigo-500 bg-clip-text text-transparent truncate">
                      {chatData?.name}
                      {chatData?.type === "channel" && (
                        <span className="ml-2 text-xs font-normal opacity-75">
                          {channelConfig.badge}
                        </span>
                      )}
                    </h1>

                    <div className="flex items-center space-x-2">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-semibold ${statusColorClass}`}
                      >
                        {statusDisplay}
                      </span>

                      {chatData?.type === "channel" && (
                        <>
                          {chatData.isPrivate ? (
                            <span className={`px-2 py-1 rounded-full text-xs font-semibold ${BADGE_STYLES.private}`}>
                              <Lock className="w-3 h-3 inline mr-1" />
                              Private
                            </span>
                          ) : (
                            <span className={`px-2 py-1 rounded-full text-xs font-semibold ${BADGE_STYLES.public}`}>
                              <Globe className="w-3 h-3 inline mr-1" />
                              Public
                            </span>
                          )}

                          {isUserOwner && (
                            <span className={`px-2 py-1 rounded-full text-xs font-semibold ${BADGE_STYLES.owner}`}>
                              <Crown className="w-3 h-3 inline mr-1" />
                              Owner
                            </span>
                          )}

                          {isUserAdmin && !isUserOwner && (
                            <span className={`px-2 py-1 rounded-full text-xs font-semibold ${BADGE_STYLES.admin}`}>
                              <Settings className="w-3 h-3 inline mr-1" />
                              Admin
                            </span>
                          )}
                        </>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                    {chatData?.type === "tournament" ? (
                      <>
                        <div className="flex items-center space-x-1">
                          <Users className="w-3 h-3 sm:w-4 sm:h-4" />
                          <span>
                            {chatData?.participants?.length || 0} participants
                          </span>
                        </div>
                        {chatData?.start_time && (
                          <div className="flex items-center space-x-1">
                            <Calendar className="w-3 h-3 sm:w-4 sm:h-4" />
                            <span>{formatDate(chatData.start_time)}</span>
                          </div>
                        )}
                        {chatData?.game_type && (
                          <div className="flex items-center space-x-1">
                            <Clock className="w-3 h-3 sm:w-4 sm:h-4" />
                            <span>{chatData.game_type}</span>
                          </div>
                        )}
                      </>
                    ) : (
                      chatData?.type === "channel" && (
                        <>
                          <div className="flex items-center space-x-1">
                            <Users className="w-3 h-3 sm:w-4 sm:h-4" />
                            <span>{chatData.memberCount || 0} members</span>
                            {onlineUsers?.length > 0 && (
                              <span className="text-green-500 dark:text-green-400">
                                ({onlineUsers.length} online)
                              </span>
                            )}
                          </div>
                          {chatData?.createdAt && (
                            <div className="flex items-center space-x-1">
                              <Calendar className="w-3 h-3 sm:w-4 sm:h-4" />
                              <span>
                                Created {formatDate(chatData.createdAt)}
                              </span>
                            </div>
                          )}
                          {chatData?.owner?.username && (
                            <div className="flex items-center space-x-1">
                              <Crown className="w-3 h-3 sm:w-4 sm:h-4" />
                              <span>Owned by {chatData.owner.username}</span>
                            </div>
                          )}
                        </>
                      )
                    )}
                  </div>

                  {chatData?.description && (
                    <p className="mt-2 text-sm text-gray-600 dark:text-gray-400 line-clamp-1">
                      {chatData.description}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Right Section */}
            <div className="flex items-center justify-between lg:justify-end space-x-3 flex-shrink-0">
              {/* Connection Status */}
              {shouldShowChat && (
                <button
                  onClick={!isConnected ? handleReconnect : undefined}
                  className={cn(
                    "flex items-center space-x-2 px-3 py-2 rounded-xl border transition-all duration-200 hover:scale-105",
                    isConnected
                      ? "bg-gradient-to-r from-emerald-500 to-green-500 text-white border-emerald-500/20"
                      : "bg-gradient-to-r from-red-500 to-pink-500 text-white border-red-500/20 hover:opacity-90 cursor-pointer"
                  )}
                  title={
                    isConnected ? "Connected to chat" : "Click to reconnect"
                  }
                  disabled={isConnected}
                >
                  {isConnected ? (
                    <Wifi className="w-4 h-4" />
                  ) : (
                    <WifiOff className="w-4 h-4" />
                  )}
                  <span className="text-sm font-medium hidden sm:inline">
                    {isConnected ? "Connected" : "Reconnect"}
                  </span>
                </button>
              )}

              {/* Channel Actions */}
              {chatData?.type === "channel" && isUserMember && (
                <div className="flex items-center space-x-2">
                  {/* Invite Button */}
                  {isUserAdmin && (
                    <button
                      onClick={handleInvite}
                      className="flex items-center space-x-2 px-3 py-2 rounded-xl text-sm font-medium bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600 text-white transition-all duration-200 hover:scale-105"
                    >
                      <UserPlus className="w-4 h-4" />
                      <span className="hidden sm:inline">Invite</span>
                    </button>
                  )}

                  {/* Copy Invite Link */}
                  {!chatData.isPrivate && (
                    <button
                      onClick={handleCopyInviteLink}
                      className="flex items-center space-x-2 px-3 py-2 rounded-xl text-sm font-medium bg-gradient-to-r from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-900 hover:from-gray-200 hover:to-gray-300 dark:hover:from-gray-700 dark:hover:to-gray-800 text-gray-700 dark:text-gray-300 transition-all duration-200 hover:scale-105"
                    >
                      <Link className="w-4 h-4" />
                      <span className="hidden sm:inline">Copy Link</span>
                    </button>
                  )}

                  {/* Mute/Notification Toggle */}
                  <div className="flex items-center space-x-1">
                    <button
                      onClick={handleToggleMute}
                      className={cn(
                        "p-2 rounded-xl transition-all duration-200 hover:scale-105",
                        channelSettings.isMuted
                          ? "bg-gradient-to-br from-red-100 to-pink-100 dark:from-red-900/40 dark:to-pink-900/40 text-red-600 dark:text-red-400"
                          : "bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-900 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-300"
                      )}
                      title={
                        channelSettings.isMuted
                          ? "Unmute channel"
                          : "Mute channel"
                      }
                    >
                      {channelSettings.isMuted ? (
                        <VolumeX className="w-4 h-4" />
                      ) : (
                        <Volume2 className="w-4 h-4" />
                      )}
                    </button>

                    <button
                      onClick={handleToggleNotifications}
                      className={cn(
                        "p-2 rounded-xl transition-all duration-200 hover:scale-105",
                        !channelSettings.notificationsEnabled
                          ? "bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-900 text-gray-600 dark:text-gray-400"
                          : "bg-gradient-to-br from-purple-100 to-indigo-100 dark:from-purple-900/40 dark:to-indigo-900/40 text-purple-600 dark:text-purple-400"
                      )}
                      title={
                        channelSettings.notificationsEnabled
                          ? "Disable notifications"
                          : "Enable notifications"
                      }
                    >
                      {channelSettings.notificationsEnabled ? (
                        <Bell className="w-4 h-4" />
                      ) : (
                        <BellOff className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>
              )}

              {/* Back Button */}
              <div className="flex items-center space-x-2">
                <button
                  onClick={handleBack}
                  className="hidden sm:flex items-center space-x-2 px-3 py-2 rounded-xl text-sm font-medium bg-gradient-to-r from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-900 hover:from-gray-200 hover:to-gray-300 dark:hover:from-gray-700 dark:hover:to-gray-800 text-gray-700 dark:text-gray-300 transition-all duration-200 hover:scale-105"
                >
                  {chatData?.type === "tournament" ? (
                    <Trophy className="w-4 h-4" />
                  ) : (
                    <Hash className="w-4 h-4" />
                  )}
                  <span>
                    View{" "}
                    {chatData?.type === "tournament"
                      ? "Tournament"
                      : "Channels"}
                  </span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Banners Section */}
        {banners.map((banner) => (
          <Banner
            key={banner.id}
            type={banner.type}
            title={banner.title}
            message={banner.message}
            onClose={banner.id === "error" ? () => setError("") : undefined}
            action={banner.action}
            className="mb-4"
            compact={isMobile}
          />
        ))}

        {/* Chat Window Container */}
       
          {shouldShowChat ? (
            <ChatWindow
              tournament={chatData?.type === "tournament" ? chatData : null}
              channel={chatData?.type === "channel" ? chatData : null}
            />
          ) : (
            <div className="h-full flex flex-col items-center justify-center p-6 bg-gradient-to-br from-white to-gray-50/80 dark:from-gray-800 dark:to-gray-900/90">
              {!chatData ? (
                <>
                  <LoadingSpinner size="lg" />
                  <p className="mt-4 text-gray-400">Loading chat...</p>
                </>
              ) : !isChatEnabled ? (
                <>
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-100 to-indigo-100 dark:from-purple-900/40 dark:to-indigo-900/40 flex items-center justify-center mb-4">
                    <MessageCircle className="w-8 h-8 text-purple-600 dark:text-purple-400" />
                  </div>
                  <h3 className="text-xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent mb-2">
                    Chat Not Available
                  </h3>
                  <p className="text-center text-gray-600 dark:text-gray-400 mb-6">
                    {chatData.type === "tournament"
                      ? "Chat has not been enabled for this tournament."
                      : "You do not have access to this chat."}
                  </p>
                  <button
                    onClick={handleBack}
                    className="px-6 py-3 bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600 text-white rounded-xl transition-all duration-200 hover:scale-105"
                  >
                    Return to{" "}
                    {chatData.type === "tournament" ? "Tournament" : "Channels"}
                  </button>
                </>
              ) : (
                <>
                  <LoadingSpinner size="lg" />
                  <p className="mt-4 text-gray-400">Initializing chat...</p>
                </>
              )}
            </div>
          )}
        
      </main>

      {/* Invite Modal for Channels */}
      {showInviteModal && chatData?.type === "channel" && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-gradient-to-br from-white to-gray-50/80 dark:from-gray-800 dark:to-gray-900/90 rounded-xl border border-gray-200 dark:border-gray-700 w-full max-w-md max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
                  Invite Users to {chatData.name}
                </h2>
                <button
                  onClick={() => setShowInviteModal(false)}
                  className="p-1 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:scale-105 transition-transform duration-200"
                >
                  <svg
                    className="w-6 h-6"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                    Invite Link
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      readOnly
                      value={`${window.location.origin}/channels/${id}/join`}
                      className="flex-1 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm"
                    />
                    <button
                      onClick={handleCopyInviteLink}
                      className="px-4 py-2 rounded-lg font-medium flex items-center gap-2 bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600 text-white transition-all duration-200 hover:scale-105"
                    >
                      <Link className="w-4 h-4" />
                      Copy
                    </button>
                  </div>
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    Share this link with anyone you want to invite to this
                    channel
                  </p>
                </div>

                <div>
                  <h3 className="text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                    Quick Actions
                  </h3>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => {
                        if (navigator.share) {
                          navigator.share({
                            title: `Join ${chatData.name} on our platform`,
                            text: `Check out this chat channel: ${chatData.name}`,
                            url: `${window.location.origin}/channels/${id}/join`,
                          });
                        }
                      }}
                      className="p-3 rounded-lg border border-gray-200 dark:border-gray-700 flex flex-col items-center justify-center gap-2 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                    >
                      <Share2 className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        Share
                      </span>
                    </button>

                    <button
                      onClick={() => {
                        const subject = `Invitation to join ${chatData.name}`;
                        const body = `You've been invited to join "${chatData.name}" chat channel.\n\nJoin here: ${window.location.origin}/channels/${id}/join`;
                        window.location.href = `mailto:?subject=${encodeURIComponent(
                          subject
                        )}&body=${encodeURIComponent(body)}`;
                      }}
                      className="p-3 rounded-lg border border-gray-200 dark:border-gray-700 flex flex-col items-center justify-center gap-2 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                    >
                      <svg
                        className="w-5 h-5 text-gray-600 dark:text-gray-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                        />
                      </svg>
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        Email
                      </span>
                    </button>
                  </div>
                </div>

                <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                  <button
                    onClick={() => setShowInviteModal(false)}
                    className="w-full px-4 py-2 rounded-lg font-medium bg-gradient-to-r from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-900 hover:from-gray-200 hover:to-gray-300 dark:hover:from-gray-700 dark:hover:to-gray-800 text-gray-800 dark:text-gray-200 transition-all duration-200 hover:scale-105"
                  >
                    Done
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}