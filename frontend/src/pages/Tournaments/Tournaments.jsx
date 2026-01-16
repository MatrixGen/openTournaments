import React, { useCallback, useMemo, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Filter, Search } from "lucide-react";
import Banner from "../../components/common/Banner";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import TournamentsResults from "../../components/tournament/TournamentsResults";
import MobileFilterDrawer from "../../components/tournament/MobileFilterDrawer";
import { MobileFAB } from "../../components/tournament/MobileFAB";
import { useTournamentsQuery } from "../../hooks/useTournamentsQuery";
import { cn } from "../../utils/cn";

export default function Tournaments(props) {
  const {
    customFilters = null,
    filters = null,
    showCreateButton = true,
    showFilters = true,
    showSearch = true,
    tournamentType = "all",
    userId = null,
    maxTournaments = null,
    emptyStateMessage = "No tournaments found",
    emptyStateAction = null,
    onTournamentClick = null,
    customApiEndpoint = null,
    hideHeader = false,
    layout = "grid",
    compact = false,
  } = props;
  const location = useLocation();
  const navigate = useNavigate();
  const filterButtonRef = useRef(null);
  const [showMobileFilters, setShowMobileFilters] = useState(false);

  const resolvedUserId = userId ?? location.state?.userId;
  const searchParams = useMemo(
    () => new URLSearchParams(location.search),
    [location.search]
  );

  const {
    filters: queryFilters,
    setFilters,
    resetFilters,
    tournaments,
    isLoading,
    error,
    setError,
    responseCurrency,
    refresh,
  } = useTournamentsQuery({
    customFilters,
    filters,
    tournamentType,
    resolvedUserId,
    maxTournaments,
    customApiEndpoint,
    searchParams,
    locationPathname: location.pathname,
  });

  const handleFilterChange = useCallback(
    (key, value) => {
      setFilters((prev) => ({ ...prev, [key]: value }));
    },
    [setFilters]
  );

  const handleTournamentClick = useCallback(
    (tournament) => {
      if (onTournamentClick) {
        onTournamentClick(tournament);
      } else {
        navigate(`/tournaments/${tournament.id}`);
      }
    },
    [navigate, onTournamentClick]
  );

  return (
    <div
      className={cn(
        "min-h-screen bg-gray-50 dark:bg-neutral-900 safe-padding",
        compact && "py-2"
      )}
    >
      {showFilters && (
        <MobileFilterDrawer
          isOpen={showMobileFilters}
          onClose={() => setShowMobileFilters(false)}
          filters={queryFilters}
          onFilterChange={handleFilterChange}
          onReset={resetFilters}
          showTypeFilter={tournamentType === "all"}
          anchorRef={filterButtonRef}
        />
      )}

      {showCreateButton && !hideHeader && <MobileFAB />}

      <main
        className={cn(
          "mx-auto py-4 md:py-8 px-3 sm:px-4 lg:px-8",
          compact && "py-2 px-2 sm:px-3",
          maxTournaments && "max-w-5xl"
        )}
      >
        {(showSearch || showFilters) && (
          <div
            className={cn(
              "flex items-center gap-3 mb-4",
              !showSearch && "justify-end"
            )}
          >
            {showSearch && (
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search tournaments..."
                  value={queryFilters.search || ""}
                  onChange={(e) => handleFilterChange("search", e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-white dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 rounded-lg text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
            )}
            {showFilters && (
              <button
                ref={filterButtonRef}
                onClick={() => setShowMobileFilters(true)}
                className="p-2 bg-white dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 rounded-lg"
                aria-label="Open filters"
              >
                <Filter className="h-5 w-5 text-gray-600 dark:text-gray-400" />
              </button>
            )}
          </div>
        )}

        {error && (
          <Banner
            type="error"
            title="Failed to Load Tournaments"
            message={error}
            onClose={() => setError("")}
            action={{
              text: "Try Again",
              onClick: refresh,
            }}
            className="mb-6"
          />
        )}

        {isLoading ? (
          <LoadingSpinner />
        ) : tournaments.length > 0 ? (
          <TournamentsResults
            tournaments={tournaments}
            responseCurrency={responseCurrency}
            onTournamentClick={handleTournamentClick}
            compact={compact}
            layout={layout}
          />
        ) : (
          <div className="text-center py-12 md:py-16 bg-white dark:bg-neutral-800 rounded-xl border border-gray-200 dark:border-neutral-700">
            <h3 className="text-lg md:text-xl font-medium text-gray-900 dark:text-white mb-2">
              {emptyStateMessage}
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-md mx-auto px-4 text-sm md:text-base">
              There are no tournaments matching your criteria.
            </p>
            {emptyStateAction ? (
              <button
                onClick={emptyStateAction.onClick}
                className="inline-flex items-center justify-center bg-primary-500 hover:bg-primary-600 text-white font-medium py-2.5 px-4 rounded-lg text-sm md:text-base"
              >
                {emptyStateAction.icon}
                <span>{emptyStateAction.label}</span>
              </button>
            ) : tournamentType === "all" && showCreateButton ? (
              <Link
                to="/create-tournament"
                className="inline-flex items-center justify-center bg-primary-500 hover:bg-primary-600 text-white font-medium py-2.5 px-4 rounded-lg text-sm md:text-base"
              >
                Create Tournament
              </Link>
            ) : null}
          </div>
        )}

        {!hideHeader && <div className="h-16 md:h-0"></div>}
      </main>
    </div>
  );
}
