import Header from '../../components/layout/Header';
import { useAuth } from '../../contexts/AuthContext';
import { useState, useEffect, useRef } from 'react';
import { tournamentService } from '../../services/tournamentService';
import { Link } from 'react-router-dom';
import TournamentCarousel from '../../components/TournamentCarousel';

export default function Dashboard() {
  const { user } = useAuth();
  const [userTournaments, setUserTournaments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentSlide, setCurrentSlide] = useState(0);
  const tournamentContainerRef = useRef(null);

  useEffect(() => {
    loadUserTournaments();
  }, []);

  const loadUserTournaments = async () => {
    try {
      const tournaments = await tournamentService.getAll();
      setUserTournaments(tournaments.slice(0, 6)); // Show more tournaments for better carousel effect
    } catch (error) {
      console.error('Failed to load user tournaments:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const nextSlide = () => {
    if (currentSlide < Math.ceil(userTournaments.length / 2) - 1) {
      setCurrentSlide(currentSlide + 1);
    }
  };

  const prevSlide = () => {
    if (currentSlide > 0) {
      setCurrentSlide(currentSlide - 1);
    }
  };

  // Calculate transform value for sliding effect
  const getTransformValue = () => {
    if (tournamentContainerRef.current) {
      const containerWidth = tournamentContainerRef.current.offsetWidth;
      return `translateX(-${currentSlide * containerWidth}px)`;
    }
    return `translateX(-${currentSlide * 100}%)`;
  };

  return (
    <div className="min-h-screen bg-neutral-900">
      <Header />
      <main className="mx-auto max-w-7xl py-8 px-4 sm:px-6 lg:px-8 space-y-8">
        <h1 className="text-3xl font-bold text-white text-center md:text-left">Dashboard</h1>

        {/* Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Welcome Card */}
          <div className="bg-neutral-800 rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-white mb-2">Welcome, {user?.username}!</h2>
            <p className="text-gray-400 mb-4">Your account is ready. Start your first tournament challenge.</p>
            
            <div className="mb-4 p-3 bg-neutral-700/50 rounded-lg">
              <p className="text-gray-400 text-sm">Wallet Balance</p>
              <p className="text-2xl font-bold text-white">${user?.wallet_balance || '0.00'}</p>
            </div>
            
            {parseFloat(user?.wallet_balance || 0) < 5 ? (
              <div className="bg-yellow-800/30 border border-yellow-600/50 rounded-lg p-3 mb-4">
                <p className="text-yellow-300 text-sm">
                  <strong>Low balance!</strong> Add funds to join tournaments.
                </p>
                <Link
                  to="/deposit"
                  className="mt-2 inline-block bg-yellow-500 hover:bg-yellow-600 text-white font-medium py-2 px-4 rounded text-sm"
                >
                  Add Funds Now
                </Link>
              </div>
            ) : null}
            
            <Link
              to="/create-tournament"
              className="bg-primary-500 hover:bg-primary-600 text-white font-medium py-2 px-4 rounded"
            >
              Create Tournament
            </Link>
          </div>

          {/* Stats Card */}
          <div className="bg-neutral-800 rounded-lg shadow p-6 space-y-2">
            <h2 className="text-xl font-semibold text-white mb-4">Your Stats</h2>
            <p className="text-gray-400"><span className="text-white font-medium">0</span> Matches Played</p>
            <p className="text-gray-400"><span className="text-white font-medium">0</span> Wins</p>
            <p className="text-gray-400"><span className="text-white font-medium">$0.00</span> Earnings</p>
          </div>

          {/* Status Card */}
          <div className="bg-neutral-800 rounded-lg shadow p-6 space-y-2">
            <h2 className="text-xl font-semibold text-white mb-4">Account Status</h2>
            <p className="text-gray-400"><span className="text-white font-medium">Verified:</span> {user?.is_verified ? 'Yes' : 'No'}</p>
            <p className="text-gray-400"><span className="text-white font-medium">Role:</span> {user?.role}</p>
            <p className="text-gray-400"><span className="text-white font-medium">Member since:</span> {new Date(user?.created_at).toLocaleDateString()}</p>
          </div>
        </div>

        {/* User's Tournaments */}
        <div className="bg-neutral-800 rounded-lg shadow p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-white">Your Tournaments</h2>
            <Link to="/tournaments" className="text-primary-500 hover:text-primary-400 text-sm font-medium">
              All →
            </Link>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-4">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-500"></div>
            </div>
          ) : userTournaments.length > 0 ? (
            <TournamentCarousel tournaments={userTournaments} />
          ) : (
            <p className="text-gray-400">You haven't joined any tournaments yet.</p>
          )}

        </div>
      </main>
    </div>
  );
}