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
  Gamepad2,
  Smartphone,
  Monitor
} from 'lucide-react';
import { formatCurrency } from '../utils/formatters';
import { useTheme } from '../contexts/ThemeContext';

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
  const {theme} = useTheme();
  
  
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
      <div className={`rounded-xl p-4 sm:p-6 md:p-8 text-center ${theme === 'dark' ? 'bg-neutral-800/50' : 'bg-gray-50'} border ${theme === 'dark' ? 'border-neutral-700' : 'border-gray-200'}`}>
        <Trophy className="h-8 sm:h-10 md:h-12 w-8 sm:w-10 md:w-12 mx-auto mb-3 sm:mb-4 text-gray-400" />
        <h3 className={`text-base sm:text-lg md:text-xl font-semibold mb-1 sm:mb-2 ${theme === 'dark' ? 'text-gray-900 dark:text-white' : 'text-gray-900'}`}>
          No Tournaments Available
        </h3>
        <p className={`text-xs sm:text-sm ${theme === 'dark' ? 'text-neutral-400' : 'text-gray-600'}`}>
          Check back later for new tournaments
        </p>
      </div>
    );
  }

  const statusColors = getStatusColor(currentItem?.status);
  const bgClass = theme === 'dark' 
    ? 'bg-neutral-800/50 border-neutral-700' 
    : 'bg-white/80 border-gray-200';
  const textColor = theme === 'dark' ? 'text-gray-900 dark:text-white' : 'text-gray-900';
  const subtextColor = theme === 'dark' ? 'text-neutral-400' : 'text-gray-600';

  // Calculate prize pool
  //const prizePool = parseFloat(currentItem.entry_fee) * currentItem.total_slots;
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
        className="absolute -inset-2 bg-gradient-to-r from-purple-500 to-blue-500 dark:from-purple-600 dark:to-blue-600 rounded-xl blur-lg opacity-10 dark:opacity-20 hidden sm:block"
        animate={{ rotate: 360 }}
        transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
      />
      
      <div 
        className={`relative backdrop-blur-sm rounded-xl p-4 sm:p-5 md:p-6 border ${bgClass}`}
        onMouseEnter={pause}
        onMouseLeave={resume}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Header - Stack on mobile, row on desktop */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 sm:mb-6 gap-2 sm:gap-0">
          <div>
            <h2 className={`text-lg sm:text-xl md:text-2xl font-bold ${textColor} flex items-center gap-2`}>
              <Trophy className="h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6 text-yellow-500" />
              <span className="text-base sm:text-lg md:text-xl">Featured Tournaments</span>
            </h2>
            <p className={`text-xs sm:text-sm ${subtextColor} mt-0.5`}>
              Discover exciting tournaments to join
            </p>
          </div>
          
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <div className={`text-[10px] xs:text-xs px-2 py-1 rounded-full ${statusColors.bg} ${statusColors.text}`}>
              {currentItem?.status?.toUpperCase()}
            </div>
            <div className={`flex items-center text-xs ${subtextColor}`}>
              <div className={`w-1.5 h-1.5 rounded-full mr-1 ${isPaused ? 'bg-yellow-500' : 'bg-green-500'}`} />
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
                    className="w-full h-full object-cover opacity-10 dark:opacity-20"
                    initial={{ scale: 1 }}
                    animate={{ scale: 1.1 }}
                    transition={{ duration: 10, repeat: Infinity, repeatType: "reverse" }}
                    loading="lazy"
                  />
                ) : (
                  <div className={`w-full h-full ${theme === 'dark' ? 'bg-neutral-700' : 'bg-gray-200'} opacity-20`} />
                )}
                
                {/* Gradient Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t sm:bg-gradient-to-r from-black/50 via-transparent to-transparent" />
              </div>

              {/* Content - Stack vertically on mobile, row on larger screens */}
              <div className="relative flex-1 p-4 sm:p-5 md:p-6 flex flex-col justify-between">
                {/* Tournament Info */}
                <div>
                  <motion.h3
                    className={`text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold mb-2 line-clamp-2 ${textColor}`}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1, duration: 0.3 }}
                  >
                    {currentItem?.name}
                  </motion.h3>
                  
                  {/* Game and Players info - Stack on mobile, row on larger */}
                  <div className="flex flex-col xs:flex-row items-start xs:items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
                    <div className="flex items-center gap-1.5 text-xs sm:text-sm">
                      <Gamepad2 className="h-3 w-3 sm:h-4 sm:w-4 text-blue-400" />
                      <span className={subtextColor}>
                        {currentItem?.game?.name || 'Unknown Game'}
                      </span>
                    </div>
                    <div className="hidden xs:block text-xs text-gray-400">•</div>
                    <div className="flex items-center gap-1.5 text-xs sm:text-sm">
                      <Users className="h-3 w-3 sm:h-4 sm:w-4 text-purple-400" />
                      <span className={subtextColor}>
                        {currentItem?.current_slots}/{currentItem?.total_slots} players
                      </span>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="mb-3 sm:mb-4">
                    <div className="flex justify-between text-[10px] xs:text-xs mb-1">
                      <span className={subtextColor}>Tournament Filled</span>
                      <span className={textColor}>{filledPercentage}%</span>
                    </div>
                    <div className="h-1.5 xs:h-2 bg-gray-700/50 dark:bg-neutral-700/50 rounded-full overflow-hidden">
                      <motion.div
                        className="h-full bg-gradient-to-r from-blue-500 to-purple-500"
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
                      <DollarSign className="h-3 w-3 sm:h-4 sm:w-4 text-emerald-400" />
                      <span className={`text-sm sm:text-base md:text-lg font-bold ${textColor}`}>
                        {currentItem?.entry_fee > 0 
                          ? formatCurrency(currentItem.entry_fee, 'USD') 
                          : 'Free'}
                      </span>
                    </div>
                    <span className={`text-[10px] xs:text-xs ${subtextColor}`}>Entry Fee</span>
                  </div>
                  
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-1 mb-0.5 sm:mb-1">
                      <Trophy className="h-3 w-3 sm:h-4 sm:w-4 text-yellow-400" />
                      <span className={`text-sm sm:text-base md:text-lg font-bold ${textColor}`}>
                        {formatCurrency(currentItem?.prize_pool,'USD')}
                      </span>
                    </div>
                    <span className={`text-[10px] xs:text-xs ${subtextColor}`}>Prize Pool</span>
                  </div>
                  
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-1 mb-0.5 sm:mb-1">
                      <Clock className="h-3 w-3 sm:h-4 sm:w-4 text-orange-400" />
                      <span className={`text-sm sm:text-base md:text-lg font-bold ${textColor}`}>
                        {formatDate(currentItem?.start_time)}
                      </span>
                    </div>
                    <span className={`text-[10px] xs:text-xs ${subtextColor}`}>Starts</span>
                  </div>
                </div>
              </div>
            </motion.div>
          </AnimatePresence>

          {/* Navigation Arrows - Smaller on mobile, positioned for easy thumb access */}
          <button
            onClick={prevItem}
            className={`absolute left-1 xs:left-2 top-1/2 transform -translate-y-1/2 w-8 h-8 sm:w-9 sm:h-9 md:w-10 md:h-10 rounded-full flex items-center justify-center transition-all duration-300 group ${
              theme === 'dark' 
                ? 'bg-neutral-700/80 hover:bg-neutral-600' 
                : 'bg-gray-300/80 hover:bg-gray-400'
            }`}
            aria-label="Previous tournament"
          >
            <ChevronLeft className={`h-3 w-3 sm:h-4 sm:w-4 md:h-5 md:w-5 group-hover:text-purple-500 transition-colors ${
              theme === 'dark' ? 'text-gray-900 dark:text-white' : 'text-gray-700'
            }`} />
          </button>
          
          <button
            onClick={nextItem}
            className={`absolute right-1 xs:right-2 top-1/2 transform -translate-y-1/2 w-8 h-8 sm:w-9 sm:h-9 md:w-10 md:h-10 rounded-full flex items-center justify-center transition-all duration-300 group ${
              theme === 'dark' 
                ? 'bg-neutral-700/80 hover:bg-neutral-600' 
                : 'bg-gray-300/80 hover:bg-gray-400'
            }`}
            aria-label="Next tournament"
          >
            <ChevronRight className={`h-3 w-3 sm:h-4 sm:w-4 md:h-5 md:w-5 group-hover:text-purple-500 transition-colors ${
              theme === 'dark' ? 'text-gray-900 dark:text-white' : 'text-gray-700'
            }`} />
          </button>
          
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
              className={`relative rounded-full transition-all duration-300 focus:outline-none ${
                index === currentIndex 
                  ? "bg-gradient-to-r from-blue-500 to-purple-500" 
                  : theme === 'dark' 
                    ? "bg-neutral-600 hover:bg-neutral-500" 
                    : "bg-gray-300 hover:bg-gray-400"
              }`}
              aria-label={`Go to tournament ${index + 1}`}
            >
              <div className={`w-1.5 h-1.5 sm:w-2 sm:h-2 ${
                index === currentIndex ? 'sm:w-4 md:w-5' : ''
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
        <div className={`border-t pt-3 sm:pt-4 ${
          theme === 'dark' ? 'border-neutral-700' : 'border-gray-200'
        } hidden xs:block`}>
          <p className={`text-center text-xs sm:text-sm mb-2 ${subtextColor} flex items-center justify-center gap-1.5`}>
            <Calendar className="h-3 w-3 sm:h-4 sm:w-4" />
            Upcoming Tournaments
          </p>
          <div className="grid grid-cols-3 gap-2 sm:gap-3">
            {tournaments.slice(0, 3).map((tournament, index) => (
              <motion.button
                key={tournament.id}
                className={`flex flex-col items-center p-2 sm:p-3 rounded-lg transition-all duration-300 ${
                  index === currentIndex 
                    ? theme === 'dark'
                      ? 'bg-neutral-700/80 ring-1 sm:ring-2 ring-purple-500/50'
                      : 'bg-gray-200 ring-1 sm:ring-2 ring-purple-500/30'
                    : theme === 'dark'
                      ? 'bg-neutral-700/40 hover:bg-neutral-700/60'
                      : 'bg-gray-100 hover:bg-gray-200'
                }`}
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
                  <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-md flex items-center justify-center mb-1 sm:mb-2">
                    <Trophy className="h-4 w-4 sm:h-5 sm:w-5 text-gray-900 dark:text-white" />
                  </div>
                )}
                <span className={`text-[10px] xs:text-xs font-medium truncate w-full text-center ${textColor}`}>
                  {tournament.name}
                </span>
                <span className={`text-[10px] ${subtextColor} mt-0.5`}>
                  {formatCurrency(tournament.entry_fee,'USD')}
                </span>
              </motion.button>
            ))}
          </div>
        </div>

        {/* Action Button */}
        <div className="mt-4 sm:mt-6">
          <motion.button
            onClick={() => navigate(`/tournaments/${currentItem.id}`)}
            className="w-full py-2.5 sm:py-3 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg text-gray-900 dark:text-white font-semibold hover:from-blue-600 hover:to-purple-600 transition-all duration-300 flex items-center justify-center gap-1.5 sm:gap-2 group shadow-lg"
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
                    <div className={`w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 rounded-full border-2 ${
                      theme === 'dark' ? 'border-neutral-800' : 'border-white'
                    } bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center`}>
                      <User className="h-2.5 w-2.5 sm:h-3 sm:w-3 md:h-4 md:w-4 text-gray-900 dark:text-white" />
                    </div>
                    {idx === 2 && currentItem.participants.length > 3 && (
                      <div className={`absolute inset-0 w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 rounded-full border-2 ${
                        theme === 'dark' ? 'border-neutral-800' : 'border-white'
                      } bg-neutral-700 flex items-center justify-center`}>
                        <span className="text-[8px] sm:text-[10px] md:text-xs font-bold text-gray-900 dark:text-white">
                          +{currentItem.participants.length - 3}
                        </span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
              <span className={`text-[10px] sm:text-xs ml-1.5 sm:ml-2 ${subtextColor}`}>
                {currentItem.current_slots} player{currentItem.current_slots !== 1 ? 's' : ''} joined
              </span>
            </div>
          )}
        </div>
        
        {/* Mobile-only indicators */}
        <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-200/30 dark:border-neutral-700/30 sm:hidden">
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