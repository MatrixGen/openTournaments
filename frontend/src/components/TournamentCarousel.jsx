import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Trophy, 
  Users, 
  Clock, 
  DollarSign, 
  Calendar,
  ChevronLeft, 
  ChevronRight,
  Zap,
  User,
  Gamepad2
} from 'lucide-react';
import { formatMoney } from '../utils/formatters';

// Custom hook for carousel functionality
const useTournamentCarousel = (items, interval = 4000) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [direction, setDirection] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const intervalRef = useRef(null);

  const nextItem = useCallback(() => {
    setDirection(1);
    setCurrentIndex((prevIndex) => (prevIndex + 1) % items.length);
  }, [items.length]);

  const prevItem = useCallback(() => {
    setDirection(-1);
    setCurrentIndex((prevIndex) => (prevIndex - 1 + items.length) % items.length);
  }, [items.length]);

  const goToItem = useCallback((index) => {
    const dir = index > currentIndex ? 1 : -1;
    setDirection(dir);
    setCurrentIndex(index);
  }, [currentIndex]);

  // Auto-rotate
  useEffect(() => {
    if (isPaused || items.length <= 1) return;

    intervalRef.current = setInterval(nextItem, interval);
    
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isPaused, nextItem, interval, items.length]);

  const pause = () => {
    setIsPaused(true);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
  };

  const resume = () => {
    setIsPaused(false);
  };

  return {
    currentIndex,
    currentItem: items[currentIndex] || items[0],
    direction,
    nextItem,
    prevItem,
    goToItem,
    isPaused,
    pause,
    resume,
  };
};

// Helper function to get status color
const getStatusColor = (status) => {
  switch (status) {
    case 'open':
      return { bg: 'bg-emerald-500/20', text: 'text-emerald-300', border: 'border-emerald-500/30' };
    case 'ongoing':
      return { bg: 'bg-blue-500/20', text: 'text-blue-300', border: 'border-blue-500/30' };
    case 'completed':
      return { bg: 'bg-purple-500/20', text: 'text-purple-300', border: 'border-purple-500/30' };
    case 'cancelled':
      return { bg: 'bg-red-500/20', text: 'text-red-300', border: 'border-red-500/30' };
    default:
      return { bg: 'bg-gray-500/20', text: 'text-gray-300', border: 'border-gray-500/30' };
  }
};

const getTournamentCurrency = (tournament, fallbackCurrency = 'TZS') => {
  return tournament?.currency || fallbackCurrency;
};

// Format date with mobile-friendly display
const formatDate = (dateString) => {
  if (!dateString) return 'TBD';
  
  const date = new Date(dateString);
  const now = new Date();
  const diffInHours = Math.floor((date - now) / (1000 * 60 * 60));
  
  // Mobile: shorter format
  if (window.innerWidth < 640) {
    if (diffInHours < 24 && diffInHours > 0) {
      return `${diffInHours}h`;
    }
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
    });
  }
  
  // Desktop: full format
  if (diffInHours < 24 && diffInHours > 0) {
    return `in ${diffInHours}h`;
  }
  
  return date.toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

// Tournament Carousel Component
export default function TournamentCarousel({ tournaments = []}) {
  const navigate = useNavigate();
  const [isMobile, setIsMobile] = useState(false);
  
  // Check for mobile viewport
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const {
    currentIndex,
    currentItem,
    direction,
    nextItem,
    prevItem,
    goToItem,
    isPaused,
    pause,
    resume,
  } = useTournamentCarousel(tournaments, isMobile ? 6000 : 5000); // Slower on mobile

  // If no tournaments, show empty state
  if (!tournaments || tournaments.length === 0) {
    return (
      <div className="rounded-xl p-4 sm:p-6 md:p-8 text-center bg-gradient-to-br from-white to-gray-50/80 dark:from-gray-800 dark:to-gray-900/90 border border-gray-200 dark:border-gray-700">
        <Trophy className="h-8 sm:h-10 md:h-12 w-8 sm:w-10 md:w-12 mx-auto mb-3 sm:mb-4 text-gray-400" />
        <h3 className="text-base sm:text-lg md:text-xl font-semibold mb-1 sm:mb-2 bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
          No Tournaments Available
        </h3>
        <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
          Check back later for new tournaments
        </p>
      </div>
    );
  }

  const statusColors = getStatusColor(currentItem?.status);
  const filledPercentage = Math.round((currentItem.current_slots / currentItem.total_slots) * 100);

  // Swipe support for mobile
  const touchStartX = useRef(0);
  const touchEndX = useRef(0);

  const handleTouchStart = (e) => {
    touchStartX.current = e.touches[0].clientX;
    pause();
  };

  const handleTouchMove = (e) => {
    touchEndX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = () => {
    if (!touchStartX.current || !touchEndX.current) return;
    
    const swipeThreshold = 50;
    const diff = touchStartX.current - touchEndX.current;
    
    if (Math.abs(diff) > swipeThreshold) {
      if (diff > 0) {
        nextItem(); // Swipe left
      } else {
        prevItem(); // Swipe right
      }
    }
    
    setTimeout(resume, 1000);
  };

  return (
    <motion.div
      className="relative w-full"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      {/* Animated Background Glow - Only on desktop */}
      <motion.div 
        className="absolute -inset-2 bg-gradient-to-r from-purple-500 to-indigo-500 rounded-xl blur-lg opacity-10 dark:opacity-20 hidden sm:block"
        animate={{ rotate: 360 }}
        transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
      />
      
      <div 
        className="relative backdrop-blur-sm rounded-xl p-4 sm:p-5 md:p-6 border bg-gradient-to-br from-white to-gray-50/80 dark:from-gray-800 dark:to-gray-900/90 border-gray-200 dark:border-gray-700"
        onMouseEnter={pause}
        onMouseLeave={resume}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Header - Stack on mobile, row on desktop */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 sm:mb-6 gap-2 sm:gap-0">
          <div>
            <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <div className="p-1.5 bg-gradient-to-br from-amber-500 to-yellow-500 rounded-lg">
                <Trophy className="h-3 w-3 sm:h-4 sm:w-4 md:h-5 md:w-5 text-white" />
              </div>
              <span className="text-base sm:text-lg md:text-xl bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
                Featured Tournaments
              </span>
            </h2>
            <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mt-0.5">
              Discover exciting tournaments to join
            </p>
          </div>
          
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <div className={`text-[10px] xs:text-xs px-2 py-1 rounded-full ${statusColors.bg} ${statusColors.text}`}>
              {currentItem?.status?.toUpperCase()}
            </div>
            <div className="flex items-center text-xs text-gray-600 dark:text-gray-400">
              <div className={`w-1.5 h-1.5 rounded-full mr-1 ${isPaused ? 'bg-amber-500' : 'bg-emerald-500'}`} />
              <span className="hidden sm:inline">{isPaused ? 'Paused' : 'Auto'}</span>
            </div>
          </div>
        </div>

        {/* Main Carousel Content */}
        <div className="relative h-48 sm:h-56 md:h-64 lg:h-72 mb-6 sm:mb-8">
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={currentItem?.id}
              custom={direction}
              initial={{ opacity: 0, x: direction > 0 ? (isMobile ? 50 : 100) : (isMobile ? -50 : -100) }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: direction > 0 ? (isMobile ? -50 : -100) : (isMobile ? 50 : 100) }}
              transition={{ 
                duration: isMobile ? 0.3 : 0.5, 
                type: "spring", 
                stiffness: isMobile ? 150 : 200 
              }}
              className="absolute inset-0 flex flex-col sm:flex-row"
            >
              {/* Background Image/Game Logo */}
              <div className="absolute inset-0 overflow-hidden rounded-lg">
                {currentItem?.game?.logo_url ? (
                  <motion.img
                    src={currentItem.game.logo_url}
                    alt={currentItem.game.name}
                    className="w-full h-full object-cover opacity-80 dark:opacity-20"
                    initial={{ scale: 1 }}
                    animate={{ scale: 1.1 }}
                    transition={{ duration: 10, repeat: Infinity, repeatType: "reverse" }}
                    loading="lazy"
                  />
                ) : (
                  <div className="w-full h-full bg-gray-200 dark:bg-gray-700 opacity-20" />
                )}
                
                {/* Gradient Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t sm:bg-gradient-to-r from-black/50 via-transparent to-transparent" />
              </div>

              {/* Content - Stack vertically on mobile, row on larger screens */}
              <div className="relative flex-1 p-4 sm:p-5 md:p-6 flex flex-col justify-between">
                {/* Tournament Info */}
                <div>
                  <motion.h3
                    className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold mb-2 line-clamp-2 text-gray-900 dark:text-white"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1, duration: 0.3 }}
                  >
                    {currentItem?.name}
                  </motion.h3>
                  
                  {/* Game and Players info - Stack on mobile, row on larger */}
                  <div className="flex flex-col xs:flex-row items-start xs:items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
                    <div className="flex items-center gap-1.5 text-xs sm:text-sm">
                      <div className="p-1 bg-gradient-to-br from-blue-500 to-indigo-500 rounded">
                        <Gamepad2 className="h-2 w-2 sm:h-3 sm:w-3 text-white" />
                      </div>
                      <span className="text-gray-600 dark:text-gray-400">
                        {currentItem?.game?.name || 'Unknown Game'}
                      </span>
                    </div>
                    <div className="hidden xs:block text-xs text-gray-400">•</div>
                    <div className="flex items-center gap-1.5 text-xs sm:text-sm">
                      <div className="p-1 bg-gradient-to-br from-purple-500 to-indigo-500 rounded">
                        <Users className="h-2 w-2 sm:h-3 sm:w-3 text-white" />
                      </div>
                      <span className="text-gray-600 dark:text-gray-400">
                        {currentItem?.current_slots}/{currentItem?.total_slots} players
                      </span>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="mb-3 sm:mb-4">
                    <div className="flex justify-between text-[10px] xs:text-xs mb-1">
                      <span className="text-gray-600 dark:text-gray-400">Tournament Filled</span>
                      <span className="font-medium text-gray-900 dark:text-white">{filledPercentage}%</span>
                    </div>
                    <div className="h-1.5 xs:h-2 bg-gray-200 dark:bg-gray-700/50 rounded-full overflow-hidden">
                      <motion.div
                        className="h-full bg-gradient-to-r from-purple-500 to-indigo-500"
                        initial={{ width: 0 }}
                        animate={{ width: `${filledPercentage}%` }}
                        transition={{ duration: 1, ease: "easeOut" }}
                      />
                    </div>
                  </div>
                </div>

                {/* Bottom Section - Grid layout */}
                <div className="grid grid-cols-3 gap-2 sm:gap-3 md:gap-4">
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-1 mb-0.5 sm:mb-1">
                      <div className="p-1 bg-gradient-to-br from-emerald-500 to-green-500 rounded">
                        <DollarSign className="h-2 w-2 sm:h-3 sm:w-3 text-white" />
                      </div>
                      <span className="text-sm sm:text-base md:text-lg font-bold text-gray-900 dark:text-white">
                        {currentItem?.entry_fee > 0 
                          ? formatMoney(
                              currentItem.entry_fee,
                              getTournamentCurrency(currentItem)
                            ) 
                          : 'Free'}
                      </span>
                    </div>
                    <span className="text-[10px] xs:text-xs text-gray-600 dark:text-gray-400">Entry Fee</span>
                  </div>
                  
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-1 mb-0.5 sm:mb-1">
                      <div className="p-1 bg-gradient-to-br from-amber-500 to-yellow-500 rounded">
                        <Trophy className="h-2 w-2 sm:h-3 sm:w-3 text-white" />
                      </div>
                      <span className="text-sm sm:text-base md:text-lg font-bold text-gray-900 dark:text-white">
                        {formatMoney(
                          currentItem?.prize_pool,
                          getTournamentCurrency(currentItem)
                        )}
                      </span>
                    </div>
                    <span className="text-[10px] xs:text-xs text-gray-600 dark:text-gray-400">Prize Pool</span>
                  </div>
                  
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-1 mb-0.5 sm:mb-1">
                      <div className="p-1 bg-gradient-to-br from-blue-500 to-indigo-500 rounded">
                        <Clock className="h-2 w-2 sm:h-3 sm:w-3 text-white" />
                      </div>
                      <span className="text-sm sm:text-base md:text-lg font-bold text-gray-900 dark:text-white">
                        {formatDate(currentItem?.start_time)}
                      </span>
                    </div>
                    <span className="text-[10px] xs:text-xs text-gray-600 dark:text-gray-400">Starts</span>
                  </div>
                </div>
              </div>
            </motion.div>
          </AnimatePresence>

          
          
          {/* Mobile swipe indicator */}
          <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 flex items-center gap-1 text-[10px] text-gray-400 sm:hidden">
            <ChevronLeft className="h-2 w-2" />
            <span>Swipe</span>
            <ChevronRight className="h-2 w-2" />
          </div>
        </div>

        {/* Progress Dots */}
        <div className="flex justify-center space-x-1.5 sm:space-x-2 mb-4 sm:mb-6">
          {tournaments.map((tournament, index) => (
            <button
              key={tournament.id}
              onClick={() => goToItem(index)}
              className="relative rounded-full transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
              aria-label={`Go to tournament ${index + 1}`}
            >
              <div className={`w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full transition-all duration-300 ${
                index === currentIndex 
                  ? "bg-gradient-to-r from-purple-500 to-indigo-500 sm:w-4 md:w-5" 
                  : "bg-gray-300 dark:bg-gray-600 hover:bg-gray-400 dark:hover:bg-gray-500"
              }`} />
              
              {/* Active dot animation */}
              {index === currentIndex && !isPaused && (
                <motion.div
                  className="absolute inset-0 rounded-full border border-purple-500"
                  initial={{ scale: 1 }}
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ 
                    duration: 5, 
                    repeat: Infinity,
                    ease: "linear"
                  }}
                />
              )}
            </button>
          ))}
        </div>

        {/* Quick Preview Grid - Hidden on very small screens */}
        <div className="border-t border-gray-200 dark:border-gray-700 pt-3 sm:pt-4 hidden xs:block">
          <p className="text-center text-xs sm:text-sm mb-2 text-gray-600 dark:text-gray-400 flex items-center justify-center gap-1.5">
            <div className="p-1 bg-gradient-to-br from-purple-500 to-indigo-500 rounded">
              <Calendar className="h-2 w-2 sm:h-3 sm:w-3 text-white" />
            </div>
            Upcoming Tournaments
          </p>
          <div className="grid grid-cols-3 gap-2 sm:gap-3">
            {tournaments.slice(0, 3).map((tournament, index) => (
              <motion.button
                key={tournament.id}
                className="flex flex-col items-center p-2 sm:p-3 rounded-lg transition-all duration-300 bg-gradient-to-br from-white to-gray-50/80 dark:from-gray-800 dark:to-gray-900/90 border border-gray-200 dark:border-gray-700 hover:border-purple-300 dark:hover:border-purple-700"
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => goToItem(index)}
                aria-label={`Switch to ${tournament.name}`}
              >
                {tournament.game?.logo_url ? (
                  <img
                    src={tournament.game.logo_url}
                    alt={tournament.game.name}
                    className="w-8 h-8 sm:w-10 sm:h-10 object-cover rounded-md mb-1 sm:mb-2"
                    loading="lazy"
                  />
                ) : (
                  <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-purple-500 to-indigo-500 rounded-md flex items-center justify-center mb-1 sm:mb-2">
                    <Trophy className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
                  </div>
                )}
                <span className="text-[10px] xs:text-xs font-medium truncate w-full text-center text-gray-900 dark:text-white">
                  {tournament.name}
                </span>
                <span className="text-[10px] text-gray-600 dark:text-gray-400 mt-0.5">
                  {formatMoney(
                    tournament.entry_fee,
                    getTournamentCurrency(tournament)
                  )}
                </span>
              </motion.button>
            ))}
          </div>
        </div>

        {/* Action Button */}
        <div className="mt-4 sm:mt-6">
          <motion.button
            onClick={() => navigate(`/tournaments/${currentItem.id}`)}
            className="w-full py-2.5 sm:py-3 bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600 text-white font-semibold transition-all duration-300 flex items-center justify-center gap-1.5 sm:gap-2 group hover:scale-105 active:scale-95 hover:shadow-purple-500/25 rounded-lg shadow-lg"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Zap className="h-4 w-4 sm:h-5 sm:w-5 group-hover:animate-pulse" />
            <span className="text-sm sm:text-base">
              {currentItem.current_slots >= currentItem.total_slots 
                ? 'View Tournament' 
                : 'Join Tournament'}
            </span>
          </motion.button>
          
          {/* Participants - Only show if there are participants */}
          {currentItem.participants && currentItem.participants.length > 0 && (
            <div className="flex items-center justify-center mt-2 sm:mt-3">
              <div className="flex -space-x-1.5 sm:-space-x-2">
                {currentItem.participants.slice(0, 3).map((participant, idx) => (
                  <div key={participant.id} className="relative">
                    <div className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 rounded-full border-2 border-white dark:border-gray-800 bg-gradient-to-br from-purple-500 to-indigo-500 flex items-center justify-center">
                      <User className="h-2.5 w-2.5 sm:h-3 sm:w-3 md:h-4 md:w-4 text-white" />
                    </div>
                    {idx === 2 && currentItem.participants.length > 3 && (
                      <div className="absolute inset-0 w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 rounded-full border-2 border-white dark:border-gray-800 bg-gray-700 dark:bg-gray-800 flex items-center justify-center">
                        <span className="text-[8px] sm:text-[10px] md:text-xs font-bold text-white">
                          +{currentItem.participants.length - 3}
                        </span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
              <span className="text-[10px] sm:text-xs ml-1.5 sm:ml-2 text-gray-600 dark:text-gray-400">
                {currentItem.current_slots} player{currentItem.current_slots !== 1 ? 's' : ''} joined
              </span>
            </div>
          )}
        </div>
        
        {/* Mobile-only indicators */}
        <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-200/30 dark:border-gray-700/30 sm:hidden">
          <div className="text-[10px] text-gray-400 flex items-center gap-1">
            <Trophy className="h-2.5 w-2.5" />
            <span>{tournaments.length} tournaments</span>
          </div>
          <div className="text-[10px] text-gray-400">
            {currentIndex + 1} of {tournaments.length}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
