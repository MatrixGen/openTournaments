import { useCallback, useEffect, useMemo, useState } from 'react';
import { tournamentService } from '../services/tournamentService';
import { userProfileService } from '../services/userProfileService';

const DEFAULT_FILTERS = {
  status: 'all',
  sort: 'newest',
  minPrice: '',
  maxPrice: '',
  search: '',
};

const buildFilters = ({ baseFilters, searchParams, tournamentType, resolvedUserId }) => {
  const initial = { ...DEFAULT_FILTERS, ...baseFilters };

  if (searchParams.has('status')) initial.status = searchParams.get('status');
  if (searchParams.has('sort')) initial.sort = searchParams.get('sort');
  if (searchParams.has('search')) initial.search = searchParams.get('search');
  if (searchParams.has('minPrice')) initial.minPrice = searchParams.get('minPrice');
  if (searchParams.has('maxPrice')) initial.maxPrice = searchParams.get('maxPrice');

  if (tournamentType !== 'all') {
    initial.type = tournamentType;
  }

  if (resolvedUserId) {
    initial.userId = resolvedUserId;
  }

  return initial;
};

const buildResetFilters = ({ baseFilters, tournamentType, resolvedUserId }) => {
  const reset = { ...DEFAULT_FILTERS, ...baseFilters };

  if (tournamentType !== 'all') {
    reset.type = tournamentType;
  }

  if (resolvedUserId) {
    reset.userId = resolvedUserId;
  }

  return reset;
};

export const useTournamentsQuery = ({
  customFilters,
  filters,
  tournamentType,
  resolvedUserId,
  maxTournaments,
  customApiEndpoint,
  searchParams,
  locationPathname,
}) => {
  const baseFilters = useMemo(
    () => customFilters || filters || {},
    [customFilters, filters]
  );

  const [filtersState, setFiltersState] = useState(() =>
    buildFilters({
      baseFilters,
      searchParams,
      tournamentType,
      resolvedUserId,
    })
  );
  const [tournaments, setTournaments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [responseCurrency, setResponseCurrency] = useState('TZS');

  const refresh = useCallback(async () => {
    try {
      setIsLoading(true);
      setError('');

      const params = {};
      Object.keys(filtersState).forEach((key) => {
        if (filtersState[key] && filtersState[key] !== '') {
          params[key] = filtersState[key];
        }
      });

      if (tournamentType !== 'all') {
        params.type = tournamentType;
      }

      if (maxTournaments) {
        params.limit = maxTournaments;
      }

      let data;
      if (customApiEndpoint) {
        data = await customApiEndpoint(params);
      } else if (resolvedUserId) {
        const response = await userProfileService.getUserTournaments(resolvedUserId, params);
        data = response?.data;
      } else {
        data = await tournamentService.getAll(params);
      }

      const tournamentsData = data?.tournaments || data || [];
      setTournaments(Array.isArray(tournamentsData) ? tournamentsData : []);
      if (data?.currency) {
        setResponseCurrency(data.currency);
      }
    } catch (err) {
      console.error('Tournaments loading error:', err);
      setError(
        err.response?.data?.message || err.message || 'Failed to load tournaments'
      );
      setTournaments([]);
    } finally {
      setIsLoading(false);
    }
  }, [customApiEndpoint, filtersState, maxTournaments, resolvedUserId, tournamentType]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    const nextParams = new URLSearchParams();
    Object.keys(filtersState).forEach((key) => {
      if (filtersState[key] && filtersState[key] !== '') {
        nextParams.set(key, filtersState[key]);
      }
    });
    const newUrl = `${locationPathname}?${nextParams.toString()}`;
    window.history.replaceState(null, '', newUrl);
  }, [filtersState, locationPathname]);

  const resetFilters = useCallback(() => {
    setFiltersState(
      buildResetFilters({ baseFilters, tournamentType, resolvedUserId })
    );
  }, [baseFilters, resolvedUserId, tournamentType]);

  return {
    filters: filtersState,
    setFilters: setFiltersState,
    resetFilters,
    tournaments,
    isLoading,
    error,
    responseCurrency,
    refresh,
    setError,
  };
};
