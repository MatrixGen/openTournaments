import { useState, useEffect } from 'react';
import {
  UserGroupIcon,
  CurrencyDollarIcon,
  ClockIcon,
  TrophyIcon,
  CalendarIcon,
} from '@heroicons/react/24/outline';

const TournamentInfoGrid = ({ tournament }) => {
  const [timeRemaining, setTimeRemaining] = useState('');
  const [isLive, setIsLive] = useState(false);

  // Calculate time remaining until start or show live status
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const startTime = new Date(tournament.start_time);
      const timeDiff = startTime - now;

      if (timeDiff <= 0) {
        setIsLive(true);
        setTimeRemaining('Live Now');
        return;
      }

      const hours = Math.floor(timeDiff / (1000 * 60 * 60));
      const minutes = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60));

      if (hours > 24) {
        setTimeRemaining(startTime.toLocaleDateString());
      } else if (hours > 0) {
        setTimeRemaining(`in ${hours}h ${minutes}m`);
      } else {
        setTimeRemaining(`in ${minutes}m`);
      }
    };

    updateTime();
    const interval = setInterval(updateTime, 60000); // Update every minute

    return () => clearInterval(interval);
  }, [tournament.start_time]);

  // Calculate progress percentage for participants
  const progressPercentage = Math.round(
    (tournament.current_slots / tournament.total_slots) * 100
  );

  // Format entry fee display
  const formatEntryFee = (fee) => {
    return fee === 0 ? 'Free' : `$${fee}`;
  };

  // Format tournament format for display
  const formatTournamentFormat = (format) => {
    return format.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const infoItems = [
    {
      label: 'Format',
      value: formatTournamentFormat(tournament.format),
      icon: TrophyIcon,
      color: 'text-purple-400',
      bgColor: 'bg-purple-500/20'
    },
    {
      label: 'Entry Fee',
      value: formatEntryFee(tournament.entry_fee),
      icon: CurrencyDollarIcon,
      color: tournament.entry_fee === 0 ? 'text-green-400' : 'text-yellow-400',
      bgColor: tournament.entry_fee === 0 ? 'bg-green-500/20' : 'bg-yellow-500/20'
    },
    {
      label: 'Participants',
      value: `${tournament.current_slots}/${tournament.total_slots}`,
      icon: UserGroupIcon,
      color: 'text-blue-400',
      bgColor: 'bg-blue-500/20',
      progress: progressPercentage
    },
    {
      label: isLive ? 'Status' : 'Starts',
      value: timeRemaining,
      icon: isLive ? ClockIcon : CalendarIcon,
      color: isLive ? 'text-red-400' : 'text-cyan-400',
      bgColor: isLive ? 'bg-red-500/20' : 'bg-cyan-500/20'
    }
  ];

  return (
    <div className="border-t border-neutral-700/50 bg-gradient-to-b from-neutral-800/50 to-neutral-900/30 px-4 sm:px-6 py-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {infoItems.map((item, index) => (
          <div key={index} className="group">
            <div className="flex items-center gap-3 mb-2">
              <div className={`p-2 rounded-lg ${item.bgColor} group-hover:scale-110 transition-transform duration-200`}>
                <item.icon className={`h-4 w-4 ${item.color}`} />
              </div>
              <span className="text-xs font-medium text-gray-400 uppercase tracking-wide">
                {item.label}
              </span>
            </div>
            
            <div className="flex flex-col">
              <p className={`font-semibold text-white text-sm sm:text-base ${
                item.label === 'Starts' || item.label === 'Status' ? 'text-xs sm:text-sm' : ''
              }`}>
                {item.value}
              </p>
              
              {/* Progress bar for participants */}
              {item.progress !== undefined && (
                <div className="mt-2">
                  <div className="flex justify-between text-xs text-gray-400 mb-1">
                    <span>{progressPercentage}% filled</span>
                    <span>{tournament.total_slots - tournament.current_slots} spots left</span>
                  </div>
                  <div className="w-full bg-neutral-700 rounded-full h-1.5">
                    <div 
                      className="bg-gradient-to-r from-blue-500 to-cyan-500 h-1.5 rounded-full transition-all duration-500 ease-out"
                      style={{ width: `${progressPercentage}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Detailed time for start time */}
              {item.label === 'Starts' && !isLive && (
                <p className="text-xs text-gray-500 mt-1">
                  {new Date(tournament.start_time).toLocaleString()}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Additional tournament status information */}
      <div className="mt-6 pt-4 border-t border-neutral-700/30">
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-4">
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
              tournament.status === 'ongoing' 
                ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                : tournament.status === 'completed'
                ? 'bg-gray-500/20 text-gray-400 border border-gray-500/30'
                : tournament.status === 'cancelled'
                ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
            }`}>
              <div className={`w-1.5 h-1.5 rounded-full ${
                tournament.status === 'ongoing' ? 'bg-green-400 animate-pulse' 
                : tournament.status === 'completed' ? 'bg-gray-400'
                : tournament.status === 'cancelled' ? 'bg-red-400'
                : 'bg-blue-400'
              }`} />
              {tournament.status?.charAt(0).toUpperCase() + tournament.status?.slice(1) || 'Upcoming'}
            </span>
            
            {tournament.visibility && (
              <span className="text-gray-500">
                {tournament.visibility === 'public' ? 'Public Tournament' : 'Private Tournament'}
              </span>
            )}
          </div>
          
          {tournament.prize_pool && (
            <div className="flex items-center gap-1.5 text-amber-400 font-medium">
              <TrophyIcon className="h-3.5 w-3.5" />
              <span>${tournament.prize_pool} Prize Pool</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TournamentInfoGrid;