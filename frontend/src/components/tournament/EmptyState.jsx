import { Link } from 'react-router-dom';

const EmptyState = ({ filter }) => (
  <div className="text-center py-12 sm:py-16 bg-neutral-800 rounded-lg border border-neutral-700">
    <div className="mx-auto h-16 w-16 sm:h-20 sm:w-20 rounded-full bg-neutral-700 flex items-center justify-center mb-4">
      <span className="text-2xl sm:text-3xl">🏆</span>
    </div>
    <h3 className="text-lg sm:text-xl font-medium text-white mb-2">No tournaments found</h3>
    <p className="text-gray-400 mb-6 max-w-md mx-auto text-sm sm:text-base px-4">
      {filter === 'all' 
        ? "You haven't created any tournaments yet. Start by creating your first tournament!"
        : `You don't have any ${filter} tournaments. Try changing the filter.`}
    </p>
    <Link
      to="/create-tournament"
      className="inline-flex items-center px-4 sm:px-6 py-2 sm:py-3 border border-transparent rounded-md shadow-sm text-sm sm:text-base font-medium text-white bg-primary-500 hover:bg-primary-600 transition-colors"
    >
      <span className="mr-2">➕</span>
      Create Your First Tournament
    </Link>
  </div>
);

export default EmptyState;