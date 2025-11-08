import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Header from '../../components/layout/Header';
import TournamentForm from '../../components/tournament/TournamentForm';
import { tournamentService } from '../../services/tournamentService';
import { useAuth } from '../../contexts/AuthContext';
import Banner from '../../components/common/Banner';
import LoadingSpinner from '../../components/common/LoadingSpinner';

export default function EditTournament() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [tournament, setTournament] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const { user } = useAuth();

  useEffect(() => {
    const loadData = async () => {
      try {
        const tournamentData = await tournamentService.getById(id);
        
        // Check if user is the creator
        if (tournamentData.created_by !== user.id) {
          setError('You are not authorized to edit this tournament');
          setIsLoading(false);
          return;
        }
        
        setTournament(tournamentData);
      } catch (err) {
        console.error('Failed to load data:', err);
        setError(err.response?.data?.message || 'Failed to load tournament data');
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [id, user.id]);

  const onSubmit = async (data) => {
    const localDate = new Date(data.start_time); // value from datetime-local
    const utcDate = new Date(localDate.getTime() - localDate.getTimezoneOffset() * 60000);

    setIsSubmitting(true);
    setError('');
    setSuccess('');

    try {
      // Convert string values to numbers where needed
      const formattedData = {
        ...data,
         start_time: utcDate.toISOString(),
        game_id: parseInt(data.game_id),
        platform_id: parseInt(data.platform_id),
        game_mode_id: parseInt(data.game_mode_id),
        entry_fee: parseFloat(data.entry_fee),
        total_slots: parseInt(data.total_slots),
      };

      await tournamentService.update(id, formattedData);
      setSuccess('Tournament updated successfully! Redirecting...');
      
      // Redirect to the tournament page after a short delay
      setTimeout(() => {
        navigate(`/tournaments/${id}`);
      }, 1500);
    } catch (err) {
      console.error('Tournament update error:', err);
      setError(err.response?.data?.message || 'Failed to update tournament. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-neutral-900">
        
        <LoadingSpinner 
          fullPage={true} 
          text="Loading tournament data..." 
        />
      </div>
    );
  }

  if (!tournament) {
    return (
      <div className="min-h-screen bg-neutral-900">
        
        <main className="mx-auto max-w-4xl py-8 px-4 sm:px-6 lg:px-8">
          <Banner
            type="error"
            title="Tournament Not Found"
            message={error || 'The tournament you are trying to edit does not exist.'}
            action={{
              text: 'Back to Tournaments',
              onClick: () => navigate('/tournaments')
            }}
          />
        </main>
      </div>
    );
  }

  // Prepare initial data for the form
  const initialData = {
    name: tournament.name,
    game_id: Number(tournament.game_id),
    platform_id: Number(tournament.platform_id),
    game_mode_id: Number(tournament.game_mode_id),
    format: tournament.format,
    entry_fee: Number(tournament.entry_fee),
    total_slots: Number(tournament.total_slots),
    start_time: new Date(tournament.start_time).toISOString().slice(0, 16),
    rules: tournament.rules || '',
    visibility: tournament.visibility,
    prize_distribution: Array.isArray(tournament.prizes) && tournament.prizes.length > 0
      ? tournament.prizes.map(p => ({
          position: Number(p.position),
          percentage: Number(p.percentage),
        }))
      : [{ position: 1, percentage: 100 }],
  };

  return (
    <div className="min-h-screen bg-neutral-900">
      
      <main className="mx-auto max-w-4xl py-8 px-4 sm:px-6 lg:px-8">
        <div className="md:flex md:items-center md:justify-between mb-8">
          <div className="flex-1 min-w-0">
            <h1 className="text-1xl font-bold text-white">Update Tournament</h1>
            <p className="mt-2 text-sm text-gray-400">
              Update your tournament for players to compete in.
            </p>
          </div>
          <div className="mt-4 flex md:mt-0 md:ml-4">
            <button
              type="button"
              onClick={() => navigate('/tournaments')}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-300 bg-transparent hover:bg-neutral-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>

        {/* Error Banner */}
        {error && (
          <Banner
            type="error"
            title="Update Failed"
            message={error}
            onClose={() => setError('')}
            className="mb-6"
          />
        )}

        {/* Success Banner */}
        {success && (
          <Banner
            type="success"
            title="Success!"
            message={success}
            className="mb-6"
          />
        )}

        {/* Info Banner */}
        <Banner
          type="info"
          title="Editing Tournament"
          message="Any changes you make will be immediately visible to participants. Make sure all information is accurate."
          className="mb-6"
        />

        <TournamentForm
          initialData={initialData}
          onSubmit={onSubmit}
          isSubmitting={isSubmitting}
          submitButtonText={
            isSubmitting ? (
              <span className="flex items-center space-x-2">
                <LoadingSpinner size="sm" />
                <span>Updating Tournament...</span>
              </span>
            ) : (
              'Update Tournament'
            )
          }
        />

        {/* Warning Banner for Started Tournaments */}
        {tournament.status === 'live' && (
          <Banner
            type="warning"
            title="Tournament in Progress"
            message="This tournament has already started. Some changes may not be allowed while the tournament is active."
            className="mt-6"
          />
        )}

        {/* Info Banner for Participant Notification */}
        <Banner
          type="info"
          message="Participants will be notified of any significant changes to the tournament details."
          className="mt-6"
        />
      </main>
    </div>
  );
}