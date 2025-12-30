import { Plus } from "lucide-react";
import { Link } from "react-router-dom";

export const MobileFAB = () => (
    <div className="fixed bottom-20 right-4 z-50 md:hidden" style={{ isolation: 'isolate' }}>
      <Link
        to="/create-tournament"
        className="flex items-center justify-center p-4 bg-primary-500 text-white dark:text-white rounded-full shadow-lg transform transition-all duration-200 hover:scale-105 hover:bg-primary-600 active:scale-95"
      >
        <Plus className="h-6 w-6" />
      </Link>
    </div>
  );