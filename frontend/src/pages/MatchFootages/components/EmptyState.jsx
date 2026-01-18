import { memo } from "react";
import { Link } from "react-router-dom";
import { FileVideo } from "lucide-react";

/**
 * Empty state when no recordings found
 */
const EmptyState = memo(({ searchQuery }) => {
  return (
    <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
      <div className="w-20 h-20 rounded-full bg-gray-800 flex items-center justify-center mb-6">
        <FileVideo className="h-10 w-10 text-gray-500" />
      </div>
      
      <h3 className="text-xl font-semibold text-white mb-3">
        {searchQuery ? "No matches found" : "No match footages yet"}
      </h3>
      
      <p className="text-gray-400 mb-8 max-w-xs">
        {searchQuery
          ? `No footages match "${searchQuery}"`
          : "Your match recordings will appear here after you play"}
      </p>
      
      {!searchQuery && (
        <Link
          to="/dashboard"
          className="
            inline-flex items-center 
            bg-gradient-to-r from-purple-500 to-indigo-500 
            hover:from-purple-600 hover:to-indigo-600 
            text-white font-medium py-3 px-6 rounded-full
            transition-all duration-200 
            hover:scale-105 active:scale-95
          "
        >
          Find a Match
        </Link>
      )}
    </div>
  );
});

EmptyState.displayName = "EmptyState";

export default EmptyState;
