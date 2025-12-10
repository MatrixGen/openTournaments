import { Trophy, Users, Gamepad2, Globe, Sparkles, Award, Crown } from 'lucide-react';
import { useState, useEffect } from 'react';

const TournamentHeader = ({ tournament }) => {
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
      case 'upcoming':
        return {
          color: 'text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/30 border-blue-500/30',
          label: 'Upcoming',
          icon: Trophy,
          gradient: 'from-blue-500/20 to-blue-600/10'
        };
      case 'ongoing':
        return {
          color: 'text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/30 border-green-500/30',
          label: 'Live',
          icon: Sparkles,
          gradient: 'from-green-500/20 to-emerald-600/10'
        };
      case 'completed':
        return {
          color: 'text-purple-600 dark:text-purple-400 bg-purple-100 dark:bg-purple-900/30 border-purple-500/30',
          label: 'Completed',
          icon: Award,
          gradient: 'from-purple-500/20 to-purple-600/10'
        };
      case 'cancelled':
        return {
          color: 'text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/30 border-red-500/30',
          label: 'Cancelled',
          icon: 'X',
          gradient: 'from-red-500/20 to-red-600/10'
        };
      default:
        return {
          color: 'text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-900/30 border-gray-500/30',
          label: status,
          icon: Gamepad2,
          gradient: 'from-gray-500/20 to-gray-600/10'
        };
    }
  };

  const statusConfig = getStatusConfig(tournament.status);
  const StatusIcon = statusConfig.icon;

  return (
    <div className="hidden md:block relative rounded-xl shadow-sm border border-gray-200 dark:border-neutral-700 overflow-hidden mb-6">
      {/* Background Image with Multiple Overlay Layers */}
      <div className="absolute inset-0 z-0">
        {/* Background Image */}
        {tournament?.game?.logo_url && !imageError && (
          <div className="absolute inset-0">
            <img
              src={tournament.game.logo_url}
              alt={tournament.game.name}
              className={`w-full h-full object-cover transition-opacity duration-1000 ${
                isImageLoaded ? 'opacity-10 dark:opacity-15' : 'opacity-0'
              }`}
              loading="lazy"
              onLoad={() => setIsImageLoaded(true)}
              onError={() => setImageError(true)}
            />
            
            {/* Multiple Gradient Overlays */}
            <div className="absolute inset-0 bg-gradient-to-br from-white/60 via-white/40 to-transparent dark:from-neutral-900/80 dark:via-neutral-900/60 dark:to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-t from-white via-white/50 to-transparent dark:from-neutral-900 via-neutral-900/50 dark:to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 via-transparent to-purple-500/5" />
            
            {/* Animated Gradient for Status */}
            <div className={`absolute inset-0 bg-gradient-to-r ${statusConfig.gradient} opacity-20`} />
            
            {/* Subtle Pattern Overlay */}
            <div className="absolute inset-0 opacity-[0.02]"
              style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23000000' fill-opacity='0.05'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
                backgroundSize: '60px 60px'
              }}
            />
          </div>
        )}
        
        {/* Fallback Gradient Background */}
        {(!tournament?.game?.logo_url || imageError) && (
          <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20" />
        )}
        
        {/* Glow Effect for Featured Tournaments */}
        {tournament.is_featured && (
          <div className="absolute -inset-1 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-xl blur-xl opacity-20 animate-pulse" />
        )}
      </div>

      {/* Main Content with Glass Effect */}
      <div className="relative z-10 p-6 backdrop-blur-sm bg-white/70 dark:bg-neutral-800/70">
        <div className="flex flex-col md:flex-row md:items-start justify-between">
          {/* Left Section - Tournament Info */}
          <div className="flex items-start mb-4 md:mb-0">
            {/* Game Logo Container with Glow */}
            <div className="relative mr-3 md:mr-4 flex-shrink-0">
              <div className="h-14 w-14 md:h-16 md:w-16 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg">
                {tournament.game?.logo_url && !imageError ? (
                  <img
                    src={tournament.game.logo_url}
                    alt={tournament.game.name}
                    className="h-10 w-10 md:h-12 md:w-12 object-contain rounded-lg"
                    loading="lazy"
                  />
                ) : (
                  <Gamepad2 className="h-7 w-7 md:h-8 md:w-8 text-white" />
                )}
              </div>
              {/* Glow Effect */}
              <div className="absolute -inset-1 bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl blur opacity-30" />
              
              {/* Featured Badge */}
              {tournament.is_featured && (
                <div className="absolute -top-1 -right-1 z-20">
                  <div className="relative">
                    <Crown className="h-5 w-5 text-yellow-500 fill-yellow-500/20" />
                    <div className="absolute inset-0 animate-ping">
                      <Crown className="h-5 w-5 text-yellow-500/40" />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Tournament Details */}
            <div className="flex-1 min-w-0">
              {/* Status and Visibility Badges */}
              <div className="flex items-center space-x-2 mb-2">
                <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border backdrop-blur-sm ${statusConfig.color} shadow-sm`}>
                  {typeof StatusIcon === 'string' ? (
                    StatusIcon
                  ) : (
                    <StatusIcon className="h-3 w-3 mr-1.5" />
                  )}
                  {statusConfig.label}
                </span>
                
                {tournament.visibility === 'public' && (
                  <span className="inline-flex items-center text-xs text-gray-600 dark:text-gray-300 bg-white/50 dark:bg-neutral-700/50 px-2 py-1 rounded-full backdrop-blur-sm">
                    <Globe className="h-3 w-3 mr-1" />
                    Public
                  </span>
                )}
                
                {/* Prize Pool Indicator */}
                {tournament.entry_fee > 0 && (
                  <span className="inline-flex items-center text-xs text-emerald-600 dark:text-emerald-400 bg-emerald-100/50 dark:bg-emerald-900/30 px-2 py-1 rounded-full backdrop-blur-sm">
                    <Trophy className="h-3 w-3 mr-1" />
                    ${tournament.entry_fee * tournament.total_slots || 0}
                  </span>
                )}
              </div>

              {/* Tournament Name */}
              <h1 className="text-xl md:text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white mb-1 drop-shadow-sm">
                {tournament.name}
              </h1>

              {/* Game and Mode Info */}
              <div className="flex flex-col md:flex-row md:items-center md:space-x-4 text-sm">
                <div className="flex items-center text-gray-700 dark:text-gray-300 mb-1 md:mb-0">
                  <div className="p-1 bg-blue-100 dark:bg-blue-900/30 rounded mr-2">
                    <Gamepad2 className="h-3 w-3 text-blue-600 dark:text-blue-400" />
                  </div>
                  <span className="font-medium truncate">{tournament.game?.name || 'Tournament'}</span>
                </div>
                <span className="hidden md:block text-gray-400">•</span>
                <div className="flex items-center text-gray-700 dark:text-gray-300">
                  <div className="p-1 bg-purple-100 dark:bg-purple-900/30 rounded mr-2">
                    <Users className="h-3 w-3 text-purple-600 dark:text-purple-400" />
                  </div>
                  <span className="font-medium truncate">{tournament.game_mode?.name || 'Game Mode'}</span>
                </div>
                
                {/* Platform Info if Available */}
                {tournament.platform?.name && (
                  <>
                    <span className="hidden md:block text-gray-400">•</span>
                    <div className="flex items-center text-gray-700 dark:text-gray-300">
                      <div className="p-1 bg-green-100 dark:bg-green-900/30 rounded mr-2">
                        <span className="text-xs">🎮</span>
                      </div>
                      <span className="font-medium truncate">{tournament.platform.name}</span>
                    </div>
                  </>
                )}
              </div>
              
              {/* Start Time */}
              {tournament.start_time && (
                <div className="flex items-center text-gray-600 dark:text-gray-400 text-xs mt-2">
                  <div className="p-1 bg-gray-100 dark:bg-neutral-700/50 rounded mr-2">
                    <span className="text-xs">⏰</span>
                  </div>
                  <span>
                    Starts {new Date(tournament.start_time).toLocaleDateString('en-US', {
                      weekday: 'long',
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Right Section - Creator Info */}
          <div className="flex flex-col items-start md:items-end mt-4 md:mt-0">
            <div className="relative group">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-1 font-medium">
                Tournament Host
              </p>
              <div className="flex items-center bg-white/50 dark:bg-neutral-700/50 backdrop-blur-sm rounded-lg p-2 pl-3 border border-gray-200/50 dark:border-neutral-700/50 shadow-sm">
                <div className="h-8 w-8 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center mr-2 shadow-sm">
                  <span className="text-xs font-bold text-white">
                    {tournament.creator?.username?.charAt(0).toUpperCase() || 'U'}
                  </span>
                </div>
                <div>
                  <span className="text-sm font-semibold text-gray-900 dark:text-white block">
                    {tournament.creator?.username || 'Unknown'}
                  </span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {tournament.creator?.role || 'Organizer'}
                  </span>
                </div>
              </div>
              {/* Glow effect on hover */}
              <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg blur opacity-0 group-hover:opacity-20 transition-opacity duration-300 -z-10" />
            </div>
            
            {/* Additional Stats */}
            {tournament.participants && (
              <div className="flex items-center space-x-4 mt-3">
                <div className="text-center">
                  <p className="text-lg font-bold text-gray-900 dark:text-white">
                    {tournament.current_slots || tournament.participants.length}
                  </p>
                  <p className="text-xs text-gray-600 dark:text-gray-400">Joined</p>
                </div>
                <div className="h-8 w-px bg-gray-300 dark:bg-neutral-600" />
                <div className="text-center">
                  <p className="text-lg font-bold text-gray-900 dark:text-white">
                    {tournament.total_slots}
                  </p>
                  <p className="text-xs text-gray-600 dark:text-gray-400">Total Slots</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bottom Gradient Border */}
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 opacity-30" />
    </div>
  );
};

export default TournamentHeader;