import { useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';

export const useMatchPermissions = (match) => {
  const { user } = useAuth();

  return useMemo(() => {
    const isPlayer1 = user && match.participant1?.user_id === user.id;
    const isPlayer2 = user && match.participant2?.user_id === user.id;
    const isParticipant = isPlayer1 || isPlayer2;
    const isReporter = user && match.reported_by_user_id === user.id;

    const canReport = isParticipant && match.status === 'scheduled';
    const canConfirm = isParticipant && match.status === 'awaiting_confirmation' && !isReporter;
    const canDispute = isParticipant && match.status === 'awaiting_confirmation' && !isReporter;

    return {
      isPlayer1,
      isPlayer2,
      isParticipant,
      isReporter,
      canReport,
      canConfirm,
      canDispute
    };
  }, [user, match]);
};