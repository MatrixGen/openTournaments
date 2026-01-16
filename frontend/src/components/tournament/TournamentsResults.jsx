import TournamentCard from './TournamentCard';
import { cn } from '../../utils/cn';

const TournamentsResults = ({
  tournaments,
  responseCurrency,
  onTournamentClick,
  layout = 'grid',
  compact = false,
}) => (
  <div
    className={cn(
      layout === 'grid' &&
        'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6',
      layout === 'list' && 'space-y-4',
      compact && 'gap-3'
    )}
  >
    {tournaments.map((tournament) => (
      <TournamentCard
        key={tournament.id}
        tournament={tournament}
        responseCurrency={responseCurrency}
        onClick={() => onTournamentClick(tournament)}
        compact={compact}
        layout={layout}
      />
    ))}
  </div>
);

export default TournamentsResults;
