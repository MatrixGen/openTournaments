import { useState, useEffect, useCallback } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { userProfileService } from "../services/userProfileService";
import LoadingSpinner from "../components/common/LoadingSpinner";
import {
  Search,
  Filter,
  Users as UsersIcon,
  Trophy,
  TrendingUp,
  MapPin,
  UserCheck,
  UserPlus,
  Shield,
  Crown,
  X,
  SlidersHorizontal,
  Flame,
  Medal,
  Target,
  Zap,
  Calendar,
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";

// User Card Component - Updated with brand colors
const UserCard = ({ user, onFollowChange, currentUserId }) => {
  const isOwnProfile = currentUserId === user.id;
  const [isFollowing, setIsFollowing] = useState(user.is_following || false);
  const [isLoading, setIsLoading] = useState(false);

  const handleFollow = async () => {
    if (isOwnProfile) return;
    
    setIsLoading(true);
    try {
      if (isFollowing) {
        await userProfileService.unfollowUser(user.id);
        setIsFollowing(false);
      } else {
        await userProfileService.followUser(user.id);
        setIsFollowing(true);
      }
      onFollowChange?.(user.id, !isFollowing);
    } catch (error) {
      console.error("Error toggling follow:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const getWinRateColor = (rate) => {
    if (rate >= 70) return "text-emerald-600 dark:text-emerald-400";
    if (rate >= 50) return "text-green-600 dark:text-green-400";
    if (rate >= 30) return "text-amber-600 dark:text-amber-400";
    return "text-red-600 dark:text-red-400";
  };

  return (
    <div className="group bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-purple-300 dark:hover:border-purple-700 hover:shadow-lg dark:hover:shadow-purple-900/20 transition-all duration-200">
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <Link 
            to={`/player/${user.id}`} 
            className="flex items-center gap-3 flex-1 min-w-0"
          >
            <div className="relative flex-shrink-0">
              <div className="w-14 h-14 bg-gradient-to-br from-purple-500 to-indigo-500 rounded-full flex items-center justify-center shadow-md">
                {user.avatar_url ? (
                  <img 
                    src={user.avatar_url} 
                    alt={user.username}
                    className="w-full h-full rounded-full object-cover"
                    loading="lazy"
                  />
                ) : (
                  <span className="text-white font-bold text-lg">
                    {(user.display_name || user.username).charAt(0).toUpperCase()}
                  </span>
                )}
              </div>
              <div className="absolute -bottom-1 -right-1 flex gap-0.5">
                {user.is_verified && (
                  <div className="bg-gradient-to-br from-blue-500 to-indigo-500 rounded-full p-0.5 shadow-sm" title="Verified">
                    <Shield className="h-3 w-3 text-white" />
                  </div>
                )}
                {user.is_pro_player && (
                  <div className="bg-gradient-to-br from-amber-500 to-amber-600 rounded-full p-0.5 shadow-sm" title="Pro Player">
                    <Crown className="h-3 w-3 text-white" />
                  </div>
                )}
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 mb-1">
                <h3 className="font-semibold text-gray-900 dark:text-gray-100 text-sm truncate">
                  {user.display_name || user.username}
                </h3>
                {user.is_online && (
                  <span className="h-1.5 w-1.5 bg-gradient-to-br from-emerald-400 to-green-500 rounded-full animate-pulse" title="Online Now" />
                )}
              </div>
              <p className="text-gray-500 dark:text-gray-400 text-xs truncate mb-1">
                @{user.username}
              </p>
              {user.bio && (
                <p className="text-gray-600 dark:text-gray-300 text-xs line-clamp-2">
                  {user.bio}
                </p>
              )}
            </div>
          </Link>
          
          {!isOwnProfile && (
            <button
              onClick={handleFollow}
              disabled={isLoading}
              className={`ml-auto flex-shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 hover:scale-105 active:scale-95 ${
                isFollowing
                  ? "bg-gradient-to-r from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-800 hover:from-gray-200 hover:to-gray-300 dark:hover:from-gray-600 dark:hover:to-gray-700 text-gray-700 dark:text-gray-300"
                  : "bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600 text-white shadow-md hover:shadow-purple-500/25"
              }`}
            >
              {isLoading ? (
               <LoadingSpinner size={"sm"} />
              ) : isFollowing ? (
                <>
                  <UserCheck className="h-3.5 w-3.5" />
                  <span className="hidden xs:inline">Following</span>
                </>
              ) : (
                <>
                  <UserPlus className="h-3.5 w-3.5" />
                  <span className="hidden xs:inline">Follow</span>
                </>
              )}
            </button>
          )}
        </div>

        <div className="mt-3 flex items-center justify-between text-xs">
          {user.country && (
            <div className="flex items-center gap-1.5 text-gray-500 dark:text-gray-400">
              <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
              <span className="truncate">{user.country}</span>
            </div>
          )}
          
          <div className={`flex items-center gap-1.5 ${getWinRateColor(user.stats?.win_rate || 0)}`}>
            <Target className="h-3.5 w-3.5 flex-shrink-0" />
            <span className="font-medium">{user.stats?.win_rate || 0}%</span>
            <span className="hidden xs:inline">win rate</span>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
          <div className="text-center group-hover:scale-105 transition-transform duration-200">
            <div className="text-base font-bold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
              {user.stats?.tournaments_won || 0}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">Wins</div>
          </div>
          <div className="text-center group-hover:scale-105 transition-transform duration-200">
            <div className={`text-base font-bold ${getWinRateColor(user.stats?.win_rate || 0)}`}>
              {user.stats?.win_rate || 0}%
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">Win Rate</div>
          </div>
          <div className="text-center group-hover:scale-105 transition-transform duration-200">
            <div className="text-base font-bold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
              Lv.{user.stats?.level || 1}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">Level</div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Mobile Filter Tabs Component
const MobileFilterTabs = ({ activeTab, onTabChange, filterCount }) => {
  const tabs = [
    { id: 'all', label: 'All Players', icon: UsersIcon, color: 'from-purple-500 to-indigo-500' },
    { id: 'online', label: 'Online', icon: Flame, color: 'from-emerald-500 to-green-500' },
    { id: 'pro', label: 'Pro', icon: Crown, color: 'from-amber-500 to-yellow-500' },
    { id: 'verified', label: 'Verified', icon: Shield, color: 'from-blue-500 to-indigo-500' },
  ];

  return (
    <div className="flex overflow-x-auto scrollbar-hide py-2 gap-2 min-w-max">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          className={`flex-shrink-0 flex items-center gap-2 px-4 py-2 rounded-lg whitespace-nowrap transition-all duration-200 ${
            activeTab === tab.id
              ? `bg-gradient-to-r ${tab.color} text-white shadow-md`
              : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700'
          }`}
        >
          <tab.icon className="h-4 w-4 flex-shrink-0" />
          <span className="text-sm font-medium">{tab.label}</span>
          {filterCount > 0 && tab.id === 'all' && (
            <span className="ml-1 bg-white text-gray-900 text-xs rounded-full h-5 w-5 flex items-center justify-center flex-shrink-0">
              {filterCount}
            </span>
          )}
        </button>
      ))}
    </div>
  );
};

// Mobile Filter Modal
const MobileFilterModal = ({ isOpen, onClose, filters, onFilterChange }) => {
  const [localFilters, setLocalFilters] = useState(filters);

  useEffect(() => {
    setLocalFilters(filters);
  }, [filters]);

  const handleApply = () => {
    onFilterChange(localFilters);
    onClose();
  };

  const handleReset = () => {
    const defaultFilters = {
      sortBy: 'newest',
      role: 'all',
      onlineOnly: false,
      verifiedOnly: false,
      proOnly: false
    };
    setLocalFilters(defaultFilters);
    onFilterChange(defaultFilters);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-900 rounded-t-2xl shadow-xl max-h-[85vh] overflow-hidden flex flex-col">
        <div className="p-4 border-b border-gray-200 dark:border-gray-800">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Filters
            </h3>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {/* Sort Section */}
          <div>
            <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-3">
              Sort By
            </h4>
            <div className="grid grid-cols-2 gap-2">
              {[
                { value: 'newest', label: 'Newest', icon: Calendar },
                { value: 'most_followed', label: 'Popular', icon: UsersIcon },
                { value: 'highest_winrate', label: 'Win Rate', icon: Target },
                { value: 'most_tournaments', label: 'Tournaments', icon: Trophy },
              ].map((option) => (
                <button
                  key={option.value}
                  onClick={() => setLocalFilters({...localFilters, sortBy: option.value})}
                  className={`flex items-center gap-2 p-3 rounded-lg border transition-all duration-200 ${
                    localFilters.sortBy === option.value
                      ? 'border-purple-500 bg-gradient-to-br from-purple-50 to-indigo-50 dark:from-purple-900/20 dark:to-indigo-900/20 text-purple-700 dark:text-purple-400'
                      : 'border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:border-purple-300 dark:hover:border-purple-700'
                  }`}
                >
                  <option.icon className="h-4 w-4" />
                  <span className="text-sm font-medium">{option.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Filter Section */}
          <div>
            <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-3">
              Player Type
            </h4>
            <div className="space-y-3">
              {[
                { key: 'verifiedOnly', label: 'Verified Only', icon: Shield, color: 'blue' },
                { key: 'proOnly', label: 'Pro Players Only', icon: Crown, color: 'amber' },
                { key: 'onlineOnly', label: 'Online Now', icon: Flame, color: 'emerald' },
              ].map((filter) => (
                <label
                  key={filter.key}
                  className="flex items-center justify-between p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-1.5 bg-${filter.color}-500/10 rounded-lg`}>
                      <filter.icon className={`h-4 w-4 text-${filter.color}-600 dark:text-${filter.color}-400`} />
                    </div>
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      {filter.label}
                    </span>
                  </div>
                  <div className="relative">
                    <input
                      type="checkbox"
                      checked={localFilters[filter.key]}
                      onChange={(e) => setLocalFilters({
                        ...localFilters,
                        [filter.key]: e.target.checked
                      })}
                      className="sr-only"
                    />
                    <div className={`h-6 w-11 rounded-full transition-colors ${
                      localFilters[filter.key]
                        ? `bg-${filter.color}-500`
                        : 'bg-gray-200 dark:bg-gray-700'
                    }`}>
                      <div className={`h-5 w-5 rounded-full bg-white transition-transform mt-0.5 ${
                        localFilters[filter.key]
                          ? 'translate-x-5'
                          : 'translate-x-0.5'
                      }`} />
                    </div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Role Section */}
          <div>
            <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-3">
              Role
            </h4>
            <select
              value={localFilters.role}
              onChange={(e) => setLocalFilters({...localFilters, role: e.target.value})}
              className="w-full bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2.5 text-sm text-gray-700 dark:text-gray-300 focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200"
            >
              <option value="all">All Roles</option>
              <option value="user">Regular Users</option>
              <option value="pro">Pro Players</option>
              <option value="streamer">Streamers</option>
              <option value="admin">Admins</option>
            </select>
          </div>
        </div>

        <div className="p-4 border-t border-gray-200 dark:border-gray-800 grid grid-cols-2 gap-3">
          <button
            onClick={handleReset}
            className="px-4 py-2.5 bg-gradient-to-r from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-900 hover:from-gray-200 hover:to-gray-300 dark:hover:from-gray-700 dark:hover:to-gray-800 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium transition-all duration-200 hover:scale-105 active:scale-95"
          >
            Reset All
          </button>
          <button
            onClick={handleApply}
            className="px-4 py-2.5 bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600 text-white rounded-lg text-sm font-medium transition-all duration-200 hover:scale-105 active:scale-95 shadow-md hover:shadow-purple-500/25"
          >
            Apply Filters
          </button>
        </div>
      </div>
    </div>
  );
};

export default function UsersPage() {
  const { user: currentUser } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchLoading, setSearchLoading] = useState(false);
  const [error, setError] = useState(null);
  const [mobileTab, setMobileTab] = useState('all');
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 1
  });
  
  const [filters, setFilters] = useState({
    search: searchParams.get('search') || '',
    sortBy: searchParams.get('sortBy') || 'newest',
    role: searchParams.get('role') || 'all',
    onlineOnly: searchParams.get('onlineOnly') === 'true',
    verifiedOnly: searchParams.get('verifiedOnly') === 'true',
    proOnly: searchParams.get('proOnly') === 'true'
  });

  const loadUsers = useCallback(async (searchTerm = filters.search) => {
    try {
      setLoading(true);
      setError(null);

      const params = {
        page: pagination.page,
        limit: pagination.limit,
        search: searchTerm,
        sortBy: filters.sortBy,
        role: filters.role,
        onlineOnly: filters.onlineOnly,
        verifiedOnly: filters.verifiedOnly,
        proOnly: filters.proOnly,
        excludeSelf: true,
        currentUserId: currentUser?.id || null
      };

      const response = await userProfileService.searchUsers(searchTerm, params);
      
      if (response.success) {
        setUsers(response.data.users || []);
        setPagination({
          ...pagination,
          total: response.data.total,
          totalPages: response.data.totalPages
        });
      } else {
        setError(response.error || "Failed to load users");
      }
    } catch (error) {
      console.error("Failed to load users:", error);
      setError("Failed to load users. Please try again.");
    } finally {
      setLoading(false);
      setSearchLoading(false);
    }
  }, [filters, pagination.page]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  useEffect(() => {
    // Sync mobile tab with filters
    if (filters.onlineOnly) setMobileTab('online');
    else if (filters.proOnly) setMobileTab('pro');
    else if (filters.verifiedOnly) setMobileTab('verified');
    else setMobileTab('all');
  }, [filters]);

  const handleMobileTabChange = (tab) => {
    setMobileTab(tab);
    const newFilters = { ...filters };
    
    // Reset all boolean filters
    newFilters.onlineOnly = false;
    newFilters.proOnly = false;
    newFilters.verifiedOnly = false;
    
    // Apply tab-specific filter
    switch (tab) {
      case 'online':
        newFilters.onlineOnly = true;
        break;
      case 'pro':
        newFilters.proOnly = true;
        break;
      case 'verified':
        newFilters.verifiedOnly = true;
        break;
    }
    
    setFilters(newFilters);
    updateURLParams(newFilters);
  };

  const handleSearch = (value) => {
    const newFilters = { ...filters, search: value };
    setFilters(newFilters);
    updateURLParams(newFilters);
    
    // Debounced search
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
      setPagination(prev => ({ ...prev, page: 1 }));
      loadUsers(value);
    }, 500);
  };

  const updateURLParams = (newFilters) => {
    const params = new URLSearchParams();
    Object.entries(newFilters).forEach(([key, value]) => {
      if (value && value !== 'all' && value !== false) {
        params.set(key, value);
      }
    });
    setSearchParams(params);
  };

  let searchTimeout;

  const handleFilterChange = (newFilters) => {
    setFilters(newFilters);
    updateURLParams(newFilters);
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const handleFollowChange = (userId, isFollowing) => {
    setUsers(prevUsers => 
      prevUsers.map(user => 
        user.id === userId 
          ? { ...user, is_following: isFollowing } 
          : user
      )
    );
  };

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= pagination.totalPages) {
      setPagination(prev => ({ ...prev, page: newPage }));
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const activeFilterCount = Object.entries(filters).filter(([value]) => 
    value !== '' && value !== 'newest' && value !== 'all' && value !== false
  ).length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-indigo-50/10 dark:from-gray-900 dark:to-gray-800 safe-padding">
      <main className="mx-auto max-w-7xl">
        {/* Header - Mobile Optimized */}
        <div className="sticky top-0 z-20 bg-gradient-to-b from-white to-gray-50/50 dark:from-gray-900 dark:to-gray-800/50 border-b border-gray-200 dark:border-gray-800 backdrop-blur-sm">
          <div className="px-3 sm:px-4 lg:px-8 py-4">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h1 className="text-xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
                  Discover Players
                </h1>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  Find and connect with gamers worldwide
                </p>
              </div>
              <Link
                to="/leaderboards"
                className="hidden sm:flex items-center gap-1.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-medium py-2 px-3 rounded-lg text-xs transition-all duration-200 hover:scale-105 active:scale-95 shadow-md"
              >
                <Trophy className="h-3.5 w-3.5" />
                <span>Leaderboards</span>
              </Link>
            </div>

            {/* Search Bar */}
            <div className="relative">
              <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
                <Search className="h-4 w-4 text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Search players..."
                value={filters.search}
                onChange={(e) => handleSearch(e.target.value)}
                className="w-full pl-10 pr-12 py-2.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm transition-all duration-200"
              />
              {searchLoading && (
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                  <LoadingSpinner size="sm" />
                </div>
              )}
            </div>

            {/* Mobile Filter Button */}
            <div className="flex items-center justify-between mt-3 sm:hidden">
              <div className="flex-1 overflow-x-auto scrollbar-hide">
                <div className="inline-flex items-center min-w-max">
                  <MobileFilterTabs 
                    activeTab={mobileTab}
                    onTabChange={handleMobileTabChange}
                    filterCount={activeFilterCount}
                  />
                </div>
              </div>
              <button
                onClick={() => setShowMobileFilters(true)}
                className="ml-3 flex-shrink-0 flex items-center gap-1.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 hover:border-purple-400 dark:hover:border-purple-600 text-gray-700 dark:text-gray-300 px-3 py-2 rounded-lg transition-all duration-200 hover:scale-105 active:scale-95"
              >
                <SlidersHorizontal className="h-4 w-4" />
                {activeFilterCount > 0 && (
                  <span className="bg-gradient-to-br from-purple-500 to-indigo-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                    {activeFilterCount}
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Desktop Filter Bar */}
        <div className="hidden sm:block px-3 sm:px-4 lg:px-8 py-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-3">
              <button
                onClick={() => handleFilterChange({
                  ...filters,
                  onlineOnly: !filters.onlineOnly
                })}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 hover:scale-105 active:scale-95 ${
                  filters.onlineOnly
                    ? 'bg-gradient-to-r from-emerald-500 to-green-500 text-white shadow-md'
                    : 'bg-gradient-to-r from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-900 text-gray-700 dark:text-gray-300 hover:from-gray-200 hover:to-gray-300'
                }`}
              >
                <Flame className="h-3.5 w-3.5" />
                Online
              </button>
              <button
                onClick={() => handleFilterChange({
                  ...filters,
                  proOnly: !filters.proOnly
                })}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 hover:scale-105 active:scale-95 ${
                  filters.proOnly
                    ? 'bg-gradient-to-r from-amber-500 to-yellow-500 text-white shadow-md'
                    : 'bg-gradient-to-r from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-900 text-gray-700 dark:text-gray-300 hover:from-gray-200 hover:to-gray-300'
                }`}
              >
                <Crown className="h-3.5 w-3.5" />
                Pro Players
              </button>
              <button
                onClick={() => handleFilterChange({
                  ...filters,
                  verifiedOnly: !filters.verifiedOnly
                })}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 hover:scale-105 active:scale-95 ${
                  filters.verifiedOnly
                    ? 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white shadow-md'
                    : 'bg-gradient-to-r from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-900 text-gray-700 dark:text-gray-300 hover:from-gray-200 hover:to-gray-300'
                }`}
              >
                <Shield className="h-3.5 w-3.5" />
                Verified
              </button>
            </div>

            <div className="ml-auto flex items-center gap-3">
              <span className="text-xs text-gray-500 dark:text-gray-400">Sort:</span>
              <select
                value={filters.sortBy}
                onChange={(e) => handleFilterChange({ ...filters, sortBy: e.target.value })}
                className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-1.5 text-xs text-gray-700 dark:text-gray-300 focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200"
              >
                <option value="newest">Newest</option>
                <option value="most_followed">Most Followed</option>
                <option value="highest_winrate">Highest Win Rate</option>
                <option value="most_tournaments">Most Tournaments</option>
                <option value="most_wins">Most Wins</option>
              </select>
            </div>
          </div>
        </div>

        {/* Stats Overview - Responsive Grid */}
        <div className="px-3 sm:px-4 lg:px-8 pb-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
            <div className="bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900 rounded-xl p-3 border border-gray-200 dark:border-gray-700 shadow-sm">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-gradient-to-br from-blue-500/10 to-indigo-500/10 rounded-lg">
                  <UsersIcon className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Total</p>
                  <p className="text-base font-bold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
                    {pagination.total.toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
            <div className="bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900 rounded-xl p-3 border border-gray-200 dark:border-gray-700 shadow-sm">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-gradient-to-br from-emerald-500/10 to-green-500/10 rounded-lg">
                  <Flame className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Online</p>
                  <p className="text-base font-bold bg-gradient-to-r from-emerald-600 to-green-600 bg-clip-text text-transparent">
                    {Math.floor(pagination.total * 0.15).toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
            <div className="bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900 rounded-xl p-3 border border-gray-200 dark:border-gray-700 shadow-sm">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-gradient-to-br from-amber-500/10 to-yellow-500/10 rounded-lg">
                  <Crown className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Pro</p>
                  <p className="text-base font-bold bg-gradient-to-r from-amber-600 to-yellow-600 bg-clip-text text-transparent">
                    {Math.floor(pagination.total * 0.05).toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
            <div className="bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900 rounded-xl p-3 border border-gray-200 dark:border-gray-700 shadow-sm">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-gradient-to-br from-purple-500/10 to-indigo-500/10 rounded-lg">
                  <Trophy className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Playing</p>
                  <p className="text-base font-bold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
                    {Math.floor(pagination.total * 0.02).toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="px-3 sm:px-4 lg:px-8 pb-8">
          {/* Error State */}
          {error && (
            <div className="bg-gradient-to-br from-red-50 to-pink-50 dark:from-red-900/20 dark:to-pink-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gradient-to-br from-red-500/10 to-pink-500/10 rounded-lg">
                  <UsersIcon className="h-5 w-5 text-red-600 dark:text-red-400" />
                </div>
                <div className="flex-1">
                  <p className="text-red-700 dark:text-red-300 font-medium text-sm">{error}</p>
                  <button
                    onClick={loadUsers}
                    className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 text-xs font-medium mt-1 transition-colors"
                  >
                    Try Again
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Loading State */}
          {loading ? (
            <div className="flex justify-center items-center min-h-[400px]">
              <div className="text-center">
                <LoadingSpinner size="lg" />
                <p className="mt-4 text-gray-600 dark:text-gray-400 text-sm">
                  Loading players...
                </p>
              </div>
            </div>
          ) : (
            <>
              {/* Users Grid */}
              {users.length > 0 ? (
                <>
                  <div className="mb-4 flex items-center justify-between">
                    <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                      Showing {((pagination.page - 1) * pagination.limit) + 1} to{' '}
                      {Math.min(pagination.page * pagination.limit, pagination.total)} of{' '}
                      {pagination.total} players
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4 mb-6">
                    {users.map((user) => (
                      <UserCard
                        key={user.id}
                        user={user}
                        onFollowChange={handleFollowChange}
                        currentUserId={currentUser?.id}
                      />
                    ))}
                  </div>

                  {/* Pagination - Mobile Optimized */}
                  {pagination.totalPages > 1 && (
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 py-4 border-t border-gray-200 dark:border-gray-800">
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        Page {pagination.page} of {pagination.totalPages}
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handlePageChange(pagination.page - 1)}
                          disabled={pagination.page === 1}
                          className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-white to-gray-50 dark:from-gray-800 dark:to-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg text-sm text-gray-700 dark:text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:from-gray-50 hover:to-gray-100 dark:hover:from-gray-700 dark:hover:to-gray-800 transition-all duration-200 hover:scale-105 active:scale-95"
                        >
                          ← Previous
                        </button>
                        <div className="hidden sm:flex items-center gap-1">
                          {Array.from({ length: Math.min(3, pagination.totalPages) }, (_, i) => {
                            let pageNum;
                            if (pagination.totalPages <= 3) {
                              pageNum = i + 1;
                            } else if (pagination.page === 1) {
                              pageNum = i + 1;
                            } else if (pagination.page === pagination.totalPages) {
                              pageNum = pagination.totalPages - 2 + i;
                            } else {
                              pageNum = pagination.page - 1 + i;
                            }
                            
                            return (
                              <button
                                key={pageNum}
                                onClick={() => handlePageChange(pageNum)}
                                className={`h-10 w-10 rounded-lg font-medium transition-all duration-200 hover:scale-105 active:scale-95 ${
                                  pagination.page === pageNum
                                    ? 'bg-gradient-to-r from-purple-500 to-indigo-500 text-white shadow-md'
                                    : 'bg-gradient-to-r from-white to-gray-50 dark:from-gray-800 dark:to-gray-900 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:from-gray-50 hover:to-gray-100 dark:hover:from-gray-700 dark:hover:to-gray-800'
                                }`}
                              >
                                {pageNum}
                              </button>
                            );
                          })}
                        </div>
                        <button
                          onClick={() => handlePageChange(pagination.page + 1)}
                          disabled={pagination.page === pagination.totalPages}
                          className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-white to-gray-50 dark:from-gray-800 dark:to-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg text-sm text-gray-700 dark:text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:from-gray-50 hover:to-gray-100 dark:hover:from-gray-700 dark:hover:to-gray-800 transition-all duration-200 hover:scale-105 active:scale-95"
                        >
                          Next →
                        </button>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-12">
                  <div className="bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-900 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                    <UsersIcon className="h-8 w-8 text-gray-400 dark:text-gray-500" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                    No players found
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 text-sm mb-6 max-w-sm mx-auto">
                    {filters.search 
                      ? `No players match "${filters.search}". Try a different search term.`
                      : "Try adjusting your filters or check back later for new players."}
                  </p>
                  <button
                    onClick={() => handleFilterChange({
                      search: '',
                      sortBy: 'newest',
                      role: 'all',
                      onlineOnly: false,
                      verifiedOnly: false,
                      proOnly: false
                    })}
                    className="inline-flex items-center gap-2 bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600 text-white font-medium py-2.5 px-4 rounded-lg text-sm transition-all duration-200 hover:scale-105 active:scale-95 shadow-md hover:shadow-purple-500/25"
                  >
                    <Zap className="h-4 w-4" />
                    Clear All Filters
                  </button>
                </div>
              )}

              {/* Call to Action */}
              <div className="bg-gradient-to-r from-purple-500 to-indigo-600 rounded-xl p-6 mt-8 shadow-lg">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
                  <div className="text-white">
                    <h3 className="text-lg font-bold mb-2">Want to stand out?</h3>
                    <p className="opacity-90 text-sm mb-4">
                      Complete your profile and join tournaments to get featured!
                    </p>
                    <div className="flex flex-wrap items-center gap-4 text-xs">
                      <div className="flex items-center gap-2 bg-white/10 rounded-lg px-3 py-1.5">
                        <Trophy className="h-4 w-4" />
                        <span>Win tournaments</span>
                      </div>
                      <div className="flex items-center gap-2 bg-white/10 rounded-lg px-3 py-1.5">
                        <Target className="h-4 w-4" />
                        <span>Improve stats</span>
                      </div>
                      <div className="flex items-center gap-2 bg-white/10 rounded-lg px-3 py-1.5">
                        <UsersIcon className="h-4 w-4" />
                        <span>Gain followers</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <Link
                      to="/tournaments"
                      className="inline-flex items-center gap-2 bg-white text-purple-600 hover:bg-gray-100 font-medium py-2.5 px-4 rounded-lg text-sm transition-all duration-200 hover:scale-105 active:scale-95"
                    >
                      <Zap className="h-4 w-4" />
                      <span>Join Tournaments</span>
                    </Link>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </main>

      {/* Mobile Filter Modal */}
      <MobileFilterModal
        isOpen={showMobileFilters}
        onClose={() => setShowMobileFilters(false)}
        filters={filters}
        onFilterChange={handleFilterChange}
      />
    </div>
  );
}