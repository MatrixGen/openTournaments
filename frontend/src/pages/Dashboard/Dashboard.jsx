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
  Zap,
  DollarSign,
  ChevronRight,
  AlertCircle
} from 'lucide-react';
import { formatCurrency } from '../../utils/formatters';
import { useTheme } from '../../contexts/ThemeContext';

export default function Dashboard() {
  const { user } = useAuth();
  const {theme}= useTheme();
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
      const { tournaments} = await tournamentService.getMyTournaments();
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
      label: 'Total',
      value: stats.total,
      icon: Trophy,
      color: 'text-blue-600 dark:text-blue-400',
      bgColor: 'bg-blue-100 dark:bg-blue-900/30'
    },
    {
      label: 'Active',
      value: stats.active,
      icon: Zap,
      color: 'text-green-600 dark:text-green-400',
      bgColor: 'bg-green-100 dark:bg-green-900/30'
    },
    {
      label: 'Completed',
      value: stats.completed,
      icon: Calendar,
      color: 'text-gray-600 dark:text-gray-400',
      bgColor: 'bg-gray-100 dark:bg-gray-800'
    },
    {
      label: 'Won',
      value: stats.won,
      icon: Award,
      color: 'text-yellow-600 dark:text-yellow-400',
      bgColor: 'bg-yellow-100 dark:bg-yellow-900/30'
    }
  ];

  // Mobile bottom navigation items
  const mobileNavItems = [
    { icon: Search, label: 'Browse', to: '/tournaments' },
    { icon: Plus, label: 'Create', to: '/create-tournament' },
    { icon: Trophy, label: 'My', to: '/my-tournaments' },
    { icon: Users, label: 'Profile', to: '/my-profile' },
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gradient-to-br dark:from-neutral-900 dark:to-neutral-800 safe-padding">
      <main className="mx-auto max-w-7xl py-4 md:py-8 px-3 sm:px-4 lg:px-8 space-y-6">
        {/* Mobile Header with Balance */}
        <div className="lg:hidden mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">Welcome, {user?.username}! 👋</h1>
              <p className="text-gray-600 dark:text-gray-400 text-sm mt-1">Your dashboard overview</p>
            </div>
            <div className="bg-white dark:bg-neutral-800 rounded-lg px-3 py-2 border border-gray-200 dark:border-neutral-700 shadow-sm">
              <p className="text-gray-500 dark:text-gray-400 text-xs">Balance</p>
              <p className="text-lg font-bold text-gray-900 dark:text-white">
                {formatCurrency(user?.wallet_balance || 0,'USD')}
              </p>
            </div>
          </div>
          
          {/* Quick Action Buttons - Mobile */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            <Link 
              to="/create-tournament" 
              className="bg-primary-500 hover:bg-primary-600 text-white font-medium py-3 px-4 rounded-lg text-center transition-colors flex items-center justify-center space-x-2"
            >
              <Plus className="h-4 w-4" />
              <span className="text-sm">Create</span>
            </Link>
            
            <Link 
              to="/tournaments" 
              className="bg-white dark:bg-neutral-800 hover:bg-gray-50 dark:hover:bg-neutral-700 border border-gray-300 dark:border-neutral-700 text-gray-900 dark:text-white font-medium py-3 px-4 rounded-lg text-center transition-colors flex items-center justify-center space-x-2"
            >
              <Search className="h-4 w-4" />
              <span className="text-sm">Browse</span>
            </Link>
          </div>
        </div>

        {/* Desktop Header */}
        <div className="hidden lg:flex flex-col md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">Welcome back, {user?.username}! </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">Here's what's happening with your tournaments</p>
          </div>
          <div className="mt-4 md:mt-0">
            <div className="bg-white dark:bg-neutral-800 rounded-lg px-4 py-3 border border-gray-200 dark:border-neutral-700 shadow-sm">
              <p className="text-gray-600 dark:text-gray-400 text-sm">Wallet Balance</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {formatCurrency(user?.wallet_balance || 0)}
              </p>
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
            icon={<AlertCircle className="h-5 w-5" />}
            className="mb-6"
          />
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
          {statCards.map((stat, index) => (
            <div 
              key={index}
              className="bg-white dark:bg-neutral-800 rounded-lg md:rounded-xl p-4 border border-gray-200 dark:border-neutral-700 hover:border-gray-300 dark:hover:border-neutral-600 transition-colors"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 dark:text-gray-400 text-xs md:text-sm font-medium">{stat.label}</p>
                  <p className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white mt-1 md:mt-2">{stat.value}</p>
                </div>
                <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                  <stat.icon className={`h-5 w-5 md:h-6 md:w-6 ${stat.color}`} />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Quick Actions - Desktop */}
        <div className="hidden md:grid md:grid-cols-3 gap-4 md:gap-6">
          <Link 
            to="/create-tournament" 
            className="group bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 text-white font-semibold py-4 md:py-6 px-6 rounded-lg md:rounded-xl text-center transition-all duration-200 shadow-lg hover:shadow-primary-500/25"
          >
            <div className="flex items-center justify-center space-x-2 md:space-x-3">
              <Plus className="h-5 w-5 md:h-6 md:w-6" />
              <span className="text-sm md:text-base">Create Tournament</span>
            </div>
          </Link>
          
          <Link 
            to="/browse-matches" 
            className="group bg-white dark:bg-neutral-800 hover:bg-gray-50 dark:hover:bg-neutral-700 border border-gray-300 dark:border-neutral-700 text-gray-900 dark:text-white font-semibold py-4 md:py-6 px-6 rounded-lg md:rounded-xl text-center transition-all duration-200"
          >
            <div className="flex items-center justify-center space-x-2 md:space-x-3">
              <Search className="h-5 w-5 md:h-6 md:w-6" />
              <span className="text-sm md:text-base">Browse Tournaments</span>
            </div>
          </Link>
          
          <Link 
            to="/my-profile" 
            className="group bg-white dark:bg-neutral-800 hover:bg-gray-50 dark:hover:bg-neutral-700 border border-gray-300 dark:border-neutral-700 text-gray-900 dark:text-white font-semibold py-4 md:py-6 px-6 rounded-lg md:rounded-xl text-center transition-all duration-200"
          >
            <div className="flex items-center justify-center space-x-2 md:space-x-3">
              <TrendingUp className="h-5 w-5 md:h-6 md:w-6" />
              <span className="text-sm md:text-base">View Stats</span>
            </div>
          </Link>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recent Tournaments - Takes 2/3 on large screens */}
          <div className="lg:col-span-2">
            <div className="bg-white dark:bg-neutral-800 rounded-lg md:rounded-xl shadow border border-gray-200 dark:border-neutral-700 p-4 md:p-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 md:mb-6">
                <h2 className="text-lg md:text-xl font-semibold text-gray-900 dark:text-white flex items-center">
                  <Trophy className="h-5 w-5 md:h-6 md:w-6 mr-2 text-yellow-500 dark:text-yellow-400" />
                  Your Tournaments
                </h2>
                <Link 
                  to="/my-tournaments" 
                  className="inline-flex items-center text-primary-600 dark:text-primary-500 hover:text-primary-700 dark:hover:text-primary-400 text-sm font-medium mt-2 sm:mt-0"
                >
                  View All <ChevronRight className="h-4 w-4 ml-1" />
                </Link>
              </div>

              {isLoading ? (
                <div className="flex justify-center py-8 md:py-12">
                  <LoadingSpinner size="md" />
                </div>
              ) : error ? (
                <div className="text-center py-6 md:py-8">
                  <p className="text-red-500 dark:text-red-400 mb-3 md:mb-4">{error}</p>
                  <button
                    onClick={loadUserTournaments}
                    className="bg-primary-500 hover:bg-primary-600 text-white font-medium py-2 px-4 rounded transition-colors text-sm md:text-base"
                  >
                    Try Again
                  </button>
                </div>
              ) : userTournaments.length > 0 ? (
                <TournamentCarousel tournaments={userTournaments} />
              ) : (
                <div className="text-center py-8 md:py-12">
                  <div className="bg-gray-100 dark:bg-neutral-700/50 rounded-full w-12 h-12 md:w-16 md:h-16 flex items-center justify-center mx-auto mb-3 md:mb-4">
                    <Trophy className="h-6 w-6 md:h-8 md:w-8 text-gray-400 dark:text-gray-500" />
                  </div>
                  <h3 className="text-base md:text-lg font-medium text-gray-900 dark:text-white mb-1 md:mb-2">No tournaments yet</h3>
                  <p className="text-gray-600 dark:text-gray-400 mb-4 md:mb-6 max-w-sm mx-auto text-sm md:text-base">
                    Join your first tournament and start competing for prizes!
                  </p>
                  <Link
                    to="/browse-matches"
                    className="inline-flex items-center bg-primary-500 hover:bg-primary-600 text-white font-medium py-2 md:py-3 px-4 md:px-6 rounded-lg transition-colors text-sm md:text-base"
                  >
                    <Search className="h-4 w-4 mr-2" />
                    Explore Tournaments
                  </Link>
                </div>
              )}
            </div>
          </div>

          {/* Sidebar - Takes 1/3 on large screens */}
          <div className="space-y-4 md:space-y-6">
            {/* Profile Quick View */}
            <Link 
              to="/my-profile" 
              className="block group"
            >
              <div className="bg-white dark:bg-neutral-800 rounded-lg md:rounded-xl border border-gray-200 dark:border-neutral-700 p-4 hover:border-primary-500/30 transition-all duration-200">
                <div className="flex items-center space-x-3 md:space-x-4">
                  <div className="bg-gradient-to-r from-primary-500 to-primary-600 rounded-full w-10 h-10 md:w-12 md:h-12 flex items-center justify-center flex-shrink-0">
                    <Users className="h-5 w-5 md:h-6 md:w-6 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900 dark:text-white group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors text-sm md:text-base">
                      Your Profile
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400 text-xs md:text-sm mt-0.5 truncate">
                      View stats & achievements
                    </p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-gray-400 group-hover:text-primary-500 transition-colors flex-shrink-0" />
                </div>
              </div>
            </Link>

            {/* Achievement Preview */}
            {stats.won > 0 && (
              <div className="bg-gradient-to-r from-yellow-500/10 to-yellow-600/10 dark:from-yellow-500/20 dark:to-yellow-600/20 rounded-lg md:rounded-xl border border-yellow-500/20 p-4">
                <div className="flex items-center space-x-2 md:space-x-3">
                  <Award className="h-6 w-6 md:h-8 md:w-8 text-yellow-500 dark:text-yellow-400 flex-shrink-0" />
                  <div className="min-w-0">
                    <h3 className="font-semibold text-gray-900 dark:text-white text-sm md:text-base">Tournament Champion! 🏆</h3>
                    <p className="text-yellow-700 dark:text-yellow-300 text-xs md:text-sm mt-0.5 truncate">
                      You've won {stats.won} tournament{stats.won > 1 ? 's' : ''}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Quick Tips for New Users */}
            {isNewUser && !isLoading && (
              <div className="bg-white dark:bg-neutral-800 rounded-lg md:rounded-xl border border-gray-200 dark:border-neutral-700 p-4">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-2 md:mb-3 flex items-center text-sm md:text-base">
                  <Zap className="h-4 w-4 md:h-5 md:w-5 mr-2 text-primary-500 dark:text-primary-400" />
                  Getting Started
                </h3>
                <ul className="space-y-1.5 text-xs md:text-sm text-gray-600 dark:text-gray-400">
                  <li className="flex items-start">
                    <span className="text-primary-500 dark:text-primary-400 mr-2">•</span>
                    <span>Browse tournaments to find matches</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-primary-500 dark:text-primary-400 mr-2">•</span>
                    <span>Ensure sufficient wallet balance</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-primary-500 dark:text-primary-400 mr-2">•</span>
                    <span>Check tournament rules before joining</span>
                  </li>
                </ul>
              </div>
            )}

            {/* Deposit Card for Low Balance */}
            {hasLowBalance && (
              <div className="bg-gradient-to-r from-red-500/10 to-red-600/10 dark:from-red-500/20 dark:to-red-600/20 rounded-lg md:rounded-xl border border-red-500/20 p-4">
                <div className="flex items-center space-x-2 md:space-x-3">
                  <DollarSign className="h-6 w-6 md:h-8 md:w-8 text-red-500 dark:text-red-400 flex-shrink-0" />
                  <div className="min-w-0">
                    <h3 className="font-semibold text-gray-900 dark:text-white text-sm md:text-base">Add Funds 💰</h3>
                    <p className="text-red-700 dark:text-red-300 text-xs md:text-sm mt-0.5">
                      Low balance detected
                    </p>
                    <Link
                      to="/deposit"
                      className="inline-flex items-center text-primary-600 dark:text-primary-500 hover:text-primary-700 dark:hover:text-primary-400 text-xs md:text-sm font-medium mt-1"
                    >
                      Add funds now <ChevronRight className="h-3 w-3 ml-1" />
                    </Link>
                  </div>
                </div>
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
            className="mt-4 md:mt-6"
          />
        )}

        {/* Mobile Bottom Navigation */}
        <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-neutral-800 border-t border-gray-200 dark:border-neutral-700 py-2 px-4 md:hidden z-40 mobile-nav-container">
          <div className="grid grid-cols-4 gap-2">
            {mobileNavItems.map((item, index) => (
              <Link
                key={index}
                to={item.to}
                className="flex flex-col items-center justify-center p-2 text-gray-600 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-500 transition-colors"
              >
                <item.icon className="h-5 w-5 mb-1" />
                <span className="text-xs font-medium">{item.label}</span>
              </Link>
            ))}
          </div>
        </div>
        
        {/* Spacer for mobile bottom nav */}
        <div className="h-16 md:h-0"></div>
      </main>
    </div>
  );
}