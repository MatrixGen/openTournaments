import { useCallback } from 'react';
import { formatMoney } from '../utils/formatters';

export const useTournamentShare = ({ getTournamentCurrency } = {}) => {
  const copyToClipboard = useCallback(async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      if (window.showToast) {
        window.showToast('Share link copied to clipboard!', 'success');
      }
    } catch (error) {
      console.error('Copy failed:', error);
      const textArea = document.createElement('textarea');
      textArea.value = text;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      if (window.showToast) {
        window.showToast('Link copied!', 'success');
      }
    }
  }, []);

  const shareTournament = useCallback(
    async (tournament) => {
      const shareUrl = `${window.location.origin}/tournaments/${tournament.id}`;
      const currency = getTournamentCurrency
        ? getTournamentCurrency(tournament)
        : tournament?.currency;
      const shareText = `Join ${tournament.name} - ${formatMoney(
        tournament.entry_fee || 0,
        currency
      )} entry fee, ${tournament.total_slots} slots available!`;

      if (navigator.share) {
        try {
          await navigator.share({
            title: tournament.name,
            text: shareText,
            url: shareUrl,
          });
          if (window.showToast) {
            window.showToast('Tournament shared successfully!', 'success');
          }
          return;
        } catch (error) {
          if (error.name !== 'AbortError') {
            console.error('Share error:', error);
          }
        }
      }

      await copyToClipboard(shareUrl);
    },
    [copyToClipboard, getTournamentCurrency]
  );

  return { shareTournament, copyToClipboard };
};
