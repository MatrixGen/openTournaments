import { useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';

export const useMatchPermissions = (match) => {
  const { user } = useAuth();

  return useMemo(() => {
    const participant1Id =
      match?.participant1?.user_id ?? match?.participant1?.user?.id;
    const participant2Id =
      match?.participant2?.user_id ?? match?.participant2?.user?.id;
    const reportedById =
      match?.reported_by_user_id ??
      match?.reported_by_user?.id ??
      match?.reported_by?.id;

    const isPlayer1 = user && participant1Id === user.id;
    const isPlayer2 = user && participant2Id === user.id;
    const isParticipant = isPlayer1 || isPlayer2;
    const isReporter = user && reportedById === user.id;

    const canReport = isParticipant && match?.status === 'scheduled';
    const canConfirm = isParticipant && match?.status === 'awaiting_confirmation' && !isReporter;
    const canDispute = isParticipant && match?.status === 'awaiting_confirmation' && !isReporter;

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
