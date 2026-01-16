import { Trophy, Users, Zap, Award, Calendar } from 'lucide-react';

export const TOURNAMENT_FILTERS = [
  { id: 'all', label: 'All', icon: Trophy },
  { id: 'open', label: 'Open', icon: Users },
  { id: 'live', label: 'Live', icon: Zap },
  { id: 'completed', label: 'Completed', icon: Award },
  { id: 'cancelled', label: 'Cancelled', icon: Calendar },
];

export const STATUS_BADGE_CLASSES = {
  completed: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  live: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  open: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
  cancelled: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400',
  default: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400',
};
