import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Header from '../../components/layout/Header';
import TournamentForm from '../../components/tournament/TournamentForm';
import { tournamentService } from '../../services/tournamentService';
import { useAuth } from '../../contexts/AuthContext';
import Banner from '../../components/common/Banner';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { ArrowLeftIcon, ExclamationCircleIcon } from '@heroicons/react/24/outline';

export default function EditTournament() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [tournament, setTournament] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const { user } = useAuth();

  const loadTournament = useCallback(async () => {
    try {
      setIsLoading(true);
      setError('');
      const tournamentData = await tournamentService.getById(id);
      
      // Check if user is the creator
      if (tournamentData.created_by !== user.id) {
        setError('You are not authorized to edit this tournament');
        setTournament(null);
        return;
      }
      
      setTournament(tournamentData);
    } catch (err) {
      console.error('Failed to load data:', err);
      setError(err.response?.data?.message || 'Failed to load tournament data');
      setTournament(null);
    } finally {
      setIsLoading(false);
    }
  }, [id, user.id]);

  useEffect(() => {
    loadTournament();
  }, [loadTournament]);

  const onSubmit = useCallback(async (data) => {
    try {
      const localDate = new Date(data.start_time);
      const utcDate = new Date(localDate.getTime() - localDate.getTimezoneOffset() * 60000);

      setIsSubmitting(true);
      setError('');
      setSuccess('');

      // Convert string values to numbers where needed
      const formattedData = {
        ...data,
        start_time: utcDate.toISOString(),
        game_id: parseInt(data.game_id),
        platform_id: parseInt(data.platform_id),
        game_mode_id: parseInt(data.game_mode_id),
        entry_fee: parseFloat(data.entry_fee),
        total_slots: parseInt(data.total_slots),
        rules: Array.isArray(data.rules) ? data.rules.join('\n') : data.rules || ''
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
  }, [id, navigate]);

  const handleCancel = useCallback(() => {
    if (tournament?.id) {
      navigate(`/tournaments/${tournament.id}`);
    } else {
      navigate('/tournaments');
    }
  }, [navigate, tournament?.id]);

  // Prepare initial data for the form
  const initialData = useMemo(() => {
    if (!tournament) return null;
    
    return {
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
      currency: tournament.currency,
      prize_distribution: Array.isArray(tournament.prizes) && tournament.prizes.length > 0
        ? tournament.prizes.map(p => ({
            position: Number(p.position),
            percentage: Number(p.percentage),
          }))
        : [{ position: 1, percentage: 100 }],
    };
  }, [tournament]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-neutral-900 transition-colors">
        <Header />
        <main className="mx-auto max-w-4xl py-8 px-4 sm:px-6 lg:px-8">
          <LoadingSpinner 
            fullPage={false} 
            text="Loading tournament data..." 
            className="h-96"
          />
        </main>
      </div>
    );
  }

  if (error && !tournament) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-neutral-900 transition-colors">
        <Header />
        <main className="mx-auto max-w-4xl py-8 px-4 sm:px-6 lg:px-8">
          <div className="mb-6">
            <button
              onClick={() => navigate('/tournaments')}
              className="inline-flex items-center text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-300 mb-6"
            >
              <ArrowLeftIcon className="h-4 w-4 mr-2" />
              Back to Tournaments
            </button>
          </div>
          
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

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-neutral-900 transition-colors">
      <Header />
      <main className="mx-auto max-w-4xl py-6 sm:py-8 px-3 sm:px-4 lg:px-8">
        {/* Mobile-friendly header */}
        <div className="mb-6 sm:mb-8">
          <button
            onClick={handleCancel}
            className="inline-flex items-center text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-300 mb-4"
          >
            <ArrowLeftIcon className="h-4 w-4 mr-2" />
            Back to Tournament
          </button>
          
          <div className="md:flex md:items-center md:justify-between">
            <div className="flex-1 min-w-0">
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-900 dark:text-white">
                Update Tournament
              </h1>
              <p className="mt-1 sm:mt-2 text-sm text-gray-600 dark:text-gray-400">
                Update your tournament for players to compete in.
              </p>
            </div>
            <div className="mt-4 flex md:mt-0 md:ml-4">
              <button
                type="button"
                onClick={handleCancel}
                className="inline-flex items-center px-3 sm:px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-neutral-800 hover:bg-gray-50 dark:hover:bg-neutral-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-colors"
              >
                Cancel
              </button>
            </div>
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

        {initialData && (
          <TournamentForm
            initialData={initialData}
            onSubmit={onSubmit}
            isSubmitting={isSubmitting}
            submitButtonText={
              isSubmitting ? (
                <span className="flex items-center justify-center space-x-2">
                  <LoadingSpinner size="sm" />
                  <span>Updating Tournament...</span>
                </span>
              ) : (
                'Update Tournament'
              )
            }
            mode="edit"
            tournamentStatus={tournament?.status}
          />
        )}

        {/* Warning Banner for Started Tournaments */}
        {tournament?.status === 'live' && (
          <Banner
            type="warning"
            title="Tournament in Progress"
            message="This tournament has already started. Some changes may not be allowed while the tournament is active."
            className="mt-6"
          />
        )}

        {/* Info Banner for Participant Notification */}
        {tournament?.status === 'scheduled' && (
          <Banner
            type="info"
            message="Participants will be notified of any significant changes to the tournament details."
            className="mt-6"
          />
        )}
      </main>
    </div>
  );
}
