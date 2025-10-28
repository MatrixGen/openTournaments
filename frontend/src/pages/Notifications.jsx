import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/layout/Header';
import { notificationService } from '../services/notificationService';
import { useAuth } from '../contexts/AuthContext';
import Banner from '../components/common/Banner';
import LoadingSpinner from '../components/common/LoadingSpinner';

export default function Notifications() {
  const [notifications, setNotifications] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [unreadCount, setUnreadCount] = useState(0);
  const navigate = useNavigate();

  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      loadNotifications();
      loadUnreadCount();
    }
  }, [user]);

  const loadNotifications = async () => {
    try {
      const response = await notificationService.getAll();
      setNotifications(response.notifications || []);
    } catch (err) {
      console.error('Failed to load notifications:', err);
      setError(err.response?.data?.message || 'Failed to load notifications');
    } finally {
      setIsLoading(false);
    }
  };

  const loadUnreadCount = async () => {
    try {
      const response = await notificationService.getUnreadCount();
      setUnreadCount(response.count || 0);
    } catch (err) {
      console.error('Failed to load unread count:', err);
    }
  };

  const markAsRead = async (id) => {
    try {
      await notificationService.markAsRead(id);
      // Update local state
      setNotifications(notifications.map(n => 
        n.id === id ? { ...n, is_read: true } : n
      ));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (err) {
      console.error('Failed to mark notification as read:', err);
      setError('Failed to mark notification as read');
    }
  };

  const markAllAsRead = async () => {
    try {
      await notificationService.markAllAsRead();
      // Update all notifications to read
      setNotifications(notifications.map(n => ({ ...n, is_read: true })));
      setUnreadCount(0);
      setSuccess('All notifications marked as read');
    } catch (err) {
      console.error('Failed to mark all notifications as read:', err);
      setError('Failed to mark all notifications as read');
    }
  };

  const handleNotificationClick = async (notification) => {
    // Mark as read first
    if (!notification.is_read) {
      await markAsRead(notification.id);
    }
    
    // Navigate based on notification type and related entity
    if (notification.related_entity_type && notification.related_entity_id) {
      switch (notification.related_entity_type) {
        case 'match':
          navigate(`/matches/${notification.related_entity_id}`);
          break;
        case 'tournament':
          navigate(`/tournaments/${notification.related_entity_id}`);
          break;
        case 'dispute':
          navigate(`/disputes/${notification.related_entity_id}`);
          break;
        case 'friend_request':
          navigate('/friends/requests');
          break;
        case 'wallet':
          navigate('/wallet');
          break;
        default:
          console.log('Unknown entity type:', notification.related_entity_type);
      }
    } else {
      // Fallback for notifications without specific entity links
      switch (notification.type) {
        case 'friend_request':
          navigate('/friends/requests');
          break;
        case 'wallet_update':
          navigate('/wallet');
          break;
        default:
          // Do nothing for generic notifications
          console.log('No specific action for this notification');
      }
    }
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'match': return '📊';
      case 'tournament': return '🏆';
      case 'match_reminder': return '⏰';
      case 'prize': return '💰';
      case 'dispute': return '⚖️';
      case 'tournament_invite': return '📨';
      case 'friend_request': return '👤';
      case 'wallet_update': return '💳';
      case 'system': return '🔧';
      default: return '🔔';
    }
  };

  const getActionText = (notification) => {
    if (notification.related_entity_type) {
      switch (notification.related_entity_type) {
        case 'match': return 'View Match →';
        case 'tournament': return 'View Tournament →';
        case 'dispute': return 'View Dispute →';
        case 'friend_request': return 'View Requests →';
        case 'wallet': return 'View Wallet →';
        default: return 'View Details →';
      }
    }
    
    // Fallback for notifications without specific entity
    switch (notification.type) {
      case 'friend_request': return 'View Requests →';
      case 'wallet_update': return 'View Wallet →';
      default: return 'View Details →';
    }
  };

  const formatNotificationTime = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now - date) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours}h ago`;
    if (diffInHours < 168) return `${Math.floor(diffInHours / 24)}d ago`;
    return date.toLocaleDateString();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-neutral-900">
        
        <LoadingSpinner 
          fullPage={true} 
          text="Loading your notifications..." 
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-900">
      
      <main className="mx-auto max-w-4xl py-8 px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-1xl font-bold text-white">Notifications</h1>
            <p className="mt-2 text-gray-400">
              Stay updated with your tournament activities
            </p>
          </div>
          {unreadCount > 0 && (
            <button
              onClick={markAllAsRead}
              className="text-primary-500 hover:text-primary-400 text-sm font-medium transition-colors"
            >
              Mark all as read
            </button>
          )}
        </div>

        {/* Error Banner */}
        {error && (
          <Banner
            type="error"
            title="Action Failed"
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
            onClose={() => setSuccess('')}
            className="mb-6"
          />
        )}

        {/* Unread Count Banner */}
        {unreadCount > 0 && (
          <Banner
            type="info"
            title={`You have ${unreadCount} unread notification${unreadCount > 1 ? 's' : ''}`}
            message="Click on notifications to mark them as read and take action."
            action={{
              text: 'Mark All as Read',
              onClick: markAllAsRead
            }}
            className="mb-6"
          />
        )}

        {/* Empty State Banner */}
        {notifications.length === 0 && (
          <Banner
            type="info"
            title="No Notifications Yet"
            message="You'll see important updates about your tournaments, matches, and account activities here."
            action={{
              text: 'Browse Tournaments',
              to: '/tournaments'
            }}
            className="mb-6"
          />
        )}

        {/* Notifications List */}
        <div className="space-y-3">
          {notifications.length > 0 ? (
            notifications.map((notification) => (
              <div
                key={notification.id}
                className={`p-4 rounded-lg border cursor-pointer transition-all duration-200 ${
                  notification.is_read
                    ? 'bg-neutral-800 border-neutral-700 hover:bg-neutral-750'
                    : 'bg-primary-900/20 border-primary-500/30 hover:bg-primary-900/30'
                }`}
                onClick={() => handleNotificationClick(notification)}
              >
                <div className="flex items-start">
                  <span className="text-xl mr-3 mt-1 flex-shrink-0">
                    {getNotificationIcon(notification.type)}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start mb-1">
                      <h3 className={`font-medium ${
                        notification.is_read ? 'text-white' : 'text-primary-300'
                      }`}>
                        {notification.title}
                      </h3>
                      {!notification.is_read && (
                        <span className="h-2 w-2 rounded-full bg-primary-500 flex-shrink-0 mt-2 ml-2"></span>
                      )}
                    </div>
                    <p className="text-gray-400 text-sm mb-2">{notification.message}</p>
                    <div className="flex justify-between items-center">
                      <p className="text-gray-500 text-xs">
                        {formatNotificationTime(notification.created_at)}
                      </p>
                      <span className="text-primary-500 hover:text-primary-400 text-sm font-medium transition-colors">
                        {getActionText(notification)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-12 bg-neutral-800 rounded-lg border border-neutral-700">
              <div className="mx-auto h-24 w-24 rounded-full bg-neutral-700 flex items-center justify-center mb-4">
                <span className="text-4xl">🔔</span>
              </div>
              <h3 className="text-lg font-medium text-white mb-2">All caught up!</h3>
              <p className="text-gray-400 mb-6 max-w-md mx-auto">
                You don't have any notifications at the moment. Check back later for updates.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <button
                  onClick={() => navigate('/tournaments')}
                  className="bg-primary-500 hover:bg-primary-600 text-white font-medium py-2 px-4 rounded transition-colors"
                >
                  Browse Tournaments
                </button>
                <button
                  onClick={loadNotifications}
                  className="bg-neutral-700 hover:bg-neutral-600 text-white font-medium py-2 px-4 rounded transition-colors"
                >
                  Refresh
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Notification Tips Banner */}
        {notifications.length > 0 && (
          <Banner
            type="info"
            message="Notifications are automatically cleared after 30 days. Important system notifications will always be available."
            className="mt-6"
          />
        )}
      </main>
    </div>
  );
}