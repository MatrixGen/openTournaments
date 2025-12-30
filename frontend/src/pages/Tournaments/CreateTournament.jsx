import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import MultiStepTournamentForm from '../../components/tournament/MultiStepTournamentForm';
import { tournamentService } from '../../services/tournamentService';
import chatService  from '../../services/chatService';
import { useAuth } from '../../contexts/AuthContext';
import { ArrowLeftIcon, XCircleIcon } from '@heroicons/react/24/outline';

export default function CreateTournament() {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const { user, updateUser } = useAuth();
  
  const [showMobileExitModal, setShowMobileExitModal] = useState(false);

  const onSubmit = async (data) => {
    console.log('Prize pool from form:', data.prize_pool);
    const localDate = new Date(data.start_time);
    const utcDate = new Date(localDate.getTime() - localDate.getTimezoneOffset() * 60000);

    setIsSubmitting(true);
    setError('');
    setSuccess('');

    try {
      const formattedData = {
        ...data,
        start_time: utcDate.toISOString(),
        game_id: parseInt(data.game_id),
        platform_id: parseInt(data.platform_id),
        game_mode_id: parseInt(data.game_mode_id),
        entry_fee: parseFloat(data.entry_fee),
        prize_pool: data.prize_pool ? parseFloat(data.prize_pool) : undefined, 
        total_slots: parseInt(data.total_slots),
        rules: Array.isArray(data.rules) ? data.rules.join('\n') : data.rules || '',
        gamer_tag: data.gamer_tag || user?.default_gamer_tag || user?.username,
      };

      // Create tournament
      const response = await tournamentService.create(formattedData);
      
      // Create chat channel
      let channelId = null;
      try {
        const channelData = {
          name: `tournament-${response.tournament.id}`,
          description: `Chat for tournament: ${response.tournament.name}`,
          type: 'group',
          isPrivate: false,
          metadata: {
            tournamentId: response.tournament.id,
            tournamentName: response.tournament.name,
            createdBy: user.id,
            createdAt: new Date().toISOString()
          }
        };
        
        const channelResponse = await chatService.createChannel(channelData);
        channelId = channelResponse.id || channelResponse.data?.channel?.id;
      } catch (channelError) {
        console.warn('Failed to create tournament channel:', channelError);
      }

      // Update tournament with channel ID and join
      if (channelId) {
        try {
          await tournamentService.update(response.tournament.id, {
            chat_channel_id: channelId
          });
        } catch (updateError) {
          console.warn('Failed to update tournament with channel ID:', updateError);
        }
      }
      

      setSuccess(response.message || 'Tournament created successfully!');
      
      if (response.new_balance !== undefined) {
        updateUser({ wallet_balance: response.new_balance });
      }
      
      setTimeout(() => {
        navigate(`/tournaments/${response.tournament.id}`);
      }, 4000);
    } catch (err) {
      console.error('Tournament creation error:', err);
      setError(err.response?.data?.message || 'Failed to create tournament. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    if (window.innerWidth < 768) {
      setShowMobileExitModal(true);
    } else {
      navigate('/tournaments');
    }
  };

  const MobileExitModal = () => (
    <div className="fixed inset-0 z-50 md:hidden">
      <div className="fixed inset-0 bg-black/50" onClick={() => setShowMobileExitModal(false)} />
      <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-neutral-800 rounded-t-2xl p-6 shadow-xl">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-900 dark:text-white mb-4">
          Exit Tournament Creation?
        </h3>
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          Your progress will be saved as a draft.
        </p>
        <div className="space-y-3">
          <button
            onClick={() => {
              setShowMobileExitModal(false);
              navigate('/tournaments');
            }}
            className="w-full bg-red-600 text-gray-900 dark:text-white py-3 rounded-lg font-medium"
          >
            Exit & Save Draft
          </button>
          <button
            onClick={() => setShowMobileExitModal(false)}
            className="w-full border border-gray-300 dark:border-neutral-600 text-gray-700 dark:text-gray-300 py-3 rounded-lg font-medium"
          >
            Continue Creating
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-neutral-900">
      {/* Mobile Header */}
      <div className="md:hidden bg-white dark:bg-neutral-800 border-b border-gray-200 dark:border-neutral-700 px-4 py-3 sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <button
              onClick={handleCancel}
              className="p-2 text-gray-600 dark:text-gray-400"
            >
              <ArrowLeftIcon className="h-5 w-5" />
            </button>
            <div>
              <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-900 dark:text-white">Create Tournament</h1>
              <p className="text-xs text-gray-500 dark:text-gray-400">Step-by-step setup</p>
            </div>
          </div>
          <button
            onClick={handleCancel}
            className="p-2 text-gray-600 dark:text-gray-400"
          >
            <XCircleIcon className="h-5 w-5" />
          </button>
        </div>
      </div>

      <main className="mx-auto max-w-4xl py-4 md:py-8 px-3 sm:px-4 lg:px-8">
        {/* Desktop Header */}
        <div className="hidden md:flex md:items-center md:justify-between mb-8">
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-gray-900 dark:text-white">Create Tournament</h1>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
              Follow the steps to set up your tournament. You can go back to make changes anytime.
            </p>
          </div>
          <div className="mt-4 flex md:mt-0 md:ml-4">
            <button
              type="button"
              onClick={() => navigate('/tournaments')}
              className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-neutral-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-neutral-800 hover:bg-gray-50 dark:hover:bg-neutral-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
            >
              Cancel
            </button>
          </div>
         
        </div>

        <MultiStepTournamentForm
          onSubmit={onSubmit}
          isSubmitting={isSubmitting}
          error={error}
          success={success}
          submitButtonText={isSubmitting ? 'Creating Tournament...' : 'Create Tournament'}
          initialData={{
            gamer_tag: user?.default_gamer_tag || user?.username || ''
          }}
        />
      </main>

      {showMobileExitModal && <MobileExitModal />}
    </div>
  );
}