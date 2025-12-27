import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { tournamentService } from "../../services/tournamentService";
import  chatService  from "../../services/chatService";
import { useAuth } from "../../contexts/AuthContext";
import websocketService from "../../services/websocketService";
import TournamentHeader from "../../components/tournamentDetail/TournamentHeader";
import TournamentInfoGrid from "../../components/tournamentDetail/TournamentInfoGrid";
import TournamentDetailsCard from "../../components/tournamentDetail/TournamentDetailsCard";
import ParticipantsList from "../../components/tournamentDetail/ParticipantsList";
import JoinTournamentCard from "../../components/tournamentDetail/JoinTournamentCard";
import TournamentBracketSection from "../../components/tournamentDetail/TournamentBracketSection";
import TournamentInfoSidebar from "../../components/tournamentDetail/TournamentInfoSidebar";
import TournamentJoinModal from "../../components/tournamentDetail/TournamentJoinModal";
import ManagementSection from "../../components/tournamentDetail/ManagementSection";
import LoadingState from "../../components/tournamentDetail/LoadingState";
import ErrorState from "../../components/tournamentDetail/ErrorState";
import Banner from "../../components/common/Banner";
import {
  MessageSquare,
  Users,
  Trophy,
  Clock,
  DollarSign,
  ExternalLink,
  AlertTriangle,
  RefreshCw,
  Share2,
  Edit,
  Calendar,
  User,
  Gamepad2,
  ChevronRight,
} from "lucide-react";
import { authService } from "../../services/authService";
import { formatCurrency, formatName } from "../../utils/formatters";

// Mobile Navigation Tabs Component
const MobileNavTabs = React.memo(({ activeTab, onTabChange }) => {
  const tabs = useMemo(
    () => [
      {
        id: "overview",
        label: "Overview",
        icon: Trophy,
        color: "text-yellow-500",
      },
      { id: "bracket", label: "Bracket", icon: Users, color: "text-blue-500" },
      {
        id: "participants",
        label: "Players",
        icon: Users,
        color: "text-purple-500",
      },
      { id: "info", label: "Details", icon: Clock, color: "text-green-500" },
    ],
    []
  );

  return (
    <div className="md:hidden mb-6">
      <div className="flex space-x-3 overflow-x-auto pb-2 no-scrollbar px-1">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`flex flex-col items-center justify-center space-y-1 px-5 py-3 rounded-xl whitespace-nowrap transition-all duration-300 min-w-[85px] border ${
                activeTab === tab.id
                  ? "bg-primary-500 text-gray-900 dark:text-white border-primary-500 shadow-lg shadow-primary-500/20"
                  : "bg-white/70 dark:bg-neutral-800/70 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-neutral-700 backdrop-blur-sm hover:bg-gray-50 dark:hover:bg-neutral-700/80"
              }`}
            >
              <Icon
                className={`h-5 w-5 ${activeTab === tab.id ? "text-gray-900 dark:text-white" : tab.color}`}
              />
              <span className="text-xs font-semibold">{tab.label}</span>
              {activeTab === tab.id && (
                <div className="absolute -bottom-1 w-6 h-1 bg-primary-400 rounded-full" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
});

MobileNavTabs.displayName = "MobileNavTabs";

// Mobile Tournament Stats Component
const MobileTournamentStats = React.memo(({ tournament }) => {
  const stats = useMemo(
    () => [
      {
        label: "Prize Pool",
        value: `${tournament.prize_pool > 0 ? formatCurrency(tournament.prize_pool,'USD'):'free'}`,
        icon: Trophy,
        color: "text-yellow-600 dark:text-yellow-400",
        bgColor: "bg-yellow-100 dark:bg-yellow-900/20",
      },
      {
        label: "Players",
        value: `${tournament.current_slots || 0}/${tournament.total_slots || 0}`,
        icon: Users,
        color: "text-blue-600 dark:text-blue-400",
        bgColor: "bg-blue-100 dark:bg-blue-900/20",
      },
      {
        label: "Entry Fee",
        value: `${tournament.entry_fee > 0 ? formatCurrency(tournament.entry_fee || 0,'USD'):'free'}`,
        icon: DollarSign,
        color: "text-emerald-600 dark:text-emerald-400",
        bgColor: "bg-emerald-100 dark:bg-emerald-900/20",
      },
    ],
    [tournament]
  );

  return (
    <div className="md:hidden mb-6 relative">
      {/* Background Image with Overlay */}
      <div className="absolute inset-0 rounded-xl overflow-hidden z-0">
        {tournament?.game?.logo_url && (
          <div className="absolute inset-0">
            
            <div className="absolute inset-0 bg-gradient-to-br from-white/40 via-transparent to-transparent dark:from-neutral-900/50" />
            <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_30%,rgba(255,255,255,0.1)_50%,transparent_70%)] dark:bg-[linear-gradient(45deg,transparent_30%,rgba(0,0,0,0.1)_50%,transparent_70%)]" />
          </div>
        )}

        {!tournament?.game?.logo_url && (
          <div className="absolute inset-0 bg-gradient-to-br from-blue-50/30 to-purple-50/30 dark:from-blue-900/10 dark:to-purple-900/10" />
        )}
      </div>

      <div className="relative z-10">
        <div className="grid grid-cols-3 gap-3">
          {stats.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <div
                key={index}
                className="bg-white/90 dark:bg-neutral-800/90 backdrop-blur-md rounded-lg p-3 text-center border border-white/40 dark:border-neutral-700/40 shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-0.5"
              >
                <div className="flex justify-center mb-2">
                  <div
                    className={`p-2.5 rounded-lg ${stat.bgColor} backdrop-blur-sm`}
                  >
                    <Icon className={`h-4 w-4 ${stat.color}`} />
                  </div>
                </div>
                <p
                  className={`text-lg font-bold ${stat.color} drop-shadow-sm mb-1`}
                >
                  {stat.value}
                </p>
                <p className="text-xs font-medium text-gray-700 dark:text-gray-300 tracking-wide">
                  {stat.label}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
});

MobileTournamentStats.displayName = "MobileTournamentStats";

export default function TournamentDetail() {
  const { id } = useParams();
  const [tournament, setTournament] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [joinError, setJoinError] = useState("");
  const [joinSuccess, setJoinSuccess] = useState("");
  const [isJoinModalOpen, setIsJoinModalOpen] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [activeMobileTab, setActiveMobileTab] = useState("overview");
  const { user, updateUser } = useAuth();
  const navigate = useNavigate();

  const loadTournament = useCallback(async () => {
    try {
      setIsLoading(true);
      setError("");
      const data = await tournamentService.getById(id);
      setTournament(data);
    } catch (err) {
      console.error("Tournament loading error:", err);
      setError(
        err.response?.data?.message || "Failed to load tournament details"
      );
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  const loadUser = useCallback(async () => {
    try {
      const profile = await authService.getProfile();
      if (profile.success) {
        updateUser(profile.data.user);
      } else setError(profile.error);
    } catch (error) {
      console.error("user loading error ,continue unauthenticated :", error);
    }
  }, []);

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  useEffect(() => {
    loadTournament();
  }, [loadTournament]);

  useEffect(() => {
    if (
      !tournament ||
      !(tournament.status === "ongoing" || tournament.status === "completed")
    ) {
      return;
    }

    const unsubscribe = websocketService.subscribeToMatchUpdates((data) => {
      if (data.tournament_id === tournament.id) {
        loadTournament();
      }
    });

    return () => unsubscribe();
  }, [tournament, loadTournament]);

  const handleJoinTournament = async (gamerTag) => {
    if (!gamerTag.trim()) {
      setJoinError("Please enter your gamer tag");
      return;
    }

    setIsJoining(true);
    setJoinError("");
    setJoinSuccess("");

    try {
      const response = await tournamentService.join(id, gamerTag);

      if (response.chat_channel_id) {
        try {
          await chatService.joinChannel(response.chat_channel_id);
        } catch (channelError) {
          if (channelError.response?.status !== 409) {
            console.warn("Failed to join tournament channel:", channelError);
          }
        }
      }

      setJoinSuccess("Successfully joined the tournament");

      if (response.new_balance && updateUser) {
        updateUser({ wallet_balance: response.new_balance });
      }

      await loadTournament();

      setTimeout(() => {
        setIsJoinModalOpen(false);
        setJoinSuccess("");
        navigate(`/tournaments/${tournament.id}/chat`);
      }, 2000);
    } catch (err) {
      console.error("Join tournament error:", err);
      setJoinError(
        err.response?.data?.message ||
          "Failed to join tournament. Please try again."
      );
    } finally {
      setIsJoining(false);
    }
  };

  const handleManagementAction = async (actionType) => {
    try {
      let response;
      switch (actionType) {
        case "cancel":
          response = await tournamentService.cancel(id);
          break;
        case "start":
          response = await tournamentService.start(id);
          break;
        case "finalize":
          response = await tournamentService.finalize(id);
          break;
        default:
          return;
      }

      setJoinSuccess(
        response.message || `Tournament ${actionType}ed successfully`
      );
      await loadTournament();
    } catch (err) {
      console.error(`Failed to ${actionType} tournament:`, err);
      setError(
        err.response?.data?.message ||
          `Failed to ${actionType} tournament. Please try again.`
      );
    }
  };

  const isParticipant = useMemo(
    () => user && tournament?.participants?.some((p) => p.user_id === user.id),
    [user, tournament]
  );

  const isCreator = useMemo(
    () => user && tournament?.created_by === user.id,
    [user, tournament]
  );

  if (isLoading) {
    return <LoadingState />;
  }

  if (error || !tournament) {
    return <ErrorState error={error} tournament={tournament} />;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-neutral-900 safe-padding">
      <TournamentJoinModal
        isOpen={isJoinModalOpen}
        onClose={() => {
          setIsJoinModalOpen(false);
          setJoinError("");
          setJoinSuccess("");
        }}
        tournament={tournament}
        onJoin={handleJoinTournament}
        joinError={joinError}
        joinSuccess={joinSuccess}
        isJoining={isJoining}
        setJoinError={setJoinError}
        setJoinSuccess={setJoinSuccess}
      />

      <main className="mx-auto max-w-7xl py-4 md:py-8 px-4 sm:px-6 lg:px-8">
        {/* Mobile Header Actions */}
        <div className="md:hidden mb-6 relative rounded-2xl overflow-hidden border border-gray-200 dark:border-neutral-700 shadow-lg">
          {/* Background Image with Enhanced Overlay - Opacity increased to 40-50% */}
          <div className="absolute inset-0 z-0">
            {tournament?.game?.logo_url && (
              <div className="absolute inset-0">
                {/* Background Image with higher opacity */}
                <img
                  src={tournament.game.logo_url}
                  alt={tournament.game.name}
                  loading="lazy"
                />

                {/* Multiple Overlay Layers for Better Readability */}
                <div className="absolute inset-0 bg-gradient-to-b from-white/80 via-white/50 to-transparent dark:from-neutral-900/70 dark:via-neutral-900/50 dark:to-transparent" />
                <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-pink-500/10 dark:from-blue-500/5 dark:via-purple-500/5 dark:to-pink-500/5" />
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-transparent via-transparent to-white/30 dark:to-neutral-900/30" />
              </div>
            )}

            {/* Fallback Gradient Background */}
            {!tournament?.game?.logo_url && (
              <div className="absolute inset-0 bg-gradient-to-br from-blue-100/50 to-purple-100/50 dark:from-blue-900/20 dark:to-purple-900/20" />
            )}

            {/* Border Glow for Featured Tournaments */}
            {tournament.is_featured && (
              <div className="absolute -inset-1 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-2xl blur-xl opacity-30" />
            )}
          </div>

          {/* Content Container with Glass Effect */}
          <div className="relative z-10 p-5">

            {/* Header with Tournament Name and Status */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex-1 min-w-0 pr-3">
                {/* Tournament Name with Shadow for Contrast */}
                <h1 className="text-xl font-bold text-gray-900 dark:text-gray-900 dark:text-white mb-2 drop-shadow-sm leading-tight">
                  {formatName(tournament.name)}
                </h1>

                {/* Status and Game Info - Enhanced Visibility */}
                <div className="flex items-center space-x-2 mb-3">
                  <span
                    className={`px-2.5 py-1 rounded-full text-xs font-semibold backdrop-blur-sm border ${
                      tournament.status === "completed"
                        ? "bg-green-100/90 text-green-800 dark:bg-green-900/50 dark:text-green-300 border-green-500/40"
                        : tournament.status === "ongoing"
                          ? "bg-blue-100/90 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300 border-blue-500/40"
                          : tournament.status === "open"
                            ? "bg-purple-100/90 text-purple-800 dark:bg-purple-900/50 dark:text-purple-300 border-purple-500/40"
                            : "bg-gray-100/90 text-gray-800 dark:bg-gray-900/50 dark:text-gray-300 border-gray-500/40"
                    }`}
                  >
                    {tournament.status.charAt(0).toUpperCase() +
                      tournament.status.slice(1)}
                  </span>

                  {/* Game Name with Semi-Transparent Background */}
                  {tournament.game?.name && (
                    <div className="flex items-center px-2 py-1 bg-white/80 dark:bg-neutral-800/80 rounded-lg backdrop-blur-sm">
                      <Gamepad2 className="h-3 w-3 text-blue-500 mr-1.5" />
                      <span className="text-xs font-medium text-gray-800 dark:text-gray-200">
                        {tournament.game.name}
                      </span>
                    </div>
                  )}

                  {/* Platform Badge if Available */}
                  {tournament.platform?.name && (
                    <div className="px-2 py-1 bg-white/60 dark:bg-neutral-800/60 rounded-lg backdrop-blur-sm">
                      <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                        {tournament.platform.name}
                      </span>
                    </div>
                  )}
                </div>

                {/* Quick Stats Line */}
                <div className="flex items-center space-x-4 text-sm text-gray-700 dark:text-gray-300">
                  <div className="flex items-center">
                    <Trophy className="h-4 w-4 mr-1.5 text-yellow-500" />
                    <span className="font-medium">
                      
                      {formatCurrency(
                        tournament.entry_fee *
                        tournament.total_slots,'USD'
                      )}
                    </span>
                  </div>
                  <div className="h-1 w-1 rounded-full bg-gray-300 dark:bg-gray-600" />
                  <div className="flex items-center">
                    <Users className="h-4 w-4 mr-1.5 text-blue-500" />
                    <span className="font-medium">
                      {tournament.current_slots}/{tournament.total_slots}
                    </span>
                  </div>
                </div>
              </div>

              {/* Mobile Action Buttons */}
              <div className="flex flex-col space-y-2">
                {/* Chat Button - Always Show for Participants */}
                {tournament.chat_channel_id && isParticipant && (
                  <button
                    onClick={() =>
                      navigate(`/tournaments/${tournament.id}/chat`)
                    }
                    className="p-3 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl backdrop-blur-sm hover:from-blue-600 hover:to-purple-700 transition-all duration-300 shadow-lg"
                    title="Open Chat"
                  >
                    <MessageSquare className="h-5 w-5 text-gray-900 dark:text-white" />
                  </button>
                )}

                {/* Quick Action Menu */}
                <div className="relative group">
                  <button className="p-3 bg-white/90 dark:bg-neutral-800/90 border border-gray-200 dark:border-neutral-700 rounded-xl backdrop-blur-sm hover:bg-white dark:hover:bg-neutral-700 transition-all duration-300">
                    <span className="text-gray-700 dark:text-gray-300 font-bold">
                      ⋯
                    </span>
                  </button>

                  {/* Dropdown Menu */}
                  <div className="absolute right-0 top-full mt-2 w-56 bg-white/95 dark:bg-neutral-900/95 backdrop-blur-xl rounded-xl shadow-2xl border border-gray-200/50 dark:border-neutral-700/50 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 z-50 overflow-hidden">
                    <button
                      onClick={() => navigate(`/tournaments/${tournament.id}`)}
                      className="w-full text-left px-4 py-3 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-neutral-800 flex items-center transition-colors"
                    >
                      <ExternalLink className="h-4 w-4 mr-3 text-gray-500" />
                      View Details
                    </button>
                    <button
                      onClick={() => loadTournament()}
                      className="w-full text-left px-4 py-3 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-neutral-800 flex items-center transition-colors"
                    >
                      <RefreshCw className="h-4 w-4 mr-3 text-gray-500" />
                      Refresh
                    </button>
                    <button
                      onClick={() =>
                        window.open(
                          `/tournaments/${tournament.id}/share`,
                          "_blank"
                        )
                      }
                      className="w-full text-left px-4 py-3 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-neutral-800 flex items-center transition-colors"
                    >
                      <Share2 className="h-4 w-4 mr-3 text-gray-500" />
                      Share
                    </button>
                    {isCreator && tournament.status === "open" && (
                      <button
                        onClick={() =>
                          navigate(`/tournaments/${tournament.id}/edit`)
                        }
                        className="w-full text-left px-4 py-3 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-neutral-800 flex items-center transition-colors"
                      >
                        <Edit className="h-4 w-4 mr-3 text-gray-500" />
                        Edit Tournament
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>

           

            {/* Enhanced Tournament Stats */}
            <MobileTournamentStats tournament={tournament} />

            {/* Navigation Tabs with Spacing */}
            <div className="mt-6">
              <MobileNavTabs
                activeTab={activeMobileTab}
                onTabChange={setActiveMobileTab}
              />
            </div>

            {/* Mobile Quick Info Banner */}
            <div className="mt-6 p-4 bg-gradient-to-r from-blue-500/10 to-purple-500/10 dark:from-blue-500/5 dark:to-purple-500/5 rounded-xl backdrop-blur-sm border border-gray-200/30 dark:border-neutral-700/30">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="flex items-center">
                    <Calendar className="h-4 w-4 text-blue-500 mr-2" />
                    <span className="text-sm font-medium text-gray-800 dark:text-gray-200">
                      {tournament.start_time
                        ? new Date(tournament.start_time).toLocaleDateString(
                            "en-US",
                            {
                              month: "short",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            }
                          )
                        : "TBD"}
                    </span>
                  </div>
                  <div className="h-4 w-px bg-gray-300 dark:bg-gray-600" />
                  <div className="flex items-center">
                    <User className="h-4 w-4 text-purple-500 mr-2" />
                    <span className="text-sm font-medium text-gray-800 dark:text-gray-200">
                      by {tournament.creator?.username || "Unknown"}
                    </span>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-gray-400" />
              </div>
            </div>
          </div>

          {/* Bottom Gradient Border */}
          <div className="absolute bottom-0 left-0 right-0 h-2 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 opacity-40 rounded-b-2xl" />
        </div>

        {/* Success Message Banner */}
        {joinSuccess && (
          <Banner
            type="success"
            title="Success"
            message={joinSuccess}
            onClose={() => setJoinSuccess("")}
            icon={<Trophy className="h-5 w-5" />}
            className="mb-6 md:mb-8"
          />
        )}

        {/* Desktop Tournament Header */}
        <div className="hidden md:block">
          <TournamentHeader tournament={tournament} />
          <TournamentInfoGrid tournament={tournament} />
        </div>

        {/* Mobile Content Based on Active Tab */}
        <div className="md:hidden space-y-8 pt-4">
          {activeMobileTab === "overview" && (
            <>
              <TournamentDetailsCard tournament={tournament} />
              <JoinTournamentCard
                tournament={tournament}
                user={user}
                onJoinClick={() => setIsJoinModalOpen(true)}
              />
              <TournamentInfoSidebar tournament={tournament} />
            </>
          )}

          {activeMobileTab === "bracket" && (
            <TournamentBracketSection tournament={tournament} />
          )}

          {activeMobileTab === "participants" && (
            <ParticipantsList tournament={tournament} />
          )}

          {activeMobileTab === "info" && (
            <div className="space-y-6">
              <div className="bg-white/90 dark:bg-neutral-800/90 rounded-2xl p-6 border border-gray-200 dark:border-neutral-700 backdrop-blur-sm">
                <div className="flex items-center mb-4">
                  <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg mr-3">
                    <Trophy className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-gray-900 dark:text-white">
                    Tournament Rules
                  </h3>
                </div>
                <div className="text-sm text-gray-700 dark:text-gray-300 bg-gray-50/50 dark:bg-neutral-700/30 rounded-xl p-4">
                  {tournament.rules ||
                    "No specific rules provided for this tournament. Please check with the tournament organizer for detailed rules and guidelines."}
                </div>
              </div>

              <div className="bg-white/90 dark:bg-neutral-800/90 rounded-2xl p-6 border border-gray-200 dark:border-neutral-700 backdrop-blur-sm">
                <div className="flex items-center mb-4">
                  <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg mr-3">
                    <Calendar className="h-5 w-5 text-green-600 dark:text-green-400" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-gray-900 dark:text-white">
                    Tournament Details
                  </h3>
                </div>
                <div className="space-y-4 text-sm">
                  <div className="flex justify-between items-center p-3 bg-gray-50/50 dark:bg-neutral-700/30 rounded-lg">
                    <span className="text-gray-600 dark:text-gray-400">
                      Created
                    </span>
                    <span className="font-medium text-gray-900 dark:text-gray-900 dark:text-white">
                      {new Date(tournament.created_at).toLocaleDateString(
                        "en-US",
                        {
                          weekday: "long",
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        }
                      )}
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-gray-50/50 dark:bg-neutral-700/30 rounded-lg">
                    <span className="text-gray-600 dark:text-gray-400">
                      Starts
                    </span>
                    <span className="font-medium text-gray-900 dark:text-gray-900 dark:text-white">
                      {tournament.start_time
                        ? new Date(tournament.start_time).toLocaleDateString(
                            "en-US",
                            {
                              weekday: "long",
                              month: "long",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            }
                          )
                        : "TBD"}
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-gray-50/50 dark:bg-neutral-700/30 rounded-lg">
                    <span className="text-gray-600 dark:text-gray-400">
                      Visibility
                    </span>
                    <span className="font-medium text-gray-900 dark:text-gray-900 dark:text-white capitalize">
                      {tournament.visibility}
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-gray-50/50 dark:bg-neutral-700/30 rounded-lg">
                    <span className="text-gray-600 dark:text-gray-400">
                      Format
                    </span>
                    <span className="font-medium text-gray-900 dark:text-gray-900 dark:text-white">
                      {tournament.format?.replace("_", " ") ||
                        "Single Elimination"}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
          {/* Management Section */}
          <ManagementSection
            tournament={tournament}
            user={user}
            onAction={handleManagementAction}
          />
        </div>

        {/* Desktop Layout */}
        <div className="hidden md:grid md:grid-cols-12 gap-8 mt-8">
          <div className="lg:col-span-4 space-y-8">
            <TournamentDetailsCard tournament={tournament} />
            <ParticipantsList tournament={tournament} />
          </div>

          <div className="lg:col-span-5">
            <TournamentBracketSection tournament={tournament} />
          </div>

          <div className="lg:col-span-3 space-y-8">
            <JoinTournamentCard
              tournament={tournament}
              user={user}
              onJoinClick={() => setIsJoinModalOpen(true)}
            />
            <TournamentInfoSidebar tournament={tournament} />
          </div>
        </div>

        {/* Warning Banner for Low Balance */}
        {tournament.status === "open" &&
          user &&
          formatCurrency(user.wallet_balance || 0,'USD') < tournament.entry_fee && (
            <div className="mt-8">
              <Banner
                type="warning"
                title="Insufficient Balance"
                message={`You need $${tournament.entry_fee} to join this tournament. Your current balance is ${formatCurrency(user.wallet_balance || 0,'USD')}`}
                action={{
                  text: "Add Funds",
                  to: "/deposit",
                }}
                icon={<AlertTriangle className="h-5 w-5" />}
                className="shadow-lg"
              />
            </div>
          )}

        {/* Mobile Floating Join Button */}
        {tournament.status === "open" && user && !isParticipant && (
          <div className="md:hidden fixed bottom-8 right-8 z-30">
            <button
              onClick={() => setIsJoinModalOpen(true)}
              className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-gray-900 dark:text-white p-5 rounded-2xl shadow-2xl transition-all duration-300 active:scale-95 flex items-center space-x-2"
            >
              <Trophy className="h-6 w-6" />
              <span className="text-lg font-bold">Join Now</span>
            </button>
          </div>
        )}

        {/* Desktop Quick Actions */}
        <div className="hidden md:flex items-center justify-between mt-12 pt-8 border-t border-gray-200 dark:border-neutral-700">
          <div className="flex items-center space-x-6">
            {tournament.chat_channel_id && isParticipant && (
              <button
                onClick={() => navigate(`/tournaments/${tournament.id}/chat`)}
                className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-gray-900 dark:text-white font-medium rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl"
              >
                <MessageSquare className="h-5 w-5 mr-3" />
                Tournament Chat
                <ChevronRight className="h-5 w-5 ml-2" />
              </button>
            )}

            {isCreator && tournament.status === "open" && (
              <button
                onClick={() => navigate(`/tournaments/${tournament.id}/edit`)}
                className="inline-flex items-center px-6 py-3 border-2 border-gray-300 dark:border-neutral-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-neutral-800 rounded-xl transition-all duration-300 font-medium"
              >
                <Edit className="h-5 w-5 mr-3" />
                Edit Tournament
              </button>
            )}
          </div>

          <div className="flex items-center space-x-6">
            <button
              onClick={loadTournament}
              disabled={isLoading}
              className="inline-flex items-center px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-300 transition-colors disabled:opacity-50"
            >
              <RefreshCw
                className={`h-5 w-5 mr-2 ${isLoading ? "animate-spin" : ""}`}
              />
              Refresh
            </button>
            <a
              href={`/tournaments/${tournament.id}`}
              className="inline-flex items-center px-4 py-2 text-primary-600 dark:text-primary-500 hover:text-primary-700 dark:hover:text-primary-400 transition-colors font-medium"
            >
              <Share2 className="h-5 w-5 mr-2" />
              Share Tournament
            </a>
          </div>
        </div>

        {/* Mobile bottom navigation spacer */}
        <div className="h-20 md:h-0"></div>
      </main>
    </div>
  );
}
