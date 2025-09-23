import Header from '../../components/layout/Header';
import VerificationBanner from '../../components/auth/VerificationBanner';
import { useAuth } from '../../contexts/AuthContext';
import { useState, useEffect } from 'react';
import { tournamentService } from '../../services/tournamentService';
import { Link } from 'react-router-dom';
import TournamentCarousel from '../../components/TournamentCarousel';

export default function Dashboard() {
  const { user } = useAuth();
  const [userTournaments, setUserTournaments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  
  useEffect(() => {
    loadUserTournaments();
  }, []);

  const loadUserTournaments = async () => {
    try {
      const tournaments = await tournamentService.getAll();
      setUserTournaments(tournaments.slice(0, 6));
    } catch (error) {
      console.error('Failed to load user tournaments:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-900">
      <Header />
      <main className="mx-auto max-w-7xl py-8 px-4 sm:px-6 lg:px-8 space-y-8">
        {/* Email Verification Banner */}
        <VerificationBanner />
        
        <h1 className="text-3xl font-bold text-white text-center md:text-left">Dashboard</h1>

        {/* Welcome Card as Link to Profile */}
        <Link to="/my-profile" className="block hover:scale-105 transition-transform duration-200">
          <div className="bg-neutral-800 rounded-lg shadow p-6 cursor-pointer border-2 border-transparent hover:border-primary-500/30">
            <h2 className="text-xl font-semibold text-white mb-2">Welcome, {user?.username}!</h2>
            <p className="text-gray-400 mb-4">Click here to view your complete profile and stats</p>
            
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
                  onClick={(e) => e.stopPropagation()}
                >
                  Add Funds Now
                </Link>
              </div>
            ) : null}
            
            <div className="flex justify-between items-center mt-4">
              <span className="text-primary-500 font-medium">View Full Profile →</span>
              <span className="text-gray-400 text-sm">Tournaments: {userTournaments.length}</span>
            </div>
          </div>
        </Link>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Link 
            to="/create-tournament" 
            className="bg-primary-500 hover:bg-primary-600 text-white font-medium py-4 px-6 rounded-lg text-center transition-colors"
          >
            Create New Tournament
          </Link>
          <Link 
            to="/tournaments" 
            className="bg-neutral-700 hover:bg-neutral-600 text-white font-medium py-4 px-6 rounded-lg text-center transition-colors"
          >
            Browse All Tournaments
          </Link>
        </div>

        {/* User's Tournaments */}
        <div className="bg-neutral-800 rounded-lg shadow p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-white">Your Recent Tournaments</h2>
            <Link to="/tournaments" className="text-primary-500 hover:text-primary-400 text-sm font-medium">
              View All →
            </Link>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
            </div>
          ) : userTournaments.length > 0 ? (
            <TournamentCarousel tournaments={userTournaments} />
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-400 mb-4">You haven't joined any tournaments yet.</p>
              <Link
                to="/tournaments"
                className="inline-block bg-primary-500 hover:bg-primary-600 text-white font-medium py-2 px-4 rounded"
              >
                Explore Tournaments
              </Link>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}