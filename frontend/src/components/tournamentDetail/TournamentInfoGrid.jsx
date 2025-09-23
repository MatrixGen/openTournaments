const TournamentInfoGrid = ({ tournament }) => (
  <div className="border-t border-neutral-700 px-4 sm:px-6 py-4">
    <div className="grid grid-cols-2 gap-3 sm:gap-4">
      <div>
        <p className="text-sm text-gray-400">Format</p>
        <p className="text-white font-medium text-sm sm:text-base capitalize">
          {tournament.format.replace('_', ' ')}
        </p>
      </div>
      <div>
        <p className="text-sm text-gray-400">Entry Fee</p>
        <p className="text-white font-medium text-sm sm:text-base">${tournament.entry_fee}</p>
      </div>
      <div>
        <p className="text-sm text-gray-400">Participants</p>
        <p className="text-white font-medium text-sm sm:text-base">
          {tournament.current_slots} / {tournament.total_slots}
        </p>
      </div>
      <div>
        <p className="text-sm text-gray-400">Start Time</p>
        <p className="text-white font-medium text-xs sm:text-base">
          {new Date(tournament.start_time).toLocaleString()}
        </p>
      </div>
    </div>
  </div>
);

export default TournamentInfoGrid;