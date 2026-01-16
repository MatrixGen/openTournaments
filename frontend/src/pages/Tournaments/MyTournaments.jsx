import { useCallback, useMemo, useRef, useState } from 'react';

import { MobileFAB } from '../../components/tournament/MobileFAB';
import MyArenaTournamentsRow from '../../components/tournament/MyArenaTournamentsRow';
import MyArenaMatchesList from '../../components/matches/MyArenaMatchesList';
import MyTournamentsFilterDrawer from '../../components/tournament/MyTournamentsFilterDrawer';
import SupportedGamesRow from '../../components/tournament/SupportedGamesRow';
import { useMyMatches } from '../../hooks/useMyMatches';
import { useMyTournaments } from '../../hooks/useMyTournaments';
import { useSupportedGames } from '../../hooks/useSupportedGames';

const buildFilterStats = (list) => ({
  total: list.length,
  open: list.filter((t) => t.status === 'open').length,
  live: list.filter((t) => t.status === 'live').length,
  completed: list.filter((t) => t.status === 'completed').length,
  cancelled: list.filter((t) => t.status === 'cancelled').length,
});

export default function MyTournaments() {
  const [showFilters, setShowFilters] = useState(false);
  const filterButtonRef = useRef(null);

  const {
    tournaments,
    isLoading: tournamentsLoading,
    error: tournamentsError,
    refresh: refreshTournaments,
    filter,
    setFilter,
    getTournamentCurrency,
  } = useMyTournaments('all');

  const {
    games,
    isLoading: gamesLoading,
    refresh: refreshGames,
  } = useSupportedGames();

  const {
    matches,
    isLoading: matchesLoading,
    error: matchesError,
    refresh: refreshMatches,
  } = useMyMatches();

  const filterStats = useMemo(() => {
    if (filter !== 'all') {
      return null;
    }
    return buildFilterStats(tournaments);
  }, [filter, tournaments]);

  const handleOpenFilters = useCallback(() => setShowFilters(true), []);
  const handleCloseFilters = useCallback(() => setShowFilters(false), []);
  const handleRefresh = useCallback(() => {
    refreshGames();
    refreshTournaments();
    refreshMatches();
  }, [refreshGames, refreshMatches, refreshTournaments]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-neutral-900 safe-padding">
      <MyTournamentsFilterDrawer
        isOpen={showFilters}
        onClose={handleCloseFilters}
        filter={filter}
        setFilter={setFilter}
        stats={filterStats}
        showCounts={Boolean(filterStats)}
        anchorRef={filterButtonRef}
      />
      <MobileFAB />

      <main className="mx-auto max-w-7xl py-4 md:py-8 px-3 sm:px-4 lg:px-8">
        <div className="mb-4">
          <h1 className="text-lg font-semibold text-gray-900 dark:text-white">
            My Arena
          </h1>
        </div>

        <SupportedGamesRow
          games={games}
          isLoading={gamesLoading}
          onRefresh={handleRefresh}
          onOpenFilters={handleOpenFilters}
          filterButtonRef={filterButtonRef}
        />

        <MyArenaTournamentsRow
          tournaments={tournaments}
          isLoading={tournamentsLoading}
          error={tournamentsError}
          onRetry={refreshTournaments}
          getTournamentCurrency={getTournamentCurrency}
        />

        <MyArenaMatchesList
          matches={matches}
          isLoading={matchesLoading}
          error={matchesError}
          onRetry={refreshMatches}
        />
      </main>

      <div className="h-16 md:h-0"></div>
    </div>
  );
}
