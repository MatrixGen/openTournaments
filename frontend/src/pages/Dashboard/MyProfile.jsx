import Header from '../../components/layout/Header';
import { useAuth } from '../../contexts/AuthContext';
import { useState, useEffect } from 'react';
import { tournamentService } from '../../services/tournamentService';
import { Link } from 'react-router-dom';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import Banner from '../../components/common/Banner';

export default function MyProfile() {
  const { user } = useAuth();
  const [userStats, setUserStats] = useState({
    matchesPlayed: 0,
    wins: 0,
    earnings: 0,
    tournamentsJoined: 0,
    winRate: 0
  });
  const [recentTournaments, setRecentTournaments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      const { tournaments = [] } = await tournamentService.getMyTournaments();
      
      // Update recent tournaments (limit to latest 3)
      setRecentTournaments(tournaments.slice(0, 3));

      // Compute user stats safely
      const matchesPlayed = tournaments.length * 3; // Example metric
      const wins = tournaments.filter(
        t => t.status === 'completed' && t.winner_id === user?.id
      ).length;
      const earnings = tournaments.reduce(
        (total, t) => total + (t.prize_money || 0),
        0
      );
      const winRate = matchesPlayed > 0 ? (wins / matchesPlayed) * 100 : 0;

      setUserStats({
        matchesPlayed,
        wins,
        earnings,
        tournamentsJoined: tournaments.length,
        winRate
      });

    } catch (error) {
      console.error('Failed to load user data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Format date safely
  const formatMemberSince = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short' 
    });
  };

  // Calculate membership duration
  const getMembershipDuration = (dateString) => {
    if (!dateString) return '';
    const created = new Date(dateString);
    const now = new Date();
    const years = now.getFullYear() - created.getFullYear();
    const months = now.getMonth() - created.getMonth();
    
    if (years > 0) {
      return `${years} year${years > 1 ? 's' : ''}`;
    }
    return `${Math.max(months, 1)} month${months !== 1 ? 's' : ''}`;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-neutral-900">
        <div className="flex justify-center items-center min-h-[400px]">
          <LoadingSpinner size="lg" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-900">
      
      <main className="mx-auto max-w-4xl py-6 px-4 sm:px-6 lg:px-8 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white">My Profile</h1>
            <p className="text-gray-400 text-sm sm:text-base mt-1">
              Manage your account and track your progress
            </p>
          </div>
          <Link 
            to="/dashboard" 
            className="inline-flex items-center text-primary-500 hover:text-primary-400 text-sm font-medium w-fit"
          >
            ← Back to Dashboard
          </Link>
        </div>

        {/* Profile Overview Card */}
        <div className="bg-gradient-to-br from-neutral-800 to-neutral-900 rounded-2xl shadow-xl p-4 sm:p-6 border border-neutral-700">
          {/* Header Section */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-6">
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-primary-500 to-primary-600 rounded-full flex items-center justify-center shadow-lg">
                  <span className="text-2xl sm:text-3xl font-bold text-white">
                    {user?.username?.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div className="absolute bottom-1 right-1 w-3 h-3 sm:w-4 sm:h-4 bg-green-500 rounded-full border-2 border-neutral-800"></div>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h2 className="text-xl sm:text-2xl font-bold text-white truncate">
                    {user?.username}
                  </h2>
                  {user?.is_verified && (
                    <div className="bg-blue-500 rounded-full p-1 flex-shrink-0" title="Verified User">
                      <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                  )}
                </div>
                <p className="text-gray-400 text-sm sm:text-base flex items-center truncate">
                  <svg className="w-4 h-4 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  <p className='text-gray-400 text-xs sm:text-sm font-medium mb-1 truncate'>{user?.email}</p>
                </p>
              </div>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mb-6">
            <div className="bg-neutral-700/30 rounded-xl p-3 sm:p-4 border border-neutral-600/50 hover:border-primary-500/30 transition-all duration-200 group">
              <div className="flex items-center justify-between">
                <div className="min-w-0">
                  <p className="text-gray-400 text-xs sm:text-sm font-medium mb-1 truncate">Wallet Balance</p>
                  <p className="text-xl sm:text-2xl font-bold text-white truncate">
                    ${parseFloat(user?.wallet_balance || 0).toFixed(2)}
                  </p>
                </div>
                <div className="bg-primary-500/20 p-2 rounded-lg group-hover:scale-110 transition-transform flex-shrink-0 ml-3">
                  <svg className="w-5 h-5 sm:w-6 sm:h-6 text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                  </svg>
                </div>
              </div>
              <div className="mt-2 flex items-center text-xs">
                <span className="text-green-400 flex items-center">
                  <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M5.293 9.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 7.414V15a1 1 0 11-2 0V7.414L6.707 9.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
                  </svg>
                  Ready to play
                </span>
              </div>
            </div>

            <div className="bg-neutral-700/30 rounded-xl p-3 sm:p-4 border border-neutral-600/50 hover:border-primary-500/30 transition-all duration-200 group">
              <div className="flex items-center justify-between">
                <div className="min-w-0">
                  <p className="text-gray-400 text-xs sm:text-sm font-medium mb-1">Member Since</p>
                  <p className="text-lg sm:text-xl font-semibold text-white">
                    {formatMemberSince(user?.created_at)}
                  </p>
                  <p className="text-gray-400 text-xs sm:text-sm">
                    {getMembershipDuration(user?.created_at)}
                  </p>
                </div>
                <div className="bg-blue-500/20 p-2 rounded-lg group-hover:scale-110 transition-transform flex-shrink-0 ml-3">
                  <svg className="w-5 h-5 sm:w-6 sm:h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            <Link
              to="/deposit"
              className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-medium py-2 px-3 rounded-lg text-center transition-all duration-200 transform hover:scale-105 text-xs sm:text-sm"
            >
              Add Funds
            </Link>
            <Link
              to="/settings"
              className="bg-neutral-700 hover:bg-neutral-600 border border-neutral-600 text-white font-medium py-2 px-3 rounded-lg text-center transition-all duration-200 text-xs sm:text-sm"
            >
              Settings
            </Link>
          </div>

        {parseFloat(user?.wallet_balance || 0) < 5 && (
          <Banner
            type="warning"
            title="Low Balance Alert"
            message={
              <div>
                <p className="text-yellow-200/80 text-xs mb-2">
                  Add funds to join paid tournaments and avoid interruption.
                </p>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="w-12 sm:w-16 bg-yellow-500/30 rounded-full h-1.5">
                      <div
                        className="bg-yellow-400 h-1.5 rounded-full"
                        style={{
                          width: `${Math.min((parseFloat(user?.wallet_balance || 0) / 5) * 100, 100)}%`
                        }}
                      ></div>
                    </div>
                    <span className="text-yellow-300 text-xs font-medium whitespace-nowrap">
                      ${parseFloat(user?.wallet_balance || 0).toFixed(2)} / $5.00
                    </span>
                  </div>
                  <Link
                    to="/deposit"
                    className="bg-yellow-500 hover:bg-yellow-600 text-white font-medium py-1 px-3 rounded text-xs transition-colors whitespace-nowrap text-center"
                  >
                    Add Funds
                  </Link>
                </div>
              </div>
            }
            autoDismiss={false}
          />
        )}

        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
          {/* Gaming Stats Card */}
          <div className="bg-neutral-800 rounded-xl shadow p-4 sm:p-6">
            <h2 className="text-lg sm:text-xl font-semibold text-white mb-4">Gaming Stats</h2>
            <div className="space-y-3">
              <div className="flex justify-between items-center py-2 border-b border-neutral-700">
                <span className="text-gray-400 text-sm sm:text-base">Matches Played</span>
                <span className="text-white font-bold text-lg">{userStats.matchesPlayed}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-neutral-700">
                <span className="text-gray-400 text-sm sm:text-base">Wins</span>
                <span className="text-green-500 font-bold text-lg">{userStats.wins}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-neutral-700">
                <span className="text-gray-400 text-sm sm:text-base">Win Rate</span>
                <span className="text-white font-bold text-lg">
                  {userStats.winRate > 0 ? `${userStats.winRate.toFixed(1)}%` : '0%'}
                </span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-gray-400 text-sm sm:text-base">Total Earnings</span>
                <span className="text-yellow-500 font-bold text-lg">${userStats.earnings.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Account Status Card */}
          <div className="bg-neutral-800 rounded-xl shadow p-4 sm:p-6">
            <h2 className="text-lg sm:text-xl font-semibold text-white mb-4">Account Status</h2>
            <div className="space-y-3">
              <div className="flex justify-between items-center py-2 border-b border-neutral-700">
                <span className="text-gray-400 text-sm sm:text-base">Verification</span>
                <span className={`font-bold text-sm sm:text-lg ${
                  user?.is_verified ? 'text-green-500' : 'text-yellow-500'
                }`}>
                  {user?.is_verified ? 'Verified' : 'Pending'}
                </span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-neutral-700">
                <span className="text-gray-400 text-sm sm:text-base">Account Role</span>
                <span className="text-primary-500 font-bold text-sm sm:text-lg capitalize">
                  {user?.role || 'Player'}
                </span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-neutral-700">
                <span className="text-gray-400 text-sm sm:text-base">Tournaments Joined</span>
                <span className="text-white font-bold text-lg">{userStats.tournamentsJoined}</span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-gray-400 text-sm sm:text-base">Last Active</span>
                <span className="text-white font-medium text-xs sm:text-sm">
                  Today
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Tournaments */}
        <div className="bg-neutral-800 rounded-xl shadow p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 mb-4">
            <h2 className="text-lg sm:text-xl font-semibold text-white">Recent Tournaments</h2>
            <Link to="/my-tournaments" className="inline-flex items-center text-primary-500 hover:text-primary-400 text-sm font-medium w-fit">
              View All →
            </Link>
          </div>

          {recentTournaments.length > 0 ? (
            <div className="space-y-3">
              {recentTournaments.map((tournament) => (
                <div key={tournament.id} className="bg-neutral-700/50 rounded-lg p-3 sm:p-4 hover:bg-neutral-700 transition-colors">
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-white text-sm sm:text-base truncate">{tournament.name}</h3>
                      <p className="text-gray-400 text-xs sm:text-sm">
                        {tournament.game_type} • <span className="capitalize">{tournament.status}</span>
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-white font-medium text-sm sm:text-base">${tournament.entry_fee || '0'}</p>
                      <p className="text-gray-400 text-xs">Entry Fee</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-6 sm:py-8">
              <div className="bg-neutral-700/30 rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-3">
                <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <p className="text-gray-400 text-sm sm:text-base mb-4">You haven't joined any tournaments yet.</p>
              <Link
                to="/tournaments"
                className="inline-block bg-primary-500 hover:bg-primary-600 text-white font-medium py-2 px-4 rounded-lg text-sm sm:text-base transition-colors"
              >
                Join Your First Tournament
              </Link>
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
          <Link
            to="/deposit"
            className="bg-green-600 hover:bg-green-700 text-white font-medium py-3 px-4 rounded-lg text-center transition-colors text-sm sm:text-base"
          >
            Add Funds
          </Link>
          <Link
            to="/create-tournament"
            className="bg-primary-500 hover:bg-primary-600 text-white font-medium py-3 px-4 rounded-lg text-center transition-colors text-sm sm:text-base"
          >
            Create Tournament
          </Link>
          <Link
            to="/settings"
            className="bg-neutral-700 hover:bg-neutral-600 text-white font-medium py-3 px-4 rounded-lg text-center transition-colors text-sm sm:text-base"
          >
            Account Settings
          </Link>
        </div>
      </main>
    </div>
  );
}