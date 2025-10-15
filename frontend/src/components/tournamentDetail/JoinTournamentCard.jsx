import { Link, useNavigate } from 'react-router-dom';

const JoinTournamentCard = ({ tournament, user, onJoinClick }) => {
  const navigate = useNavigate();

  const isUserParticipant = () => {
    if (!tournament || !user) return false;
    return tournament.participants.some(
      (participant) => participant.user_id === user.id
    );
  };

  const isTournamentFull = () => {
    return tournament && tournament.current_slots >= tournament.total_slots;
  };

  const hasTournamentStarted = () => {
    return tournament && new Date(tournament.start_time) < new Date();
  };

  const handleJoin = async () => {
    try {
      await onJoinClick();
      // ✅ Redirect to the tournament's public chat page
      //navigate(`/tournaments/${tournament.id}/chat`);
    } catch (error) {
      console.error('Failed to join tournament:', error);
    }
  };

  if (!user) return null;

  return (
    <div className="bg-neutral-800 rounded-lg shadow p-4 sm:p-6">
      <h2 className="text-lg sm:text-xl font-semibold text-white mb-3 sm:mb-4">
        Join Tournament
      </h2>

      {isUserParticipant() ? (
        <div className="text-center">
          <p className="text-green-400 text-sm sm:text-base mb-3 sm:mb-4">
            You've already joined this tournament!
          </p>
          <button
            onClick={() => navigate(`/tournaments/${tournament.id}/chat`)}
            className="w-full bg-primary-500 hover:bg-primary-600 text-white font-medium py-2 px-4 rounded-md text-sm sm:text-base"
          >
            Go to Chat
          </button>
        </div>
      ) : isTournamentFull() ? (
        <div className="text-center">
          <p className="text-red-400 text-sm sm:text-base mb-3 sm:mb-4">
            This tournament is full.
          </p>
          <button
            disabled
            className="w-full bg-gray-600 text-gray-400 py-2 px-4 rounded-md cursor-not-allowed text-sm sm:text-base"
          >
            Tournament Full
          </button>
        </div>
      ) : hasTournamentStarted() ? (
        <div className="text-center">
          <p className="text-red-400 text-sm sm:text-base mb-3 sm:mb-4">
            This tournament has already started.
          </p>
          <button
            disabled
            className="w-full bg-gray-600 text-gray-400 py-2 px-4 rounded-md cursor-not-allowed text-sm sm:text-base"
          >
            Tournament Started
          </button>
        </div>
      ) : (
        <div>
          <p className="text-gray-400 text-sm sm:text-base mb-3">
            Entry fee: <span className="text-white font-medium">${tournament.entry_fee}</span>
          </p>
          <p className="text-gray-400 text-sm sm:text-base mb-4">
            Your wallet balance: <span className="text-white font-medium">${user.wallet_balance || '0.00'}</span>
          </p>

          {parseFloat(user.wallet_balance || 0) < parseFloat(tournament.entry_fee) ? (
            <div className="text-center">
              <p className="text-red-400 text-sm sm:text-base mb-3">
                Insufficient funds to join this tournament.
              </p>
              <p className="text-gray-400 text-xs sm:text-sm mb-4">
                You need ${tournament.entry_fee} but only have ${user.wallet_balance || '0.00'}
              </p>
              <Link
                to="/deposit"
                className="w-full bg-primary-500 hover:bg-primary-600 text-white font-medium py-2 px-4 rounded-md inline-block text-sm sm:text-base"
              >
                Add Funds
              </Link>
            </div>
          ) : (
            <button
              onClick={handleJoin}
              className="w-full bg-primary-500 hover:bg-primary-600 text-white font-medium py-2 px-4 rounded-md text-sm sm:text-base"
            >
              Join Tournament
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default JoinTournamentCard;