import { useCallback, useState } from "react";
import { transactionService } from "../../services/transactionService";

export const useTransactionStats = (period) => {
  const [stats, setStats] = useState(null);

  const fetchStats = useCallback(async () => {
    try {
      const statsResponse = await transactionService.getTransactionStats({
        period,
      });
      if (statsResponse.success) {
        setStats(statsResponse.data);
      }
    } catch {
      // Silent to avoid UI noise.
    }
  }, [period]);

  return { stats, fetchStats, setStats };
};
