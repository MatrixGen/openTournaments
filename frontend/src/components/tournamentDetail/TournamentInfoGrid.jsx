import { useState, useEffect } from 'react';
import { 
  Trophy, 
  DollarSign, 
  Users, 
  Clock, 
  Calendar,
  TrendingUp,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { formatCurrency } from '../../config/currencyConfig';

const TournamentInfoGrid = ({ tournament }) => {
  const [timeRemaining, setTimeRemaining] = useState('');
  const [isLive, setIsLive] = useState(false);
  const [formattedStartTime, setFormattedStartTime] = useState('');

  // Calculate time remaining and format display
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const startTime = new Date(tournament.start_time);
      const timeDiff = startTime - now;

      // Format the full start time for display
      setFormattedStartTime(startTime.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }));

      if (timeDiff <= 0) {
        setIsLive(true);
        setTimeRemaining('Live Now');
        return;
      }

      const days = Math.floor(timeDiff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((timeDiff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60));

      if (days > 0) {
        setTimeRemaining(`${days}d ${hours}h`);
      } else if (hours > 0) {
        setTimeRemaining(`${hours}h ${minutes}m`);
      } else {
        setTimeRemaining(`${minutes}m`);
      }
    };

    updateTime();
    const interval = setInterval(updateTime, 60000); // Update every minute

    return () => clearInterval(interval);
  }, [tournament.start_time]);

  // Calculate progress percentage for participants
  const progressPercentage = Math.round(
    (tournament.current_participants / tournament.total_slots) * 100
  );

  // Format tournament format for display
  const formatTournamentFormat = (format) => {
    if (!format) return 'Single Elimination';
    return format.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const infoItems = [
    {
      label: 'Format',
      value: formatTournamentFormat(tournament.format),
      icon: Trophy,
      color: 'text-purple-600 dark:text-purple-400',
      bgColor: 'bg-purple-100 dark:bg-purple-900/20'
    },
    {
      label: 'Entry Fee',
      value: tournament.entry_fee === 0 ? 'Free' : `${formatCurrency(tournament.entry_fee,'USD')}`,
      icon: DollarSign,
      color: tournament.entry_fee === 0 ? 'text-green-600 dark:text-green-400' : 'text-yellow-600 dark:text-yellow-400',
      bgColor: tournament.entry_fee === 0 ? 'bg-green-100 dark:bg-green-900/20' : 'bg-yellow-100 dark:bg-yellow-900/20'
    },
    {
      label: 'Players',
      value: `${tournament.current_participants || 0}/${tournament.total_slots || 0}`,
      icon: Users,
      color: 'text-blue-600 dark:text-blue-400',
      bgColor: 'bg-blue-100 dark:bg-blue-900/20',
      progress: progressPercentage
    },
    {
      label: isLive ? 'Status' : 'Starts',
      value: isLive ? 'Live Now' : timeRemaining,
      icon: isLive ? CheckCircle : Calendar,
      color: isLive ? 'text-green-600 dark:text-green-400' : 'text-cyan-600 dark:text-cyan-400',
      bgColor: isLive ? 'bg-green-100 dark:bg-green-900/20' : 'bg-cyan-100 dark:bg-cyan-900/20'
    }
  ];

  return (
    <div className="hidden md:block border-t border-gray-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-6 py-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        {infoItems.map((item, index) => {
          const Icon = item.icon;
          return (
            <div key={index} className="group">
              <div className="flex items-center gap-3 mb-2">
                <div className={`p-2 rounded-lg ${item.bgColor} group-hover:scale-110 transition-transform duration-200`}>
                  <Icon className={`h-4 w-4 md:h-5 md:w-5 ${item.color}`} />
                </div>
                <span className="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wide">
                  {item.label}
                </span>
              </div>
              
              <div className="flex flex-col">
                <p className={`font-semibold text-gray-900 dark:text-white text-sm md:text-base ${
                  item.label === 'Starts' || item.label === 'Status' ? 'text-xs md:text-sm' : ''
                }`}>
                  {item.value}
                </p>
                
                {/* Progress bar for participants */}
                {item.progress !== undefined && (
                  <div className="mt-2">
                    <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
                      <span>{progressPercentage}% filled</span>
                      <span>{tournament.total_slots - tournament.current_participants} spots left</span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-neutral-700 rounded-full h-1.5">
                      <div 
                        className="bg-gradient-to-r from-blue-500 to-cyan-500 h-1.5 rounded-full transition-all duration-500 ease-out"
                        style={{ width: `${progressPercentage}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Detailed time for start time */}
                {item.label === 'Starts' && !isLive && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {formattedStartTime}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Additional tournament status information */}
      <div className="mt-6 pt-4 border-t border-gray-200 dark:border-neutral-300">
        <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${
                tournament.status === 'ongoing' 
                  ? 'bg-green-500 animate-pulse' 
                  : tournament.status === 'completed'
                  ? 'bg-gray-500'
                  : tournament.status === 'cancelled'
                  ? 'bg-red-500'
                  : 'bg-blue-500'
              }`} />
              <span className="text-sm text-gray-700 dark:text-gray-300 capitalize">
                {tournament.status?.charAt(0).toUpperCase() + tournament.status?.slice(1) || 'Upcoming'}
              </span>
            </div>
            
            {tournament.visibility && (
              <span className="text-gray-500 dark:text-gray-400 text-sm">
                {tournament.visibility === 'public' ? 'Public Tournament' : 'Private Tournament'}
              </span>
            )}
          </div>
          
          {tournament.prize_pool && tournament.prize_pool > 0 && (
            <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-medium">
              <TrendingUp className="h-4 w-4" />
              <span className="text-sm">{formatCurrency(tournament.prize_pool,'USD')} Prize Pool</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TournamentInfoGrid;