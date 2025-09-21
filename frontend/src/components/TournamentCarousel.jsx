import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

export default function TournamentCarousel({ tournaments }) {
  const navigate = useNavigate();
  const scrollRef = useRef(null);
  const autoScrollRef = useRef(null);

  // Auto-scroll every 3s
  useEffect(() => {
    const scrollContainer = scrollRef.current;
    if (!scrollContainer || tournaments.length <= 1) return;

    const scrollStep = scrollContainer.offsetWidth; // scroll by container width
    autoScrollRef.current = setInterval(() => {
      if (!scrollContainer) return;
      if (
        scrollContainer.scrollLeft + scrollContainer.offsetWidth >=
        scrollContainer.scrollWidth
      ) {
        scrollContainer.scrollTo({ left: 0, behavior: 'smooth' });
      } else {
        scrollContainer.scrollBy({ left: scrollStep, behavior: 'smooth' });
      }
    }, 3000);

    return () => clearInterval(autoScrollRef.current);
  }, [tournaments]);

  // Pause auto-scroll on user interaction
  const pauseAutoScroll = () => clearInterval(autoScrollRef.current);

  return (
    <div className="relative">
      <div
        ref={scrollRef}
        className="flex overflow-x-auto gap-4 scroll-smooth snap-x snap-mandatory"
        onMouseEnter={pauseAutoScroll}
        onTouchStart={pauseAutoScroll}
        style={{ scrollbarWidth: 'none' }} // hides Firefox scrollbar
      >
        {tournaments.map((tournament) => (
          <div
            key={tournament.id}
            className="snap-start flex-shrink-0 w-64 bg-neutral-700/50 rounded-lg p-4 cursor-pointer hover:bg-neutral-700 transition"
            onClick={() => navigate(`/tournaments/${tournament.id}`)}
          >
            <h3 className="text-lg font-medium text-white truncate" title={tournament.name}>
              {tournament.name}
            </h3>
            <p className="text-gray-400 text-sm truncate" title={tournament.game.name}>
              {tournament.game.name}
            </p>
            <span
              className={`mt-2 inline-block px-2 py-1 rounded text-xs font-medium ${
                tournament.status === 'upcoming'
                  ? 'bg-blue-500/20 text-blue-300'
                  : tournament.status === 'ongoing'
                  ? 'bg-green-500/20 text-green-300'
                  : 'bg-gray-500/20 text-gray-300'
              }`}
            >
              {tournament.status}
            </span>
          </div>
        ))}
      </div>

      {/* Optional Slide Indicators */}
      <div className="flex justify-center mt-4 space-x-2">
        {tournaments.map((_, idx) => (
          <button
            key={idx}
            onClick={() => {
              scrollRef.current.scrollLeft = idx * 256; // approximate card width + gap
            }}
            className="h-2 w-2 rounded-full bg-neutral-600"
          />
        ))}
      </div>
    </div>
  );
}
