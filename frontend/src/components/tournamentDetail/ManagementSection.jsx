import { Link } from 'react-router-dom';
import ManagementActions from '../tournament/ManagementActions';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';

const ManagementSection = ({ tournament, user, onAction }) => (
  <div className="mb-4 sm:mb-6 space-y-4">
    <Link
      to="/tournaments"
      className="inline-flex items-center text-sm sm:text-base text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-300 transition-colors group"
      aria-label="Back to tournaments"
    >
      <ArrowLeftIcon className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform" />
      Back to Tournaments
    </Link>
    
    {/* Management Actions for Tournament Creator */}
    {user && tournament.created_by === user.id && (
      <ManagementActions 
        tournament={tournament} 
        onAction={onAction} 
      />
    )}
  </div>
);

export default ManagementSection;