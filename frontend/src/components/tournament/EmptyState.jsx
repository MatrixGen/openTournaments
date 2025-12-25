import { Link } from 'react-router-dom';
import { 
  TrophyIcon, 
  PlusIcon, 
  AdjustmentsHorizontalIcon,
  FolderOpenIcon 
} from '@heroicons/react/24/outline';

const EmptyState = ({ filter, isCreator = false }) => {
  // Get filter-specific messages
  const getMessages = () => {
    if (!isCreator) {
      switch (filter) {
        case 'live':
          return {
            title: 'No Active Tournaments',
            description: 'There are currently no live tournaments. Check back soon or browse scheduled tournaments.',
            actionText: 'Browse Scheduled',
            actionTo: '/tournaments?scheduled=true',
            icon: TrophyIcon
          };
        case 'completed':
          return {
            title: 'No Completed Tournaments',
            description: 'No completed tournaments found. Check back after tournaments finish.',
            actionText: 'View Active Tournaments',
            actionTo: '/tournaments?status=live',
            icon: TrophyIcon
          };
        case 'scheduled':
          return {
            title: 'No Upcoming Tournaments',
            description: 'There are no scheduled tournaments at the moment. Create one to get started.',
            actionText: 'Create Tournament',
            actionTo: '/create-tournament',
            icon: PlusIcon
          };
        default:
          return {
            title: 'No Tournaments Found',
            description: 'No tournaments match your current filters. Try adjusting your search criteria.',
            actionText: 'Clear Filters',
            actionTo: '/tournaments',
            icon: AdjustmentsHorizontalIcon
          };
      }
    }

    // For tournament creators
    switch (filter) {
      case 'live':
        return {
          title: 'No Active Tournaments',
          description: 'You don\'t have any live tournaments. Start one from your scheduled tournaments.',
          actionText: 'View Scheduled',
          actionTo: '/tournaments?scheduled=true',
          icon: TrophyIcon
        };
      case 'completed':
        return {
          title: 'No Completed Tournaments',
          description: 'Your completed tournaments will appear here once tournaments finish.',
          actionText: 'View All Tournaments',
          actionTo: '/tournaments',
          icon: TrophyIcon
        };
      case 'scheduled':
        return {
          title: 'No Scheduled Tournaments',
          description: 'You haven\'t scheduled any tournaments yet. Create your first tournament to get started.',
          actionText: 'Create Tournament',
          actionTo: '/create-tournament',
          icon: PlusIcon
        };
      default:
        return {
          title: 'No Tournaments Created',
          description: 'You haven\'t created any tournaments yet. Start by creating your first tournament!',
          actionText: 'Create Your First Tournament',
          actionTo: '/create-tournament',
          icon: PlusIcon
        };
    }
  };

  const { title, description, actionText, actionTo, icon: Icon } = getMessages();

  return (
    <div className="text-center py-8 sm:py-12 bg-white dark:bg-neutral-800 rounded-xl border border-gray-200 dark:border-neutral-700 shadow-sm">
      {/* Icon */}
      <div className="inline-flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gray-100 dark:bg-neutral-700 mb-4 sm:mb-6">
        <Icon className="h-8 w-8 sm:h-10 sm:w-10 text-gray-600 dark:text-gray-300" />
      </div>

      {/* Title */}
      <h3 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-gray-900 dark:text-white mb-2">
        {title}
      </h3>

      {/* Description */}
      <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-md mx-auto text-sm sm:text-base px-4">
        {description}
      </p>

      {/* Action Button */}
      <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
        <Link
          to={actionTo}
          className="inline-flex items-center justify-center px-4 sm:px-5 py-2.5 sm:py-3 rounded-lg text-sm sm:text-base font-medium text-gray-900 dark:text-white bg-primary-500 hover:bg-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 transition-colors"
        >
          <PlusIcon className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
          {actionText}
        </Link>

        {/* Secondary action for some states */}
        {filter === 'live' && (
          <Link
            to="/tournaments?scheduled=true"
            className="inline-flex items-center justify-center px-4 sm:px-5 py-2.5 sm:py-3 rounded-lg text-sm sm:text-base font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-neutral-700 hover:bg-gray-200 dark:hover:bg-neutral-600 transition-colors"
          >
            <AdjustmentsHorizontalIcon className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
            Browse Scheduled
          </Link>
        )}
      </div>

      {/* Additional tips for creators */}
      {isCreator && filter === 'all' && (
        <div className="mt-6 sm:mt-8 pt-6 sm:pt-8 border-t border-gray-200 dark:border-neutral-700">
          <h4 className="text-sm font-medium text-gray-900 dark:text-gray-900 dark:text-white mb-3">
            Getting Started Tips
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-left max-w-2xl mx-auto">
            <div className="p-3 bg-gray-50 dark:bg-neutral-700/30 rounded-lg">
              <div className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                Plan Your Tournament
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Set clear rules, format, and prize structure
              </p>
            </div>
            <div className="p-3 bg-gray-50 dark:bg-neutral-700/30 rounded-lg">
              <div className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                Set a Schedule
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Choose dates that work for participants
              </p>
            </div>
            <div className="p-3 bg-gray-50 dark:bg-neutral-700/30 rounded-lg">
              <div className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                Promote Your Event
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Share with your community to get participants
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Browse all tournaments link */}
      {(filter !== 'all' && !isCreator) && (
        <div className="mt-6">
          <Link
            to="/tournaments"
            className="inline-flex items-center text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-300 transition-colors"
          >
            <FolderOpenIcon className="h-4 w-4 mr-1" />
            View all tournaments
          </Link>
        </div>
      )}
    </div>
  );
};

export default EmptyState;