import { useState, useEffect } from 'react';
import { adminService } from '../../services/adminService';
import { useAuth } from '../../contexts/AuthContext';

export default function DisputeList() {
  const [disputes, setDisputes] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [resolvingId, setResolvingId] = useState(null);
  const [resolution, setResolution] = useState('');

  const { user } = useAuth();

  useEffect(() => {
    if (user?.role === 'admin') {
      loadDisputes();
    }
  }, [user]);

  const loadDisputes = async () => {
    try {
      const data = await adminService.getDisputes();
      setDisputes(data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load disputes');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResolve = async (disputeId) => {
    setResolvingId(disputeId);
    setError('');

    try {
      await adminService.resolveDispute(disputeId, {
        resolution,
        winner_id: resolution.includes('player1') 
          ? disputes.find(d => d.id === disputeId).match.participant1_id
          : disputes.find(d => d.id === disputeId).match.participant2_id
      });
      setResolution('');
      setDisputes(disputes.filter(d => d.id !== disputeId));
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to resolve dispute');
    } finally {
      setResolvingId(null);
    }
  };

  if (!user || user.role !== 'admin') {
    return null;
  }

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  return (
    <div className="bg-neutral-800 rounded-lg shadow p-6 mb-6">
      <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Dispute Resolution</h2>
      
      {error && (
        <div className="mb-4 rounded-md bg-red-800/50 py-2 px-3 text-sm text-red-200">
          {error}
        </div>
      )}

      {disputes.length === 0 ? (
        <p className="text-gray-400">No active disputes.</p>
      ) : (
        <div className="space-y-4">
          {disputes.map(dispute => (
            <div key={dispute.id} className="border border-neutral-700 rounded-lg p-4">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h3 className="text-gray-900 dark:text-white font-medium">Dispute #{dispute.id}</h3>
                  <p className="text-gray-400 text-sm">
                    Match: {dispute.match.participant1?.user?.username} vs {dispute.match.participant2?.user?.username}
                  </p>
                </div>
                <span className="px-2 py-1 bg-red-500/20 text-red-300 text-xs rounded-full">
                  Disputed
                </span>
              </div>

              <div className="mb-3">
                <p className="text-gray-400 text-sm">Reason:</p>
                <p className="text-gray-900 dark:text-white">{dispute.reason}</p>
              </div>

              {dispute.evidence_url && (
                <div className="mb-3">
                  <p className="text-gray-400 text-sm">Evidence:</p>
                  <a 
                    href={dispute.evidence_url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-primary-500 hover:text-primary-400 text-sm"
                  >
                    View Evidence
                  </a>
                </div>
              )}

              <div className="flex items-center space-x-2">
                <select
                  value={resolvingId === dispute.id ? resolution : ''}
                  onChange={(e) => setResolution(e.target.value)}
                  className="rounded-md border border-neutral-600 bg-neutral-700 py-1 px-2 text-gray-900 dark:text-white"
                >
                  <option value="">Select resolution</option>
                  <option value="resolved_in_favor_player1">Resolve in favor of {dispute.match.participant1?.user?.username}</option>
                  <option value="resolved_in_favor_player2">Resolve in favor of {dispute.match.participant2?.user?.username}</option>
                </select>
                
                <button
                  onClick={() => handleResolve(dispute.id)}
                  disabled={!resolution || resolvingId === dispute.id}
                  className="bg-green-600 hover:bg-green-700 text-gray-900 dark:text-white text-sm font-medium py-1 px-3 rounded disabled:opacity-50"
                >
                  {resolvingId === dispute.id ? 'Resolving...' : 'Resolve'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}