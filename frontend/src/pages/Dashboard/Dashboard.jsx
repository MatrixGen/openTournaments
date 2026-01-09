import Header from "../../components/layout/Header";
import DashboardBannerCarousel from "../../components/dashboard/DashboardBannerCarousel"; // New component
import { useAuth } from "../../contexts/AuthContext";
import { useState, useEffect } from "react";
import { tournamentService } from "../../services/tournamentService";
import { Link } from "react-router-dom";
import TournamentCarousel from "../../components/TournamentCarousel";
import Banner from "../../components/common/Banner";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import GooglePasswordBanner from "../../components/auth/GooglePasswordBanner"
import {
  Trophy,
  Plus,
  Search,
  TrendingUp,
  Users,
 
  Award,
  Zap,
  
  ChevronRight,
 
  Wallet,
 
} from "lucide-react";
import { formatCurrency } from "../../utils/formatters";

export default function Dashboard() {
  const { user } = useAuth();
  const [userTournaments, setUserTournaments] = useState([]);
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    completed: 0,
    won: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadUserTournaments();
  }, []);

  const loadUserTournaments = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const { tournaments } = await tournamentService.getMyTournaments();
      setUserTournaments(tournaments || []);
      calculateStats(tournaments || []);
    } catch (error) {
      console.error("Failed to load user tournaments:", error);
      setError("Failed to load tournaments. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const calculateStats = (tournaments) => {
    const stats = {
      total: tournaments.length,
      active: tournaments.filter(
        (t) => t.status === "active" || t.status === "upcoming"
      ).length,
      completed: tournaments.filter((t) => t.status === "completed").length,
      won: tournaments.filter(
        (t) => t.status === "completed" && t.position === 1
      ).length,
    };
    setStats(stats);
  };

  const isNewUser = userTournaments.length === 0;


  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-indigo-50/20 dark:from-gray-900 dark:to-gray-800 safe-padding">
      <main className="mx-auto max-w-7xl py-4 md:py-8 px-3 sm:px-4 lg:px-8 space-y-6">
        {/* Mobile Header with Balance */}
        <div className="lg:hidden mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
                Welcome, {user?.username}!
              </h1>
              <p className="text-gray-600 dark:text-gray-400 text-sm mt-1">
                Your tournament dashboard
              </p>
            </div>
            <div className="bg-gradient-to-br from-white to-gray-50/80 dark:from-gray-800 dark:to-gray-900/90 rounded-xl px-3 py-2 border border-gray-200 dark:border-gray-700 shadow-sm">
              <div className="flex items-center gap-2">
                <Wallet className="h-4 w-4 text-purple-500 dark:text-purple-400" />
                <div>
                  <p className="text-gray-500 dark:text-gray-400 text-xs">
                    Balance
                  </p>
                  <p className="text-lg font-bold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
                    {formatCurrency(user?.wallet_balance || 0, "USD")}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Action Buttons - Mobile */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            <Link
              to="/create-tournament"
              className="bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600 text-white font-medium py-3 px-4 rounded-xl text-center transition-all duration-200 hover:scale-105 active:scale-95 shadow-md hover:shadow-purple-500/25 flex items-center justify-center space-x-2"
            >
              <Plus className="h-4 w-4" />
              <span className="text-sm">Create</span>
            </Link>

            <Link
              to="/tournaments"
              className="bg-gradient-to-br from-white to-gray-50/80 dark:from-gray-800 dark:to-gray-900/90 hover:from-gray-50 hover:to-gray-100 dark:hover:from-gray-700 dark:hover:to-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white font-medium py-3 px-4 rounded-xl text-center transition-all duration-200 hover:scale-105 active:scale-95 flex items-center justify-center space-x-2"
            >
              <Search className="h-4 w-4" />
              <span className="text-sm">Browse</span>
            </Link>
          </div>
        </div>

        {/* Desktop Header */}
        <div className="hidden lg:flex flex-col md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
              Welcome back, {user?.username}!
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              Track your tournaments and performance
            </p>
          </div>
          <div className="mt-4 md:mt-0">
            <div className="bg-gradient-to-br from-white to-gray-50/80 dark:from-gray-800 dark:to-gray-900/90 rounded-xl px-6 py-4 border border-gray-200 dark:border-gray-700 shadow-lg">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-gradient-to-br from-purple-100 to-indigo-100 dark:from-purple-900/40 dark:to-indigo-900/40">
                  <Wallet className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <p className="text-gray-600 dark:text-gray-400 text-sm">
                    Wallet Balance
                  </p>
                  <p className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
                    {formatCurrency(user?.wallet_balance || 0, "USD")}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Banner Carousel Section - Replaces static banners */}
        <DashboardBannerCarousel />
        <GooglePasswordBanner/>

        {/* Quick Actions - Desktop */}
        <div className="hidden md:grid md:grid-cols-3 gap-4 md:gap-6">
          <Link
            to="/create-tournament"
            className="group bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600 text-white font-semibold py-4 md:py-6 px-6 rounded-xl text-center transition-all duration-200 hover:scale-105 active:scale-95 shadow-lg hover:shadow-purple-500/25"
          >
            <div className="flex items-center justify-center space-x-2 md:space-x-3">
              <Plus className="h-5 w-5 md:h-6 md:w-6" />
              <span className="text-sm md:text-base">Create Tournament</span>
            </div>
          </Link>

          <Link
            to="/tournaments"
            className="group bg-gradient-to-br from-white to-gray-50/80 dark:from-gray-800 dark:to-gray-900/90 hover:from-gray-50 hover:to-gray-100 dark:hover:from-gray-700 dark:hover:to-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white font-semibold py-4 md:py-6 px-6 rounded-xl text-center transition-all duration-200 hover:scale-105 active:scale-95"
          >
            <div className="flex items-center justify-center space-x-2 md:space-x-3">
              <Search className="h-5 w-5 md:h-6 md:w-6" />
              <span className="text-sm md:text-base">Browse Tournaments</span>
            </div>
          </Link>

          <Link
            to="/my-profile"
            className="group bg-gradient-to-br from-white to-gray-50/80 dark:from-gray-800 dark:to-gray-900/90 hover:from-gray-50 hover:to-gray-100 dark:hover:from-gray-700 dark:hover:to-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white font-semibold py-4 md:py-6 px-6 rounded-xl text-center transition-all duration-200 hover:scale-105 active:scale-95"
          >
            <div className="flex items-center justify-center space-x-2 md:space-x-3">
              <TrendingUp className="h-5 w-5 md:h-6 md:w-6" />
              <span className="text-sm md:text-base">View Stats</span>
            </div>
          </Link>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recent Tournaments - Takes 2/3 on large screens */}
          <div className="lg:col-span-2">
            {isLoading ? (
              <div className="flex justify-center py-8 md:py-12">
                <LoadingSpinner size="md" />
              </div>
            ) : error ? (
              <div className="text-center py-6 md:py-8">
                <p className="text-red-500 dark:text-red-400 mb-3 md:mb-4">
                  {error}
                </p>
                <button
                  onClick={loadUserTournaments}
                  className="bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600 text-white font-medium py-2 px-4 rounded-lg transition-all duration-200 hover:scale-105 active:scale-95 text-sm md:text-base"
                >
                  Try Again
                </button>
              </div>
            ) : userTournaments.length > 0 ? (
              <TournamentCarousel tournaments={userTournaments} />
            ) : (
              <div className="text-center py-8 md:py-12">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-900 flex items-center justify-center">
                  <Trophy className="h-8 w-8 text-gray-400 dark:text-gray-500" />
                </div>
                <h3 className="text-base md:text-lg font-medium text-gray-900 dark:text-white mb-1 md:mb-2">
                  No tournaments yet
                </h3>
                <p className="text-gray-600 dark:text-gray-400 mb-4 md:mb-6 max-w-sm mx-auto text-sm md:text-base">
                  Join your first tournament and start competing for prizes!
                </p>
                <Link
                  to="/tournaments"
                  className="inline-flex items-center bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600 text-white font-medium py-2.5 px-6 rounded-lg transition-all duration-200 hover:scale-105 active:scale-95 shadow-md text-sm md:text-base"
                >
                  <Search className="h-4 w-4 mr-2" />
                  Explore Tournaments
                </Link>
              </div>
            )}
          </div>

          
          {/* Sidebar - Takes 1/3 on large screens */}
          <div className="space-y-4 md:space-y-6">
            {/* Profile Quick View */}
            <Link to="/my-profile" className="block group">
              <div className="bg-gradient-to-br from-white to-gray-50/80 dark:from-gray-800 dark:to-gray-900/90 rounded-xl border border-gray-200 dark:border-gray-700 p-4 hover:border-purple-300 dark:hover:border-purple-700 transition-all duration-200 hover:scale-105 active:scale-95">
                <div className="flex items-center space-x-3 md:space-x-4">
                  <div className="bg-gradient-to-br from-purple-500 to-indigo-500 rounded-full w-10 h-10 md:w-12 md:h-12 flex items-center justify-center flex-shrink-0 shadow-md">
                    <Users className="h-5 w-5 md:h-6 md:w-6 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900 dark:text-white group-hover:bg-gradient-to-r group-hover:from-purple-600 group-hover:to-indigo-600 group-hover:bg-clip-text group-hover:text-transparent transition-all duration-200 text-sm md:text-base">
                      Your Profile
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400 text-xs md:text-sm mt-0.5 truncate">
                      View stats & achievements
                    </p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-gray-400 group-hover:text-purple-500 dark:group-hover:text-purple-400 transition-colors flex-shrink-0" />
                </div>
              </div>
            </Link>

            {/* Achievement Preview */}
            {stats.won > 0 && (
              <div className="bg-gradient-to-r from-amber-500/10 to-yellow-500/10 dark:from-amber-900/20 dark:to-yellow-900/20 rounded-xl border border-amber-500/20 dark:border-amber-500/30 p-4">
                <div className="flex items-center space-x-2 md:space-x-3">
                  <div className="bg-gradient-to-br from-amber-500 to-yellow-500 p-2 rounded-lg">
                    <Award className="h-5 w-5 md:h-6 md:w-6 text-white" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-semibold text-gray-900 dark:text-white text-sm md:text-base">
                      Tournament Champion!{" "}
                    </h3>
                    <p className="text-amber-700 dark:text-amber-300 text-xs md:text-sm mt-0.5 truncate">
                      You've won {stats.won} tournament
                      {stats.won > 1 ? "s" : ""}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Quick Tips for New Users */}
            {isNewUser && !isLoading && (
              <div className="bg-gradient-to-br from-white to-gray-50/80 dark:from-gray-800 dark:to-gray-900/90 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-2 md:mb-3 flex items-center text-sm md:text-base">
                  <Zap className="h-4 w-4 md:h-5 md:w-5 mr-2 text-purple-500 dark:text-purple-400" />
                  Getting Started
                </h3>
                <ul className="space-y-1.5 text-xs md:text-sm text-gray-600 dark:text-gray-400">
                  <li className="flex items-start">
                    <span className="text-purple-500 dark:text-purple-400 mr-2">
                      •
                    </span>
                    <span>Browse tournaments to find matches</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-purple-500 dark:text-purple-400 mr-2">
                      •
                    </span>
                    <span>Ensure sufficient wallet balance</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-purple-500 dark:text-purple-400 mr-2">
                      •
                    </span>
                    <span>Check tournament rules before joining</span>
                  </li>
                </ul>
              </div>
            )}

            {/* Deposit Card for Low Balance */}

            <Link to="/channels" className="block">
              <img
                src="/images/createProfileBanner.png"
                alt="channels link"
                className="w-full rounded-xl border border-red-500/20 dark:border-red-500/30 hover:scale-[1.01] transition-transform duration-300 cursor-pointer"
              />
            </Link>
          </div>
        </div>

      </main>
    </div>
  );
}
