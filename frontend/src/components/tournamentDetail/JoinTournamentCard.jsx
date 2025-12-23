import { Link } from 'react-router-dom';
import { 
  Trophy, 
  DollarSign, 
  Wallet, 
  AlertCircle, 
  CheckCircle, 
  Users,
  Clock,
  ArrowRight,
  Plus,
  Loader2
} from 'lucide-react';
import { formatCurrency } from '../../utils/formatters';
import { useState, useEffect } from 'react';


const JoinTournamentCard = ({ tournament,user, onJoinClick }) => {
  const [isUserLoading, setIsUserLoading] = useState(true);
  
  // Add a loading state to prevent premature rendering
  useEffect(() => {
    // If user is explicitly passed as null (meaning not logged in), don't wait
    if (user === null) {
      setIsUserLoading(false);
      return;
    }
    
    // If user is an object (logged in), we're done loading
    if (user && typeof user === 'object' && user.id) {
      setIsUserLoading(false);
      return;
    }
    
    // If user is undefined, we might still be loading
    // Wait a bit before showing the sign-in state
    const timer = setTimeout(() => {
      setIsUserLoading(false);
    }, 500);
    
    return () => clearTimeout(timer);
  }, [user]);

  const isUserParticipant = () => {
    if (!tournament || !user || !user.id) return false;
    return tournament.participants?.some(
      (participant) => participant.user_id === user.id
    );
  };

  const isTournamentFull = () => {
    return tournament && tournament.current_participants >= tournament.total_slots;
  };

  const hasTournamentStarted = () => {
    if (!tournament?.start_time) return false;
    return new Date(tournament.start_time) < new Date();
  };

  const canJoinTournament = () => {
    if (!user || !user.id) return false;
    if (isUserParticipant()) return false;
    if (isTournamentFull()) return false;
    if (hasTournamentStarted()) return false;
    if (tournament.status !== 'open' && tournament.status !== 'upcoming') return false;
    return true;
  };

  const hasSufficientFunds = () => {
    if (!user || !user.id || !tournament) return false;
    const userBalance = parseFloat(user.wallet_balance || 0);
    const entryFee = parseFloat(tournament.entry_fee || 0);
    return userBalance >= entryFee;
  };

  // Mobile compact view for small screens
  const MobileJoinButton = () => {
    if (isUserParticipant()) {
      return (
        <button
          onClick={() => window.location.href = `/tournaments/${tournament.id}/chat`}
          className="w-full bg-primary-500 hover:bg-primary-600 text-red font-medium py-3 px-4 rounded-lg transition-colors text-sm flex items-center justify-center"
        >
          <Trophy className="h-4 w-4 mr-2" />
          Joined
        </button>
      );
    }

    if (!canJoinTournament()) {
      return (
        <button
          disabled
          className="w-full bg-gray-100 dark:bg-neutral-700 text-gray-400 dark:text-gray-500 py-3 px-4 rounded-lg cursor-not-allowed text-sm"
        >
          Cannot Join
        </button>
      );
    }

    if (!hasSufficientFunds()) {
      return (
        <Link
          to="/deposit"
          className="w-full bg-primary-500 hover:bg-primary-600 text-black font-medium py-3 px-4 rounded-lg transition-colors text-sm flex items-center justify-center"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Funds to Join
        </Link>
      );
    }

    return (
      <button
        onClick={onJoinClick}
        className="w-full bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 text-black font-medium py-3 px-4 rounded-lg transition-colors text-sm flex items-center justify-center"
      >
        <Plus className="h-4 w-4 mr-2" />
        Join Tournament
      </button>
    );
  };

  // Show loading state while checking user auth
  if (isUserLoading) {
    return (
      <div className="bg-white dark:bg-neutral-800 rounded-xl shadow-sm border border-gray-200 dark:border-neutral-700 p-4 md:p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base md:text-lg font-semibold text-gray-900 dark:text-white">Join Tournament</h2>
          <Loader2 className="h-5 w-5 text-gray-400 animate-spin" />
        </div>
        <div className="text-center py-8">
          <div className="animate-pulse space-y-3">
            <div className="h-4 bg-gray-200 dark:bg-neutral-700 rounded w-3/4 mx-auto"></div>
            <div className="h-4 bg-gray-200 dark:bg-neutral-700 rounded w-1/2 mx-auto"></div>
          </div>
        </div>
      </div>
    );
  }

  // Show sign-in prompt if user is explicitly null (not logged in)
  if (user === null) {
    return (
      <div className="bg-white dark:bg-neutral-800 rounded-xl shadow-sm border border-gray-200 dark:border-neutral-700 p-4 md:p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base md:text-lg font-semibold text-gray-900 dark:text-white">Join Tournament</h2>
          <Trophy className="h-5 w-5 text-gray-400" />
        </div>
        <div className="text-center py-4">
          <p className="text-gray-600 dark:text-gray-400 text-sm mb-3">
            Sign in to join this tournament
          </p>
          <Link
            to="/login"
            className="inline-block w-full bg-primary-500 hover:bg-primary-600 text-black font-medium py-2.5 px-4 rounded-lg transition-colors text-sm"
          >
            Sign In
          </Link>
        </div>
      </div>
    );
  }

  // If user is undefined after loading, there might be an auth issue
  if (!user || !user.id) {
    return (
      <div className="bg-white dark:bg-neutral-800 rounded-xl shadow-sm border border-gray-200 dark:border-neutral-700 p-4 md:p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base md:text-lg font-semibold text-gray-900 dark:text-gray">Join Tournament</h2>
          <AlertCircle className="h-5 w-5 text-red-400" />
        </div>
        <div className="text-center py-4">
          <p className="text-gray-600 dark:text-gray-400 text-sm mb-3">
            Authentication error. Please try signing in again.
          </p>
          <Link
            to="/login"
            className="inline-block w-full bg-primary-500 hover:bg-primary-600 text-white font-medium py-2.5 px-4 rounded-lg transition-colors text-sm"
          >
            Sign In Again
          </Link>
        </div>
      </div>
    );
  }

  // Main component for logged-in users
  return (
    <div className="bg-white dark:bg-neutral-800 rounded-xl shadow-sm border border-gray-200 dark:border-neutral-700 p-4 md:p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base md:text-lg font-semibold text-gray-900 dark:text-white">Join Tournament</h2>
        <Trophy className="h-5 w-5 text-primary-500" />
      </div>

      {/* Mobile View */}
      <div className="md:hidden">
        <div className="mb-4 space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600 dark:text-gray-400">Entry Fee</span>
            <span className="font-medium text-gray-900 dark:text-white">
              {formatCurrency(tournament.entry_fee || 0,'USD')}
            </span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600 dark:text-gray-400">Your Balance</span>
            <span className="font-medium text-gray-900 dark:text-white">
              {formatCurrency(user.wallet_balance || 0,'USD')}
            </span>
          </div>
          {!hasSufficientFunds() && canJoinTournament() && (
            <div className="flex items-center space-x-2 text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 p-2 rounded-lg">
              <AlertCircle className="h-3 w-3 flex-shrink-0" />
              <span>Need {formatCurrency(tournament.entry_fee - user.wallet_balance,'USD')} more</span>
            </div>
          )}
        </div>
        <MobileJoinButton />
      </div>

      {/* Desktop View */}
      <div className="hidden md:block">
        {isUserParticipant() ? (
          <div className="space-y-4">
            <div className="flex items-center space-x-3 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-500/30">
              <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
              <div>
                <p className="text-sm font-medium text-green-800 dark:text-green-300">
                  You're registered for this tournament
                </p>
                <p className="text-xs text-green-700 dark:text-green-400 mt-0.5">
                  Tournament chat and updates available
                </p>
              </div>
            </div>
            <button
              onClick={() => window.location.href = `/tournaments/${tournament.id}/chat`}
              className="w-full bg-gray-100 dark:bg-neutral-700 hover:bg-gray-200 dark:hover:bg-neutral-600 text-gray-900 dark:text-white font-medium py-3 px-4 rounded-lg transition-colors flex items-center justify-center"
            >
              <Trophy className="h-4 w-4 mr-2" />
              Go to Tournament Chat
              <ArrowRight className="h-4 w-4 ml-2" />
            </button>
          </div>
        ) : isTournamentFull() ? (
          <div className="space-y-4">
            <div className="flex items-center space-x-3 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-500/30">
              <Users className="h-5 w-5 text-red-600 dark:text-red-400" />
              <div>
                <p className="text-sm font-medium text-red-800 dark:text-red-300">
                  Tournament is full
                </p>
                <p className="text-xs text-red-700 dark:text-red-400 mt-0.5">
                  All {tournament.total_slots} spots have been taken
                </p>
              </div>
            </div>
            <button
              disabled
              className="w-full bg-gray-100 dark:bg-neutral-700 text-gray-400 dark:text-gray-500 py-3 px-4 rounded-lg cursor-not-allowed"
            >
              Tournament Full
            </button>
          </div>
        ) : hasTournamentStarted() ? (
          <div className="space-y-4">
            <div className="flex items-center space-x-3 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-500/30">
              <Clock className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
              <div>
                <p className="text-sm font-medium text-yellow-800 dark:text-yellow-300">
                  Tournament has started
                </p>
                <p className="text-xs text-yellow-700 dark:text-yellow-400 mt-0.5">
                  Registration is closed for this tournament
                </p>
              </div>
            </div>
            <button
              disabled
              className="w-full bg-gray-100 dark:bg-neutral-700 text-gray-400 dark:text-gray-500 py-3 px-4 rounded-lg cursor-not-allowed"
            >
              Tournament Started
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Price and Balance Info */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="p-2 bg-purple-100 dark:bg-purple-900/20 rounded-lg">
                    <DollarSign className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Entry Fee</p>
                    <p className="text-lg font-semibold text-gray-900 dark:text-white">
                      {formatCurrency(tournament.entry_fee || 0,'USD')}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
                    <Wallet className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Your Balance</p>
                    <p className="text-lg font-semibold text-gray-900 dark:text-white">
                      {formatCurrency(user.wallet_balance || 0,'USD')}
                    </p>
                  </div>
                </div>
              </div>

              {/* Balance Warning */}
              {!hasSufficientFunds() && (
                <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-500/30">
                  <div className="flex items-center space-x-3">
                    <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-red-800 dark:text-red-300">
                        Insufficient funds
                      </p>
                      <p className="text-xs text-red-700 dark:text-red-400 mt-0.5">
                        You need {formatCurrency(tournament.entry_fee - user.wallet_balance,'USD')} more
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="space-y-3">
              {hasSufficientFunds() ? (
                <button
                  onClick={onJoinClick}
                  className="w-full bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 text-black font-medium py-3 px-4 rounded-lg transition-colors flex items-center justify-center"
                >
                  <Plus className="h-5 w-5 mr-2" />
                  Join Tournament
                </button>
              ) : (
                <div className="space-y-3">
                  <button
                    disabled
                    className="w-full bg-gray-100 dark:bg-neutral-700 text-gray-400 dark:text-gray-500 py-3 px-4 rounded-lg cursor-not-allowed"
                  >
                    Insufficient Funds
                  </button>
                  <Link
                    to="/deposit"
                    className="block w-full bg-primary-500 hover:bg-primary-600 text-white font-medium py-3 px-4 rounded-lg transition-colors text-center"
                  >
                    Add Funds
                  </Link>
                </div>
              )}
            </div>

            {/* Additional Info */}
            <div className="pt-4 border-t border-gray-200 dark:border-neutral-700">
              <div className="text-xs text-gray-500 dark:text-gray-400 space-y-1">
                <p className="flex items-center">
                  <span className="w-1 h-1 rounded-full bg-gray-400 mr-2"></span>
                  Slots available: {tournament.total_slots - tournament.current_participants} of {tournament.total_slots}
                </p>
                <p className="flex items-center">
                  <span className="w-1 h-1 rounded-full bg-gray-400 mr-2"></span>
                  Tournament starts: {new Date(tournament.start_time).toLocaleDateString()}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Help Text for All States */}
      <div className="mt-4 pt-4 border-t border-gray-200 dark:border-neutral-700">
        <p className="text-xs text-gray-500 dark:text-gray-400">
          By joining, you agree to the tournament rules and terms of service.
        </p>
      </div>
    </div>
  );
};

export default JoinTournamentCard;