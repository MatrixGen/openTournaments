import { useCallback, useEffect, useState } from 'react';
import { dataService } from '../services/dataService';

export const useSupportedGames = () => {
  const [games, setGames] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const refresh = useCallback(async () => {
    try {
      setIsLoading(true);
      setError('');
      const data = await dataService.getGames();
      setGames(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to load games:', err);
      setError(err?.message || 'Failed to load games');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { games, isLoading, error, refresh };
};
