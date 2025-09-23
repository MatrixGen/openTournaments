const TournamentDetailsCard = ({ tournament }) => (
  <div className="bg-neutral-800 rounded-lg shadow p-4 sm:p-6">
    <h2 className="text-lg sm:text-xl font-semibold text-white mb-3 sm:mb-4">Tournament Details</h2>
    
    {tournament.rules && (
      <div className="mb-4 sm:mb-6">
        <h3 className="text-md font-medium text-white mb-2">Rules & Guidelines</h3>
        <p className="text-gray-400 whitespace-pre-wrap text-sm sm:text-base">
          {tournament.rules}
        </p>
      </div>
    )}

    {tournament.prizes && tournament.prizes.length > 0 && (
      <div>
        <h3 className="text-md font-medium text-white mb-2">Prize Distribution</h3>
        <div className="bg-neutral-700/50 rounded-lg p-3 sm:p-4">
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="font-medium text-white">Position</div>
            <div className="font-medium text-white">Percentage</div>
            {tournament.prizes.map((prize, index) => (
              <div key={index} className="contents">
                <div className="text-gray-400">{prize.position}</div>
                <div className="text-gray-400">{prize.percentage}%</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    )}
  </div>
);

export default TournamentDetailsCard;