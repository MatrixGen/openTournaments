import { useState, useEffect, useCallback } from "react";
import { tournamentService } from "../../services/tournamentService";
import { Link } from "react-router-dom";
import Banner from "../../components/common/Banner";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import {
  Plus,
  Clock,
  Users,
  DollarSign,
  Trophy,
  Gamepad2,
  Calendar,
  Filter,
  TrendingUp,
  ChevronRight,
  Search,
  Star,
  Zap,
  AlertCircle,
  
  X,
} from "lucide-react";
import { formatCurrency } from "../../utils/formatters";

// Mobile Filter Drawer Component
const MobileFilterDrawer = ({
  isOpen,
  onClose,
  filters,
  onFilterChange,
  onReset,
}) => {
  const statusOptions = [
    { id: "all", label: "All Status", icon: Trophy },
    { id: "ongoing", label: "Ongoing", icon: Zap },
    { id: "upcoming", label: "Upcoming", icon: Calendar },
    { id: "completed", label: "Completed", icon: Trophy },
  ];

  const sortOptions = [
    { id: "newest", label: "Newest First" },
    { id: "prize_high", label: "Prize: High to Low" },
    { id: "prize_low", label: "Prize: Low to High" },
    { id: "starting_soon", label: "Starting Soon" },
  ];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 md:hidden">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-neutral-800 rounded-t-2xl shadow-xl max-h-[80vh] overflow-y-auto">
        <div className="p-4 border-b border-gray-200 dark:border-neutral-700">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-900 dark:text-white">
              Filter & Sort
            </h3>
            <button
              onClick={onClose}
              className="p-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <h4 className="text-sm font-medium text-gray-900 dark:text-gray-900 dark:text-white mb-2">
                Status
              </h4>
              <div className="flex flex-wrap gap-2">
                {statusOptions.map((option) => (
                  <button
                    key={option.id}
                    onClick={() => onFilterChange("status", option.id)}
                    className={`px-3 py-2 rounded-lg text-sm flex items-center space-x-2 ${
                      filters.status === option.id
                        ? "bg-primary-500 text-gray-900 dark:text-white"
                        : "bg-gray-100 dark:bg-neutral-700 text-gray-700 dark:text-gray-300"
                    }`}
                  >
                    <option.icon className="h-4 w-4" />
                    <span>{option.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <h4 className="text-sm font-medium text-gray-900 dark:text-gray-900 dark:text-white mb-2">
                Sort By
              </h4>
              <div className="space-y-2">
                {sortOptions.map((option) => (
                  <button
                    key={option.id}
                    onClick={() => onFilterChange("sort", option.id)}
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm ${
                      filters.sort === option.id
                        ? "bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400"
                        : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-neutral-700"
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <h4 className="text-sm font-medium text-gray-900 dark:text-gray-900 dark:text-white mb-2">
                Price Range
              </h4>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="number"
                  placeholder="Min"
                  value={filters.minPrice || ""}
                  onChange={(e) => onFilterChange("minPrice", e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-neutral-600 rounded-lg bg-white dark:bg-neutral-700 text-gray-900 dark:text-gray-900 dark:text-white text-sm"
                />
                <input
                  type="number"
                  placeholder="Max"
                  value={filters.maxPrice || ""}
                  onChange={(e) => onFilterChange("maxPrice", e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-neutral-600 rounded-lg bg-white dark:bg-neutral-700 text-gray-900 dark:text-gray-900 dark:text-white text-sm"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="p-4 space-y-3">
          <button
            onClick={onReset}
            className="w-full px-4 py-3 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-neutral-600 rounded-lg text-sm font-medium hover:bg-gray-50 dark:hover:bg-neutral-700"
          >
            Reset Filters
          </button>
          <button
            onClick={onClose}
            className="w-full px-4 py-3 bg-primary-500 text-gray-900 dark:text-white rounded-lg text-sm font-medium hover:bg-primary-600"
          >
            Apply Filters
          </button>
        </div>
      </div>
    </div>
  );
};

// Tournament Card Component

import { Shield, Award } from "lucide-react";

const TournamentCard = ({ tournament }) => {
  const [isImageLoaded, setIsImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);

  // Handle image loading
  useEffect(() => {
    if (tournament?.game?.logo_url) {
      const img = new Image();
      img.src = tournament.game.logo_url;
      img.onload = () => {
        setIsImageLoaded(true);
        setImageError(false);
      };
      img.onerror = () => {
        setImageError(true);
        setIsImageLoaded(false);
      };
    }
  }, [tournament?.game?.logo_url]);

  const getStatusConfig = (status) => {
    switch (status) {
      case "ongoing":
        return {
          color:
            "text-green-600 dark:text-green-400 bg-green-500/10 dark:bg-green-500/20 border-green-500/30",
          icon: Zap,
          label: "Live",
          glow: "shadow-lg shadow-green-500/20",
        };
      case "open":
        return {
          color:
            "text-blue-600 dark:text-blue-400 bg-blue-500/10 dark:bg-blue-500/20 border-blue-500/30",
          icon: Shield,
          label: "Open",
          glow: "shadow-lg shadow-blue-500/20",
        };
      case "completed":
        return {
          color:
            "text-purple-600 dark:text-purple-400 bg-purple-500/10 dark:bg-purple-500/20 border-purple-500/30",
          icon: Trophy,
          label: "Completed",
          glow: "shadow-lg shadow-purple-500/20",
        };
      case "upcoming":
        return {
          color:
            "text-yellow-600 dark:text-yellow-400 bg-yellow-500/10 dark:bg-yellow-500/20 border-yellow-500/30",
          icon: Clock,
          label: "Upcoming",
          glow: "shadow-lg shadow-yellow-500/20",
        };
      default:
        return {
          color:
            "text-gray-600 dark:text-gray-400 bg-gray-500/10 dark:bg-gray-500/20 border-gray-500/30",
          icon: AlertCircle,
          label: status,
          glow: "",
        };
    }
  };

  const statusConfig = getStatusConfig(tournament.status);
  const Icon = statusConfig.icon;



  const prizePool = tournament.prize_pool;

  return (
    <div className="relative group bg-white dark:bg-neutral-800 rounded-xl shadow-sm hover:shadow-xl transition-all duration-300 border border-gray-200 dark:border-neutral-700 overflow-hidden">
      {/* Background Image with Gradient Overlay */}
      <div className="absolute inset-0 z-0">
        {/* Background Image */}
        {tournament?.game?.logo_url && !imageError && (
          <div className="absolute inset-0">
            <img
              src={tournament.game.logo_url}
              alt={tournament.game.name}
              className={`w-full h-full object-cover transition-opacity duration-700 ${
                isImageLoaded ? "opacity-10 dark:opacity-15" : "opacity-0"
              }`}
              loading="lazy"
              onLoad={() => setIsImageLoaded(true)}
              onError={() => setImageError(true)}
            />

            {/* Gradient Overlays */}
            <div className="absolute inset-0 bg-gradient-to-t from-white via-white/80 to-transparent dark:from-neutral-800 dark:via-neutral-800/90" />
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-transparent to-purple-500/5" />
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-transparent via-transparent to-blue-500/3" />
          </div>
        )}

        {/* Pattern Overlay for better readability */}
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiMwMDAiIGZpbGwtb3BhY2l0eT0iMC4wMyI+PHBhdGggZD0iTTM2IDM0LjVWMzZIMjR2LTEuNWgxMnptMC0zVjI0SDI0djcuNWgxMnptLTE1IDBWMjRINXY3LjVoMTZ6bTAgM1YzNkg1di0xLjVoMTZ6Ii8+PC9nPjwvZz48L3N2Zz4=')] opacity-5 dark:opacity-10" />
      </div>

      {/* Content Container */}
      <div className="relative z-10">
        {/* Tournament Header */}
        <div className="p-4 md:p-6 border-b border-gray-100 dark:border-neutral-700">
          <div className="flex justify-between items-start mb-3">
            <div className="flex-1 min-w-0 pr-2">
              {/* Tournament Name and Status */}
              <div className="flex items-start justify-between mb-2">
                <h3 className="text-base md:text-lg font-bold text-gray-900 dark:text-gray-900 dark:text-white line-clamp-2 pr-8">
                  {tournament.name}
                </h3>
                {tournament.is_featured && (
                  <div className="flex-shrink-0 ml-2">
                    <div className="relative">
                      <Star className="h-5 w-5 text-yellow-500 fill-yellow-500/20" />
                      <div className="absolute inset-0 animate-ping">
                        <Star className="h-5 w-5 text-yellow-500/40" />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Status and Game Info */}
              <div className="flex items-center space-x-2 mt-1">
                <span
                  className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${statusConfig.color} ${statusConfig.glow} border backdrop-blur-sm`}
                >
                  <Icon className="h-3 w-3 mr-1.5" />
                  {statusConfig.label}
                </span>
                <div className="flex items-center text-xs text-gray-600 dark:text-gray-300 bg-white/50 dark:bg-neutral-700/50 px-2 py-1 rounded-full">
                  <Gamepad2 className="h-3 w-3 mr-1" />
                  <span className="truncate max-w-[100px]">
                    {tournament.game_type || tournament.game?.name}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Game Logo and Info - Enhanced with background */}
          <div className="flex items-center mt-4">
            <div className="relative">
              <div className="w-12 h-12 md:w-14 md:h-14 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center flex-shrink-0 mr-4 shadow-lg">
                {tournament.game?.logo_url && !imageError ? (
                  <img
                    src={tournament.game.logo_url}
                    alt={tournament.game.name}
                    className="w-8 h-8 md:w-10 md:h-10 object-contain rounded"
                    loading="lazy"
                  />
                ) : (
                  <Gamepad2 className="h-6 w-6 md:h-7 md:w-7 text-gray-900 dark:text-white" />
                )}
              </div>
              {/* Glow effect */}
              <div className="absolute -inset-1 bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl blur opacity-20 group-hover:opacity-30 transition-opacity" />
            </div>

            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-900 dark:text-gray-900 dark:text-white truncate">
                {tournament.game?.name || "Tournament"}
              </p>
              <div className="flex items-center text-gray-600 dark:text-gray-300 text-xs mt-1">
                <Calendar className="h-3 w-3 mr-1.5 flex-shrink-0" />
                <span className="truncate">
                  {new Date(tournament.start_time).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>
              {tournament.creator && (
                <div className="flex items-center text-xs text-gray-500 dark:text-gray-400 mt-1">
                  <span className="truncate">
                    by {tournament.creator.username}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Tournament Details with elevated design */}
        <div className="p-4 md:p-6 relative">
          {/* Floating stats background */}
          <div className="absolute inset-4 bg-gradient-to-b from-white/30 to-transparent dark:from-neutral-800/30 rounded-lg -z-10" />

          <div className="grid grid-cols-2 gap-3 md:gap-4 mb-5">
            {/* Entry Fee */}
            <div className="text-center group/item">
              <div className="relative">
                <div className="flex items-center justify-center space-x-1.5 mb-1.5">
                  <div className="p-1.5 rounded-lg bg-emerald-100 dark:bg-emerald-900/30">
                    <DollarSign className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <p className="text-lg md:text-xl font-bold text-gray-900 dark:text-gray-900 dark:text-white">
                    {tournament.entry_fee > 0 ? formatCurrency(tournament.entry_fee || 0,'USD'):'Free'}
                  </p>
                </div>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  Entry Fee
                </p>
                {/* Hover effect line */}
                <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-0 group-hover/item:w-10 h-0.5 bg-gradient-to-r from-transparent via-emerald-500 to-transparent transition-all duration-300" />
              </div>
            </div>

            {/* Players */}
            <div className="text-center group/item">
              <div className="relative">
                <div className="flex items-center justify-center space-x-1.5 mb-1.5">
                  <div className="p-1.5 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                    <Users className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <p className="text-lg md:text-xl font-bold text-gray-900 dark:text-gray-900 dark:text-white">
                    {tournament.current_slots ||
                      tournament.current_participants ||
                      0}
                    /
                    {tournament.total_slots || tournament.max_participants || 0}
                  </p>
                </div>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  Players
                </p>
                {/* Progress bar */}
                <div className="h-1 bg-gray-200 dark:bg-neutral-700 rounded-full overflow-hidden mt-1.5">
                  <div
                    className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-700"
                    style={{
                      width: `${((tournament.current_slots || tournament.current_participants || 0) / (tournament.total_slots || tournament.max_participants || 1)) * 100}%`,
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Prize Pool */}
            <div className="text-center group/item">
              <div className="relative">
                <div className="flex items-center justify-center space-x-1.5 mb-1.5">
                  <div className="p-1.5 rounded-lg bg-yellow-100 dark:bg-yellow-900/30">
                    <Trophy className="h-3.5 w-3.5 text-yellow-600 dark:text-yellow-400" />
                  </div>
                  <p className="text-lg md:text-xl font-bold text-emerald-600 dark:text-emerald-400">
                    {formatCurrency(prizePool,'USD')}
                  </p>
                </div>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  Prize Pool
                </p>
                {/* Prize distribution indicator */}
                {tournament.prizes && tournament.prizes.length > 0 && (
                  <div className="flex justify-center space-x-1 mt-1.5">
                    {tournament.prizes.slice(0, 3).map((prize, idx) => (
                      <div
                        key={idx}
                        className="w-1 h-1 rounded-full bg-gradient-to-r from-yellow-400 to-orange-500"
                        title={`${prize.position}${prize.position === 1 ? "st" : prize.position === 2 ? "nd" : "rd"}: ${prize.percentage}%`}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Duration/Time */}
            <div className="text-center group/item">
              <div className="relative">
                <div className="flex items-center justify-center space-x-1.5 mb-1.5">
                  <div className="p-1.5 rounded-lg bg-purple-100 dark:bg-purple-900/30">
                    <Clock className="h-3.5 w-3.5 text-purple-600 dark:text-purple-400" />
                  </div>
                  <p className="text-lg md:text-xl font-bold text-gray-900 dark:text-gray-900 dark:text-white">
                    {tournament.duration || "2h"}
                  </p>
                </div>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  Duration
                </p>
                {/* Animated pulse for live/upcoming */}
                {(tournament.status === "ongoing" ||
                  tournament.status === "upcoming") && (
                  <div className="absolute -top-1 -right-1">
                    <div className="relative">
                      <div className="w-2 h-2 bg-gradient-to-r from-green-400 to-emerald-500 rounded-full animate-ping" />
                      <div className="absolute inset-0 w-2 h-2 bg-gradient-to-r from-green-400 to-emerald-500 rounded-full" />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Platform and Format info */}
          <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mb-5">
            <div className="flex items-center space-x-2">
              <div className="flex items-center">
                <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mr-1.5" />
                <span>{tournament.platform?.name || "Multi-Platform"}</span>
              </div>
              <span className="text-gray-300 dark:text-gray-600">•</span>
              <div className="flex items-center">
                <Award className="h-3 w-3 mr-1" />
                <span>
                  {tournament.format?.replace("_", " ") || "Single Elimination"}
                </span>
              </div>
            </div>

            {/* Additional participants info */}
            {tournament.participants && tournament.participants.length > 0 && (
              <div className="flex items-center">
                <div className="flex -space-x-2 mr-2">
                  {tournament.participants
                    .slice(0, 3)
                    .map((participant) => (
                      <div
                        key={participant.id}
                        className="w-5 h-5 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 border border-white dark:border-neutral-800 flex items-center justify-center"
                      >
                        <span className="text-[10px] font-bold text-gray-900 dark:text-white">
                          {participant.user?.username?.charAt(0).toUpperCase()}
                        </span>
                      </div>
                    ))}
                </div>
                {tournament.participants.length > 3 && (
                  <span className="text-xs">
                    +{tournament.participants.length - 3}
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Action Button */}
          <Link
            to={`/tournaments/${tournament.id}`}
            className="block w-full bg-gradient-to-r from-blue-300 to-purple-400 hover:from-blue-600 hover:to-purple-700 text-gray-900 dark:text-white text-center font-semibold py-3 rounded-lg transition-all duration-300 flex items-center justify-center gap-2 group/btn shadow-lg hover:shadow-xl"
          >
            <span>View Tournament</span>
            <ChevronRight className="h-4 w-4 group-hover/btn:translate-x-1 transition-transform" />
          </Link>
        </div>
      </div>

      {/* Glow border effect on hover */}
      <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-blue-500 to-purple-500 opacity-0 group-hover:opacity-10 transition-opacity duration-300 -z-10" />
    </div>
  );
};

export default TournamentCard