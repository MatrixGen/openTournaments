import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import ChatService from '../../services/chatService';
import ChannelForm from '../../components/channels/ChannelForm';
import Banner from '../../components/common/Banner';
import { ArrowLeft } from 'lucide-react';

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

export default function SquadEditPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  // Get navigation source from state
  const fromPath = location.state?.from || '/squads';
  const fromLabel = location.state?.fromLabel || 'Back';

  const [channel, setChannel] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [banner, setBanner] = useState(null);

  const fetchChannel = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await ChatService.getChannel(id);
      const channelData = response?.data?.channel || response?.channel || response;
      if (!channelData) {
        throw new Error('Squad not found');
      }
      setChannel(channelData);
    } catch (err) {
      console.error('Failed to fetch squad:', err);
      const errorData = ChatService.handleError?.(err) || { message: 'Failed to load squad' };
      setError(errorData.message);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (id) {
      fetchChannel();
    }
  }, [id, fetchChannel]);

  const handleUpdateSquad = async (channelData) => {
    try {
      const response = await ChatService.updateChannel(id, channelData);
      const updatedChannel = response?.data?.channel || response?.channel || response;

      setBanner({
        type: 'success',
        title: 'Squad Updated',
        message: `"${updatedChannel?.name || 'Squad'}" has been updated successfully!`,
        autoDismiss: true,
        duration: 2000,
      });

      // Navigate back after a short delay to show success message
      setTimeout(() => {
        navigate(fromPath);
      }, 1500);
    } catch (err) {
      console.error('Failed to update squad:', err);
      const errorData = ChatService.handleError?.(err) || { message: 'Failed to update squad' };
      setBanner({
        type: 'error',
        title: 'Update Failed',
        message: errorData.message,
        autoDismiss: true,
        duration: 4000,
      });
      throw errorData;
    }
  };

  const handleCancel = () => {
    navigate(fromPath);
  };

  const handleBack = () => {
    navigate(fromPath);
  };

  if (loading) {
    return (
      <div className={`min-h-screen ${uiClasses.page} p-4 md:p-6`}>
        <div className="max-w-3xl mx-auto">
          <div className={`${uiClasses.card} rounded-xl p-6 animate-pulse`}>
            <div className="h-8 bg-gray-200 dark:bg-neutral-700 rounded w-1/3 mb-4" />
            <div className="h-4 bg-gray-200 dark:bg-neutral-700 rounded w-1/2 mb-6" />
            <div className="space-y-4">
              <div className="h-12 bg-gray-200 dark:bg-neutral-700 rounded" />
              <div className="h-12 bg-gray-200 dark:bg-neutral-700 rounded" />
              <div className="h-24 bg-gray-200 dark:bg-neutral-700 rounded" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`min-h-screen ${uiClasses.page} p-4 md:p-6`}>
        <div className="max-w-3xl mx-auto">
          <button
            onClick={handleBack}
            className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-4 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>{fromLabel}</span>
          </button>
          <div className={`${uiClasses.card} rounded-xl p-6 text-center`}>
            <div className="text-red-500 text-5xl mb-4">⚠️</div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              Failed to Load Squad
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-4">{error}</p>
            <div className="flex justify-center gap-3">
              <button
                onClick={fetchChannel}
                className={`${uiClasses.button.primary} px-4 py-2 rounded-lg text-sm font-medium`}
              >
                Try Again
              </button>
              <button
                onClick={handleBack}
                className={`${uiClasses.button.secondary} px-4 py-2 rounded-lg text-sm font-medium`}
              >
                Go Back
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!channel) {
    return (
      <div className={`min-h-screen ${uiClasses.page} p-4 md:p-6`}>
        <div className="max-w-3xl mx-auto">
          <button
            onClick={handleBack}
            className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-4 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>{fromLabel}</span>
          </button>
          <div className={`${uiClasses.card} rounded-xl p-6 text-center`}>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              Squad Not Found
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              The squad you're looking for doesn't exist or has been deleted.
            </p>
            <button
              onClick={handleBack}
              className={`${uiClasses.button.primary} px-4 py-2 rounded-lg text-sm font-medium`}
            >
              Go Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${uiClasses.page} p-4 md:p-6`}>
      <div className="max-w-3xl mx-auto">
        {/* Back button */}
        <button
          onClick={handleBack}
          className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-4 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>{fromLabel}</span>
        </button>

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
          channel={channel}
          onSubmit={handleUpdateSquad}
          onCancel={handleCancel}
          themeClasses={themeClasses}
          variant="page"
        />
      </div>
    </div>
  );
}
