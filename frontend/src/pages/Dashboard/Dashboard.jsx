import Header from '../../components/layout/Header';
import VerificationBanner from '../../components/auth/VerificationBanner';
import { useAuth } from '../../contexts/AuthContext';
import { useState, useEffect } from 'react';
import { tournamentService } from '../../services/tournamentService';
import { Link } from 'react-router-dom';
import TournamentCarousel from '../../components/TournamentCarousel';
import Banner from '../../components/common/Banner';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { 
  Trophy, 
  Plus, 
  Search, 
  TrendingUp, 
  Users, 
  Calendar,
  Award,
  Zap
} from 'lucide-react';

export default function Dashboard() {
  const { user } = useAuth();
  const [userTournaments, setUserTournaments] = useState([]);
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    completed: 0,
    won: 0
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  
  useEffect(() => {
    loadUserTournaments();
  }, []);

  const loadUserTournaments = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const { tournaments, pagination } = await tournamentService.getMyTournaments();
      setUserTournaments(tournaments || []);
      calculateStats(tournaments || []);
    } catch (error) {
      console.error('Failed to load user tournaments:', error);
      setError('Failed to load tournaments. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const calculateStats = (tournaments) => {
    const stats = {
      total: tournaments.length,
      active: tournaments.filter(t => t.status === 'active' || t.status === 'upcoming').length,
      completed: tournaments.filter(t => t.status === 'completed').length,
      won: tournaments.filter(t => t.status === 'completed' && t.position === 1).length
    };
    setStats(stats);
  };

  const hasLowBalance = parseFloat(user?.wallet_balance || 0) < 5;
  const isNewUser = userTournaments.length === 0;

  // Quick stats cards data
  const statCards = [
    {
      label: 'Total Tournaments',
      value: stats.total,
      icon: Trophy,
      color: 'text-blue-400'
    },
    {
      label: 'Active',
      value: stats.active,
      icon: Zap,
      color: 'text-green-400'
    },
    {
      label: 'Completed',
      value: stats.completed,
      icon: Calendar,
      color: 'text-gray-400'
    },
    {
      label: 'Tournaments Won',
      value: stats.won,
      icon: Award,
      color: 'text-yellow-400'
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-neutral-900 to-neutral-800">
      <main className="mx-auto max-w-7xl py-8 px-4 sm:px-6 lg:px-8 space-y-8">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white">Welcome back, {user?.username}! 👋</h1>
            <p className="text-gray-400 mt-2">Here's what's happening with your tournaments</p>
          </div>
          <div className="mt-4 md:mt-0">
            <div className="bg-neutral-800 rounded-lg px-4 py-3 border border-neutral-700">
              <p className="text-gray-400 text-sm">Wallet Balance</p>
              <p className="text-2xl font-bold text-white">${parseFloat(user?.wallet_balance || 0).toFixed(2)}</p>
            </div>
          </div>
        </div>

        {/* Email Verification Banner */}
        <VerificationBanner />

        {/* Low Balance Warning */}
        {hasLowBalance && (
          <Banner
            type="warning"
            title="Low Balance Alert!"
            message="Add funds to join tournaments and avoid missing out."
            action={{
              text: 'Add Funds Now',
              to: '/deposit'
            }}
            icon="⚠️"
          />
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {statCards.map((stat, index) => (
            <div 
              key={index}
              className="bg-neutral-800 rounded-xl p-6 border border-neutral-700 hover:border-neutral-600 transition-colors"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm font-medium">{stat.label}</p>
                  <p className="text-2xl font-bold text-white mt-2">{stat.value}</p>
                </div>
                <stat.icon className={`h-8 w-8 ${stat.color}`} />
              </div>
            </div>
          ))}
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Link 
            to="/create-tournament" 
            className="group bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 text-white font-semibold py-6 px-6 rounded-xl text-center transition-all duration-200 transform hover:scale-105 shadow-lg hover:shadow-primary-500/25"
          >
            <div className="flex items-center justify-center space-x-3">
              <Plus className="h-6 w-6" />
              <span>Create Tournament</span>
            </div>
          </Link>
          
          <Link 
            to="/browse-matches" 
            className="group bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 text-white font-semibold py-6 px-6 rounded-xl text-center transition-all duration-200 transform hover:scale-105"
          >
            <div className="flex items-center justify-center space-x-3">
              <Search className="h-6 w-6" />
              <span>Browse Tournaments</span>
            </div>
          </Link>
          
          <Link 
            to="/my-profile" 
            className="group bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 text-white font-semibold py-6 px-6 rounded-xl text-center transition-all duration-200 transform hover:scale-105"
          >
            <div className="flex items-center justify-center space-x-3">
              <TrendingUp className="h-6 w-6" />
              <span>View Stats</span>
            </div>
          </Link>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Recent Tournaments - Takes 2/3 on large screens */}
          <div className="lg:col-span-2">
            <div className="bg-neutral-800 rounded-xl shadow-lg border border-neutral-700 p-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
                <h2 className="text-xl font-semibold text-white flex items-center">
                  <Trophy className="h-6 w-6 mr-2 text-yellow-400" />
                  Your Tournaments
                </h2>
                <Link 
                  to="/my-tournaments" 
                  className="inline-flex items-center text-primary-500 hover:text-primary-400 text-sm font-medium mt-2 sm:mt-0"
                >
                  View All <span className="ml-1">→</span>
                </Link>
              </div>

              {isLoading ? (
                <div className="flex justify-center py-12">
                  <LoadingSpinner size="lg" />
                </div>
              ) : error ? (
                <div className="text-center py-8">
                  <p className="text-red-400 mb-4">{error}</p>
                  <button
                    onClick={loadUserTournaments}
                    className="bg-primary-500 hover:bg-primary-600 text-white font-medium py-2 px-4 rounded transition-colors"
                  >
                    Try Again
                  </button>
                </div>
              ) : userTournaments.length > 0 ? (
                <TournamentCarousel tournaments={userTournaments} />
              ) : (
                <div className="text-center py-12">
                  <div className="bg-neutral-700/50 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                    <Trophy className="h-8 w-8 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-medium text-white mb-2">No tournaments yet</h3>
                  <p className="text-gray-400 mb-6 max-w-sm mx-auto">
                    Join your first tournament and start competing for prizes!
                  </p>
                  <Link
                    to="/browse-matches"
                    className="inline-flex items-center bg-primary-500 hover:bg-primary-600 text-white font-medium py-3 px-6 rounded-lg transition-colors"
                  >
                    <Search className="h-4 w-4 mr-2" />
                    Explore Tournaments
                  </Link>
                </div>
              )}
            </div>
          </div>

          {/* Sidebar - Takes 1/3 on large screens */}
          <div className="space-y-6">
            {/* Profile Quick View */}
            <Link 
              to="/my-profile" 
              className="block group"
            >
              <div className="bg-neutral-800 rounded-xl shadow-lg border border-neutral-700 p-6 hover:border-primary-500/30 transition-all duration-200">
                <div className="flex items-center space-x-4">
                  <div className="bg-gradient-to-r from-primary-500 to-primary-600 rounded-full w-12 h-12 flex items-center justify-center">
                    <Users className="h-6 w-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-white group-hover:text-primary-400 transition-colors">
                      Your Profile
                    </h3>
                    <p className="text-gray-400 text-sm mt-1">
                      View stats & achievements
                    </p>
                  </div>
                </div>
              </div>
            </Link>

            {/* Achievement Preview */}
            {stats.won > 0 && (
              <div className="bg-gradient-to-r from-yellow-500/10 to-yellow-600/10 rounded-xl border border-yellow-500/20 p-6">
                <div className="flex items-center space-x-3">
                  <Award className="h-8 w-8 text-yellow-400" />
                  <div>
                    <h3 className="font-semibold text-white">Tournament Champion! 🏆</h3>
                    <p className="text-yellow-200 text-sm mt-1">
                      You've won {stats.won} tournament{stats.won > 1 ? 's' : ''}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Quick Tips for New Users */}
            {isNewUser && !isLoading && (
              <div className="bg-neutral-800 rounded-xl border border-neutral-700 p-6">
                <h3 className="font-semibold text-white mb-3 flex items-center">
                  <Zap className="h-5 w-5 mr-2 text-primary-400" />
                  Getting Started
                </h3>
                <ul className="space-y-2 text-sm text-gray-400">
                  <li className="flex items-start">
                    <span className="text-primary-400 mr-2">•</span>
                    Browse tournaments to find matches
                  </li>
                  <li className="flex items-start">
                    <span className="text-primary-400 mr-2">•</span>
                    Ensure sufficient wallet balance
                  </li>
                  <li className="flex items-start">
                    <span className="text-primary-400 mr-2">•</span>
                    Check tournament rules before joining
                  </li>
                </ul>
              </div>
            )}
          </div>
        </div>

        {/* Motivational Banner */}
        {userTournaments.length > 0 && !isLoading && (
          <Banner
            type="success"
            title="Great progress! 🚀"
            message={`You're competing in ${stats.active} active tournament${stats.active > 1 ? 's' : ''}. Keep climbing the ranks!`}
            action={{
              text: 'View Performance',
              to: '/my-profile'
            }}
          />
        )}
      </main>
    </div>
  );
}