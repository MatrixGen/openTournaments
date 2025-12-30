import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { userProfileService } from "../services/userProfileService";
import LoadingSpinner from "../components/common/LoadingSpinner";
import {
  Trophy,
  Calendar,
  GamepadIcon,
  TrendingUp,
  BarChart,
  Shield,
  Zap,
  ChevronRight,
  Users,
  Target,
  Clock,
  Award,
  Globe,
  UserCheck,
  UserPlus,
  UserMinus,
  Users as UsersIcon,
  Star,
  Crown,
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";

// Public Stats Card Component
const PublicStatCard = ({ label, value, icon: Icon, color, suffix }) => (
  <div className="bg-gradient-to-br from-white to-gray-50/80 dark:from-gray-800 dark:to-gray-900/90 rounded-xl p-4 border border-gray-200 dark:border-gray-700 hover:border-purple-300 dark:hover:border-purple-700 transition-all duration-200 hover:shadow-md">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-gray-600 dark:text-gray-400 text-xs font-medium mb-1">
          {label}
        </p>
        <p
          className={`text-xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent ${
            color ? '' : 'dark:text-white'
          }`}
        >
          {value}
          {suffix}
        </p>
      </div>
      <div
        className={`p-2 rounded-lg bg-gradient-to-br ${
          color 
            ? color.replace('text-', 'from-').replace('dark:text-', 'dark:from-') + '/10 to-' + color.replace('text-', '').replace('dark:text-', 'dark:') + '/20'
            : 'from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-800'
        }`}
      >
        <Icon
          className={`h-4 w-5 ${color || 'text-gray-600 dark:text-gray-400'}`}
        />
      </div>
    </div>
  </div>
);

export default function PublicProfile() {
  const { userId } = useParams();
  const { user: currentUser } = useAuth();
  const [profileData, setProfileData] = useState(null);
  const [recentTournaments, setRecentTournaments] = useState([]);
  const [followers, setFollowers] = useState([]);
  const [following, setFollowing] = useState([]);
  const [isFollowing, setIsFollowing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    loadPublicProfileData();
  }, [userId]);

  const loadPublicProfileData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Load public user profile
      const profileResponse = await userProfileService.getPublicProfile(userId);

      if (profileResponse.success) {
        setProfileData(profileResponse.data);
        setIsFollowing(
          profileResponse.data.relationship?.is_following || false
        );
      } else {
        setError(profileResponse.error || "User not found");
      }

      if (profileResponse.success) {
        setRecentTournaments(profileResponse.data.recent_tournaments || []);
      }

      // Load followers (first page)
      const followersResponse = await userProfileService.getFollowers(userId, {
        limit: 3,
      });
      if (followersResponse.success) {
        setFollowers(followersResponse.data.followers || []);
      }

      // Load following (first page)
      const followingResponse = await userProfileService.getFollowing(userId, {
        limit: 3,
      });
      if (followingResponse.success) {
        setFollowing(followingResponse.data.following || []);
      }
    } catch (error) {
      console.error("Failed to load public profile:", error);
      setError("Failed to load profile data. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleFollow = async () => {
    try {
      setActionLoading(true);
      const response = await userProfileService.followUser(userId);
      if (response.success) {
        setIsFollowing(true);
        // Refresh followers count
        loadPublicProfileData();
      }
    } catch (error) {
      console.error("Error following user:", error);
    } finally {
      setActionLoading(false);
    }
  };

  const handleUnfollow = async () => {
    try {
      setActionLoading(true);
      const response = await userProfileService.unfollowUser(userId);
      if (response.success) {
        setIsFollowing(false);
        // Refresh followers count
        loadPublicProfileData();
      }
    } catch (error) {
      console.error("Error unfollowing user:", error);
    } finally {
      setActionLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;

    return date.toLocaleDateString("en-US", {
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
    const totalMonths = years * 12 + months;

    if (years > 0) {
      return `${years} year${years > 1 ? "s" : ""} on platform`;
    }
    return `${Math.max(totalMonths, 1)} month${
      totalMonths !== 1 ? "s" : ""
    } on platform`;
  };

  // Public stats cards
  const publicStatCards = [
    {
      label: "Win Rate",
      value: profileData?.stats?.win_rate || 0,
      icon: TrendingUp,
      color:
        (profileData?.stats?.win_rate || 0) >= 50
          ? "text-emerald-600 dark:text-emerald-400"
          : "text-amber-600 dark:text-amber-400",
      suffix: "%",
    },
    {
      label: "Tournaments Won",
      value: profileData?.stats?.tournaments_won || 0,
      icon: Trophy,
      color: "text-blue-600 dark:text-blue-400",
    },
    {
      label: "Total Matches",
      value: profileData?.stats?.matches_played || 0,
      icon: GamepadIcon,
      color: "text-purple-600 dark:text-purple-400",
    },
    {
      label: "Avg. Position",
      value: profileData?.stats?.average_position
        ? `#${profileData.stats.average_position}`
        : "N/A",
      icon: Target,
      color: "text-orange-600 dark:text-orange-400",
    },
  ];

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-indigo-50/20 dark:from-gray-900 dark:to-gray-800">
        <div className="flex justify-center items-center min-h-[400px]">
          <LoadingSpinner size="lg" />
        </div>
      </div>
    );
  }

  if (error || !profileData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-indigo-50/20 dark:from-gray-900 dark:to-gray-800 safe-padding">
        <main className="mx-auto max-w-4xl py-6 px-3 sm:px-4 lg:px-8">
          <div className="text-center py-12">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-purple-100 to-indigo-100 dark:from-purple-900/30 dark:to-indigo-900/30 flex items-center justify-center">
              <Globe className="h-8 w-8 text-purple-500 dark:text-purple-400" />
            </div>
            <h2 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent mb-2">
              Profile Not Found
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              {error || "The user profile you're looking for doesn't exist."}
            </p>
            <Link
              to="/tournaments"
              className="inline-flex items-center bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600 text-white font-medium py-2.5 px-4 rounded-lg transition-all duration-200 hover:scale-105 active:scale-95 shadow-md"
            >
              Browse Tournaments
            </Link>
          </div>
        </main>
      </div>
    );
  }

  const isOwnProfile = currentUser?.id === parseInt(userId);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-indigo-50/20 dark:from-gray-900 dark:to-gray-800 safe-padding">
      <main className="mx-auto max-w-4xl py-6 space-y-4 md:space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
              Player Profile
            </h1>
            <p className="text-gray-600 dark:text-gray-400 text-sm md:text-base mt-1">
              Viewing {profileData.user.username}'s public stats and
              achievements
            </p>
          </div>
          <Link
            to="/tournaments"
            className="inline-flex items-center text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 text-sm font-medium w-fit hover:scale-105 transition-transform duration-200"
          >
            ← Back to Tournaments
          </Link>
        </div>

        {/* Profile Header Card */}
        <div className="bg-gradient-to-br from-white to-gray-50/80 dark:from-gray-800 dark:to-gray-900/90 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-4 md:p-6">
          <div className="flex flex-col md:flex-row md:items-start gap-4 md:gap-6 mb-4 md:mb-6">
            {/* Avatar & Info Section */}
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="w-16 h-16 md:w-20 md:h-20 bg-gradient-to-br from-purple-500 to-indigo-500 rounded-full flex items-center justify-center shadow-lg">
                  {profileData.user.avatar_url ? (
                    <img
                      src={profileData.user.avatar_url}
                      alt={profileData.user.username}
                      className="w-full h-full rounded-full object-cover"
                    />
                  ) : (
                    <Users className="h-8 w-8 md:h-10 md:w-10 text-white" />
                  )}
                </div>
                {profileData.user.is_verified && (
                  <div className="absolute -top-1 -right-1 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-full p-0.5 shadow-md">
                    <Shield className="h-4 w-4 text-white" />
                  </div>
                )}
                {profileData.user.is_pro_player && (
                  <div className="absolute -bottom-1 -right-1 bg-gradient-to-br from-amber-500 to-yellow-500 rounded-full p-0.5 shadow-md">
                    <Crown className="h-4 w-4 text-white" />
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <h2 className="text-lg md:text-2xl font-bold text-gray-900 dark:text-white truncate">
                    {profileData.user.display_name || profileData.user.username}
                  </h2>
                  {profileData.user.is_verified && (
                    <span className="inline-flex items-center gap-1 bg-gradient-to-r from-blue-500/10 to-indigo-500/10 text-blue-600 dark:text-blue-400 px-2 py-1 rounded-full text-xs border border-blue-200 dark:border-blue-800">
                      <Shield className="h-3 w-3" />
                      Verified
                    </span>
                  )}
                  {profileData.user.is_pro_player && (
                    <span className="inline-flex items-center gap-1 bg-gradient-to-r from-amber-500/10 to-yellow-500/10 text-amber-600 dark:text-amber-400 px-2 py-1 rounded-full text-xs border border-amber-200 dark:border-amber-800">
                      <Crown className="h-3 w-3" />
                      Pro Player
                    </span>
                  )}
                </div>
                <p className="text-gray-500 dark:text-gray-400 text-sm">
                  @{profileData.user.username}
                </p>
                {profileData.user.bio && (
                  <p className="text-gray-600 dark:text-gray-300 text-sm mt-2 line-clamp-2">
                    {profileData.user.bio}
                  </p>
                )}
                <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 text-gray-600 dark:text-gray-400 text-sm mt-2">
                  <div className="flex items-center">
                    <Calendar className="h-4 w-4 mr-2 flex-shrink-0" />
                    <span>
                      Member since {formatDate(profileData.user.created_at)}
                    </span>
                  </div>
                  <span className="hidden sm:inline">•</span>
                  <span className="text-gray-500 dark:text-gray-400">
                    {getMembershipDuration(profileData.user.created_at)}
                  </span>
                </div>
                {profileData.user.country && (
                  <div className="flex items-center text-gray-600 dark:text-gray-400 text-sm mt-1">
                    <Globe className="h-4 w-4 mr-2" />
                    <span>{profileData.user.country}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col gap-3 md:ml-auto md:w-48">
              {!isOwnProfile && currentUser && (
                <button
                  onClick={isFollowing ? handleUnfollow : handleFollow}
                  disabled={actionLoading}
                  className={`inline-flex items-center justify-center gap-2 font-medium py-2.5 px-4 rounded-lg transition-all duration-200 hover:scale-105 active:scale-95 ${
                    isFollowing
                      ? "bg-gradient-to-r from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-800 hover:from-gray-200 hover:to-gray-300 dark:hover:from-gray-600 dark:hover:to-gray-700 text-gray-700 dark:text-gray-300"
                      : "bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600 text-white shadow-md hover:shadow-purple-500/25"
                  }`}
                >
                  {actionLoading ? (
                    <LoadingSpinner size="sm" />
                  ) : isFollowing ? (
                    <>
                      <UserMinus className="h-4 w-4" />
                      Following
                    </>
                  ) : (
                    <>
                      <UserPlus className="h-4 w-4" />
                      Follow
                    </>
                  )}
                </button>
              )}

              {/* Social Stats */}
              <div className="flex items-center justify-between gap-4 mt-2">
                <Link
                  to={`/player/${userId}/followers`}
                  className="flex flex-col items-center hover:text-purple-600 dark:hover:text-purple-400 transition-colors group"
                >
                  <span className="text-lg font-bold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent group-hover:from-purple-700 group-hover:to-indigo-700">
                    {profileData.stats?.followers_count || 0}
                  </span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    Followers
                  </span>
                </Link>
                <div className="h-6 w-px bg-gradient-to-b from-gray-300 to-gray-400/50 dark:from-gray-600 dark:to-gray-700/50" />
                <Link
                  to={`/player/${userId}/following`}
                  className="flex flex-col items-center hover:text-purple-600 dark:hover:text-purple-400 transition-colors group"
                >
                  <span className="text-lg font-bold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent group-hover:from-purple-700 group-hover:to-indigo-700">
                    {profileData.stats?.following_count || 0}
                  </span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    Following
                  </span>
                </Link>
              </div>
            </div>
          </div>

          {/* Quick Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
            <div className="bg-gradient-to-br from-gray-50 to-gray-100/50 dark:from-gray-800/50 dark:to-gray-900/50 rounded-xl p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 dark:text-gray-400 text-xs font-medium mb-1">
                    Tournaments
                  </p>
                  <p className="text-lg md:text-2xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
                    {profileData.stats?.tournaments_joined || 0}
                  </p>
                </div>
                <div className="bg-gradient-to-br from-blue-500/20 to-indigo-500/20 p-2 rounded-lg">
                  <Trophy className="h-4 w-4 md:h-5 md:w-5 text-blue-600 dark:text-blue-400" />
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-gray-50 to-gray-100/50 dark:from-gray-800/50 dark:to-gray-900/50 rounded-xl p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 dark:text-gray-400 text-xs font-medium mb-1">
                    Matches Won
                  </p>
                  <p className="text-lg md:text-2xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
                    {profileData.stats?.matches_won || 0}
                  </p>
                </div>
                <div className="bg-gradient-to-br from-emerald-500/20 to-green-500/20 p-2 rounded-lg">
                  <Star className="h-4 w-4 md:h-5 md:w-5 text-emerald-600 dark:text-emerald-400" />
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-gray-50 to-gray-100/50 dark:from-gray-800/50 dark:to-gray-900/50 rounded-xl p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 dark:text-gray-400 text-xs font-medium mb-1">
                    Best Streak
                  </p>
                  <p className="text-lg md:text-2xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
                    {profileData.stats?.best_win_streak || 0}
                  </p>
                </div>
                <div className="bg-gradient-to-br from-purple-500/20 to-violet-500/20 p-2 rounded-lg">
                  <TrendingUp className="h-4 w-4 md:h-5 md:w-5 text-purple-600 dark:text-purple-400" />
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-gray-50 to-gray-100/50 dark:from-gray-800/50 dark:to-gray-900/50 rounded-xl p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 dark:text-gray-400 text-xs font-medium mb-1">
                    Platform Level
                  </p>
                  <p className="text-lg md:text-2xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
                    {profileData.stats?.level || 1}
                  </p>
                </div>
                <div className="bg-gradient-to-br from-amber-500/20 to-yellow-500/20 p-2 rounded-lg">
                  <Award className="h-4 w-4 md:h-5 md:w-5 text-amber-600 dark:text-amber-400" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
          {publicStatCards.map((stat, index) => (
            <PublicStatCard key={index} {...stat} />
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
          {/* Recent Followers */}
          <div className="bg-gradient-to-br from-white to-gray-50/80 dark:from-gray-800 dark:to-gray-900/90 rounded-xl border border-gray-200 dark:border-gray-700 p-4 md:p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Recent Followers
              </h2>
              <div className="bg-gradient-to-br from-purple-500/10 to-indigo-500/10 p-2 rounded-lg">
                <UsersIcon className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              </div>
            </div>
            <div className="space-y-3">
              {followers.length > 0 ? (
                followers.map((follower) => (
                  <Link
                    key={follower.id}
                    to={`/player/${follower.id}`}
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-gradient-to-r hover:from-purple-50/50 hover:to-indigo-50/50 dark:hover:from-purple-900/20 dark:hover:to-indigo-900/20 transition-all duration-200 group"
                  >
                    <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-indigo-500 rounded-full flex items-center justify-center shadow-md">
                      {follower.avatar_url ? (
                        <img
                          src={follower.avatar_url}
                          alt={follower.username}
                          className="w-full h-full rounded-full object-cover"
                        />
                      ) : (
                        <Users className="h-5 w-5 text-white" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 dark:text-white text-sm truncate group-hover:text-purple-600 dark:group-hover:text-purple-400">
                        {follower.display_name || follower.username}
                      </p>
                      <p className="text-gray-500 dark:text-gray-400 text-xs">
                        @{follower.username}
                      </p>
                    </div>
                  </Link>
                ))
              ) : (
                <div className="text-center py-4">
                  <Users className="h-8 w-8 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
                  <p className="text-gray-500 dark:text-gray-400 text-sm">
                    No followers yet
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Following */}
          <div className="bg-gradient-to-br from-white to-gray-50/80 dark:from-gray-800 dark:to-gray-900/90 rounded-xl border border-gray-200 dark:border-gray-700 p-4 md:p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Following
              </h2>
              <div className="bg-gradient-to-br from-blue-500/10 to-indigo-500/10 p-2 rounded-lg">
                <UserCheck className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
            <div className="space-y-3">
              {following.length > 0 ? (
                following.map((followed) => (
                  <Link
                    key={followed.id}
                    to={`/player/${followed.id}`}
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-gradient-to-r hover:from-purple-50/50 hover:to-indigo-50/50 dark:hover:from-purple-900/20 dark:hover:to-indigo-900/20 transition-all duration-200 group"
                  >
                    <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-indigo-500 rounded-full flex items-center justify-center shadow-md">
                      {followed.avatar_url ? (
                        <img
                          src={followed.avatar_url}
                          alt={followed.username}
                          className="w-full h-full rounded-full object-cover"
                        />
                      ) : (
                        <Users className="h-5 w-5 text-white" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 dark:text-white text-sm truncate group-hover:text-purple-600 dark:group-hover:text-purple-400">
                        {followed.display_name || followed.username}
                      </p>
                      <p className="text-gray-500 dark:text-gray-400 text-xs">
                        @{followed.username}
                      </p>
                    </div>
                  </Link>
                ))
              ) : (
                <div className="text-center py-4">
                  <UserCheck className="h-8 w-8 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
                  <p className="text-gray-500 dark:text-gray-400 text-sm">
                    Not following anyone
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Best Performance */}
          <div className="bg-gradient-to-br from-white to-gray-50/80 dark:from-gray-800 dark:to-gray-900/90 rounded-xl border border-gray-200 dark:border-gray-700 p-4 md:p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Best Performance
              </h2>
              <div className="bg-gradient-to-br from-amber-500/10 to-yellow-500/10 p-2 rounded-lg">
                <Trophy className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </div>
            </div>
            <div className="space-y-3">
              {profileData.best_performance ? (
                <div className="space-y-4">
                  <div className="bg-gradient-to-br from-amber-500/10 to-yellow-500/10 dark:from-amber-900/20 dark:to-yellow-900/20 rounded-xl p-4 border border-amber-200 dark:border-amber-800/50">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-amber-600 dark:text-amber-400 text-sm font-medium">
                          #{profileData.best_performance.position}
                        </p>
                        <p className="text-gray-900 dark:text-white font-bold text-lg line-clamp-1">
                          {profileData.best_performance.tournament_name}
                        </p>
                      </div>
                      <div className="bg-gradient-to-br from-amber-500/20 to-yellow-500/20 p-2 rounded-lg">
                        <Trophy className="h-6 w-6 text-amber-600 dark:text-amber-400" />
                      </div>
                    </div>
                  </div>
                  <Link
                    to={`/tournaments/${profileData.best_performance.tournament_id}`}
                    className="block text-center text-purple-600 dark:text-purple-500 hover:text-purple-700 dark:hover:text-purple-400 text-sm font-medium hover:scale-105 transition-transform duration-200"
                  >
                    View Tournament →
                  </Link>
                </div>
              ) : (
                <div className="text-center py-6">
                  <Trophy className="h-12 w-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                  <p className="text-gray-500 dark:text-gray-400 text-sm">
                    No tournament wins yet
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Recent Tournament Activity */}
        <div className="bg-gradient-to-br from-white to-gray-50/80 dark:from-gray-800 dark:to-gray-900/90 rounded-xl border border-gray-200 dark:border-gray-700 p-4 md:p-6">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 mb-4">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Recent Tournament Activity
              </h2>
              <p className="text-gray-600 dark:text-gray-400 text-sm mt-1">
                {profileData.user.username}'s latest tournament performance
              </p>
            </div>
           {recentTournaments.length > 0 && (
              <Link
                to="/tournaments"
                className="inline-flex items-center text-purple-600 dark:text-purple-500 hover:text-purple-700 dark:hover:text-purple-400 text-sm font-medium hover:scale-105 transition-transform duration-200"
              >
                View All Tournaments <ChevronRight className="h-4 w-4 ml-1" />
              </Link>
            )}
          </div>

          {recentTournaments.length > 0 ? (
            <div className="space-y-3">
              {recentTournaments.map((tournament) => (
                <Link
                  key={tournament.id}
                  to={`/tournaments/${tournament.id}`}
                  className="block bg-gradient-to-br from-gray-50 to-gray-100/50 dark:from-gray-800/50 dark:to-gray-900/50 rounded-xl p-4 hover:from-purple-50/30 hover:to-indigo-50/30 dark:hover:from-purple-900/20 dark:hover:to-indigo-900/20 transition-all duration-200 group"
                >
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <h3 className="font-medium text-gray-900 dark:text-white text-sm md:text-base truncate group-hover:text-purple-600 dark:group-hover:text-purple-400">
                          {tournament.name}
                        </h3>
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${
                            tournament.status === "completed"
                              ? "bg-gradient-to-r from-emerald-100 to-green-100 dark:from-emerald-900/30 dark:to-green-900/30 text-emerald-800 dark:text-emerald-400"
                              : tournament.status === "active"
                              ? "bg-gradient-to-r from-blue-100 to-indigo-100 dark:from-blue-900/30 dark:to-indigo-900/30 text-blue-800 dark:text-blue-400"
                              : "bg-gradient-to-r from-amber-100 to-yellow-100 dark:from-amber-900/30 dark:to-yellow-900/30 text-amber-800 dark:text-amber-400"
                          }`}
                        >
                          {tournament.status}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 text-gray-600 dark:text-gray-400 text-xs">
                        <span className="flex items-center bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
                          <Trophy className="h-3 w-3 mr-1" />
                          {tournament.game_type}
                        </span>
                        <span className="flex items-center bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
                          <Clock className="h-3 w-3 mr-1" />
                          {formatDate(tournament.created_at)}
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      {tournament.position && (
                        <div className="flex flex-col items-end">
                          <p
                            className={`font-medium text-sm md:text-base ${
                              tournament.position === 1
                                ? "bg-gradient-to-r from-amber-600 to-yellow-600 bg-clip-text text-transparent"
                                : tournament.position <= 3
                                ? "bg-gradient-to-r from-emerald-600 to-green-600 bg-clip-text text-transparent"
                                : "bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent"
                            }`}
                          >
                            #{tournament.position}
                          </p>
                          <p className="text-gray-500 dark:text-gray-400 text-xs">
                            {tournament.total_participants
                              ? `of ${tournament.total_participants}`
                              : "Position"}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-6 md:py-8">
              <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-900 flex items-center justify-center">
                <Trophy className="h-6 w-6 text-gray-400 dark:text-gray-500" />
              </div>
              <p className="text-gray-600 dark:text-gray-400 text-sm md:text-base mb-4">
                {profileData.user.username} hasn't joined any tournaments yet.
              </p>
              <Link
                to="/tournaments"
                className="inline-flex items-center bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600 text-white font-medium py-2.5 px-4 rounded-lg transition-all duration-200 hover:scale-105 active:scale-95 shadow-md"
              >
                <Zap className="h-4 w-4 mr-2" />
                Browse Tournaments
              </Link>
            </div>
          )}
        </div>

        {/* Social Links (if available) */}
        {profileData.user.social_links &&
          Object.keys(profileData.user.social_links).length > 0 && (
            <div className="bg-gradient-to-br from-white to-gray-50/80 dark:from-gray-800 dark:to-gray-900/90 rounded-xl border border-gray-200 dark:border-gray-700 p-4 md:p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Social Links
              </h2>
              <div className="flex flex-wrap gap-2">
                {profileData.user.social_links.twitter && (
                  <a
                    href={`https://twitter.com/${profileData.user.social_links.twitter}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 bg-gradient-to-br from-[#1DA1F2]/10 to-[#1DA1F2]/20 hover:from-[#1DA1F2]/20 hover:to-[#1DA1F2]/30 text-[#1DA1F2] px-3 py-2 rounded-lg transition-all duration-200 hover:scale-105 active:scale-95 text-sm"
                  >
                    <span>𝕏</span>
                    Twitter
                  </a>
                )}
                {profileData.user.social_links.twitch && (
                  <a
                    href={`https://twitch.tv/${profileData.user.social_links.twitch}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 bg-gradient-to-br from-[#9146FF]/10 to-[#9146FF]/20 hover:from-[#9146FF]/20 hover:to-[#9146FF]/30 text-[#9146FF] px-3 py-2 rounded-lg transition-all duration-200 hover:scale-105 active:scale-95 text-sm"
                  >
                    <span>▶</span>
                    Twitch
                  </a>
                )}
                {profileData.user.social_links.youtube && (
                  <a
                    href={`https://youtube.com/${profileData.user.social_links.youtube}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 bg-gradient-to-br from-[#FF0000]/10 to-[#FF0000]/20 hover:from-[#FF0000]/20 hover:to-[#FF0000]/30 text-[#FF0000] px-3 py-2 rounded-lg transition-all duration-200 hover:scale-105 active:scale-95 text-sm"
                  >
                    <span>▶</span>
                    YouTube
                  </a>
                )}
                {profileData.user.social_links.discord && (
                  <button
                    onClick={() =>
                      navigator.clipboard.writeText(
                        profileData.user.social_links.discord
                      )
                    }
                    className="inline-flex items-center gap-2 bg-gradient-to-br from-[#5865F2]/10 to-[#5865F2]/20 hover:from-[#5865F2]/20 hover:to-[#5865F2]/30 text-[#5865F2] px-3 py-2 rounded-lg transition-all duration-200 hover:scale-105 active:scale-95 text-sm"
                  >
                    <span>#</span>
                    Discord
                  </button>
                )}
              </div>
            </div>
          )}

        {/* Challenge Button */}
        {!isOwnProfile && (
          <div className="text-center">
            <Link
              to={`/tournaments?challenge=${profileData.user.id}`}
              className="inline-flex items-center bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 text-white font-bold py-3 px-6 rounded-xl transition-all duration-200 hover:scale-105 active:scale-95 shadow-lg hover:shadow-purple-500/25 border border-white/20 text-sm md:text-base"
            >
              <Zap className="h-4 w-4 md:h-5 md:w-5 mr-2 fill-white" />
              <span>Challenge {profileData.user.username} in a Tournament</span>
            </Link>
          </div>
        )}
      </main>
    </div>
  );
}