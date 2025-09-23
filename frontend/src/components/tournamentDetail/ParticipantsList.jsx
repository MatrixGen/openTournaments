const ParticipantsList = ({ tournament }) => (
  <div className="bg-neutral-800 rounded-lg shadow p-4 sm:p-6">
    <h2 className="text-lg sm:text-xl font-semibold text-white mb-3 sm:mb-4">
      Participants ({tournament.participants.length})
    </h2>
    
    {tournament.participants.length > 0 ? (
      <div className="space-y-2 sm:space-y-3">
        {tournament.participants.map((participant) => (
          <div key={participant.id} className="flex items-center justify-between p-3 bg-neutral-700/50 rounded-lg">
            <div className="flex items-center min-w-0 flex-1">
              <div className="flex-shrink-0 h-8 w-8 sm:h-10 sm:w-10 rounded-full bg-primary-500 flex items-center justify-center text-white font-medium text-sm">
                {participant.user.username.charAt(0).toUpperCase()}
              </div>
              <div className="ml-3 min-w-0 flex-1">
                <p className="text-sm font-medium text-white truncate">
                  {participant.user.username}
                </p>
                <p className="text-xs text-gray-400 truncate">
                  {participant.gamer_tag}
                </p>
              </div>
            </div>
            {participant.final_standing && (
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-500/20 text-yellow-300 ml-2 flex-shrink-0">
                #{participant.final_standing}
              </span>
            )}
          </div>
        ))}
      </div>
    ) : (
      <p className="text-gray-400 text-sm sm:text-base">No participants yet. Be the first to join!</p>
    )}
  </div>
);

export default ParticipantsList;