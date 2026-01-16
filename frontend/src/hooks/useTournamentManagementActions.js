import { useCallback, useState } from 'react';
import { tournamentService } from '../services/tournamentService';

export const useTournamentManagementActions = ({
  confirm,
  refresh,
  setError,
  setSuccess,
}) => {
  const [actionLoading, setActionLoading] = useState(null);

  const handleManagementAction = useCallback(
    async (actionType, tournamentId, tournamentName) => {
      setActionLoading(`${actionType}-${tournamentId}`);
      setError('');
      setSuccess('');

      try {
        const actions = {
          cancel: {
            message: `Are you sure you want to cancel "${tournamentName}"? This action cannot be undone.`,
            service: () => tournamentService.cancel(tournamentId),
          },
          start: {
            message: `Start tournament "${tournamentName}"? Participants will be notified.`,
            service: () => tournamentService.start(tournamentId),
          },
          finalize: {
            message: `Finalize results for "${tournamentName}"? This will distribute prizes and close the tournament.`,
            service: () => tournamentService.finalize(tournamentId),
          },
        };

        const action = actions[actionType];
        if (!action) return;

        const confirmed = await confirm({
          title: 'Confirm Action',
          message: action.message,
          confirmText: 'Yes, proceed',
          cancelText: 'No, cancel',
        });

        if (!confirmed) {
          setActionLoading(null);
          return;
        }

        const response = await action.service();
        setSuccess(response.message || `Tournament ${actionType}ed successfully`);
        await refresh();
      } catch (err) {
        console.error(`Failed to ${actionType} tournament:`, err);
        setError(
          err.response?.data?.message ||
            `Failed to ${actionType} tournament. Please try again.`
        );
      } finally {
        setActionLoading(null);
      }
    },
    [confirm, refresh, setError, setSuccess]
  );

  return { actionLoading, handleManagementAction };
};
