import { useEffect, useState } from "react";

// You'll need to create this hook or use a simpler approach
export const useMatchMedia = (query) => {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const media = window.matchMedia(query);
    
    // Update the state initially
    const updateMatches = () => setMatches(media.matches);
    updateMatches();
    
    // Listen for changes
    media.addEventListener('change', updateMatches);
    
    return () => media.removeEventListener('change', updateMatches);
  }, [query]);

  return matches;
};