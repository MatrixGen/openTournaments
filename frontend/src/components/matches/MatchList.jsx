import { useMemo, useRef, useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import MatchCard from './MatchCard';
import { ChevronLeft, ChevronRight, Users, Clock, Loader2 } from 'lucide-react';

export default function MatchList({ matches, onUpdate, isLoading = false }) {
  const { user } = useAuth();
  const scrollContainerRef = useRef(null);
  const [showLeftShadow, setShowLeftShadow] = useState(false);
  const [showRightShadow, setShowRightShadow] = useState(true);
  const [isScrolling, setIsScrolling] = useState(false);
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

  // Sort matches: user's matches first, then prioritize live matches, then by date
  const sortedMatches = useMemo(() => {
    if (!matches?.length) return [];

    const userMatches = [];
    const otherMatches = [];

    matches.forEach(match => {
      const isUserMatch = user && (
        match.participant1?.user_id === user.id || 
        match.participant2?.user_id === user.id
      );

      if (isUserMatch) {
        userMatches.push(match);
      } else {
        otherMatches.push(match);
      }
    });

    // Sort within categories: live matches first, then by date
    const sortByPriority = (a, b) => {
      // Live matches first
      if (a.status === 'live' && b.status !== 'live') return -1;
      if (b.status === 'live' && a.status !== 'live') return 1;
      
      // Then by date (soonest first for upcoming, most recent for completed)
      const aDate = new Date(a.scheduled_time || a.created_at);
      const bDate = new Date(b.scheduled_time || b.created_at);
      
      if (a.status === 'completed' || b.status === 'completed') {
        return bDate - aDate; // Most recent completed first
      }
      return aDate - bDate; // Soonest upcoming first
    };

    return [
      ...userMatches.sort(sortByPriority),
      ...otherMatches.sort(sortByPriority)
    ];
  }, [matches, user]);

  // Check scroll position for shadow visibility
  const updateScrollShadows = useCallback(() => {
    const element = scrollContainerRef.current;
    if (element) {
      const hasLeftScroll = element.scrollLeft > 10;
      const hasRightScroll = 
        element.scrollLeft < element.scrollWidth - element.clientWidth - 10;
      
      setShowLeftShadow(hasLeftScroll);
      setShowRightShadow(hasRightScroll);
    }
  }, []);

  // Handle scroll events with throttling
  useEffect(() => {
    let scrollTimeout;
    
    const handleScroll = () => {
      if (!isScrolling) setIsScrolling(true);
      updateScrollShadows();
      
      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(() => {
        setIsScrolling(false);
      }, 100);
    };

    const element = scrollContainerRef.current;
    if (element) {
      element.addEventListener('scroll', handleScroll);
      updateScrollShadows(); // Initial check
      
      // Re-check on resize
      const handleResize = () => {
        updateScrollShadows();
      };
      window.addEventListener('resize', handleResize);
      
      return () => {
        element.removeEventListener('scroll', handleScroll);
        window.removeEventListener('resize', handleResize);
        clearTimeout(scrollTimeout);
      };
    }
  }, [updateScrollShadows, isScrolling]);

  // Scroll buttons handler
  const scroll = useCallback((direction) => {
    const element = scrollContainerRef.current;
    if (element) {
      const scrollAmount = isMobile ? element.clientWidth * 0.85 : element.clientWidth * 0.7;
      element.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
    }
  }, [isMobile]);

  // Loading skeleton
  if (isLoading) {
    return (
      <div className="relative">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="h-7 w-32 bg-gray-200 dark:bg-neutral-700 rounded-lg animate-pulse" />
            <div className="h-6 w-16 bg-gray-200 dark:bg-neutral-700 rounded-full animate-pulse" />
          </div>
        </div>
        
        <div className="flex gap-3 md:gap-4 overflow-x-hidden pb-4 -mx-4 px-4">
          {[...Array(isMobile ? 2 : 3)].map((_, i) => (
            <div 
              key={i} 
              className={`flex-shrink-0 ${isMobile ? 'w-[calc(100vw-3rem)]' : 'w-80'}`}
            >
              <div className="bg-white dark:bg-neutral-800 rounded-xl p-4 md:p-5 animate-pulse shadow-sm dark:shadow-none">
                <div className="flex justify-between items-center mb-4">
                  <div className="h-4 w-20 bg-gray-200 dark:bg-neutral-700 rounded"></div>
                  <div className="h-6 w-16 bg-gray-200 dark:bg-neutral-700 rounded-full"></div>
                </div>
                <div className="space-y-3">
                  <div className="h-14 bg-gray-200 dark:bg-neutral-700 rounded-lg"></div>
                  <div className="h-14 bg-gray-200 dark:bg-neutral-700 rounded-lg"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!matches?.length) {
    return (
      <div className="text-center py-8 md:py-12 px-4">
        <div className="inline-flex items-center justify-center w-12 h-12 md:w-16 md:h-16 bg-gray-100 dark:bg-neutral-800 rounded-full mb-4">
          <Clock className="w-6 h-6 md:w-8 md:h-8 text-gray-400 dark:text-neutral-500" />
        </div>
        <h3 className="text-lg md:text-xl font-semibold text-gray-900 dark:text-gray-900 dark:text-white mb-2">
          No Matches Found
        </h3>
        <p className="text-sm md:text-base text-gray-600 dark:text-neutral-400 max-w-md mx-auto">
          Matches will appear here once the tournament begins. Check back soon!
        </p>
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Header with Stats and Controls */}
      <div className="flex items-center justify-between mb-6 md:mb-8">
        <div className="flex items-center gap-3 md:gap-4">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-primary-100 dark:bg-primary-900/30 rounded-lg">
              <Users className="w-5 h-5 md:w-6 md:h-6 text-primary-600 dark:text-primary-400" />
            </div>
            <div>
              <h2 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-gray-900 dark:text-white">
                Tournament Matches
              </h2>
              <p className="text-sm text-gray-500 dark:text-neutral-400 hidden md:block">
                Follow your matches and opponents
              </p>
            </div>
          </div>
          
          <span className="px-3 py-1.5 bg-gray-100 dark:bg-neutral-800 rounded-full text-sm font-medium text-gray-700 dark:text-neutral-300">
            {sortedMatches.length} match{sortedMatches.length !== 1 ? 'es' : ''}
          </span>
        </div>

        {/* Desktop Scroll Controls */}
        <div className="hidden md:flex items-center gap-2">
          <button
            onClick={() => scroll('left')}
            disabled={!showLeftShadow}
            className={`p-3 rounded-xl transition-all duration-200 ${
              showLeftShadow 
                ? 'bg-white dark:bg-neutral-800 hover:bg-gray-50 dark:hover:bg-neutral-700 text-gray-900 dark:text-gray-900 dark:text-white shadow-sm hover:shadow-md border border-gray-200 dark:border-neutral-700' 
                : 'bg-gray-100 dark:bg-neutral-800 text-gray-400 dark:text-neutral-600 cursor-not-allowed'
            }`}
            aria-label="Scroll left"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            onClick={() => scroll('right')}
            disabled={!showRightShadow}
            className={`p-3 rounded-xl transition-all duration-200 ${
              showRightShadow 
                ? 'bg-white dark:bg-neutral-800 hover:bg-gray-50 dark:hover:bg-neutral-700 text-gray-900 dark:text-gray-900 dark:text-white shadow-sm hover:shadow-md border border-gray-200 dark:border-neutral-700' 
                : 'bg-gray-100 dark:bg-neutral-800 text-gray-400 dark:text-neutral-600 cursor-not-allowed'
            }`}
            aria-label="Scroll right"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Mobile Scroll Indicator */}
      <div className="md:hidden flex items-center justify-between mb-4 px-1">
        <div className="text-sm font-medium text-gray-700 dark:text-neutral-300">
          Swipe to see more →
        </div>
        <div className="flex items-center gap-1">
          <div className="h-2 w-2 rounded-full bg-gray-300 dark:bg-neutral-700" />
          <div className="h-2 w-2 rounded-full bg-gray-300 dark:bg-neutral-700" />
          <div className="h-2 w-2 rounded-full bg-primary-500 dark:bg-primary-400" />
        </div>
      </div>

      {/* Horizontal Scroll Container */}
      <div className="relative">
        {/* Shadows for Scroll Indication */}
        <div className="absolute inset-y-0 left-0 w-6 md:w-8 bg-gradient-to-r from-gray-50 dark:from-neutral-900 to-transparent pointer-events-none z-10 transition-opacity duration-300"
          style={{ opacity: showLeftShadow ? 1 : 0 }}
        />
        <div className="absolute inset-y-0 right-0 w-6 md:w-8 bg-gradient-to-l from-gray-50 dark:from-neutral-900 to-transparent pointer-events-none z-10 transition-opacity duration-300"
          style={{ opacity: showRightShadow ? 1 : 0 }}
        />

        {/* Mobile Floating Scroll Buttons */}
        {isMobile && (
          <>
            <button
              onClick={() => scroll('left')}
              disabled={!showLeftShadow}
              className={`absolute left-2 top-1/2 -translate-y-1/2 z-20 p-2.5 rounded-full shadow-lg transition-all duration-200 ${
                showLeftShadow 
                  ? 'bg-white dark:bg-neutral-800 text-gray-900 dark:text-gray-900 dark:text-white opacity-90 hover:opacity-100' 
                  : 'opacity-0 pointer-events-none'
              }`}
              aria-label="Scroll left"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={() => scroll('right')}
              disabled={!showRightShadow}
              className={`absolute right-2 top-1/2 -translate-y-1/2 z-20 p-2.5 rounded-full shadow-lg transition-all duration-200 ${
                showRightShadow 
                  ? 'bg-white dark:bg-neutral-800 text-gray-900 dark:text-gray-900 dark:text-white opacity-90 hover:opacity-100' 
                  : 'opacity-0 pointer-events-none'
              }`}
              aria-label="Scroll right"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </>
        )}

        {/* Scroll Container */}
        <div
          ref={scrollContainerRef}
          className={`flex overflow-x-auto scrollbar-none pb-4 md:pb-6 -mx-4 px-4 md:-mx-6 md:px-6 transition-opacity duration-200 ${
            isScrolling ? 'opacity-95' : 'opacity-100'
          }`}
          style={{ scrollBehavior: 'smooth' }}
        >
          <div className="flex gap-3 md:gap-5 min-w-min">
            {sortedMatches.map((match) => (
              <div 
                key={match.id} 
                className={`flex-shrink-0 transform transition-all duration-200 hover:scale-[1.01] active:scale-100 ${
                  isMobile 
                    ? 'w-[calc(100vw-3rem)]' // Full width minus padding
                    : 'w-80 md:w-96' // Desktop widths
                }`}
              >
                <MatchCard match={match} onUpdate={onUpdate} isMobile={isMobile} />
              </div>
            ))}
          </div>
        </div>

        {/* Mobile Progress Dots */}
        {isMobile && sortedMatches.length > 1 && (
          <div className="flex justify-center gap-1.5 mt-4">
            {[...Array(Math.min(5, sortedMatches.length))].map((_, i) => (
              <div 
                key={i}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  i === 0 
                    ? 'w-6 bg-primary-500 dark:bg-primary-400' 
                    : 'w-1.5 bg-gray-300 dark:bg-neutral-700'
                }`}
              />
            ))}
          </div>
        )}

        {/* Mobile Scroll Hint */}
        <div className="md:hidden absolute -bottom-2 left-1/2 transform -translate-x-1/2 bg-gray-900/80 dark:bg-black/80 text-gray-900 dark:text-white text-xs px-3 py-1.5 rounded-full opacity-0 transition-opacity duration-300 pointer-events-none">
          Swipe horizontally to navigate
        </div>
      </div>

      {/* Loading Indicator */}
      {isLoading && (
        <div className="absolute inset-0 bg-white/60 dark:bg-neutral-900/60 backdrop-blur-sm z-30 flex items-center justify-center">
          <div className="flex items-center gap-3 bg-white dark:bg-neutral-800 px-6 py-4 rounded-2xl shadow-xl">
            <Loader2 className="w-6 h-6 text-primary-600 dark:text-primary-400 animate-spin" />
            <span className="text-gray-700 dark:text-neutral-300 font-medium">
              Loading matches...
            </span>
          </div>
        </div>
      )}
    </div>
  );
}