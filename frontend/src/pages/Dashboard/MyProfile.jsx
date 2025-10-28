import Header from '../../components/layout/Header';
import { useAuth } from '../../contexts/AuthContext';
import { useState, useEffect } from 'react';
import { tournamentService } from '../../services/tournamentService';
import { Link } from 'react-router-dom';

export default function MyProfile() {
  const { user } = useAuth();
  const [userStats, setUserStats] = useState({
    matchesPlayed: 0,
    wins: 0,
    earnings: 0,
    tournamentsJoined: 0
  });
  const [recentTournaments, setRecentTournaments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadUserData();
  }, []);

 const loadUserData = async () => {
    try {
      const { tournaments = [], pagination } = await tournamentService.getMyTournaments();

      // ✅ Update recent tournaments (limit to latest 5)
      setRecentTournaments(tournaments.slice(0, 3));

      // ✅ Compute user stats safely
      const matchesPlayed = tournaments.length * 3; // Example metric
      const wins = tournaments.filter(
        t => t.status === 'completed' && t.winner_id === user.id
      ).length;
      const earnings = tournaments.reduce(
        (total, t) => total + (t.prize_money || 0),
        0
      );

      setUserStats({
        matchesPlayed,
        wins,
        earnings,
        tournamentsJoined: tournaments.length,
      });

    } catch (error) {
      console.error('Failed to load user data:', error);
    } finally {
      setIsLoading(false);
    }
  };


  return (
    <div className="min-h-screen bg-neutral-900">
     
      <main className="mx-auto max-w-4xl py-8 px-4 sm:px-6 lg:px-8 space-y-8">
        {/* Header */}
        <div className="flex justify-between items-center">
          <h1 className="text-1xl font-bold text-white">My Profile</h1>
          <Link to="/dashboard" className="text-primary-500 hover:text-primary-400 text-sm font-medium">
            ← Back to Dashboard
          </Link>
        </div>

        {/* Profile Overview Card */}
        <div className="bg-neutral-800 rounded-lg shadow p-6">
          <div className="flex items-center space-x-4 mb-6">
            <div className="w-16 h-16 bg-primary-500 rounded-full flex items-center justify-center">
              <span className="text-2xl font-bold text-white">
                {user?.username?.charAt(0).toUpperCase()}
              </span>
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">{user?.username}</h2>
              <p className="text-gray-400">{user?.email}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div className="bg-neutral-700/50 rounded-lg p-4">
              <p className="text-gray-400 text-sm">Wallet Balance</p>
              <p className="text-2xl font-bold text-white">${user?.wallet_balance || '0.00'}</p>
            </div>
            <div className="bg-neutral-700/50 rounded-lg p-4">
              <p className="text-gray-400 text-sm">Member Since</p>
              <p className="text-xl font-semibold text-white">
                {new Date(user?.created_at).toLocaleDateString('en-US', { 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}
              </p>
            </div>
          </div>

          {parseFloat(user?.wallet_balance || 0) < 5 && (
            <div className="bg-yellow-800/30 border border-yellow-600/50 rounded-lg p-4 mb-4">
              <p className="text-yellow-300 text-sm">
                <strong>Low balance warning!</strong> Add funds to join paid tournaments.
              </p>
              <Link
                to="/deposit"
                className="mt-2 inline-block bg-yellow-500 hover:bg-yellow-600 text-white font-medium py-2 px-4 rounded text-sm"
              >
                Add Funds Now
              </Link>
            </div>
          )}
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Stats Card */}
          <div className="bg-neutral-800 rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-white mb-4">Your Gaming Stats</h2>
            <div className="space-y-3">
              <div className="flex justify-between items-center py-2 border-b border-neutral-700">
                <span className="text-gray-400">Matches Played</span>
                <span className="text-white font-bold text-lg">{userStats.matchesPlayed}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-neutral-700">
                <span className="text-gray-400">Wins</span>
                <span className="text-green-500 font-bold text-lg">{userStats.wins}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-neutral-700">
                <span className="text-gray-400">Win Rate</span>
                <span className="text-white font-bold text-lg">
                  {userStats.matchesPlayed > 0 
                    ? `${((userStats.wins / userStats.matchesPlayed) * 100).toFixed(1)}%` 
                    : '0%'
                  }
                </span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-gray-400">Total Earnings</span>
                <span className="text-yellow-500 font-bold text-lg">${userStats.earnings.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Status Card */}
          <div className="bg-neutral-800 rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-white mb-4">Account Status</h2>
            <div className="space-y-3">
              <div className="flex justify-between items-center py-2 border-b border-neutral-700">
                <span className="text-gray-400">Verification Status</span>
                <span className={`font-bold text-lg ${
                  user?.is_verified ? 'text-green-500' : 'text-yellow-500'
                }`}>
                  {user?.is_verified ? 'Verified' : 'Pending'}
                </span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-neutral-700">
                <span className="text-gray-400">Account Role</span>
                <span className="text-primary-500 font-bold text-lg capitalize">
                  {user?.role || 'Player'}
                </span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-neutral-700">
                <span className="text-gray-400">Tournaments Joined</span>
                <span className="text-white font-bold text-lg">{userStats.tournamentsJoined}</span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-gray-400">Last Active</span>
                <span className="text-white font-medium text-sm">
                  {new Date().toLocaleDateString()}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Tournaments */}
        <div className="bg-neutral-800 rounded-lg shadow p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-white">Recent Tournaments</h2>
            <Link to="/my-tournaments" className="text-primary-500 hover:text-primary-400 text-sm font-medium">
              View All →
            </Link>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-4">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-500"></div>
            </div>
          ) : recentTournaments.length > 0 ? (
            <div className="space-y-3">
              {recentTournaments.map((tournament) => (
                <div key={tournament.id} className="bg-neutral-700/50 rounded-lg p-4 hover:bg-neutral-700 transition-colors">
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="font-medium text-white">{tournament.name}</h3>
                      <p className="text-gray-400 text-sm">
                        {tournament.game_type} • {tournament.status}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-white font-medium">${tournament.entry_fee}</p>
                      <p className="text-gray-400 text-sm">Entry Fee</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-400 mb-4">You haven't joined any tournaments yet.</p>
              <Link
                to="/tournaments"
                className="inline-block bg-primary-500 hover:bg-primary-600 text-white font-medium py-2 px-4 rounded"
              >
                Join Your First Tournament
              </Link>
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link
            to="/deposit"
            className="bg-green-600 hover:bg-green-700 text-white font-medium py-3 px-4 rounded text-center transition-colors"
          >
            Add Funds
          </Link>
          <Link
            to="/create-tournament"
            className="bg-primary-500 hover:bg-primary-600 text-white font-medium py-3 px-4 rounded text-center transition-colors"
          >
            Create Tournament
          </Link>
          <Link
            to="/settings"
            className="bg-neutral-700 hover:bg-neutral-600 text-white font-medium py-3 px-4 rounded text-center transition-colors"
          >
            Account Settings
          </Link>
        </div>
      </main>
    </div>
  );
}