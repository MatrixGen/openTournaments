import { Link } from 'react-router-dom';
import { formatMoney } from '../../utils/formatters';
import { Share2, Check, Copy } from 'lucide-react'; // You can use any icon library
import { useState } from 'react';

const TournamentInfoCard = ({ tournament, actionLoading, onAction, responseCurrency }) => {
  const [shareState, setShareState] = useState({
    copied: false,
    generating: false,
    error: null
  });
  const tournamentCurrency = tournament?.currency || responseCurrency || 'TZS';

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'open': return 'bg-blue-500/20 text-blue-300 border border-blue-500/30';
      case 'live': return 'bg-green-500/20 text-green-300 border border-green-500/30';
      case 'completed': return 'bg-purple-500/20 text-purple-300 border border-purple-500/30';
      case 'cancelled': return 'bg-red-500/20 text-red-300 border border-red-500/30';
      default: return 'bg-gray-500/20 text-gray-300 border border-gray-500/30';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'open': return '🔵';
      case 'live': return '🟢';
      case 'completed': return '🟣';
      case 'cancelled': return '🔴';
      default: return '⚪';
    }
  };

  const canStartTournament = (tournament) => {
    return tournament.current_slots >= 2 && tournament.status === 'open';
  };

  const canFinalizeTournament = (tournament) => {
    return tournament.status === 'live' && tournament.current_slots >= 2;
  };

  const canCancelTournament = (tournament) => {
    return tournament.status === 'open';
  };

  const canEditTournament = (tournament) => {
    return tournament.status === 'open' && tournament.current_slots === 0;
  };

  const canShareTournament = (tournament) => {
    // Tournament can be shared if it's not cancelled
    return tournament.status !== 'cancelled';
  };

  const isActionLoading = (actionType, tournamentId) => {
    return actionLoading === `${actionType}-${tournamentId}`;
  };

  const getTimeRemaining = (startTime) => {
    const now = new Date();
    const start = new Date(startTime);
    const diff = start - now;

    if (diff <= 0) return 'Started';

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

    if (days > 0) return `In ${days}d ${hours}h`;
    if (hours > 0) return `In ${hours}h`;
    return 'Soon';
  };

  const handleShareClick = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    try {
      setShareState({ copied: false, generating: true, error: null });
      
      // Option 1: Generate share link via API
      const response = await fetch(`/api/tournaments/${tournament.id}/share-link`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      const data = await response.json();
      
      if (data.success) {
        const shareUrl = data.data.share_url || data.data.short_url;
        
        // Copy to clipboard
        await navigator.clipboard.writeText(shareUrl);
        
        setShareState({ copied: true, generating: false, error: null });
        
        // Reset copied state after 3 seconds
        setTimeout(() => {
          setShareState({ copied: false, generating: false, error: null });
        }, 3000);
        
        // Optional: Show toast notification
        if (window.showToast) {
          window.showToast('Share link copied to clipboard!', 'success');
        }
      } else {
        throw new Error(data.message || 'Failed to generate share link');
      }
    } catch (error) {
      console.error('Share error:', error);
      setShareState({ 
        copied: false, 
        generating: false, 
        error: error.message 
      });
      
      // Fallback: Use direct URL if API fails
      try {
        const fallbackUrl = `${window.location.origin}/tournament/${tournament.id}/share`;
        await navigator.clipboard.writeText(fallbackUrl);
        setShareState({ copied: true, generating: false, error: null });
        
        setTimeout(() => {
          setShareState({ copied: false, generating: false, error: null });
        }, 3000);
      } catch  {
        setShareState({ 
          copied: false, 
          generating: false, 
          error: 'Failed to copy link' 
        });
      }
    }
  };
  
  const handleSocialShare = (platform) => {
    const shareUrl = `${window.location.origin}/tournament/${tournament.id}/share`;
    const shareText = `Join ${tournament.name} - ${formatMoney(
      tournament.entry_fee,
      tournamentCurrency
    )} entry fee, ${tournament.total_slots} slots!`;
    
    let shareLink = '';
    
    switch (platform) {
      case 'facebook':
        shareLink = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}&quote=${encodeURIComponent(shareText)}`;
        break;
      case 'twitter':
        shareLink = `https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareText)}`;
        break;
      case 'whatsapp':
        shareLink = `https://wa.me/?text=${encodeURIComponent(shareText + ' ' + shareUrl)}`;
        break;
      case 'telegram':
        shareLink = `https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareText)}`;
        break;
      default:
        return;
    }
    
    window.open(shareLink, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="bg-neutral-800 rounded-lg shadow-lg hover:shadow-xl transition-shadow border border-neutral-700">
      {/* Tournament Header */}
      <div className="p-4 sm:p-6 border-b border-neutral-700">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center space-x-3 min-w-0 flex-1">
            <img
              src={tournament.game?.logo_url || '/default-game.png'}
              alt={tournament.game?.name}
              className="h-8 w-8 sm:h-10 sm:w-10 rounded-md flex-shrink-0"
            />
            <div className="min-w-0 flex-1">
              <h3 className="font-semibold text-gray-900 dark:text-white text-base sm:text-lg truncate">
                {tournament.name}
              </h3>
              <p className="text-gray-400 text-xs sm:text-sm truncate">
                {tournament.game?.name}
              </p>
            </div>
          </div>
          <span className={`inline-flex items-center px-2 py-1 sm:px-3 sm:py-1 rounded-full text-xs font-medium ml-2 flex-shrink-0 ${getStatusBadgeClass(tournament.status)}`}>
            <span className="hidden sm:inline mr-1">{getStatusIcon(tournament.status)}</span>
            {tournament.status}
          </span>
        </div>

        {/* Tournament Info */}
        <div className="grid grid-cols-2 gap-3 sm:gap-4 text-xs sm:text-sm">
          <div>
            <span className="text-gray-400">Participants:</span>
            <div className="text-gray-900 dark:text-white font-medium">
              {tournament.current_slots}/{tournament.total_slots}
            </div>
          </div>
          <div>
            <span className="text-gray-400">Entry Fee:</span>
            <div className="text-gray-900 dark:text-white font-medium">
              {tournament.entry_fee > 0
                ? formatMoney(tournament.entry_fee, tournamentCurrency)
                : 'free'}
            </div>
          </div>
          <div>
            <span className="text-gray-400">Prize Pool:</span>
            <div className="text-yellow-400 font-medium">
              {formatMoney(
                tournament.entry_fee * tournament.total_slots,
                tournamentCurrency
              )}
            </div>
          </div>
          <div>
            <span className="text-gray-400">Starts:</span>
            <div className="text-gray-900 dark:text-white font-medium text-xs">
              {getTimeRemaining(tournament.start_time)}
            </div>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="p-3 sm:p-4">
        <div className="flex flex-wrap gap-2">
          <Link
            to={`/tournaments/${tournament.id}`}
            className="flex-1 border border-neutral-600 text-neutral-200 hover:bg-neutral-700/30 hover:border-neutral-400 text-xs sm:text-sm font-medium py-2 px-2 sm:px-3 rounded text-center transition-all"
          >
            View Details
          </Link>

          {/* Share Button - Only show if tournament can be shared */}
          {canShareTournament(tournament) && (
            <div className="relative">
              <button
                onClick={handleShareClick}
                disabled={shareState.generating || actionLoading}
                className="border border-cyan-500 text-cyan-400 hover:bg-cyan-500/10 text-xs sm:text-sm font-medium py-2 px-2 sm:px-3 rounded transition-all disabled:opacity-50 flex items-center gap-1.5"
              >
                {shareState.generating ? (
                  <>
                    <span className="h-3 w-3 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin"></span>
                    Generating...
                  </>
                ) : shareState.copied ? (
                  <>
                    <Check size={14} />
                    Copied!
                  </>
                ) : (
                  <>
                    <Share2 size={14} />
                    Share
                  </>
                )}
              </button>
              
              {/* Social Share Dropdown - Optional */}
              {/* {!shareState.generating && !shareState.copied && (
                <div className="absolute bottom-full left-0 mb-2 bg-neutral-800 border border-neutral-700 rounded-lg shadow-lg p-2 hidden group-hover:block">
                  <div className="text-xs text-gray-400 mb-1">Share via:</div>
                  <div className="flex gap-1">
                    <button 
                      onClick={() => handleSocialShare('facebook')}
                      className="p-1.5 bg-blue-600 hover:bg-blue-700 rounded text-gray-900 dark:text-white"
                      title="Facebook"
                    >
                      F
                    </button>
                    <button 
                      onClick={() => handleSocialShare('twitter')}
                      className="p-1.5 bg-sky-500 hover:bg-sky-600 rounded text-gray-900 dark:text-white"
                      title="Twitter"
                    >
                      T
                    </button>
                    <button 
                      onClick={() => handleSocialShare('whatsapp')}
                      className="p-1.5 bg-green-600 hover:bg-green-700 rounded text-gray-900 dark:text-white"
                      title="WhatsApp"
                    >
                      W
                    </button>
                  </div>
                </div>
              )} */}
            </div>
          )}

          {canEditTournament(tournament) && (
            <Link
              to={`/tournaments/${tournament.id}/edit`}
              className="border border-blue-500 text-blue-400 hover:bg-blue-500/10 text-xs sm:text-sm font-medium py-2 px-2 sm:px-3 rounded transition-all"
            >
              Edit
            </Link>
          )}

          {canStartTournament(tournament) && (
            <button
              onClick={() => onAction('start', tournament.id, tournament.name)}
              disabled={isActionLoading('start', tournament.id)}
              className="border border-green-500 text-green-400 hover:bg-green-500/10 text-xs sm:text-sm font-medium py-2 px-2 sm:px-3 rounded transition-all disabled:opacity-50"
            >
              {isActionLoading('start', tournament.id) ? 'Starting...' : 'Start'}
            </button>
          )}

          {canFinalizeTournament(tournament) && (
            <button
              onClick={() => onAction('finalize', tournament.id, tournament.name)}
              disabled={isActionLoading('finalize', tournament.id)}
              className="border border-purple-500 text-purple-400 hover:bg-purple-500/10 text-xs sm:text-sm font-medium py-2 px-2 sm:px-3 rounded transition-all disabled:opacity-50"
            >
              {isActionLoading('finalize', tournament.id) ? 'Finalizing...' : 'Finalize'}
            </button>
          )}

          {canCancelTournament(tournament) && (
            <button
              onClick={() => onAction('cancel', tournament.id, tournament.name)}
              disabled={isActionLoading('cancel', tournament.id)}
              className="border border-red-500 text-red-400 hover:bg-red-500/10 text-xs sm:text-sm font-medium py-2 px-2 sm:px-3 rounded transition-all disabled:opacity-50"
            >
              {isActionLoading('cancel', tournament.id) ? 'Canceling...' : 'Cancel'}
            </button>
          )}
        </div>

        {/* Error Message for Share */}
        {shareState.error && (
          <div className="mt-2 p-2 bg-red-800/30 rounded text-red-300 text-xs">
            Error: {shareState.error}
          </div>
        )}

        {/* Status Messages */}
        {tournament.status === 'open' && tournament.current_slots < 2 && (
          <div className="mt-2 p-2 bg-yellow-800/30 rounded text-yellow-300 text-xs">
            Need {2 - tournament.current_slots} more participants to start
          </div>
        )}
      </div>
    </div>
  );
};

export default TournamentInfoCard;
