import { useState, useEffect } from 'react';
import { matchService } from '../../services/matchService';
import MatchCard from './MatchCard';

export default function TournamentBracket({ tournamentId }) {
  const [matches, setMatches] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadMatches();
  }, [tournamentId]);

  const loadMatches = async () => {
    try {
      const data = await matchService.getTournamentMatches(tournamentId);
      setMatches(data);
    } catch (err) {
      console.error('Failed to load matches:', err);
      setError('Failed to load tournament matches');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-neutral-800 rounded-lg p-4 text-center">
        <p className="text-red-400">{error}</p>
      </div>
    );
  }

  // Group matches by round
  const rounds = {};
  matches.forEach(match => {
    if (!rounds[match.round_number]) {
      rounds[match.round_number] = [];
    }
    rounds[match.round_number].push(match);
  });

  return (
    <div className="bg-neutral-800 rounded-lg shadow p-6">
      <h2 className="text-xl font-semibold text-white mb-4">Tournament Bracket</h2>
      
      {Object.keys(rounds).length === 0 ? (
        <p className="text-gray-400">No matches have been generated yet.</p>
      ) : (
        <div className="space-y-6">
          {Object.entries(rounds).map(([roundNumber, roundMatches]) => (
            <div key={roundNumber} className="border border-neutral-700 rounded-lg p-4">
              <h3 className="text-lg font-medium text-white mb-3">Round {roundNumber}</h3>
              
              <div className="space-y-4">
                {roundMatches.map(match => (
                  <MatchCard 
                    key={match.id} 
                    match={match} 
                    onUpdate={loadMatches}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}