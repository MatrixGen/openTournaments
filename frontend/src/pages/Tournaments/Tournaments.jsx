import { useState, useEffect } from 'react';
import Header from '../../components/layout/Header';
import { tournamentService } from '../../services/tournamentService';
import { Link } from 'react-router-dom';

export default function Tournaments() {
  const [tournaments, setTournaments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadTournaments();
  }, []);

  const loadTournaments = async () => {
    try {
      const data = await tournamentService.getAll();
      setTournaments(data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load tournaments');
      console.error('Tournaments loading error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-neutral-900">
        <Header />
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-900">
      <Header />
      <main className="mx-auto max-w-7xl py-8 px-4 sm:px-6 lg:px-8 space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <h1 className="text-3xl font-bold text-white">Tournaments</h1>
          <Link
            to="/create-tournament"
            className="w-full md:w-auto text-center bg-primary-500 hover:bg-primary-600 text-white font-medium py-2 px-4 rounded"
          >
            Create Tournament
          </Link>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-6 rounded-md bg-red-800/50 py-3 px-4 text-sm text-red-200">
            {error}
          </div>
        )}

        {/* Tournaments Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {tournaments.map((tournament) => (
            <div key={tournament.id} className="bg-neutral-800 rounded-lg shadow p-6 flex flex-col justify-between space-y-4">
              
              <div className="flex items-center mb-2">
                <img
                  src={tournament.game.logo_url}
                  alt={tournament.game.name}
                  className="h-10 w-10 rounded-md mr-3"
                />
                <div>
                  <h3 className="text-lg font-semibold text-white">{tournament.name}</h3>
                  <p className="text-gray-400 text-sm">{tournament.game.name}</p>
                </div>
              </div>

              <div className="space-y-1">
                <p className="text-gray-400 text-sm">
                  <span className="text-white font-medium">Format:</span> {tournament.format.replace('_', ' ')}
                </p>
                <p className="text-gray-400 text-sm">
                  <span className="text-white font-medium">Entry Fee:</span> ${tournament.entry_fee}
                </p>
                <p className="text-gray-400 text-sm">
                  <span className="text-white font-medium">Slots:</span> {tournament.current_slots}/{tournament.total_slots}
                </p>
                <p className="text-gray-400 text-sm">
                  <span className="text-white font-medium">Starts:</span> {new Date(tournament.start_time).toLocaleString()}
                </p>
              </div>

              <div className="flex justify-between items-center">
                <span className={`px-2 py-1 rounded text-xs font-medium ${
                  tournament.status === 'upcoming' ? 'bg-blue-500/20 text-blue-300' :
                  tournament.status === 'ongoing' ? 'bg-green-500/20 text-green-300' :
                  'bg-gray-500/20 text-gray-300'
                }`}>
                  {tournament.status}
                </span>
                <Link
                  to={`/tournaments/${tournament.id}`}
                  className="text-primary-500 hover:text-primary-400 text-sm font-medium"
                >
                  View Details →
                </Link>
              </div>
            </div>
          ))}
        </div>

        {tournaments.length === 0 && !error && (
          <div className="text-center py-12">
            <p className="text-gray-400">No tournaments found. Be the first to create one!</p>
          </div>
        )}
      </main>
    </div>
  );
}
