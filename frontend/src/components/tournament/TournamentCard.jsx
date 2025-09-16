import React from 'react';
import Button from '../common/Button';

function TournamentCard({ name, entryFee, status, onJoin }) {
  return (
    <div className="bg-white rounded shadow p-4 mb-4 flex flex-col gap-2">
      <div className="font-bold text-lg">{name}</div>
      <div className="text-sm text-gray-600">Entry Fee: ${entryFee}</div>
      <div className={`text-xs font-semibold ${status === 'Open' ? 'text-green-600' : 'text-red-600'}`}>
        Status: {status}
      </div>
      <Button variant="primary" onClick={onJoin} disabled={status !== 'Open'}>
        Join
      </Button>
    </div>
  );
}

export default TournamentCard;