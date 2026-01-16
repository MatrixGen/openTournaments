import { useCallback, useEffect, useState } from 'react';
import { tournamentService } from '../services/tournamentService';

export const useMyTournaments = (initialFilter = 'all') => {
  const [tournaments, setTournaments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [filter, setFilter] = useState(initialFilter);
  const [responseCurrency, setResponseCurrency] = useState('TZS');

  const getTournamentCurrency = useCallback(
    (tournament) => tournament?.currency || responseCurrency || 'TZS',
    [responseCurrency]
  );

  const refresh = useCallback(async () => {
    try {
      setIsLoading(true);
      const params = filter !== 'all' ? { status: filter } : {};
      const data = await tournamentService.getMyTournaments(params);
      setTournaments(data.tournaments || []);
      if (data?.currency) {
        setResponseCurrency(data.currency);
      }
    } catch (err) {
      console.error('Failed to load tournaments:', err);
      setError(err.response?.data?.message || 'Failed to load your tournaments');
    } finally {
      setIsLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return {
    tournaments,
    isLoading,
    error,
    success,
    setError,
    setSuccess,
    refresh,
    responseCurrency,
    filter,
    setFilter,
    getTournamentCurrency,
  };
};
