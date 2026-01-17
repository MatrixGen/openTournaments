import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ChatService from '../../services/chatService';
import ChannelForm from '../../components/channels/ChannelForm';
import Banner from '../../components/common/Banner';

const uiClasses = {
  page: 'bg-gray-50 dark:bg-neutral-900 text-gray-900 dark:text-gray-100',
  card: 'bg-white dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700',
  input:
    'bg-white dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent',
  button: {
    primary: 'bg-primary-500 hover:bg-primary-600 text-white',
    secondary:
      'bg-gray-100 dark:bg-neutral-700 text-gray-800 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-neutral-600',
    danger: 'bg-red-600 hover:bg-red-700 text-white',
  },
};

const themeClasses = {
  card: uiClasses.card,
  input: uiClasses.input,
  button: {
    primary: uiClasses.button.primary,
    secondary: uiClasses.button.secondary,
    danger: uiClasses.button.danger,
  },
  badge: {
    joined: 'bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300',
    public: 'bg-gray-100 text-gray-700 dark:bg-neutral-700 dark:text-gray-300',
  },
};

export default function CreateSquad() {
  const navigate = useNavigate();
  const [banner, setBanner] = useState(null);

  const handleCreateSquad = async (channelData) => {
    try {
      const dataToSend = {
        ...channelData,
        participantIds: Array.isArray(channelData.participantIds)
          ? channelData.participantIds
          : [],
      };

      const response = await ChatService.createChannel(dataToSend);
      const newChannel = response.data?.channel || response.channel || response;
      if (newChannel?.id) {
        navigate(`/squads/${newChannel.id}/chat`);
      } else {
        navigate('/squads');
      }
    } catch (err) {
      console.error('Failed to create squad:', err);
      const errorData = ChatService.handleError?.(err) || { message: 'Failed to create squad' };
      setBanner({
        type: 'error',
        title: 'Creation Failed',
        message: errorData.message,
        autoDismiss: true,
        duration: 4000,
      });
      throw errorData;
    }
  };

  return (
    <div className={`min-h-screen ${uiClasses.page} p-4 md:p-6`}>
      
        {banner && (
          <div className="mb-4">
            <Banner
              type={banner.type}
              title={banner.title}
              message={banner.message}
              autoDismiss={banner.autoDismiss}
              duration={banner.duration}
              onAutoDismiss={() => setBanner(null)}
              onClose={() => setBanner(null)}
              compact
            />
          </div>
        )}

        <ChannelForm
          onSubmit={handleCreateSquad}
          onCancel={() => navigate('/squads')}
          themeClasses={themeClasses}
          variant="page"
        />
      
    </div>
  );
}
