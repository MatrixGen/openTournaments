import { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  EyeIcon, 
  ClockIcon, 
  UserGroupIcon, 
  CalendarIcon, 
  CheckCircleIcon, 
  TrophyIcon, 
  DocumentDuplicateIcon,
  HashtagIcon,
  ArrowPathIcon,
  LockClosedIcon,
  LockOpenIcon,
  CalendarDaysIcon
} from '@heroicons/react/24/outline';
import { formatMoney } from '../../utils/formatters';

const TournamentInfoSidebar = ({ tournament }) => {
  const [timeSinceCreation, setTimeSinceCreation] = useState('');
  const [timeSinceUpdate, setTimeSinceUpdate] = useState('');
  const tournamentCurrency = tournament?.currency || 'TZS';

  // Format date for display
  const formatDate = useCallback((dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    });
  }, []);

  // Format time for display
  const formatTime = useCallback((dateString) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  }, []);

  // Calculate relative time
  const calculateRelativeTime = useCallback((dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    
    const minutes = Math.floor(diffTime / (1000 * 60));
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    const weeks = Math.floor(days / 7);
    const months = Math.floor(days / 30);
    const years = Math.floor(days / 365);

    if (years > 0) return `${years} year${years > 1 ? 's' : ''} ago`;
    if (months > 0) return `${months} month${months > 1 ? 's' : ''} ago`;
    if (weeks > 0) return `${weeks} week${weeks > 1 ? 's' : ''} ago`;
    if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`;
    if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    if (minutes > 0) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    return 'Just now';
  }, []);

  // Update relative times
  useEffect(() => {
    const updateTimes = () => {
      if (tournament.created_at) {
        setTimeSinceCreation(calculateRelativeTime(tournament.created_at));
      }
      if (tournament.updated_at) {
        setTimeSinceUpdate(calculateRelativeTime(tournament.updated_at));
      }
    };

    updateTimes();
    const interval = setInterval(updateTimes, 60000); // Update every minute
    return () => clearInterval(interval);
  }, [tournament.created_at, tournament.updated_at, calculateRelativeTime]);

  // Format tournament format for display
  const formatTournamentFormat = useCallback((format) => {
    if (!format) return 'Single Elimination';
    return format
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }, []);

  // Get status color and icon
  const getStatusConfig = useCallback((status) => {
    const configs = {
      scheduled: { 
        color: 'text-blue-600 dark:text-blue-400', 
        bg: 'bg-blue-100 dark:bg-blue-900/20',
        icon: ClockIcon 
      },
      locked: { 
        color: 'text-yellow-600 dark:text-yellow-400', 
        bg: 'bg-yellow-100 dark:bg-yellow-900/20',
        icon: LockClosedIcon 
      },
      live: { 
        color: 'text-green-600 dark:text-green-400', 
        bg: 'bg-green-100 dark:bg-green-900/20', 
        icon: PlayIcon || ClockIcon 
      },
      completed: { 
        color: 'text-purple-600 dark:text-purple-400', 
        bg: 'bg-purple-100 dark:bg-purple-900/20', 
        icon: TrophyIcon 
      },
      cancelled: { 
        color: 'text-red-600 dark:text-red-400', 
        bg: 'bg-red-100 dark:bg-red-900/20', 
        icon: XCircleIcon || ClockIcon 
      }
    };
    return configs[status] || { 
      color: 'text-gray-600 dark:text-gray-400', 
      bg: 'bg-gray-100 dark:bg-gray-800', 
      icon: ClockIcon 
    };
  }, []);

  // Touch device detection for mobile optimizations
  const isTouchDevice = useMemo(() => 
    'ontouchstart' in window || navigator.maxTouchPoints > 0,
    []
  );

  // Calculate fill percentage with memoization
  const fillPercentage = useMemo(() => {
    if (!tournament.total_slots || tournament.total_slots === 0) return 0;
    return Math.round((tournament.current_slots / tournament.total_slots) * 100);
  }, [tournament.current_slots, tournament.total_slots]);

  // Progress bar color based on fill percentage
  const progressBarColor = useMemo(() => {
    if (fillPercentage >= 90) return 'bg-green-500 dark:bg-green-400';
    if (fillPercentage >= 50) return 'bg-yellow-500 dark:bg-yellow-400';
    return 'bg-blue-500 dark:bg-blue-400';
  }, [fillPercentage]);

  // Info items with memoization
  const infoItems = useMemo(() => {
    const StatusIcon = getStatusConfig(tournament.status).icon;
    
    return [
      {
        label: 'Visibility',
        value: tournament.visibility === 'public' ? 'Public' : 'Private',
        icon: tournament.visibility === 'public' ? LockOpenIcon : LockClosedIcon,
        color: tournament.visibility === 'public' 
          ? 'text-green-600 dark:text-green-400' 
          : 'text-orange-600 dark:text-orange-400',
      },
      {
        label: 'Status',
        value: tournament.status.charAt(0).toUpperCase() + tournament.status.slice(1),
        icon: StatusIcon,
        color: getStatusConfig(tournament.status).color,
      },
      {
        label: 'Created',
        value: tournament.created_at ? formatDate(tournament.created_at) : 'N/A',
        subtext: timeSinceCreation || 'Calculating...',
        icon: CalendarIcon,
        color: 'text-gray-600 dark:text-gray-400',
      },
      {
        label: 'Participants',
        value: `${tournament.current_slots} / ${tournament.total_slots}`,
        subtext: `${fillPercentage}% filled`,
        icon: UserGroupIcon,
        color: 'text-blue-600 dark:text-blue-400',
        progress: true,
      },
      ...(tournament.updated_at ? [{
        label: 'Last Updated',
        value: formatDate(tournament.updated_at),
        subtext: `${timeSinceUpdate} • ${formatTime(tournament.updated_at)}`,
        icon: ArrowPathIcon,
        color: 'text-gray-600 dark:text-gray-400',
      }] : []),
      {
        label: 'Tournament ID',
        value: `#${tournament.id}`,
        icon: HashtagIcon,
        color: 'text-gray-600 dark:text-gray-400',
      },
      {
        label: 'Format',
        value: formatTournamentFormat(tournament.format),
        icon: CalendarDaysIcon,
        color: 'text-purple-600 dark:text-purple-400',
      },
      ...(tournament.prize_pool ? [{
        label: 'Prize Pool',
        value: `${tournament.prize_pool > 0
          ? formatMoney(tournament.prize_pool, tournamentCurrency)
          : 'free'}`,
        icon: TrophyIcon,
        color: 'text-yellow-600 dark:text-yellow-400',
      }] : []),
    ];
  }, [
    tournament, 
    formatDate, 
    formatTime, 
    formatTournamentFormat, 
    timeSinceCreation, 
    timeSinceUpdate, 
    getStatusConfig, 
    fillPercentage
  ]);

  // Handle copy to clipboard
  const handleCopyInviteCode = useCallback(async () => {
    if (!tournament.invite_code) return;
    
    try {
      await navigator.clipboard.writeText(tournament.invite_code);
      
      // Show feedback (you could replace this with a toast notification)
      const button = document.querySelector('[data-copy-button]');
      if (button) {
        const originalText = button.textContent;
        button.textContent = 'Copied!';
        button.classList.add('text-green-600', 'dark:text-green-400');
        
        setTimeout(() => {
          button.textContent = originalText;
          button.classList.remove('text-green-600', 'dark:text-green-400');
        }, 2000);
      }
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  }, [tournament.invite_code]);

  return (
    <div className="bg-white dark:bg-neutral-800 rounded-xl shadow-sm border border-gray-200 dark:border-neutral-700 p-4 sm:p-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4 sm:mb-6">
        <div className="bg-gray-100 dark:bg-neutral-700 p-2 rounded-lg">
          <EyeIcon className="h-5 w-5 text-gray-700 dark:text-gray-300" />
        </div>
        <div>
          <h2 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-gray-900 dark:text-white">
            Tournament Details
          </h2>
          <p className="text-gray-600 dark:text-gray-400 text-sm mt-0.5">
            Key information and statistics
          </p>
        </div>
      </div>
      
      {/* Info Grid - Responsive layout */}
      <div className="space-y-3 sm:space-y-4">
        {infoItems.map((item, index) => {
          const Icon = item.icon;
          const isLast = index === infoItems.length - 1;
          
          return (
            <div 
              key={item.label} 
              className={`pb-3 sm:pb-4 ${
                isLast 
                  ? '' 
                  : 'border-b border-gray-100 dark:border-neutral-700'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className={`p-2 rounded-lg ${item.color.replace('text-', 'bg-').replace('600', '100').replace('400', '900/20')}`}>
                  <Icon className={`h-4 w-4 ${item.color}`} />
                </div>
                
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">
                    {item.label}
                  </p>
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-900 dark:text-white truncate">
                    {item.value}
                  </p>
                  
                  {item.subtext && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      {item.subtext}
                    </p>
                  )}
                  
                  {/* Progress bar for participants */}
                  {item.progress && (
                    <div className="mt-2">
                      <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
                        <span>Progress</span>
                        <span>{fillPercentage}%</span>
                      </div>
                      <div className="h-1.5 bg-gray-200 dark:bg-neutral-700 rounded-full overflow-hidden">
                        <div 
                          className={`h-full ${progressBarColor} transition-all duration-300`}
                          style={{ width: `${Math.min(fillPercentage, 100)}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Invite Code Section */}
      {tournament.invite_code && (
        <div className="mt-6 p-4 bg-gray-50 dark:bg-neutral-700/30 rounded-lg border border-gray-200 dark:border-neutral-600">
          <div className="flex items-center gap-2 mb-2">
            <DocumentDuplicateIcon className="h-4 w-4 text-gray-500 dark:text-gray-400" />
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Invite Code
            </p>
          </div>
          
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <p className="font-mono text-sm text-gray-900 dark:text-gray-900 dark:text-white truncate bg-gray-100 dark:bg-neutral-800 px-3 py-2 rounded border border-gray-300 dark:border-neutral-600">
                {tournament.banner_url}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Share this code to invite participants
              </p>
            </div>
            
            <button
              data-copy-button
              onClick={handleCopyInviteCode}
              className={`ml-3 text-sm font-medium px-3 py-2 rounded-lg border transition-colors ${
                isTouchDevice ? 'active:scale-95' : ''
              } bg-white dark:bg-neutral-800 border-gray-300 dark:border-neutral-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-neutral-700`}
              aria-label="Copy invite code"
            >
              Copy
            </button>
          </div>
        </div>
      )}

      {/* Quick Stats for Mobile */}
      {isTouchDevice && (
        <div className="mt-6 grid grid-cols-2 gap-3">
          <div className="bg-gray-50 dark:bg-neutral-700/30 p-3 rounded-lg border border-gray-200 dark:border-neutral-600">
            <p className="text-xs text-gray-500 dark:text-gray-400">Entry Fee</p>
            <p className="text-sm font-semibold text-gray-900 dark:text-gray-900 dark:text-white">
              {formatMoney(tournament.entry_fee || 0, tournamentCurrency)}
            </p>
          </div>
          <div className="bg-gray-50 dark:bg-neutral-700/30 p-3 rounded-lg border border-gray-200 dark:border-neutral-600">
            <p className="text-xs text-gray-500 dark:text-gray-400">Remaining</p>
            <p className="text-sm font-semibold text-gray-900 dark:text-gray-900 dark:text-white">
              {Math.max(0, tournament.total_slots - tournament.current_slots)} slots
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default TournamentInfoSidebar;

// Fallback icon component if PlayIcon or XCircleIcon are not available
const PlayIcon = ({ className }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const XCircleIcon = ({ className }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);
