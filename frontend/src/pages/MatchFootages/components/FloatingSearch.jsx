import { memo, useState, useRef, useEffect } from "react";
import { Search, X } from "lucide-react";

/**
 * Floating search pill that expands on focus
 * TikTok-style minimal search input
 */
const FloatingSearch = memo(({ searchQuery, setSearchQuery }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const inputRef = useRef(null);

  // Auto-expand if there's a query
  useEffect(() => {
    if (searchQuery) {
      setIsExpanded(true);
    }
  }, [searchQuery]);

  const handleFocus = () => {
    setIsExpanded(true);
  };

  const handleBlur = () => {
    // Only collapse if empty
    if (!searchQuery) {
      setIsExpanded(false);
    }
  };

  const handleClear = () => {
    setSearchQuery("");
    inputRef.current?.focus();
  };

  const handleIconClick = () => {
    setIsExpanded(true);
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  return (
    <div className="absolute top-4 left-4 right-4 z-30 flex justify-center pointer-events-none">
      <div
        className={`
          pointer-events-auto
          flex items-center gap-2
          rounded-full
          backdrop-blur-md
          transition-all duration-300 ease-out
          ${isExpanded 
            ? "w-full max-w-sm bg-black/60 px-4 py-2.5" 
            : "w-10 h-10 bg-black/40 justify-center cursor-pointer hover:bg-black/60"
          }
        `}
        onClick={!isExpanded ? handleIconClick : undefined}
      >
        <Search className={`h-5 w-5 text-white/80 flex-shrink-0 ${!isExpanded && "cursor-pointer"}`} />
        
        {isExpanded && (
          <>
            <input
              ref={inputRef}
              type="text"
              placeholder="Search footages..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={handleFocus}
              onBlur={handleBlur}
              className="
                flex-1 bg-transparent text-white text-sm
                placeholder:text-white/50
                focus:outline-none
                min-w-0
              "
            />
            {searchQuery && (
              <button
                onClick={handleClear}
                className="p-1 rounded-full hover:bg-white/20 transition-colors"
              >
                <X className="h-4 w-4 text-white/80" />
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
});

FloatingSearch.displayName = "FloatingSearch";

export default FloatingSearch;
