const DAY_IN_MS = 24 * 60 * 60 * 1000;

const parseDate = (value) => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const getLiveSortDate = (match) =>
  parseDate(match.live_at) || parseDate(match.created_at);

const getScheduledSortDate = (match) => parseDate(match.scheduled_time);

const getCompletedSortDate = (match) =>
  parseDate(match.resolved_at) ||
  parseDate(match.confirmed_at) ||
  parseDate(match.reported_at);

export const sortAndFilterMyMatches = (matches, statusKeys) => {
  if (!Array.isArray(matches)) return [];

  const liveStatus = statusKeys.LIVE;
  const scheduledStatus = statusKeys.SCHEDULED;
  const completedStatus = statusKeys.COMPLETED;

  const now = Date.now();
  const liveMatches = [];
  const scheduledMatches = [];
  const recentCompletedMatches = [];

  matches.forEach((match) => {
    if (match.status === liveStatus) {
      const sortDate = getLiveSortDate(match);
      if (!sortDate) return;
      liveMatches.push({ match, sortDate });
      return;
    }

    if (match.status === scheduledStatus) {
      const sortDate = getScheduledSortDate(match);
      if (!sortDate) return;
      scheduledMatches.push({ match, sortDate });
      return;
    }

    if (match.status === completedStatus) {
      const sortDate = getCompletedSortDate(match);
      if (!sortDate) return;
      if (now - sortDate.getTime() <= DAY_IN_MS) {
        recentCompletedMatches.push({ match, sortDate });
      }
    }
  });

  liveMatches.sort((a, b) => b.sortDate - a.sortDate);
  scheduledMatches.sort((a, b) => a.sortDate - b.sortDate);
  recentCompletedMatches.sort((a, b) => b.sortDate - a.sortDate);

  return [
    ...liveMatches.map((entry) => entry.match),
    ...scheduledMatches.map((entry) => entry.match),
    ...recentCompletedMatches.map((entry) => entry.match),
  ];
};
