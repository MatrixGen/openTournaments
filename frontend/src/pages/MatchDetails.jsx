import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import Header from '../components/layout/Header';
import { matchService } from '../services/matchService';
import { useAuth } from '../contexts/AuthContext';
import Banner from '../components/common/Banner';
import LoadingSpinner from '../components/common/LoadingSpinner';

export default function MatchDetails() {
  const { id } = useParams();
  const [match, setMatch] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [actionMessage, setActionMessage] = useState('');

  const { user } = useAuth();

  useEffect(() => {
    loadMatch();
  }, [id]);

  const loadMatch = async () => {
    try {
      const data = await matchService.getById(id);
      setMatch(data);
    } catch (err) {
      console.error('Failed to load match:', err);
      setError(err.response?.data?.message || 'Failed to load match details');
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirmScore = async () => {
    setActionLoading(true);
    setActionMessage('');
    setError('');
    
    try {
      await matchService.confirmScore(id);
      setActionMessage('Score confirmed successfully!');
      await loadMatch(); 
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to confirm score');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDispute = async () => {
    setActionLoading(true);
    setActionMessage('');
    setError('');
    
    try {
      setActionMessage('Dispute feature will be implemented soon');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create dispute');
    } finally {
      setActionLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-neutral-900">
        
        <LoadingSpinner 
          fullPage={true} 
          text="Loading match details..." 
        />
      </div>
    );
  }

  if (error && !match) {
    return (
      <div className="min-h-screen bg-neutral-900">
        <Header />
        <main className="mx-auto max-w-4xl py-8 px-4 sm:px-6 lg:px-8">
          <Banner
            type="error"
            title="Match Not Found"
            message={error}
            action={{
              text: 'Back to Tournaments',
              to: '/tournaments'
            }}
          />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-900">
      
      <main className="mx-auto max-w-4xl py-8 px-4 sm:px-6 lg:px-8">
        <h1 className="text-1xl font-bold text-white mb-6">Match Details</h1>
        
        {/* Error Banner */}
        {error && (
          <Banner
            type="error"
            title="Action Failed"
            message={error}
            onClose={() => setError('')}
            className="mb-6"
          />
        )}

        {/* Success Banner */}
        {actionMessage && (
          <Banner
            type="success"
            title="Success!"
            message={actionMessage}
            onClose={() => setActionMessage('')}
            className="mb-6"
          />
        )}

        {match && (
          <div className="bg-neutral-800 rounded-lg shadow p-6">
            {/* Top Header with Status */}
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold text-white">Match #{match.id}</h2>
              <span
                className={`px-3 py-1 rounded-full text-xs font-semibold capitalize
                ${match.status === 'scheduled' ? 'bg-blue-500/20 text-blue-300' :
                  match.status === 'reported' ? 'bg-yellow-500/20 text-yellow-300' :
                  match.status === 'completed' ? 'bg-green-500/20 text-green-300' :
                  match.status === 'disputed' ? 'bg-red-500/20 text-red-300' :
                  'bg-gray-500/20 text-gray-300'
                }`}
              >
                {match.status}
              </span>
            </div>

            {/* Participants Section */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 items-center mb-6">
              <div className="text-center bg-neutral-700/40 rounded-lg p-4">
                <p className="text-white font-medium truncate">{match.participant1?.user?.username || 'TBD'}</p>
                <p className="text-gray-400 text-sm">{match.participant1?.gamer_tag || ''}</p>
                {match.participant1_score !== null && (
                  <p className="text-2xl font-bold text-white mt-2">{match.participant1_score}</p>
                )}
              </div>
              
              <div className="text-center text-gray-400 text-2xl font-bold">VS</div>
              
              <div className="text-center bg-neutral-700/40 rounded-lg p-4">
                <p className="text-white font-medium truncate">{match.participant2?.user?.username || 'TBD'}</p>
                <p className="text-gray-400 text-sm">{match.participant2?.gamer_tag || ''}</p>
                {match.participant2_score !== null && (
                  <p className="text-2xl font-bold text-white mt-2">{match.participant2_score}</p>
                )}
              </div>
            </div>

            {/* Action Required Banner */}
            {match.status === 'awaiting_confirmation' && user && (
              <Banner
                type="warning"
                title="Action Required"
                message={
                  match.reported_by_user_id === user.id 
                    ? 'You reported this score. Waiting for opponent confirmation.'
                    : 'Your opponent reported this score. Please confirm or dispute it.'
                }
                className="mb-6"
              />
            )}

            {/* Action Section */}
            {match.status === 'awaiting_confirmation' && user && match.reported_by_user_id !== user.id && (
              <div className="mt-6 p-4 bg-neutral-700/50 rounded-md">
                <h3 className="text-white font-medium mb-4">Confirm or Dispute Score</h3>
                
                <div className="flex flex-col sm:flex-row sm:space-x-3 space-y-3 sm:space-y-0">
                  <button
                    onClick={handleConfirmScore}
                    disabled={actionLoading}
                    className="flex items-center justify-center bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded w-full sm:w-auto disabled:opacity-50 transition-colors"
                  >
                    {actionLoading ? (
                      <span className="flex items-center space-x-2">
                        <LoadingSpinner size="sm" />
                        <span>Confirming...</span>
                      </span>
                    ) : (
                      'Confirm Score'
                    )}
                  </button>
                  <button
                    onClick={handleDispute}
                    disabled={actionLoading}
                    className="bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded w-full sm:w-auto disabled:opacity-50 transition-colors"
                  >
                    Dispute Score
                  </button>
                </div>
              </div>
            )}

            {/* Match Info Section */}
            <div className="mt-6 border-t border-neutral-700 pt-4">
              <h3 className="text-white font-medium mb-3">Match Information</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-400">Tournament</p>
                  <p className="text-white">{match.tournament?.name || 'Unknown'}</p>
                </div>
                <div>
                  <p className="text-gray-400">Round</p>
                  <p className="text-white">{match.round_number}</p>
                </div>
                <div>
                  <p className="text-gray-400">Scheduled Time</p>
                  <p className="text-white">{new Date(match.scheduled_time).toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-gray-400">Status</p>
                  <p className="text-white capitalize">{match.status}</p>
                </div>
              </div>
            </div>

            {/* Help Banner */}
            <Banner
              type="info"
              title="Need Help?"
              message="If you're experiencing issues with this match, please contact tournament administration for assistance."
              className="mt-6"
            />

            {/* Dispute Info Banner */}
            {match.status === 'disputed' && (
              <Banner
                type="error"
                title="Match Disputed"
                message="This match is currently under dispute. Tournament administration will review and resolve the issue."
                className="mt-6"
              />
            )}

            {/* Completed Match Banner */}
            {match.status === 'completed' && (
              <Banner
                type="success"
                title="Match Completed"
                message="This match has been completed and the results are final."
                className="mt-6"
              />
            )}
          </div>
        )}
      </main>
    </div>
  );
}