import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../../components/layout/Header';
import MultiStepTournamentForm from '../../components/tournament/MultiStepTournamentForm';
import { tournamentService } from '../../services/tournamentService';
import { chatService } from '../../services/chatService'; // NEW: Import chat service
import { useAuth } from '../../contexts/AuthContext';

export default function CreateTournament() {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const { user, updateUser } = useAuth();

  const onSubmit = async (data) => {
    setIsSubmitting(true);
    setError('');
    setSuccess('');

    try {
      // Convert string values to numbers where needed
      const formattedData = {
        ...data,
        game_id: parseInt(data.game_id),
        platform_id: parseInt(data.platform_id),
        game_mode_id: parseInt(data.game_mode_id),
        entry_fee: parseFloat(data.entry_fee),
        total_slots: parseInt(data.total_slots),
        // Include gamer_tag if provided, otherwise use user's default if available
        gamer_tag: data.gamer_tag || user?.default_gamer_tag || user?.username,
      };

      // STEP 1: Create tournament
      const response = await tournamentService.create(formattedData);
      
      // STEP 2: Create chat channel for this tournament
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
        
        console.log(`✅ Tournament channel created: ${channelId}`);
      } catch (channelError) {
        console.warn('⚠️ Failed to create tournament channel:', channelError);
        // Continue without channel - tournament is still created
      }

      // STEP 3: Update tournament with channel ID if created
      if (channelId) {
        try {
          let responce=await tournamentService.update(response.tournament.id, {
            chat_channel_id: channelId
          });
          console.log(`✅ Tournament updated with channel ID: ${channelId} and ${responce}`);
          console.log(responce);
          
        } catch (updateError) {
          console.warn('⚠️ Failed to update tournament with channel ID:', updateError);
          // Continue - tournament is created, just missing channel reference
        }
      }

      setSuccess(response.message || 'Tournament created successfully!');
      
      // Update user's wallet balance if provided in response
      if (response.new_balance !== undefined) {
        updateUser({ wallet_balance: response.new_balance });
      }
      
      // Redirect to the new tournament page after a short delay
      setTimeout(() => {
        navigate(`/tournaments/${response.tournament.id}`);
      }, 2000);
    } catch (err) {
      console.error('Tournament creation error:', err);
      setError(err.response?.data?.message || 'Failed to create tournament. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-900">
      
      <main className="mx-auto max-w-4xl py-8 px-4 sm:px-6 lg:px-8">
        <div className="md:flex md:items-center md:justify-between mb-8">
          <div className="flex-1 min-w-0">
            <h1 className="text-3xl font-bold text-white">Create Tournament</h1>
            <p className="mt-2 text-sm text-gray-400">
              Follow the steps to set up your tournament. You can go back to make changes anytime.
            </p>
          </div>
          <div className="mt-4 flex md:mt-0 md:ml-4">
            <button
              type="button"
              onClick={() => navigate('/tournaments')}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-300 bg-transparent hover:bg-neutral-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
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
          // Pre-fill gamer_tag with user's default if available
          initialData={{
            gamer_tag: user?.default_gamer_tag || user?.username || ''
          }}
        />
      </main>
    </div>
  );
}