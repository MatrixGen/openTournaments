export const MATCH_STATUS_KEYS = {
  LIVE: 'live',
  SCHEDULED: 'scheduled',
  COMPLETED: 'completed',
  DISPUTED: 'disputed',
  AWAITING_CONFIRMATION: 'awaiting_confirmation',
  FORFEITED: 'forfeited',
  NO_CONTEST: 'no_contest',
  EXPIRED: 'expired',
};

export const MATCH_STATUS_UI = {
  scheduled: {
    label: 'Scheduled',
    badgeClass: 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300',
    dotClass: 'bg-blue-500',
  },
  live: {
    label: 'LIVE',
    badgeClass: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-200',
    dotClass: 'bg-purple-500',
  },
  completed: {
    label: 'Completed',
    badgeClass: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300',
    dotClass: 'bg-emerald-500',
  },
  disputed: {
    label: 'Disputed',
    badgeClass: 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-300',
    dotClass: 'bg-red-500',
  },
  awaiting_confirmation: {
    label: 'Awaiting Confirmation',
    badgeClass: 'bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-300',
    dotClass: 'bg-amber-500',
  },
  forfeited: {
    label: 'Forfeited',
    badgeClass: 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-300',
    dotClass: 'bg-red-500',
  },
  no_contest: {
    label: 'No Contest',
    badgeClass: 'bg-gray-100 text-gray-700 dark:bg-neutral-700 dark:text-gray-300',
    dotClass: 'bg-gray-500',
  },
  expired: {
    label: 'Expired',
    badgeClass: 'bg-gray-100 text-gray-700 dark:bg-neutral-700 dark:text-gray-300',
    dotClass: 'bg-gray-500',
  },
};
