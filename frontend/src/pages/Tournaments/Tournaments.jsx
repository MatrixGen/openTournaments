import React, { useState, useEffect, useCallback } from "react";
import { tournamentService } from "../../services/tournamentService";
import { Link, useLocation, useNavigate } from "react-router-dom";
import Banner from "../../components/common/Banner";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import {
  Plus,
  Trophy,
  Calendar,
  Filter,
  Search,
  Zap,
  AlertCircle,
  X,
  ArrowLeft,
  Users,
  Clock,
} from "lucide-react";
import TournamentCard from "../../components/tournament/TournamentCard";
import MobileFilterDrawer from "../../components/tournament/MobileFilterDrawer";
import { MobileFAB } from "../../components/tournament/MobileFAB";
import { cn } from "../../utils/cn";
import { userProfileService } from "../../services/userProfileService";

export default function Tournaments({
  customFilters = null,
  title = "Tournaments",
  subtitle = "Explore all available tournaments",
  showCreateButton = true,
  showFilters = true,
  showSearch = true,
  showStats = true,
  tournamentType = "all",
  userId = null,
  maxTournaments = null,
  emptyStateMessage = "No tournaments found",
  emptyStateAction = null,
  onTournamentClick = null,
  customApiEndpoint = null,
  hideHeader = false,
  hideTips = false,
  layout = "grid",
  compact = false,
}) {
  const [tournaments, setTournaments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [activeTournaments, setActiveTournaments] = useState(0);
  const [responseCurrency, setResponseCurrency] = useState("TZS");
  const location = useLocation();
  const navigate = useNavigate();

  const searchParams = new URLSearchParams(location.search);
  userId = location.state?.userId;

  const [filters, setFilters] = useState(() => {
    const initial = customFilters || {
      status: "all",
      sort: "newest",
      minPrice: "",
      maxPrice: "",
      search: "",
    };

    if (searchParams.has("status")) initial.status = searchParams.get("status");
    if (searchParams.has("sort")) initial.sort = searchParams.get("sort");
    if (searchParams.has("search")) initial.search = searchParams.get("search");
    if (searchParams.has("minPrice"))
      initial.minPrice = searchParams.get("minPrice");
    if (searchParams.has("maxPrice"))
      initial.maxPrice = searchParams.get("maxPrice");
    
    if (tournamentType !== "all") {
      initial.type = tournamentType;
    }

    if (userId) {
      initial.userId = userId;
    }

    return initial;
  });

  const loadTournaments = useCallback(async () => {
    try {
      setIsLoading(true);
      setError("");

      const params = {};
      Object.keys(filters).forEach((key) => {
        if (filters[key] && filters[key] !== "") {
          params[key] = filters[key];
        }
      });

      if (tournamentType !== "all") {
        params.type = tournamentType;
      }

      if (maxTournaments) {
        params.limit = maxTournaments;
      }

      let data;
      if (customApiEndpoint) {
        const response = await customApiEndpoint(params);
        data = response;
      } else if (userId) {
        const response = await userProfileService.getUserTournaments(userId, params);
        data = response?.data;
      } else {
        data = await tournamentService.getAll(params);
      }

      const tournamentsData = data.tournaments || data || [];
      setTournaments(Array.isArray(tournamentsData) ? tournamentsData : []);
      if (data?.currency) {
        setResponseCurrency(data.currency);
      }

      const ongoing = tournamentsData?.filter(
        (t) => t.status === "ongoing" || t.status === "live"
      ).length;
      setActiveTournaments(ongoing);
    } catch (err) {
      console.error("Tournaments loading error:", err);
      setError(
        err.response?.data?.message ||
          err.message ||
          "Failed to load tournaments"
      );
      setTournaments([]);
    } finally {
      setIsLoading(false);
    }
  }, [filters, tournamentType, userId, maxTournaments, customApiEndpoint]);

  useEffect(() => {
    const searchParams = new URLSearchParams();
    Object.keys(filters).forEach((key) => {
      if (filters[key] && filters[key] !== "") {
        searchParams.set(key, filters[key]);
      }
    });
    const newUrl = `${location.pathname}?${searchParams.toString()}`;
    window.history.replaceState(null, "", newUrl);
  }, [filters, location.pathname]);

  useEffect(() => {
    loadTournaments();
  }, [loadTournaments]);

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const handleResetFilters = () => {
    const resetFilters = {
      status: "all",
      sort: "newest",
      minPrice: "",
      maxPrice: "",
      search: "",
    };

    if (tournamentType !== "all") {
      resetFilters.type = tournamentType;
    }
    if (userId) {
      resetFilters.userId = userId;
    }

    setFilters(resetFilters);
  };

  const handleTournamentClick = (tournament) => {
    if (onTournamentClick) {
      onTournamentClick(tournament);
    } else {
      navigate(`/tournaments/${tournament.id}`);
    }
  };

  const getHeaderConfig = () => {
    const configs = {
      my: {
        title: "My Tournaments",
        subtitle: "Tournaments you've joined or created",
        icon: <Users className="h-5 w-5" />,
      },
      joined: {
        title: "Joined Tournaments",
        subtitle: "Tournaments you're participating in",
        icon: <Users className="h-5 w-5" />,
      },
      created: {
        title: "Created Tournaments",
        subtitle: "Tournaments you've organized",
        icon: <Trophy className="h-5 w-5" />,
      },
      upcoming: {
        title: "Upcoming Tournaments",
        subtitle: "Tournaments starting soon",
        icon: <Clock className="h-5 w-5" />,
      },
      live: {
        title: "Live Tournaments",
        subtitle: "Tournaments currently in progress",
        icon: <Zap className="h-5 w-5" />,
      },
      completed: {
        title: "Completed Tournaments",
        subtitle: "Tournaments that have ended",
        icon: <Trophy className="h-5 w-5" />,
      },
      all: {
        title,
        subtitle,
        icon: <Trophy className="h-5 w-5" />,
      },
    };

    return configs[tournamentType] || configs.all;
  };

  const headerConfig = getHeaderConfig();
  const showBackButton = location.key !== "default" && !hideHeader;

  return (
    <div
      className={cn(
        "min-h-screen bg-gradient-to-br from-gray-50 to-indigo-50/20 dark:bg-gradient-to-br dark:from-gray-900 dark:to-gray-800 safe-padding",
        compact && "py-2"
      )}
    >
      <MobileFilterDrawer
        isOpen={showMobileFilters}
        onClose={() => setShowMobileFilters(false)}
        filters={filters}
        onFilterChange={handleFilterChange}
        onReset={handleResetFilters}
        showTypeFilter={tournamentType === "all"}
      />

      {!hideHeader && <MobileFAB />}

      <main
        className={cn(
          "mx-auto py-4 md:py-8 px-3 sm:px-4 lg:px-8",
          compact && "py-2 px-2 sm:px-3",
          maxTournaments && "max-w-5xl"
        )}
      >
        {/* Mobile Header */}
        {!hideHeader && (
          <div className="md:hidden mb-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                {showBackButton && (
                  <button
                    onClick={() => navigate(-1)}
                    className="p-2 -ml-2 transition-all duration-200 hover:scale-105 active:scale-95 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                  >
                    <ArrowLeft className="h-5 w-5" />
                  </button>
                )}
                <div>
                  <div className="flex items-center space-x-2">
                    <div className="p-2 bg-gradient-to-br from-purple-500 to-indigo-500 rounded-lg">
                      {React.cloneElement(headerConfig.icon, { className: "h-5 w-5 text-white" })}
                    </div>
                    
                  </div>
                  
                </div>
              </div>
              {showFilters && (
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setShowMobileFilters(true)}
                    className="p-2 transition-all duration-200 hover:scale-105 active:scale-95 bg-gradient-to-br from-white to-gray-50/80 dark:from-gray-800 dark:to-gray-900/90 border border-gray-200 dark:border-gray-700 hover:border-purple-300 dark:hover:border-purple-700 rounded-lg"
                  >
                    <Filter className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                  </button>
                </div>
              )}
            </div>

            {/* Mobile Search */}
            {showSearch && (
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search tournaments..."
                  value={filters.search}
                  onChange={(e) => handleFilterChange("search", e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 transition-all duration-200 bg-gradient-to-br from-white to-gray-50/80 dark:from-gray-800 dark:to-gray-900/90 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-purple-500/50 focus:border-transparent"
                />
              </div>
            )}
          </div>
        )}

        {/* Desktop Header */}
        {!hideHeader && (
          <div className="hidden md:flex flex-col lg:flex-row justify-between items-start lg:items-center mb-6 lg:mb-8 space-y-4 lg:space-y-0">
            <div className="flex items-center space-x-4">
              {showBackButton && (
                <button
                  onClick={() => navigate(-1)}
                  className="p-2 -ml-4 transition-all duration-200 hover:scale-105 active:scale-95 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white rounded-full hover:bg-gradient-to-r hover:from-gray-100 hover:to-gray-200 dark:hover:from-gray-700 dark:hover:to-gray-800"
                >
                  <ArrowLeft className="h-5 w-5" />
                </button>
              )}
              <div>
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-gradient-to-br from-purple-500 to-indigo-500 rounded-lg">
                    {React.cloneElement(headerConfig.icon, { className: "h-6 w-6 text-white" })}
                  </div>
                  <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
                    {headerConfig.title}
                  </h1>
                </div>
                <p className="mt-1 md:mt-2 text-sm md:text-base text-gray-600 dark:text-gray-400">
                  {headerConfig.subtitle}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              {showSearch && (
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search tournaments..."
                    value={filters.search}
                    onChange={(e) =>
                      handleFilterChange("search", e.target.value)
                    }
                    className="pl-10 pr-4 py-2.5 transition-all duration-200 bg-gradient-to-br from-white to-gray-50/80 dark:from-gray-800 dark:to-gray-900/90 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-purple-500/50 focus:border-transparent w-64"
                  />
                </div>
              )}
              {showCreateButton && tournamentType === "all" && (
                <Link
                  to="/create-tournament"
                  className="flex items-center justify-center space-x-2 transition-all duration-200 bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600 hover:shadow-purple-500/25 text-white font-medium py-2.5 px-4 rounded-lg hover:scale-105 active:scale-95"
                >
                  <Plus className="h-4 w-4" />
                  <span>Create Tournament</span>
                </Link>
              )}
            </div>
          </div>
        )}

        {/* Desktop Filter Bar */}
        {showFilters && !hideHeader && (
          <div className="hidden md:flex items-center justify-between mb-6">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  Filter by:
                </span>
                <select
                  value={filters.status}
                  onChange={(e) => handleFilterChange("status", e.target.value)}
                  className="transition-all duration-200 bg-gradient-to-br from-white to-gray-50/80 dark:from-gray-800 dark:to-gray-900/90 border border-gray-200 dark:border-gray-700 hover:border-purple-300 dark:hover:border-purple-700 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500/50 focus:border-transparent"
                >
                  <option value="all">All Status</option>
                  <option value="ongoing">Ongoing</option>
                  <option value="upcoming">Upcoming</option>
                  <option value="completed">Completed</option>
                </select>
                <select
                  value={filters.sort}
                  onChange={(e) => handleFilterChange("sort", e.target.value)}
                  className="transition-all duration-200 bg-gradient-to-br from-white to-gray-50/80 dark:from-gray-800 dark:to-gray-900/90 border border-gray-200 dark:border-gray-700 hover:border-purple-300 dark:hover:border-purple-700 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500/50 focus:border-transparent"
                >
                  <option value="newest">Newest First</option>
                  <option value="prize_high">Prize: High to Low</option>
                  <option value="prize_low">Prize: Low to High</option>
                  <option value="starting_soon">Starting Soon</option>
                </select>
                {tournamentType === "all" && (
                  <select
                    value={filters.type || "all"}
                    onChange={(e) => handleFilterChange("type", e.target.value)}
                    className="transition-all duration-200 bg-gradient-to-br from-white to-gray-50/80 dark:from-gray-800 dark:to-gray-900/90 border border-gray-200 dark:border-gray-700 hover:border-purple-300 dark:hover:border-purple-700 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500/50 focus:border-transparent"
                  >
                    <option value="all">All Types</option>
                    <option value="public">Public</option>
                    <option value="private">Private</option>
                    <option value="invite_only">Invite Only</option>
                  </select>
                )}
              </div>
              <button
                onClick={handleResetFilters}
                className="transition-all duration-200 text-sm text-gray-600 dark:text-gray-400 hover:text-purple-600 dark:hover:text-purple-400 hover:scale-105"
              >
                Reset Filters
              </button>
            </div>
            {showStats && (
              <div className="flex items-center space-x-2">
                <div className="px-3 py-1 bg-gradient-to-r from-emerald-100 to-green-100 dark:from-emerald-900/40 dark:to-green-900/40 rounded-lg">
                  <p className="text-sm font-medium text-emerald-600 dark:text-emerald-400">
                    Live: {activeTournaments}
                  </p>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Showing{" "}
                  <span className="font-medium bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
                    {tournaments.length}
                    {maxTournaments && ` of ${maxTournaments}`}
                  </span>{" "}
                  tournaments
                </p>
              </div>
            )}
          </div>
        )}

        {/* Error Banner */}
        {error && (
          <Banner
            type="error"
            title="Failed to Load Tournaments"
            message={error}
            onClose={() => setError("")}
            action={{
              text: "Try Again",
              onClick: loadTournaments,
            }}
            className="mb-6"
          />
        )}

        {/* Active Tournaments Alert */}
        {showStats && activeTournaments > 0 && tournamentType === "all" && (
          <Banner
            type="success"
            title="Live Tournaments Available!"
            message={`There ${
              activeTournaments === 1 ? "is" : "are"
            } ${activeTournaments} tournament${
              activeTournaments > 1 ? "s" : ""
            } currently in progress. Join now!`}
            icon={<Zap className="h-5 w-5" />}
            action={{
              text: "View Live",
              onClick: () => handleFilterChange("status", "ongoing"),
            }}
            className="mb-6"
          />
        )}

        {/* Welcome Banner for New Users */}
        {tournaments.length === 0 &&
          !isLoading &&
          !error &&
          tournamentType === "all" && (
            <Banner
              type="info"
              title="Welcome to Tournaments!"
              message="This is where you can find and join exciting gaming tournaments. Create your first tournament or join an existing one to get started."
              action={
                showCreateButton
                  ? {
                      text: "Create Tournament",
                      to: "/create-tournament",
                    }
                  : null
              }
              icon={<Trophy className="h-5 w-5" />}
              className="mb-6"
            />
          )}

        {/* Loading State */}
        {isLoading ? (
          <LoadingSpinner />
        ) : tournaments.length > 0 ? (
          <>
            {/* Mobile Results Count */}
            {showStats && !hideHeader && (
              <div className="md:hidden flex justify-between items-center mb-4">
                <div className="px-3 py-1 bg-gradient-to-r from-emerald-100 to-green-100 dark:from-emerald-900/40 dark:to-green-900/40 rounded-lg">
                  <p className="text-sm font-medium text-emerald-600 dark:text-emerald-400">
                    Live: {activeTournaments}
                  </p>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {tournaments.length}
                  {maxTournaments && ` of ${maxTournaments}`} tournaments
                </p>
              </div>
            )}

            {/* Tournaments Grid/List */}
            <div
              className={cn(
                layout === "grid" &&
                  "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6",
                layout === "list" && "space-y-4",
                compact && "gap-3"
              )}
            >
              {tournaments.map((tournament) => (
                <TournamentCard
                  key={tournament.id}
                  tournament={tournament}
                  responseCurrency={responseCurrency}
                  onClick={() => handleTournamentClick(tournament)}
                  compact={compact}
                  layout={layout}
                />
              ))}
            </div>

            {/* Tournament Tips */}
            {!hideTips && tournamentType === "all" && (
              <div className="mt-6 md:mt-8 bg-gradient-to-br from-white to-gray-50/80 dark:from-gray-800 dark:to-gray-900/90 rounded-xl p-4 md:p-6 border border-gray-200 dark:border-gray-700 hover:border-purple-300 dark:hover:border-purple-700 transition-all duration-200">
                <div className="flex items-center space-x-3 mb-3">
                  <div className="p-2 bg-gradient-to-r from-amber-500 to-yellow-500 rounded-lg">
                    <AlertCircle className="h-5 w-5 text-white" />
                  </div>
                  <h3 className="text-sm font-medium bg-gradient-to-r from-amber-600 to-yellow-600 bg-clip-text text-transparent">
                    Tournament Tips
                  </h3>
                </div>
                <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                  <li className="flex items-start">
                    <span className="text-purple-500 mr-2">•</span>
                    Make sure to read the rules before joining
                  </li>
                  <li className="flex items-start">
                    <span className="text-purple-500 mr-2">•</span>
                    Check your schedule to ensure you can participate
                  </li>
                  <li className="flex items-start">
                    <span className="text-purple-500 mr-2">•</span>
                    Ensure sufficient wallet balance for entry fees
                  </li>
                </ul>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-12 md:py-16 bg-gradient-to-br from-white to-gray-50/80 dark:from-gray-800 dark:to-gray-900/90 rounded-xl border border-gray-200 dark:border-gray-700">
            <div className="mx-auto w-16 h-16 md:w-20 md:h-20 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-800 flex items-center justify-center mb-4">
              <Trophy className="h-8 w-8 md:h-10 md:w-10 text-gray-400 dark:text-gray-500" />
            </div>
            <h3 className="text-lg md:text-xl font-medium bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent mb-2">
              {emptyStateMessage}
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-md mx-auto px-4 text-sm md:text-base">
              There are no tournaments matching your criteria. Try adjusting
              your filters
              {emptyStateAction ? " or " : ""}
              {emptyStateAction?.label || ""}
            </p>
            {emptyStateAction ? (
              <button
                onClick={emptyStateAction.onClick}
                className="inline-flex items-center justify-center transition-all duration-200 bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600 hover:shadow-purple-500/25 text-white font-medium py-2.5 px-4 rounded-lg hover:scale-105 active:scale-95 text-sm md:text-base"
              >
                {emptyStateAction.icon}
                <span>{emptyStateAction.label}</span>
              </button>
            ) : tournamentType === "all" ? (
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Link
                  to="/create-tournament"
                  className="inline-flex items-center justify-center transition-all duration-200 bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600 hover:shadow-purple-500/25 text-white font-medium py-2.5 px-4 rounded-lg hover:scale-105 active:scale-95 text-sm md:text-base"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Create Tournament
                </Link>
                <button
                  onClick={handleResetFilters}
                  className="inline-flex items-center justify-center transition-all duration-200 bg-gradient-to-r from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-800 hover:from-gray-200 hover:to-gray-300 dark:hover:from-gray-600 dark:hover:to-gray-700 text-gray-900 dark:text-white font-medium py-2.5 px-4 rounded-lg hover:scale-105 active:scale-95 text-sm md:text-base"
                >
                  Clear Filters
                </button>
              </div>
            ) : null}
          </div>
        )}

        {/* Mobile Quick Stats */}
        {showStats && !hideHeader && (
          <div className="md:hidden mt-6 bg-gradient-to-br from-white to-gray-50/80 dark:from-gray-800 dark:to-gray-900/90 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Active Now
                </p>
                <p className="text-lg font-bold bg-gradient-to-r from-emerald-600 to-green-600 bg-clip-text text-transparent">
                  {activeTournaments}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Total
                </p>
                <p className="text-lg font-bold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
                  {tournaments.length}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Mobile bottom navigation spacer */}
        {!hideHeader && <div className="h-16 md:h-0"></div>}
      </main>
    </div>
  );
}
// Utility function to safely use the component with different configurations
export const TournamentsList = {
  // Default view (all tournaments)
  All: (props) => <Tournaments {...props} />,

  // User's tournaments
  My: (props) => (
    <Tournaments
      tournamentType="my"
      title="My Tournaments"
      subtitle="Tournaments you've joined or created"
      showCreateButton={false}
      {...props}
    />
  ),

  // Joined tournaments
  Joined: (props) => (
    <Tournaments
      tournamentType="joined"
      title="Joined Tournaments"
      subtitle="Tournaments you're participating in"
      showCreateButton={false}
      {...props}
    />
  ),

  // Created tournaments
  Created: (props) => (
    <Tournaments
      tournamentType="created"
      title="Created Tournaments"
      subtitle="Tournaments you've organized"
      showCreateButton={false}
      {...props}
    />
  ),

  // Upcoming tournaments
  Upcoming: (props) => (
    <Tournaments
      tournamentType="upcoming"
      title="Upcoming Tournaments"
      subtitle="Tournaments starting soon"
      filters={{ status: "upcoming" }}
      {...props}
    />
  ),

  // Live tournaments
  Live: (props) => (
    <Tournaments
      tournamentType="live"
      title="Live Tournaments"
      subtitle="Tournaments currently in progress"
      filters={{ status: "ongoing" }}
      {...props}
    />
  ),

  // Completed tournaments
  Completed: (props) => (
    <Tournaments
      tournamentType="completed"
      title="Completed Tournaments"
      subtitle="Tournaments that have ended"
      filters={{ status: "completed" }}
      showCreateButton={false}
      {...props}
    />
  ),

  // Custom user tournaments
  UserTournaments: ({ userId, ...props }) => (
    <Tournaments
      tournamentType="user"
      userId={userId}
      title="User Tournaments"
      subtitle={`Tournaments by user`}
      showCreateButton={false}
      {...props}
    />
  ),

  // Compact view for embedding
  Compact: (props) => (
    <Tournaments
      compact={true}
      hideHeader={true}
      hideTips={true}
      showFilters={false}
      showStats={false}
      maxTournaments={4}
      layout="grid"
      {...props}
    />
  ),

  // List view for sidebar
  SidebarList: (props) => (
    <Tournaments
      compact={true}
      hideHeader={true}
      hideTips={true}
      showFilters={false}
      showSearch={false}
      showStats={false}
      maxTournaments={6}
      layout="list"
      {...props}
    />
  ),
};
