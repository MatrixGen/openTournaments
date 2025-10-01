import { useState, useEffect } from 'react';

const TournamentInfoSidebar = ({ tournament }) => {
  const [timeSinceCreation, setTimeSinceCreation] = useState('');

  // Calculate relative time since creation
  useEffect(() => {
    const calculateTimeSince = () => {
      const created = new Date(tournament.created_at);
      const now = new Date();
      const diffTime = Math.abs(now - created);
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      const diffHours = Math.floor(diffTime / (1000 * 60 * 60));
      const diffMinutes = Math.floor(diffTime / (1000 * 60));

      if (diffDays > 0) {
        return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
      } else if (diffHours > 0) {
        return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
      } else {
        return `${diffMinutes} minute${diffMinutes > 1 ? 's' : ''} ago`;
      }
    };

    setTimeSinceCreation(calculateTimeSince());
  }, [tournament.created_at]);

  const infoItems = [
    {
      label: 'Visibility',
      value: tournament.visibility.charAt(0).toUpperCase() + tournament.visibility.slice(1),
    },
    {
      label: 'Status',
      value: tournament.status.charAt(0).toUpperCase() + tournament.status.slice(1),
    },
    {
      label: 'Created',
      value: new Date(tournament.created_at).toLocaleDateString(),
      subtext: timeSinceCreation,
    },
    {
      label: 'Participants',
      value: `${tournament.current_slots} / ${tournament.total_slots}`,
      subtext: `${Math.round((tournament.current_slots / tournament.total_slots) * 100)}% filled`,
    },
    ...(tournament.updated_at ? [{
      label: 'Last Updated',
      value: new Date(tournament.updated_at).toLocaleDateString(),
      subtext: new Date(tournament.updated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    }] : []),
    {
      label: 'Tournament ID',
      value: `#${tournament.id}`,
    },
    {
      label: 'Format',
      value: tournament.format?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) || 'Single Elimination',
    },
    ...(tournament.prize_pool ? [{
      label: 'Prize Pool',
      value: `$${tournament.prize_pool}`,
    }] : []),
  ];

  return (
    <div className="bg-neutral-800 rounded-lg border border-neutral-700 p-4">
      <h2 className="text-lg font-semibold text-white mb-4">Tournament Details</h2>
      
      <div className="space-y-3">
        {infoItems.map((item, index) => (
          <div key={index} className="pb-3 border-b border-neutral-700 last:border-b-0 last:pb-0">
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <p className="text-sm text-gray-400 mb-1">{item.label}</p>
                <p className="text-white font-medium text-sm">{item.value}</p>
                {item.subtext && (
                  <p className="text-gray-500 text-xs mt-0.5">{item.subtext}</p>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Invite code if available */}
      {tournament.invite_code && (
        <div className="mt-4 p-3 bg-neutral-700/50 rounded border border-neutral-600">
          <p className="text-sm text-gray-400 mb-1">Invite Code</p>
          <div className="flex justify-between items-center">
            <p className="text-white font-mono text-sm">{tournament.invite_code}</p>
            <button
              onClick={() => navigator.clipboard.writeText(tournament.invite_code)}
              className="text-gray-400 hover:text-white text-xs px-2 py-1 border border-gray-600 rounded hover:border-gray-400 transition-colors"
            >
              Copy
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default TournamentInfoSidebar;