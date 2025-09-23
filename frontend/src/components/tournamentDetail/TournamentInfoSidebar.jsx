const TournamentInfoSidebar = ({ tournament }) => (
  <div className="bg-neutral-800 rounded-lg shadow p-4 sm:p-6">
    <h2 className="text-lg sm:text-xl font-semibold text-white mb-3 sm:mb-4">Tournament Info</h2>
    
    <div className="space-y-3">
      <div>
        <p className="text-sm text-gray-400">Visibility</p>
        <p className="text-white font-medium text-sm sm:text-base capitalize">
          {tournament.visibility}
        </p>
      </div>
      
      <div>
        <p className="text-sm text-gray-400">Created</p>
        <p className="text-white font-medium text-sm sm:text-base">
          {new Date(tournament.created_at).toLocaleDateString()}
        </p>
      </div>
      
      <div>
        <p className="text-sm text-gray-400">Status</p>
        <p className="text-white font-medium text-sm sm:text-base capitalize">
          {tournament.status}
        </p>
      </div>
      
      {tournament.updated_at && (
        <div>
          <p className="text-sm text-gray-400">Last Updated</p>
          <p className="text-white font-medium text-sm sm:text-base">
            {new Date(tournament.updated_at).toLocaleDateString()}
          </p>
        </div>
      )}
    </div>
  </div>
);

export default TournamentInfoSidebar;