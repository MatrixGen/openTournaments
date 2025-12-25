import { useAuth } from "../../contexts/AuthContext";
import { useState, useEffect } from "react";
import { userService } from "../../services/userService";
import { Link } from "react-router-dom";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import Banner from "../../components/common/Banner";
import {
  Trophy,
  Award,
  DollarSign,
  Calendar,
  Settings,
  User,
  Mail,
  CheckCircle,
  Clock,
  ChevronRight,
  TrendingUp,
  Users,
  Star,
  Shield,
  Zap,
  GamepadIcon,
  Target,
  Coins,
  BarChart,
} from "lucide-react";
import { formatCurrency } from "../../utils/formatters";
import { authService } from "../../services/authService";

// Stats Card Component
const StatCard = ({ label, value, icon: Icon, color, bgColor, suffix }) => (
  <div
    className={`bg-white dark:bg-neutral-800 rounded-lg md:rounded-xl p-4 border border-gray-200 dark:border-neutral-700 hover:border-gray-300 dark:hover:border-neutral-600 transition-colors`}
  >
    <div className="flex items-center justify-between">
      <div>
        <p className="text-gray-600 dark:text-gray-400 text-xs md:text-sm font-medium mb-1">
          {label}
        </p>
        <p className={`text-xl md:text-2xl font-bold ${color}`}>
          {value}
          {suffix}
        </p>
      </div>
      <div className={`p-2 rounded-lg ${bgColor}`}>
        <Icon className={`h-4 w-4 md:h-5 md:w-5 ${color}`} />
      </div>
    </div>
  </div>
);

// Achievement Badge Component
const AchievementBadge = ({ icon: Icon, title, description, unlocked }) => (
  <div
    className={`relative p-4 rounded-lg border ${
      unlocked
        ? "border-yellow-500/20 bg-yellow-500/5 dark:bg-yellow-500/10"
        : "border-gray-200 dark:border-neutral-700 bg-gray-50 dark:bg-neutral-800/50"
    }`}
  >
    <div className="flex items-center space-x-3">
      <div
        className={`p-2 rounded-lg ${
          unlocked
            ? "bg-yellow-500/20 text-yellow-600 dark:text-yellow-400"
            : "bg-gray-200 dark:bg-neutral-700 text-gray-400"
        }`}
      >
        <Icon className="h-5 w-5" />
      </div>
      <div className="flex-1">
        <h4
          className={`font-medium text-sm ${
            unlocked
              ? "text-gray-900 dark:text-gray-900 dark:text-white"
              : "text-gray-600 dark:text-gray-400"
          }`}
        >
          {title}
        </h4>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
          {description}
        </p>
      </div>
      {unlocked && <CheckCircle className="h-4 w-4 text-green-500" />}
    </div>
  </div>
);

export default function MyProfile() {
  const { user } = useAuth();
  const [userStats, setUserStats] = useState(null);
  const [profile, setProfile] = useState(null);
  const [recentTournaments, setRecentTournaments] = useState([]);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Load user stats
      const statsResponse = await userService.getUserStats();

      if (statsResponse.success) {
        setUserStats(statsResponse?.data?.data);
      } else {
        setError(statsResponse.error);
      }

      // Load recent tournaments
      const tournamentsResponse = await userService.getUserTournaments({
        limit: 3,
      });
      if (tournamentsResponse.success) {
        setRecentTournaments(tournamentsResponse.data.tournaments || []);
      }

      const profile = await authService.getProfile();
      if (profile.success) {
        setProfile(profile.data.user);
      } else setError(profile.error);
    } catch (error) {
      console.error("Failed to load user data:", error);
      setError("Failed to load profile data. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const getMembershipDuration = (dateString) => {
    if (!dateString) return "";
    const created = new Date(dateString);
    const now = new Date();
    const years = now.getFullYear() - created.getFullYear();
    const months = now.getMonth() - created.getMonth();

    if (years > 0) {
      return `${years} year${years > 1 ? "s" : ""} member`;
    }
    return `${Math.max(months, 1)} month${months !== 1 ? "s" : ""} member`;
  };

  const hasLowBalance = parseFloat(user?.wallet_balance || 0) < 5;

  // Stats cards data
  const statCards = [
    {
      label: "Win Rate",
      value: userStats?.win_rate || 0,
      icon: TrendingUp,
      color:
        userStats?.win_rate >= 50
          ? "text-green-600 dark:text-green-400"
          : "text-yellow-600 dark:text-yellow-400",
      bgColor:
        userStats?.win_rate >= 50
          ? "bg-green-100 dark:bg-green-900/30"
          : "bg-yellow-100 dark:bg-yellow-900/30",
      suffix: "%",
    },
    {
      label: "Matches Won",
      value: userStats?.wins || 0,
      icon: Trophy,
      color: "text-blue-600 dark:text-blue-400",
      bgColor: "bg-blue-100 dark:bg-blue-900/30",
    },
    {
      label: "Total Earnings",
      value: formatCurrency(userStats?.total_earnings || 0,'USD'),
      icon: DollarSign,
      color: "text-emerald-600 dark:text-emerald-400",
      bgColor: "bg-emerald-100 dark:bg-emerald-900/30",
    },
    {
      label: "Matches Played",
      value: userStats?.matches_played || 0,
      icon: GamepadIcon,
      color: "text-purple-600 dark:text-purple-400",
      bgColor: "bg-purple-100 dark:bg-purple-900/30",
    },
  ];

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-neutral-900">
        <div className="flex justify-center items-center min-h-[400px]">
          <LoadingSpinner size="lg" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-neutral-900 safe-padding">
      <main className="mx-auto max-w-4xl py-4 md:py-6 px-3 sm:px-4 lg:px-8 space-y-4 md:space-y-6">
        {/* Mobile Header */}
        <div className="lg:hidden">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-gray-900 dark:text-white">
                My Profile
              </h1>
              <p className="text-gray-600 dark:text-gray-400 text-sm mt-0.5">
                Manage your account and track progress
              </p>
            </div>
            <Link
              to="/dashboard"
              className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
            >
              ←
            </Link>
          </div>
        </div>

        {/* Desktop Header */}
        <div className="hidden lg:flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-gray-900 dark:text-white">
              My Profile
            </h1>
            <p className="text-gray-600 dark:text-gray-400 text-sm md:text-base mt-1">
              Manage your account and track your progress
            </p>
          </div>
          <Link
            to="/dashboard"
            className="inline-flex items-center text-primary-600 dark:text-primary-500 hover:text-primary-700 dark:hover:text-primary-400 text-sm font-medium w-fit"
          >
            ← Back to Dashboard
          </Link>
        </div>

        {/* Error Banner */}
        {error && (
          <Banner
            type="error"
            title="Error"
            message={error}
            onClose={() => setError(null)}
            className="mb-4"
          />
        )}

        {/* Profile Header Card */}
        <div className="bg-white dark:bg-neutral-800 rounded-xl shadow border border-gray-200 dark:border-neutral-700 p-4 md:p-6">
          <div className="flex flex-col md:flex-row md:items-start gap-4 mb-4 md:mb-6">
            {/* Avatar Section */}
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="w-16 h-16 md:w-20 md:h-20 bg-gradient-to-br from-primary-500 to-primary-600 rounded-full flex items-center justify-center shadow-lg">
                  <User className="h-8 w-8 md:h-10 md:w-10 text-gray-900 dark:text-white" />
                </div>
                <div className="absolute bottom-1 right-1 w-3 h-3 md:w-4 md:h-4 bg-green-500 rounded-full border-2 border-white dark:border-neutral-800"></div>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h2 className="text-lg md:text-2xl font-bold text-gray-900 dark:text-gray-900 dark:text-white truncate">
                    {profile?.username}
                  </h2>
                  {profile?.is_verified && (
                    <div
                      className="bg-blue-500 rounded-full p-1 flex-shrink-0"
                      title="Verified User"
                    >
                      <Shield className="w-3 h-3 text-gray-900 dark:text-white" />
                    </div>
                  )}
                </div>
                <div className="flex items-center text-gray-600 dark:text-gray-400 text-sm truncate">
                  <Mail className="h-4 w-4 mr-2 flex-shrink-0" />
                  <span className="truncate">{profile?.email}</span>
                </div>
                <div className="flex items-center mt-2">
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {getMembershipDuration(user?.created_at)}
                  </span>
                </div>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-2 gap-2 md:hidden">
              <div className="bg-gray-50 dark:bg-neutral-700/50 rounded-lg p-3">
                <p className="text-gray-500 dark:text-gray-400 text-xs">
                  Balance
                </p>
                <p className="text-lg font-bold text-gray-900 dark:text-gray-900 dark:text-white">
                  {formatCurrency(user?.wallet_balance,'USD')}
                </p>
              </div>
              <div className="bg-gray-50 dark:bg-neutral-700/50 rounded-lg p-3">
                <p className="text-gray-500 dark:text-gray-400 text-xs">
                  Joined
                </p>
                <p className="text-sm font-semibold text-gray-900 dark:text-gray-900 dark:text-white">
                  {formatDate(profile?.created_at)}
                </p>
              </div>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-4 mb-4">
            <div className="bg-gray-50 dark:bg-neutral-700/50 rounded-lg md:rounded-xl p-3 md:p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 dark:text-gray-400 text-xs md:text-sm font-medium mb-1">
                    Wallet Balance
                  </p>
                  <p className="text-lg md:text-2xl font-bold text-gray-900 dark:text-gray-900 dark:text-white">
                    {formatCurrency(user?.wallet_balance,'USD')}
                  </p>
                </div>
                <div className="bg-primary-500/20 p-2 rounded-lg">
                  <DollarSign className="h-4 w-4 md:h-5 md:w-5 text-primary-600 dark:text-primary-400" />
                </div>
              </div>
            </div>

            <div className="bg-gray-50 dark:bg-neutral-700/50 rounded-lg md:rounded-xl p-3 md:p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 dark:text-gray-400 text-xs md:text-sm font-medium mb-1">
                    Member Since
                  </p>
                  <p className="text-sm md:text-lg font-semibold text-gray-900 dark:text-gray-900 dark:text-white">
                    {formatDate(profile?.created_at)}
                  </p>
                </div>
                <div className="bg-blue-500/20 p-2 rounded-lg">
                  <Calendar className="h-4 w-4 md:h-5 md:w-5 text-blue-600 dark:text-blue-400" />
                </div>
              </div>
            </div>

            <div className="hidden md:block md:col-span-2">
              <div className="flex space-x-3">
                <Link
                  to="/deposit"
                  className="flex-1 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-gray-900 dark:text-white font-medium py-3 px-4 rounded-lg text-center transition-colors text-sm"
                >
                  Add Funds
                </Link>
                <Link
                  to="/settings"
                  className="flex-1 bg-gray-100 dark:bg-neutral-700 hover:bg-gray-200 dark:hover:bg-neutral-600 border border-gray-300 dark:border-neutral-600 text-gray-900 dark:text-gray-900 dark:text-white font-medium py-3 px-4 rounded-lg text-center transition-colors text-sm"
                >
                  Settings
                </Link>
              </div>
            </div>
          </div>

          {/* Mobile Action Buttons */}
          <div className="grid grid-cols-2 gap-3 md:hidden">
            <Link
              to="/deposit"
              className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-gray-900 dark:text-white font-medium py-2 px-3 rounded-lg text-center transition-colors text-sm"
            >
              Add Funds
            </Link>
            <Link
              to="/settings"
              className="bg-gray-100 dark:bg-neutral-700 hover:bg-gray-200 dark:hover:bg-neutral-600 border border-gray-300 dark:border-neutral-600 text-gray-900 dark:text-gray-900 dark:text-white font-medium py-2 px-3 rounded-lg text-center transition-colors text-sm"
            >
              Settings
            </Link>
          </div>
        </div>

        {/* Low Balance Warning */}
        {hasLowBalance && (
          <Banner
            type="warning"
            title="Low Balance Alert"
            message={
              <div className="space-y-2">
                <p className="text-yellow-700 dark:text-yellow-200 text-sm">
                  Add funds to join paid tournaments and avoid interruption.
                </p>
                <div className="flex items-center gap-3">
                  <div className="flex-1 bg-yellow-500/20 rounded-full h-2">
                    <div
                      className="bg-yellow-500 h-2 rounded-full"
                      style={{
                        width: `${Math.min((parseFloat(user?.wallet_balance || 0) / 5) * 100, 100)}%`,
                      }}
                    ></div>
                  </div>
                  <Link
                    to="/deposit"
                    className="bg-yellow-500 hover:bg-yellow-600 text-gray-900 dark:text-white font-medium py-1 px-3 rounded text-xs transition-colors whitespace-nowrap"
                  >
                    Add Funds
                  </Link>
                </div>
              </div>
            }
            autoDismiss={false}
          />
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
          {statCards.map((stat, index) => (
            <StatCard key={index} {...stat} />
          ))}
        </div>

        {/* Detailed Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
          {/* Detailed Stats Card */}
          <div className="bg-white dark:bg-neutral-800 rounded-xl shadow border border-gray-200 dark:border-neutral-700 p-4 md:p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg md:text-xl font-semibold text-gray-900 dark:text-gray-900 dark:text-white">
                Detailed Stats
              </h2>
              <BarChart className="h-5 w-5 text-gray-400" />
            </div>
            <div className="space-y-3">
              <div className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-neutral-700">
                <span className="text-gray-600 dark:text-gray-400 text-sm md:text-base">
                  Tournaments Joined
                </span>
                <span className="text-gray-900 dark:text-gray-900 dark:text-white font-bold text-sm md:text-base">
                  {userStats?.tournaments_joined}
                </span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-neutral-700">
                <span className="text-gray-600 dark:text-gray-400 text-sm md:text-base">
                  Highest Win
                </span>
                <span className="text-emerald-600 dark:text-emerald-400 font-bold text-sm md:text-base">
                  {formatCurrency(userStats?.highest_win,'USD')}
                </span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-neutral-700">
                <span className="text-gray-600 dark:text-gray-400 text-sm md:text-base">
                  Avg. Position
                </span>
                <span className="text-gray-900 dark:text-gray-900 dark:text-white font-bold text-sm md:text-base">
                  #{userStats?.average_position}
                </span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-gray-600 dark:text-gray-400 text-sm md:text-base">
                  Best Streak
                </span>
                <span className="text-purple-600 dark:text-purple-400 font-bold text-sm md:text-base">
                  {userStats?.best_streak} wins
                </span>
              </div>
            </div>
          </div>

          {/* Account Status Card */}
          <div className="bg-white dark:bg-neutral-800 rounded-xl shadow border border-gray-200 dark:border-neutral-700 p-4 md:p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg md:text-xl font-semibold text-gray-900 dark:text-gray-900 dark:text-white">
                Account Status
              </h2>
              <Shield className="h-5 w-5 text-gray-400" />
            </div>
            <div className="space-y-3">
              <div className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-neutral-700">
                <span className="text-gray-600 dark:text-gray-400 text-sm md:text-base">
                  Verification
                </span>
                <span
                  className={`font-bold text-sm md:text-base ${
                    user?.is_verified
                      ? "text-green-600 dark:text-green-400"
                      : "text-yellow-600 dark:text-yellow-400"
                  }`}
                >
                  {user?.is_verified ? "Verified" : "Pending"}
                </span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-neutral-700">
                <span className="text-gray-600 dark:text-gray-400 text-sm md:text-base">
                  Account Role
                </span>
                <span className="text-primary-600 dark:text-primary-400 font-bold text-sm md:text-base capitalize">
                  {user?.role || "Player"}
                </span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-neutral-700">
                <span className="text-gray-600 dark:text-gray-400 text-sm md:text-base">
                  Total Deposits
                </span>
                <span className="text-gray-900 dark:text-gray-900 dark:text-white font-bold text-sm md:text-base">
                  {formatCurrency(userStats?.total_deposits || 0,'USD')}
                </span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-gray-600 dark:text-gray-400 text-sm md:text-base">
                  Last Active
                </span>
                <span className="text-gray-900 dark:text-gray-900 dark:text-white font-medium text-sm">
                  Today
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Tournaments */}
        <div className="bg-white dark:bg-neutral-800 rounded-xl shadow border border-gray-200 dark:border-neutral-700 p-4 md:p-6">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 mb-4">
            <div>
              <h2 className="text-lg md:text-xl font-semibold text-gray-900 dark:text-gray-900 dark:text-white">
                Recent Tournaments
              </h2>
              <p className="text-gray-600 dark:text-gray-400 text-sm mt-1">
                Your latest tournament activity
              </p>
            </div>
            <Link
              to="/my-tournaments"
              className="inline-flex items-center text-primary-600 dark:text-primary-500 hover:text-primary-700 dark:hover:text-primary-400 text-sm font-medium"
            >
              View All <ChevronRight className="h-4 w-4 ml-1" />
            </Link>
          </div>

          {recentTournaments.length > 0 ? (
            <div className="space-y-3">
              {recentTournaments.map((tournament) => (
                <Link
                  key={tournament.id}
                  to={`/tournament/${tournament.id}`}
                  className="block bg-gray-50 dark:bg-neutral-700/30 rounded-lg p-3 md:p-4 hover:bg-gray-100 dark:hover:bg-neutral-700/50 transition-colors"
                >
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-medium text-gray-900 dark:text-gray-900 dark:text-white text-sm md:text-base truncate">
                          {tournament.name}
                        </h3>
                        <span
                          className={`px-2 py-1 rounded-full text-xs ${
                            tournament.status === "completed"
                              ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                              : tournament.status === "active"
                                ? "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400"
                                : "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400"
                          }`}
                        >
                          {tournament.status}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-gray-600 dark:text-gray-400 text-xs">
                        <span className="flex items-center">
                          <Trophy className="h-3 w-3 mr-1" />
                          {tournament.game_type}
                        </span>
                        <span>•</span>
                        <span>
                          Entry: {formatCurrency(tournament.entry_fee || 0,'USD')}
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      {tournament.position && (
                        <p
                          className={`font-medium text-sm md:text-base ${
                            tournament.position === 1
                              ? "text-yellow-600 dark:text-yellow-400"
                              : tournament.position <= 3
                                ? "text-emerald-600 dark:text-emerald-400"
                                : "text-gray-600 dark:text-gray-400"
                          }`}
                        >
                          #{tournament.position}
                        </p>
                      )}
                      <p className="text-gray-500 dark:text-gray-400 text-xs">
                        {tournament.position ? "Position" : "Entry Fee"}
                      </p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-6 md:py-8">
              <div className="bg-gray-100 dark:bg-neutral-700/30 rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-3">
                <Trophy className="h-6 w-6 text-gray-400 dark:text-gray-500" />
              </div>
              <p className="text-gray-600 dark:text-gray-400 text-sm md:text-base mb-4">
                You haven't joined any tournaments yet.
              </p>
              <Link
                to="/tournaments"
                className="inline-flex items-center bg-primary-500 hover:bg-primary-600 text-gray-900 dark:text-white font-medium py-2 md:py-3 px-4 md:px-6 rounded-lg text-sm md:text-base transition-colors"
              >
                <Zap className="h-4 w-4 mr-2" />
                Join Your First Tournament
              </Link>
            </div>
          )}
        </div>

        {/* Quick Actions Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4">
          <Link
            to="/deposit"
            className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-gray-900 dark:text-white font-medium py-3 px-4 rounded-lg text-center transition-colors text-sm md:text-base flex items-center justify-center space-x-2"
          >
            <DollarSign className="h-4 w-4 md:h-5 md:w-5" />
            <span>Add Funds</span>
          </Link>
          <Link
            to="/create-tournament"
            className="bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 text-gray-900 dark:text-white font-medium py-3 px-4 rounded-lg text-center transition-colors text-sm md:text-base flex items-center justify-center space-x-2"
          >
            <Trophy className="h-4 w-4 md:h-5 md:w-5" />
            <span>Create Tournament</span>
          </Link>
          <Link
            to="/settings"
            className="bg-gray-100 dark:bg-neutral-700 hover:bg-gray-200 dark:hover:bg-neutral-600 border border-gray-300 dark:border-neutral-600 text-gray-900 dark:text-gray-900 dark:text-white font-medium py-3 px-4 rounded-lg text-center transition-colors text-sm md:text-base flex items-center justify-center space-x-2"
          >
            <Settings className="h-4 w-4 md:h-5 md:w-5" />
            <span>Account Settings</span>
          </Link>
        </div>
      </main>
    </div>
  );
}
