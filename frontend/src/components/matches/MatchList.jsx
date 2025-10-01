import { useMemo, useRef, useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import MatchCard from './MatchCard';

export default function MatchList({ matches, onUpdate, isLoading = false }) {
  const { user } = useAuth();
  const scrollContainerRef = useRef(null);
  const [showLeftShadow, setShowLeftShadow] = useState(false);
  const [showRightShadow, setShowRightShadow] = useState(true);
  const [isScrolling, setIsScrolling] = useState(false);

  // Sort matches: user's matches first, then prioritize live matches, then by date
  const sortedMatches = useMemo(() => {
    if (!matches.length) return [];

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
  const updateScrollShadows = () => {
    const element = scrollContainerRef.current;
    if (element) {
      setShowLeftShadow(element.scrollLeft > 0);
      setShowRightShadow(
        element.scrollLeft < element.scrollWidth - element.clientWidth - 1
      );
    }
  };

  // Handle scroll events with debouncing
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolling(true);
      updateScrollShadows();
      clearTimeout(scrollContainerRef.current.scrollTimeout);
      scrollContainerRef.current.scrollTimeout = setTimeout(() => {
        setIsScrolling(false);
      }, 150);
    };

    const element = scrollContainerRef.current;
    if (element) {
      element.addEventListener('scroll', handleScroll);
      updateScrollShadows(); // Initial check
    }

    return () => {
      if (element) {
        element.removeEventListener('scroll', handleScroll);
        clearTimeout(element.scrollTimeout);
      }
    };
  }, [matches]);

  // Scroll buttons handler
  const scroll = (direction) => {
    const element = scrollContainerRef.current;
    if (element) {
      const scrollAmount = element.clientWidth * 0.8;
      element.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  // Loading skeleton
  if (isLoading) {
    return (
      <div className="relative">
        <div className="flex gap-4 overflow-x-hidden pb-6 -mx-4 px-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="flex-shrink-0 w-80">
              <div className="bg-neutral-800 rounded-lg p-4 animate-pulse">
                <div className="flex justify-between items-center mb-4">
                  <div className="h-4 bg-neutral-700 rounded w-20"></div>
                  <div className="h-6 bg-neutral-700 rounded w-16"></div>
                </div>
                <div className="space-y-3">
                  <div className="h-12 bg-neutral-700 rounded"></div>
                  <div className="h-12 bg-neutral-700 rounded"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (matches.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-gray-400 text-lg mb-2">No matches found</div>
        <div className="text-gray-500 text-sm">Matches will appear here once the tournament starts</div>
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Scroll Controls */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-semibold text-white">Matches</h2>
          <span className="px-2 py-1 bg-neutral-700 rounded-full text-sm text-neutral-300">
            {sortedMatches.length} match{sortedMatches.length !== 1 ? 'es' : ''}
          </span>
        </div>

        {/* Scroll Buttons - Desktop */}
        <div className="hidden md:flex items-center space-x-2">
          <button
            onClick={() => scroll('left')}
            disabled={!showLeftShadow}
            className={`p-3 rounded-lg transition-all duration-200 ${
              showLeftShadow 
                ? 'bg-neutral-700 hover:bg-neutral-600 text-white shadow-lg' 
                : 'bg-neutral-800 text-neutral-500 cursor-not-allowed'
            }`}
            aria-label="Scroll left"
          >
            ←
          </button>
          <button
            onClick={() => scroll('right')}
            disabled={!showRightShadow}
            className={`p-3 rounded-lg transition-all duration-200 ${
              showRightShadow 
                ? 'bg-neutral-700 hover:bg-neutral-600 text-white shadow-lg' 
                : 'bg-neutral-800 text-neutral-500 cursor-not-allowed'
            }`}
            aria-label="Scroll right"
          >
            →
          </button>
        </div>
      </div>

      {/* Horizontal Scroll Container */}
      <div className="relative group">
        {/* Left Shadow */}
        {showLeftShadow && (
          <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-neutral-900 to-transparent z-10 pointer-events-none transition-opacity duration-200" />
        )}

        {/* Right Shadow */}
        {showRightShadow && (
          <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-neutral-900 to-transparent z-10 pointer-events-none transition-opacity duration-200" />
        )}

        {/* Scroll Container */}
        <div
          ref={scrollContainerRef}
          className={`flex overflow-x-auto pb-6 -mx-4 px-4 scrollbar-thin scrollbar-thumb-neutral-600 scrollbar-track-neutral-800 transition-opacity duration-200 ${
            isScrolling ? 'opacity-90' : 'opacity-100'
          }`}
          style={{ scrollBehavior: 'smooth' }}
        >
          <div className="flex gap-4 min-w-min">
            {sortedMatches.map((match) => (
              <div 
                key={match.id} 
                className="flex-shrink-0 w-80 transform transition-transform duration-200 hover:scale-[1.02]"
              >
                <MatchCard match={match} onUpdate={onUpdate} />
              </div>
            ))}
          </div>
        </div>

        {/* Mobile Scroll Hint */}
        <div className="md:hidden absolute bottom-2 left-1/2 transform -translate-x-1/2 bg-black/70 text-white text-xs px-3 py-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
          ← Scroll horizontally →
        </div>
      </div>
    </div>
  );
}