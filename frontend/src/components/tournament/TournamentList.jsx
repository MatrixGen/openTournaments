import React from 'react';
import TournamentCard from './TournamentCard';

function TournamentList({ tournaments, onJoin }) {
  return (
    <div>
      {tournaments && tournaments.length > 0 ? (
        tournaments.map((tournament) => (
          <TournamentCard
            key={tournament.id}
            name={tournament.name}
            entryFee={tournament.entryFee}
            status={tournament.status}
            onJoin={() => onJoin(tournament.id)}
          />
        ))
      ) : (
        <div className="text-gray-500">No tournaments available.</div>
      )}
    </div>
  );
}

export default TournamentList;