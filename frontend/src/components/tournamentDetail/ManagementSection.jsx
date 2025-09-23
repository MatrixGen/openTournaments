import { Link } from 'react-router-dom';
import ManagementActions from '../tournament/ManagementActions';

const ManagementSection = ({ tournament, user, onAction }) => (
  <div className="mb-4 sm:mb-6">
    <Link
      to="/tournaments"
      className="text-primary-500 hover:text-primary-400 inline-flex items-center text-sm sm:text-base"
    >
      <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
      </svg>
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