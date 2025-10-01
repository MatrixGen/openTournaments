import { useState, useCallback } from 'react';
import { matchService } from '../services/matchService';

export const useMatchActions = (match, onUpdate) => {
  const [isReporting, setIsReporting] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [isDisputing, setIsDisputing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleReportScore = useCallback(async (scoreData) => {
    setIsReporting(true);
    setError('');

    try {
      await matchService.reportScore(match.id, scoreData);
      setSuccess('Score reported successfully. Waiting for opponent confirmation.');
      onUpdate();
      return true;
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to report score. Please try again.');
      return false;
    } finally {
      setIsReporting(false);
    }
  }, [match.id, onUpdate]);

  const handleConfirmScore = useCallback(async () => {
    setIsConfirming(true);
    setError('');

    try {
      await matchService.confirmScore(match.id);
      setSuccess('Score confirmed successfully. Match completed.');
      onUpdate();
      return true;
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to confirm score. Please try again.');
      return false;
    } finally {
      setIsConfirming(false);
    }
  }, [match.id, onUpdate]);

  const handleDispute = useCallback(async (disputeData) => {
    setIsDisputing(true);
    setError('');

    try {
      await matchService.dispute(match.id, disputeData);
      setSuccess('Dispute raised successfully. Admins will review it.');
      onUpdate();
      return true;
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to raise dispute. Please try again.');
      return false;
    } finally {
      setIsDisputing(false);
    }
  }, [match.id, onUpdate]);

  const clearMessages = useCallback(() => {
    setError('');
    setSuccess('');
  }, []);

  return {
    isReporting,
    isConfirming,
    isDisputing,
    error,
    success,
    handleReportScore,
    handleConfirmScore,
    handleDispute,
    clearMessages,
    setError,
    setSuccess
  };
};