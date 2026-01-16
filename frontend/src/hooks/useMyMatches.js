import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { matchService } from '../services/matchService';
import { tournamentService } from '../services/tournamentService';

const getParticipantUserId = (participant) =>
  participant?.user?.id ?? participant?.user_id ?? participant?.userId ?? null;

export const useMyMatches = () => {
  const { user } = useAuth();
  const [matches, setMatches] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const userId = user?.id ?? user?.user_id ?? null;

  const refresh = useCallback(async () => {
    if (!userId) {
      setMatches([]);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError('');

      const tournamentsResponse = await tournamentService.getMyTournaments();
      const tournaments = tournamentsResponse?.tournaments || [];

      if (!tournaments.length) {
        setMatches([]);
        return;
      }

      const results = await Promise.allSettled(
        tournaments.map((tournament) =>
          matchService.getTournamentMatches(tournament.id)
        )
      );

      const combinedMatches = results.flatMap((result, index) => {
        if (result.status !== 'fulfilled') return [];
        const tournament = tournaments[index];
        return result.value.map((match) => ({
          ...match,
          tournament: {
            id: tournament.id,
            name: tournament.name,
          },
        }));
      });

      const userMatches = combinedMatches.filter((match) => {
        const participant1Id = getParticipantUserId(match.participant1);
        const participant2Id = getParticipantUserId(match.participant2);
        return participant1Id === userId || participant2Id === userId;
      });

      setMatches(userMatches);
    } catch (err) {
      console.error('Failed to load matches:', err);
      setError(err?.message || 'Failed to load matches');
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return useMemo(
    () => ({
      matches,
      isLoading,
      error,
      refresh,
      setError,
    }),
    [matches, isLoading, error, refresh]
  );
};
